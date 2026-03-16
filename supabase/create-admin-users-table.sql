-- Admin users table
-- Links Supabase Auth users to admin roles
CREATE TABLE admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookup
CREATE UNIQUE INDEX admin_users_user_id_idx ON admin_users(user_id);

-- Enable RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read their own role
CREATE POLICY "Users can read own role" ON admin_users
  FOR SELECT USING (auth.uid() = user_id);

-- Allow service role full access
CREATE POLICY "Service role full access" ON admin_users
  FOR ALL USING (auth.role() = 'service_role');

-- =============================================
-- SETUP: After running this SQL, do these steps:
-- =============================================
-- 1. Go to Supabase Dashboard → Authentication → Users
-- 2. Click "Add User" → "Create New User"
-- 3. Enter admin email and password
-- 4. Copy the user's UUID
-- 5. Run this INSERT (replace values):
--
-- INSERT INTO admin_users (user_id, email, role)
-- VALUES ('paste-user-uuid-here', 'admin@email.com', 'admin');
