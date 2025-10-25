-- ============================================================================
-- Kolink v0.5/v0.6 Expansion - Database Schema
-- ============================================================================
-- Description: Adds admin logs, event logs, calendar scheduling, and analytics
-- Author: Kolink Team
-- Date: 2025-01-25
-- ============================================================================

-- ============================================================================
-- 1. ADMIN LOGS TABLE
-- ============================================================================
-- Tracks all administrative actions (add credits, change plans, delete users)

CREATE TABLE IF NOT EXISTS public.admin_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_user uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id ON public.admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_target_user ON public.admin_logs(target_user);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON public.admin_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only admins can view admin logs
CREATE POLICY "Admin logs viewable by admins only"
  ON public.admin_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policy: Only admins can insert admin logs
CREATE POLICY "Admin logs insertable by admins only"
  ON public.admin_logs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

COMMENT ON TABLE public.admin_logs IS 'Tracks administrative actions for audit trail';

-- ============================================================================
-- 2. EVENT LOGS TABLE
-- ============================================================================
-- General event logging for all user actions (login, generation, payment, errors)

CREATE TABLE IF NOT EXISTS public.logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('login', 'generation', 'payment', 'error', 'profile_update', 'other')),
  message text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_logs_user_id ON public.logs(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_type ON public.logs(type);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON public.logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own logs
CREATE POLICY "Users can view their own logs"
  ON public.logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Admins can view all logs
CREATE POLICY "Admins can view all logs"
  ON public.logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policy: Service role can insert logs
CREATE POLICY "Service role can insert logs"
  ON public.logs
  FOR INSERT
  WITH CHECK (true);

COMMENT ON TABLE public.logs IS 'General event logging for user actions and system events';

-- ============================================================================
-- 3. SCHEDULE TABLE
-- ============================================================================
-- Stores scheduled content for the calendar feature

CREATE TABLE IF NOT EXISTS public.schedule (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  scheduled_for timestamptz NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'cancelled')),
  post_id uuid REFERENCES public.posts(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_schedule_user_id ON public.schedule(user_id);
CREATE INDEX IF NOT EXISTS idx_schedule_scheduled_for ON public.schedule(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_schedule_status ON public.schedule(status);

-- Enable RLS
ALTER TABLE public.schedule ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can manage their own scheduled content
CREATE POLICY "Users can view their own schedule"
  ON public.schedule
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own schedule"
  ON public.schedule
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own schedule"
  ON public.schedule
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own schedule"
  ON public.schedule
  FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.schedule IS 'Scheduled content for calendar feature';

-- ============================================================================
-- 4. ADD ROLE COLUMN TO PROFILES (if not exists)
-- ============================================================================
-- Add role column to profiles table for admin access control

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'role'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN role text DEFAULT 'user' CHECK (role IN ('user', 'admin'));
    CREATE INDEX idx_profiles_role ON public.profiles(role);
    COMMENT ON COLUMN public.profiles.role IS 'User role: user or admin';
  END IF;
END $$;

-- ============================================================================
-- 5. ANALYTICS VIEWS
-- ============================================================================
-- Create views for easy analytics queries

-- View: User statistics
CREATE OR REPLACE VIEW public.user_stats AS
SELECT
  p.id,
  p.email,
  p.plan,
  p.credits,
  COUNT(DISTINCT po.id) as total_posts,
  COUNT(DISTINCT s.id) as scheduled_posts,
  MAX(po.created_at) as last_post_date,
  p.created_at as user_since
FROM public.profiles p
LEFT JOIN public.posts po ON po.user_id = p.id
LEFT JOIN public.schedule s ON s.user_id = p.id
GROUP BY p.id, p.email, p.plan, p.credits, p.created_at;

COMMENT ON VIEW public.user_stats IS 'Aggregated user statistics for analytics';

-- View: Global statistics (admin only)
CREATE OR REPLACE VIEW public.global_stats AS
SELECT
  COUNT(DISTINCT p.id) as total_users,
  COUNT(DISTINCT CASE WHEN p.plan != 'free' THEN p.id END) as paying_users,
  COUNT(DISTINCT po.id) as total_posts,
  COUNT(DISTINCT s.id) as total_scheduled,
  SUM(p.credits) as total_credits_remaining,
  COUNT(DISTINCT CASE WHEN p.created_at > NOW() - INTERVAL '30 days' THEN p.id END) as users_last_30_days,
  COUNT(DISTINCT CASE WHEN po.created_at > NOW() - INTERVAL '30 days' THEN po.id END) as posts_last_30_days
FROM public.profiles p
LEFT JOIN public.posts po ON po.user_id = p.id
LEFT JOIN public.schedule s ON s.user_id = p.id;

COMMENT ON VIEW public.global_stats IS 'Global platform statistics (admin only)';

-- ============================================================================
-- 6. FUNCTIONS
-- ============================================================================

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-update updated_at on schedule table
DROP TRIGGER IF EXISTS update_schedule_updated_at ON public.schedule;
CREATE TRIGGER update_schedule_updated_at
  BEFORE UPDATE ON public.schedule
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function: Log admin action
CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_action text,
  p_target_user uuid,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid AS $$
DECLARE
  log_id uuid;
BEGIN
  INSERT INTO public.admin_logs (admin_id, action, target_user, metadata)
  VALUES (auth.uid(), p_action, p_target_user, p_metadata)
  RETURNING id INTO log_id;

  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.log_admin_action IS 'Helper function to log administrative actions';

-- Function: Log event
CREATE OR REPLACE FUNCTION public.log_event(
  p_user_id uuid,
  p_type text,
  p_message text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid AS $$
DECLARE
  log_id uuid;
BEGIN
  INSERT INTO public.logs (user_id, type, message, metadata)
  VALUES (p_user_id, p_type, p_message, p_metadata)
  RETURNING id INTO log_id;

  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.log_event IS 'Helper function to log user events';

-- ============================================================================
-- 7. GRANT PERMISSIONS
-- ============================================================================

-- Grant access to authenticated users
GRANT SELECT, INSERT ON public.logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.schedule TO authenticated;
GRANT SELECT ON public.user_stats TO authenticated;

-- Grant admin access
GRANT ALL ON public.admin_logs TO authenticated;
GRANT SELECT ON public.global_stats TO authenticated;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Add migration record
DO $$
BEGIN
  -- Log successful migration
  RAISE NOTICE 'Kolink v0.5/v0.6 expansion migration completed successfully';
END $$;
