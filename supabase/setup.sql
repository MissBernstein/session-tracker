-- ============================================================
-- Session Tracker — Supabase Setup SQL
-- Run these statements in your Supabase SQL Editor
-- ============================================================

-- 1. Add email column to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS email text;

-- 2. Create profiles table (links auth users to roles)
CREATE TABLE IF NOT EXISTS profiles (
  id   uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'client' CHECK (role IN ('admin', 'client'))
);

-- 3. Trigger: auto-create a 'client' profile for every new auth user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
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

-- 4. Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients  ENABLE ROW LEVEL SECURITY;

-- 5. Drop old policies if they exist (including old user_id-based ones)
DROP POLICY IF EXISTS "Users can read their own profile" ON profiles;
DROP POLICY IF EXISTS "Admin full access to clients"    ON clients;
DROP POLICY IF EXISTS "Clients read own record"         ON clients;
-- Old user_id-based policies from previous setup:
DROP POLICY IF EXISTS "select own clients" ON clients;
DROP POLICY IF EXISTS "insert own clients" ON clients;
DROP POLICY IF EXISTS "update own clients" ON clients;
DROP POLICY IF EXISTS "delete own clients" ON clients;

-- 6. Profiles: each user can read their own row
CREATE POLICY "Users can read their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- 7. Clients: admins have full access
CREATE POLICY "Admin full access to clients"
  ON clients FOR ALL
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- 8. Clients: clients can only read their own record (matched by email)
CREATE POLICY "Clients read own record"
  ON clients FOR SELECT
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- ============================================================
-- After running the above, manually set YOUR admin profile:
-- Replace the email below with your own.
-- ============================================================
 UPDATE profiles
 SET role = 'admin'
 WHERE id = (SELECT id FROM auth.users WHERE email = 'me@leylastuber.com');
-- ============================================================
