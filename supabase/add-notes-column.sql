-- Add notes column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';

-- Update admin_users role check to include 'field_user'
ALTER TABLE admin_users DROP CONSTRAINT IF EXISTS admin_users_role_check;
ALTER TABLE admin_users ADD CONSTRAINT admin_users_role_check
  CHECK (role IN ('admin', 'user', 'field_user'));
