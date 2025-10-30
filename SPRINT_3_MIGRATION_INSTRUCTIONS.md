# Sprint 3 - Instrucciones de Migración de Base de Datos

## ⚠️ IMPORTANTE: Ejecutar en Supabase SQL Editor

Las siguientes columnas necesitan ser agregadas a la tabla `profiles` para que las funcionalidades de Sprint 3 funcionen correctamente.

### 📍 Cómo ejecutar

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Navega a **SQL Editor**
3. Crea una nueva query
4. Copia y pega el SQL completo de abajo
5. Haz clic en **Run** o presiona `Cmd/Ctrl + Enter`

---

## 🔧 SQL Migration Script

```sql
-- ============================================================================
-- Sprint 3 Migration: Add required columns to profiles table
-- ============================================================================

-- 1. Add preferred_language column
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'es-ES';

-- 2. Add check constraint for language values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_preferred_language_check'
  ) THEN
    ALTER TABLE profiles
    ADD CONSTRAINT profiles_preferred_language_check
    CHECK (preferred_language IN ('es-ES', 'en-US', 'pt-BR'));
  END IF;
END $$;

-- 3. Add LinkedIn OAuth token columns
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS linkedin_access_token TEXT,
ADD COLUMN IF NOT EXISTS linkedin_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS linkedin_token_expires_at TIMESTAMPTZ;

-- 4. Add notification preferences
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS notification_preferences JSONB
DEFAULT '{
  "email_notifications": true,
  "credit_reminders": true,
  "weekly_summary": true,
  "admin_notifications": true
}'::jsonb;

-- 5. Add analytics enabled flag
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS analytics_enabled BOOLEAN DEFAULT true;

-- 6. Migrate existing language data (if column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles'
    AND column_name = 'language'
  ) THEN
    UPDATE profiles
    SET preferred_language = COALESCE(language, 'es-ES')
    WHERE preferred_language IS NULL OR preferred_language = 'es-ES';
  END IF;
END $$;

-- 7. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_preferred_language
ON profiles(preferred_language);

CREATE INDEX IF NOT EXISTS idx_profiles_linkedin_id
ON profiles(linkedin_id)
WHERE linkedin_id IS NOT NULL;

-- 8. Add comments for documentation
COMMENT ON COLUMN profiles.preferred_language IS 'User preferred language for voice input and AI generation (Sprint 3)';
COMMENT ON COLUMN profiles.linkedin_access_token IS 'LinkedIn OAuth access token (to be encrypted in future)';
COMMENT ON COLUMN profiles.linkedin_refresh_token IS 'LinkedIn OAuth refresh token (to be encrypted in future)';
COMMENT ON COLUMN profiles.linkedin_token_expires_at IS 'Expiration timestamp for LinkedIn access token';
COMMENT ON COLUMN profiles.notification_preferences IS 'User notification settings (Sprint 3)';
COMMENT ON COLUMN profiles.analytics_enabled IS 'Whether user has enabled analytics tracking (Sprint 3)';
```

---

## ✅ Verificación

Después de ejecutar el script, verifica que las columnas se hayan agregado correctamente ejecutando:

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name IN (
  'preferred_language',
  'linkedin_access_token',
  'linkedin_refresh_token',
  'notification_preferences',
  'analytics_enabled'
)
ORDER BY column_name;
```

Deberías ver 5 columnas listadas.

---

## 📊 Columnas Agregadas

| Columna | Tipo | Default | Propósito |
|---------|------|---------|-----------|
| `preferred_language` | TEXT | 'es-ES' | Idioma para voice input y generación IA |
| `linkedin_access_token` | TEXT | NULL | Token de acceso OAuth de LinkedIn |
| `linkedin_refresh_token` | TEXT | NULL | Token de refresco OAuth de LinkedIn |
| `linkedin_token_expires_at` | TIMESTAMPTZ | NULL | Fecha de expiración del token |
| `notification_preferences` | JSONB | {...} | Preferencias de notificaciones del usuario |
| `analytics_enabled` | BOOLEAN | true | Si el usuario tiene analytics habilitado |

---

## 🚀 Después de la Migración

Una vez ejecutado el SQL:

1. El selector de idioma en `/profile` funcionará correctamente
2. Los tokens de LinkedIn se guardarán cuando el usuario conecte su cuenta
3. Las preferencias de notificaciones estarán disponibles
4. El sistema estará listo para integración con PostHog

---

## 🔒 Nota de Seguridad

Los tokens de LinkedIn actualmente se guardan en texto plano. En una futura migración (Task 5 de Sprint 3), estos serán encriptados usando `pgp_sym_encrypt` de pgcrypto.

---

**Fecha:** 27 de Octubre, 2025
**Sprint:** 3
**Tarea:** 1 & 2 - Language Selector & Preparación para OAuth
