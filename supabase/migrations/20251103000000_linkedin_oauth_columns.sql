-- LinkedIn OAuth Columns Migration
-- Agrega columnas necesarias para el nuevo flujo de LinkedIn OAuth

-- Columnas temporales para el flujo de OAuth
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS linkedin_oauth_state TEXT,
ADD COLUMN IF NOT EXISTS linkedin_oauth_started_at TIMESTAMPTZ;

-- Columnas permanentes para datos de LinkedIn
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS linkedin_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS linkedin_access_token TEXT,
ADD COLUMN IF NOT EXISTS linkedin_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS linkedin_token_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS linkedin_profile_data JSONB,
ADD COLUMN IF NOT EXISTS linkedin_connected_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS linkedin_email TEXT,
ADD COLUMN IF NOT EXISTS linkedin_name TEXT,
ADD COLUMN IF NOT EXISTS linkedin_picture TEXT;

-- Índices para mejor performance
CREATE INDEX IF NOT EXISTS idx_profiles_linkedin_id ON profiles(linkedin_id);
CREATE INDEX IF NOT EXISTS idx_profiles_linkedin_oauth_state ON profiles(linkedin_oauth_state);

-- Comentarios para documentación
COMMENT ON COLUMN profiles.linkedin_oauth_state IS 'Estado temporal para CSRF protection durante OAuth (se limpia después de usar)';
COMMENT ON COLUMN profiles.linkedin_oauth_started_at IS 'Timestamp de cuando inició el flujo OAuth (expira después de 10 minutos)';
COMMENT ON COLUMN profiles.linkedin_id IS 'ID único de LinkedIn (sub del perfil)';
COMMENT ON COLUMN profiles.linkedin_access_token IS 'Token de acceso de LinkedIn API';
COMMENT ON COLUMN profiles.linkedin_refresh_token IS 'Token de refresh para renovar access token';
COMMENT ON COLUMN profiles.linkedin_token_expires_at IS 'Fecha de expiración del access token';
COMMENT ON COLUMN profiles.linkedin_profile_data IS 'Datos completos del perfil de LinkedIn en formato JSON';
COMMENT ON COLUMN profiles.linkedin_connected_at IS 'Fecha de cuando se conectó LinkedIn por primera vez';
COMMENT ON COLUMN profiles.linkedin_email IS 'Email de LinkedIn (puede diferir del email de registro)';
COMMENT ON COLUMN profiles.linkedin_name IS 'Nombre completo desde LinkedIn';
COMMENT ON COLUMN profiles.linkedin_picture IS 'URL de la foto de perfil de LinkedIn';
