-- ============================================================
-- Session Tracker — Complete Supabase Setup
-- Run this once in the SQL Editor (safe to re-run)
-- ============================================================

-- 1. Patch the clients table
--    - Make user_id optional (it existed in the old setup)
--    - Add email column for client portal access
ALTER TABLE clients ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE clients ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE clients ADD COLUMN IF NOT EXISTS email text;

-- 2. Profiles table (maps auth users → roles)
CREATE TABLE IF NOT EXISTS profiles (
  id   uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'client' CHECK (role IN ('admin', 'client'))
);

-- 3. Auto-create a 'client' profile for every new sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role)
  VALUES (new.id, 'client')
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 4. Backfill profiles for users that existed before this setup
INSERT INTO profiles (id, role)
SELECT id, 'client' FROM auth.users
WHERE id NOT IN (SELECT id FROM profiles)
ON CONFLICT (id) DO NOTHING;

-- 5. Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients  ENABLE ROW LEVEL SECURITY;

-- 6. Drop ALL existing policies on both tables (clean slate)
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname, tablename
             FROM pg_policies
             WHERE tablename IN ('clients', 'profiles')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- 7. Profiles policy: users can read their own row
CREATE POLICY "profiles: read own"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- 8. Clients policy: admin has full access
CREATE POLICY "clients: admin all"
  ON clients FOR ALL
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- 9. Clients policy: client can read only their own record
--    Uses auth.email() — no direct access to auth.users needed
CREATE POLICY "clients: client read own"
  ON clients FOR SELECT
  USING (email = auth.email());

-- ============================================================
-- 10. Set yourself as admin
--     Replace the email with YOUR email address, then run.
-- ============================================================
UPDATE profiles
SET role = 'admin'
WHERE id = (SELECT id FROM auth.users WHERE email = 'me@leylastuber.com');
-- ============================================================
