import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Verify the caller is authenticated
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing authorization' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Verify caller is admin
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { email, name } = await req.json();
  if (!email) {
    return new Response(JSON.stringify({ error: 'Email is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const origin = req.headers.get('origin') ?? Deno.env.get('SUPABASE_URL') ?? '';

  const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${origin}/my-sessions`,
    data: { name },
  });

  if (inviteError) {
    return new Response(JSON.stringify({ error: inviteError.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Ensure a client-role profile row exists for this user (the DB trigger handles new users,
  // but if the user already existed we make sure the profile is in place)
  const { data: newUser } = await supabaseAdmin.auth.admin.listUsers();
  const invitedUser = newUser?.users?.find((u) => u.email === email);
  if (invitedUser) {
    await supabaseAdmin
      .from('profiles')
      .upsert({ id: invitedUser.id, role: 'client' }, { onConflict: 'id', ignoreDuplicates: true });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
