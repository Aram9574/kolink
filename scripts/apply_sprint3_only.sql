-- Sprint 3 Migration - Solo las queries necesarias
-- Se ejecutarán una por una para evitar errores

-- 1. Add preferred_language column
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'es-ES';

-- 2. Add check constraint (usando DO block para evitar errores si ya existe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_preferred_language_check'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_preferred_language_check
    CHECK (preferred_language IN ('es-ES', 'en-US', 'pt-BR'));
  END IF;
END $$;

-- 3. Add LinkedIn OAuth columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS linkedin_access_token TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS linkedin_refresh_token TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS linkedin_token_expires_at TIMESTAMPTZ;

-- 4. Add notification preferences
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"email_notifications":true,"credit_reminders":true,"weekly_summary":true,"admin_notifications":true}'::jsonb;

-- 5. Add analytics enabled
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS analytics_enabled BOOLEAN DEFAULT true;

-- 6. Migrate existing language data
UPDATE profiles SET preferred_language = COALESCE(language, 'es-ES') WHERE preferred_language IS NULL;

-- 7. Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_preferred_language ON profiles(preferred_language);
CREATE INDEX IF NOT EXISTS idx_profiles_linkedin_id ON profiles(linkedin_id) WHERE linkedin_id IS NOT NULL;

-- 8. Add comments
COMMENT ON COLUMN profiles.preferred_language IS 'User preferred language for voice input and AI generation';
COMMENT ON COLUMN profiles.linkedin_access_token IS 'LinkedIn OAuth access token (to be encrypted)';
COMMENT ON COLUMN profiles.linkedin_refresh_token IS 'LinkedIn OAuth refresh token (to be encrypted)';
COMMENT ON COLUMN profiles.notification_preferences IS 'User notification settings';
COMMENT ON COLUMN profiles.analytics_enabled IS 'Whether user has enabled analytics tracking';

SELECT 'Sprint 3 migration completed successfully!' AS status;
