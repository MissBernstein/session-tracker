import React, { useState, useEffect } from 'react';
import { LogOut, Mic, Heart } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { fromRow } from '../types';
import type { Client } from '../types';
import ClientCard from '../components/ClientCard';

export default function ClientPortal() {
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) { setLoading(false); return; }
      setUserEmail(user.email);

      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('email', user.email)
        .maybeSingle();

      if (error) console.error('Failed to load client record:', error);
      else if (data) setClient(fromRow(data as Record<string, unknown>));
      setLoading(false);
    })();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto min-h-screen p-4 font-sans flex items-center justify-center">
        <p className="text-[#AFAFAF] text-sm">Loading your sessions…</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen p-4 font-sans selection:bg-blue-500/30">
      {/* Header */}
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            {client ? `Hi, ${client.name.split(' ')[0]}! 👋` : 'My Sessions'}
          </h1>
          <p className="text-[11px] text-[#AFAFAF] mt-1">{userEmail}</p>
        </div>
        <button
          onClick={signOut}
          className="p-2 rounded-full bg-[#2F2F2F] hover:bg-[#3F3F3F] transition-colors text-white"
          title="Sign Out"
        >
          <LogOut size={18} />
        </button>
      </header>

      {/* No record found */}
      {!client && (
        <div className="text-center py-16 space-y-3">
          <p className="text-[#AFAFAF] text-sm">
            No session record found for <strong>{userEmail}</strong>.
          </p>
          <p className="text-[#555] text-xs">
            Ask your coach to make sure your email is linked to your client profile.
          </p>
        </div>
      )}

      {/* Client record */}
      {client && (
        <div className="space-y-6">
          {/* Package summary */}
          <div className="bg-[#252525] rounded-xl border border-[#373737] p-4">
            <div className="flex items-center gap-2 mb-3">
              {client.category === 'Vocal Coaching' ? (
                <Mic size={14} className="text-blue-400" />
              ) : (
                <Heart size={14} className="text-rose-400" />
              )}
              <span className="text-[10px] uppercase tracking-widest text-[#AFAFAF] font-bold">
                {client.category}
              </span>
            </div>
            <p className="text-xs text-[#AFAFAF]">
              {client.completedPackages?.length
                ? `You've completed ${client.completedPackages.length} package${client.completedPackages.length > 1 ? 's' : ''} so far. Keep it up!`
                : 'Welcome! Your session journey starts here.'}
            </p>
          </div>

          {/* Current package card (read-only) */}
          <ClientCard client={client} readOnly />
        </div>
      )}
    </div>
  );
}
