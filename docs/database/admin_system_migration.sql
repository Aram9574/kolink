-- [Module 5] Migration: Admin System
-- Purpose: Add admin role and audit logging for admin panel

-- 1. Add role column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- Create enum-like constraint for role
ALTER TABLE profiles ADD CONSTRAINT check_role_valid
    CHECK (role IN ('user', 'admin'));

-- Add index for role queries
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Add last_login column for admin tracking
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;

-- 2. Create admin_audit_logs table for tracking admin actions
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    action TEXT NOT NULL, -- 'modify_plan', 'add_credits', 'delete_user', 'create_admin'
    target_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    details JSONB, -- Store action details (old_value, new_value, etc.)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_user_id ON admin_audit_logs(target_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON admin_audit_logs(action);

-- Enable Row Level Security
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view audit logs
CREATE POLICY "Admins can view audit logs" ON admin_audit_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Policy: System can insert audit logs
CREATE POLICY "System can insert audit logs" ON admin_audit_logs
    FOR INSERT WITH CHECK (true);

-- 3. Update profiles RLS policies to allow admin access
-- Drop existing policies if needed and recreate with admin access

-- Policy: Admins can view all profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles" ON profiles
    FOR SELECT
    USING (
        auth.uid() = id OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Policy: Admins can update all profiles
DROP POLICY IF EXISTS "Admins can update profiles" ON profiles;
CREATE POLICY "Admins can update profiles" ON profiles
    FOR UPDATE
    USING (
        auth.uid() = id OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Policy: Admins can delete profiles
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;
CREATE POLICY "Admins can delete profiles" ON profiles
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- 4. Function to log admin actions
CREATE OR REPLACE FUNCTION log_admin_action(
    p_admin_id UUID,
    p_action TEXT,
    p_target_user_id UUID DEFAULT NULL,
    p_details JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    -- Verify the admin has admin role
    IF NOT EXISTS (
        SELECT 1 FROM profiles
        WHERE id = p_admin_id AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'User % is not an admin', p_admin_id;
    END IF;

    -- Insert audit log
    INSERT INTO admin_audit_logs (admin_id, action, target_user_id, details)
    VALUES (p_admin_id, p_action, p_target_user_id, p_details)
    RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = p_user_id AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Update last_login on auth
CREATE OR REPLACE FUNCTION update_last_login()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE profiles
    SET last_login = NOW()
    WHERE id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: This trigger needs to be created on auth.users table
-- This requires superuser access, so include instructions in comments:
/*
To enable last_login tracking, run this in Supabase SQL Editor with superuser:

CREATE TRIGGER update_user_last_login
    AFTER UPDATE ON auth.users
    FOR EACH ROW
    WHEN (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at)
    EXECUTE FUNCTION update_last_login();
*/

-- Comments
COMMENT ON TABLE admin_audit_logs IS '[Module 5] Audit trail for admin actions';
COMMENT ON COLUMN profiles.role IS '[Module 5] User role: user or admin';
COMMENT ON FUNCTION log_admin_action IS '[Module 5] Log admin actions with details';
COMMENT ON FUNCTION is_admin IS '[Module 5] Check if user has admin role';

-- Example: Create first admin user (replace with your user ID)
-- UPDATE profiles SET role = 'admin' WHERE email = 'your-admin@email.com';
