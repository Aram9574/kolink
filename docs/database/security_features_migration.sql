-- ============================================================================
-- KOLINK SECURITY FEATURES MIGRATION
-- Version: 1.0
-- Description: Comprehensive security features including 2FA, password recovery,
--              session management, and encryption
-- ============================================================================

-- ============================================================================
-- 1. TWO-FACTOR AUTHENTICATION (2FA)
-- ============================================================================

-- Table: user_2fa_settings
-- Stores 2FA configuration for users
CREATE TABLE IF NOT EXISTS user_2fa_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT FALSE,
  secret TEXT NOT NULL, -- Encrypted TOTP secret
  backup_codes TEXT[], -- Array of hashed backup codes
  method TEXT DEFAULT 'totp' CHECK (method IN ('totp', 'sms', 'email')),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Table: user_2fa_attempts
-- Track 2FA verification attempts for security monitoring
CREATE TABLE IF NOT EXISTS user_2fa_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  success BOOLEAN NOT NULL,
  ip_address INET,
  user_agent TEXT,
  attempted_at TIMESTAMPTZ DEFAULT NOW(),
  failure_reason TEXT
);

-- Index for 2FA lookups
CREATE INDEX IF NOT EXISTS idx_2fa_settings_user_id ON user_2fa_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_2fa_attempts_user_id ON user_2fa_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_2fa_attempts_attempted_at ON user_2fa_attempts(attempted_at DESC);

-- RLS Policies for 2FA settings
ALTER TABLE user_2fa_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own 2FA settings"
  ON user_2fa_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own 2FA settings"
  ON user_2fa_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own 2FA settings"
  ON user_2fa_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for 2FA attempts
ALTER TABLE user_2fa_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own 2FA attempts"
  ON user_2fa_attempts FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================================
-- 2. PASSWORD RECOVERY WITH TOKEN EXPIRATION
-- ============================================================================

-- Table: password_reset_tokens
-- Secure password reset tokens with expiration
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL, -- Hashed token for security
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(token_hash)
);

-- Index for token lookups
CREATE INDEX IF NOT EXISTS idx_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_reset_tokens_expires_at ON password_reset_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_reset_tokens_token_hash ON password_reset_tokens(token_hash);

-- Function: Clean up expired tokens (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_reset_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM password_reset_tokens
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies for password reset tokens (admin only)
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage reset tokens"
  ON password_reset_tokens FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- 3. SESSION MANAGEMENT AND TRACKING
-- ============================================================================

-- Table: user_sessions
-- Track active sessions across devices
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL,
  device_info JSONB, -- {device_type, os, browser}
  ip_address INET,
  user_agent TEXT,
  location JSONB, -- {country, city} from IP geolocation
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  UNIQUE(session_token)
);

-- Table: login_history
-- Comprehensive login audit trail
CREATE TABLE IF NOT EXISTS login_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  success BOOLEAN NOT NULL,
  ip_address INET,
  user_agent TEXT,
  device_info JSONB,
  location JSONB,
  failure_reason TEXT,
  attempted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for session management
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_last_activity ON user_sessions(last_activity DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_login_history_attempted_at ON login_history(attempted_at DESC);

-- Function: Get active sessions for a user
CREATE OR REPLACE FUNCTION get_active_sessions(p_user_id UUID)
RETURNS TABLE (
  session_id UUID,
  device_info JSONB,
  ip_address INET,
  location JSONB,
  last_activity TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  is_current BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    us.id,
    us.device_info,
    us.ip_address,
    us.location,
    us.last_activity,
    us.created_at,
    (us.session_token = current_setting('request.jwt.claims', true)::json->>'session_id')::BOOLEAN as is_current
  FROM user_sessions us
  WHERE us.user_id = p_user_id
    AND us.expires_at > NOW()
    AND us.revoked_at IS NULL
  ORDER BY us.last_activity DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Revoke a session
CREATE OR REPLACE FUNCTION revoke_session(p_session_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE user_sessions
  SET revoked_at = NOW()
  WHERE id = p_session_id
    AND user_id = p_user_id
    AND revoked_at IS NULL;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies for sessions
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions"
  ON user_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON user_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for login history
ALTER TABLE login_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own login history"
  ON login_history FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================================
-- 4. PASSWORD STRENGTH AND VALIDATION
-- ============================================================================

-- Table: password_policies
-- Configurable password policies
CREATE TABLE IF NOT EXISTS password_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  min_length INTEGER DEFAULT 8,
  require_uppercase BOOLEAN DEFAULT TRUE,
  require_lowercase BOOLEAN DEFAULT TRUE,
  require_numbers BOOLEAN DEFAULT TRUE,
  require_special_chars BOOLEAN DEFAULT TRUE,
  prevent_common_passwords BOOLEAN DEFAULT TRUE,
  password_history_count INTEGER DEFAULT 5, -- Prevent reuse of last N passwords
  max_age_days INTEGER DEFAULT 90, -- Force password change after N days
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default password policy
INSERT INTO password_policies (id, min_length, require_uppercase, require_lowercase, require_numbers, require_special_chars)
VALUES (gen_random_uuid(), 8, TRUE, TRUE, TRUE, TRUE)
ON CONFLICT DO NOTHING;

-- Table: password_history
-- Track password hashes to prevent reuse
CREATE TABLE IF NOT EXISTS password_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_history_user_id ON password_history(user_id);
CREATE INDEX IF NOT EXISTS idx_password_history_created_at ON password_history(created_at DESC);

-- RLS Policies for password history (service role only)
ALTER TABLE password_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage password history"
  ON password_history FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- 5. SECURITY ALERTS AND NOTIFICATIONS
-- ============================================================================

-- Table: security_alerts
-- Track security events and send notifications
CREATE TABLE IF NOT EXISTS security_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('new_device', 'new_location', 'password_change', 'password_reset_requested', '2fa_enabled', '2fa_disabled', 'suspicious_activity', 'multiple_failed_logins')),
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB,
  read_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_alerts_user_id ON security_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_security_alerts_created_at ON security_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_alerts_read_at ON security_alerts(read_at);

-- RLS Policies for security alerts
ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own security alerts"
  ON security_alerts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own security alerts"
  ON security_alerts FOR UPDATE
  USING (auth.uid() = user_id);

-- Function: Create security alert
CREATE OR REPLACE FUNCTION create_security_alert(
  p_user_id UUID,
  p_alert_type TEXT,
  p_severity TEXT,
  p_title TEXT,
  p_message TEXT,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_alert_id UUID;
BEGIN
  INSERT INTO security_alerts (user_id, alert_type, severity, title, message, metadata)
  VALUES (p_user_id, p_alert_type, p_severity, p_title, p_message, p_metadata)
  RETURNING id INTO v_alert_id;

  RETURN v_alert_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. DATA ENCRYPTION METADATA
-- ============================================================================

-- Table: encryption_keys (for tracking encrypted fields)
CREATE TABLE IF NOT EXISTS encryption_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  column_name TEXT NOT NULL,
  encryption_algorithm TEXT DEFAULT 'AES-256-GCM',
  key_version INTEGER DEFAULT 1,
  last_rotated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(table_name, column_name)
);

-- Track which fields are encrypted
INSERT INTO encryption_metadata (table_name, column_name, encryption_algorithm)
VALUES
  ('user_2fa_settings', 'secret', 'AES-256-GCM'),
  ('password_reset_tokens', 'token_hash', 'SHA-256'),
  ('profiles', 'email', 'AES-256-GCM')
ON CONFLICT (table_name, column_name) DO NOTHING;

-- ============================================================================
-- 7. SECURITY MONITORING AND METRICS
-- ============================================================================

-- Table: security_metrics
-- Daily aggregated security metrics
CREATE TABLE IF NOT EXISTS security_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date DATE NOT NULL,
  total_logins INTEGER DEFAULT 0,
  failed_logins INTEGER DEFAULT 0,
  successful_2fa INTEGER DEFAULT 0,
  failed_2fa INTEGER DEFAULT 0,
  password_resets INTEGER DEFAULT 0,
  new_sessions INTEGER DEFAULT 0,
  revoked_sessions INTEGER DEFAULT 0,
  security_alerts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(metric_date)
);

CREATE INDEX IF NOT EXISTS idx_security_metrics_date ON security_metrics(metric_date DESC);

-- ============================================================================
-- 8. TRIGGERS FOR AUTOMATIC SECURITY ACTIONS
-- ============================================================================

-- Trigger: Auto-create security alert on suspicious login
CREATE OR REPLACE FUNCTION trigger_suspicious_login_alert()
RETURNS TRIGGER AS $$
DECLARE
  v_recent_failures INTEGER;
  v_user_email TEXT;
BEGIN
  -- Count recent failed attempts (last 10 minutes)
  SELECT COUNT(*) INTO v_recent_failures
  FROM login_history
  WHERE user_id = NEW.user_id
    AND success = FALSE
    AND attempted_at > NOW() - INTERVAL '10 minutes';

  -- If 3 or more failures in 10 minutes, create alert
  IF v_recent_failures >= 3 AND NEW.success = TRUE THEN
    SELECT email INTO v_user_email FROM auth.users WHERE id = NEW.user_id;

    PERFORM create_security_alert(
      NEW.user_id,
      'multiple_failed_logins',
      'high',
      'Múltiples intentos de inicio de sesión fallidos',
      'Detectamos ' || v_recent_failures || ' intentos fallidos antes de un inicio de sesión exitoso desde ' || COALESCE(HOST(NEW.ip_address), 'dirección desconocida'),
      jsonb_build_object('failed_attempts', v_recent_failures, 'ip_address', NEW.ip_address)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_login_security_check
  AFTER INSERT ON login_history
  FOR EACH ROW
  EXECUTE FUNCTION trigger_suspicious_login_alert();

-- Trigger: Update session last_activity
CREATE OR REPLACE FUNCTION update_session_activity()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_activity = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_session_activity
  BEFORE UPDATE ON user_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_session_activity();

-- ============================================================================
-- 9. CLEANUP AND MAINTENANCE FUNCTIONS
-- ============================================================================

-- Function: Cleanup expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM user_sessions
  WHERE expires_at < NOW()
    OR (revoked_at IS NOT NULL AND revoked_at < NOW() - INTERVAL '30 days');

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Cleanup old login history (keep last 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_login_history()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM login_history
  WHERE attempted_at < NOW() - INTERVAL '90 days';

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Cleanup old 2FA attempts (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_2fa_attempts()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM user_2fa_attempts
  WHERE attempted_at < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 10. HELPER FUNCTIONS FOR APPLICATION
-- ============================================================================

-- Function: Check if user has 2FA enabled
CREATE OR REPLACE FUNCTION user_has_2fa_enabled(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_enabled BOOLEAN;
BEGIN
  SELECT enabled INTO v_enabled
  FROM user_2fa_settings
  WHERE user_id = p_user_id;

  RETURN COALESCE(v_enabled, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get unread security alerts count
CREATE OR REPLACE FUNCTION get_unread_security_alerts_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM security_alerts
  WHERE user_id = p_user_id
    AND read_at IS NULL;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GRANTS AND PERMISSIONS
-- ============================================================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_active_sessions(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION revoke_session(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION user_has_2fa_enabled(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_unread_security_alerts_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_security_alert(UUID, TEXT, TEXT, TEXT, TEXT, JSONB) TO service_role;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE '✅ Security features migration completed successfully';
  RAISE NOTICE '   - Two-Factor Authentication tables created';
  RAISE NOTICE '   - Password recovery system initialized';
  RAISE NOTICE '   - Session management enabled';
  RAISE NOTICE '   - Security alerts system ready';
  RAISE NOTICE '   - Encryption metadata tracked';
  RAISE NOTICE '   - Automatic security triggers active';
END $$;
