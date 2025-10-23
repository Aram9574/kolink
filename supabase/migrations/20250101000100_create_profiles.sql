-- ============================================================================
-- MIGRACIÓN 2: CREAR TABLA PROFILES
-- ============================================================================
-- Fecha: 2025-01-01
-- Descripción: Tabla principal de usuarios con información de perfil, suscripción y gamificación
-- ============================================================================

CREATE TABLE IF NOT EXISTS profiles (
  -- Identificador único (mismo ID que auth.users)
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Información básica
  email TEXT UNIQUE,
  full_name TEXT,

  -- Plan y créditos (sistema de suscripción)
  plan TEXT DEFAULT 'free',
  credits INT DEFAULT 10,

  -- Stripe (pagos)
  stripe_customer_id TEXT UNIQUE,

  -- Rol de usuario
  role TEXT DEFAULT 'user',

  -- LinkedIn integration
  bio TEXT,
  headline TEXT,
  expertise TEXT[] DEFAULT ARRAY[]::TEXT[],
  tone_profile JSONB DEFAULT '{}'::JSONB,
  profile_embedding VECTOR(1536),
  linkedin_access_token TEXT,
  linkedin_refresh_token TEXT,
  linkedin_expires_at TIMESTAMPTZ,
  linkedin_id TEXT,
  linkedin_profile_url TEXT,

  -- Gamificación
  xp INT DEFAULT 0,
  level INT DEFAULT 1,
  streak_days INT DEFAULT 0,
  last_activity_date DATE,
  total_posts INT DEFAULT 0,

  -- Features habilitadas
  features JSONB DEFAULT '{}'::JSONB,

  -- Tracking
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Restricciones de validación
ALTER TABLE profiles ADD CONSTRAINT check_role_valid
  CHECK (role IN ('user', 'admin'));

ALTER TABLE profiles ADD CONSTRAINT check_plan_valid
  CHECK (plan IN ('free', 'basic', 'standard', 'premium', 'pro'));

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_plan ON profiles(plan);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer ON profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_expertise ON profiles USING GIN (expertise);
CREATE INDEX IF NOT EXISTS idx_profiles_tone_profile ON profiles USING GIN (tone_profile);

-- Activar Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad
DO $$
BEGIN
  -- Política: usuarios pueden ver su propio perfil
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Users can view own profile'
    AND tablename = 'profiles'
  ) THEN
    CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);
  END IF;

  -- Política: usuarios pueden actualizar su propio perfil
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Users can update own profile'
    AND tablename = 'profiles'
  ) THEN
    CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);
  END IF;

  -- Política: admins pueden ver todos los perfiles
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Admins can view all profiles'
    AND tablename = 'profiles'
  ) THEN
    CREATE POLICY "Admins can view all profiles"
    ON profiles FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid() AND p.role = 'admin'
      )
    );
  END IF;

  -- Política: admins pueden actualizar todos los perfiles
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Admins can update all profiles'
    AND tablename = 'profiles'
  ) THEN
    CREATE POLICY "Admins can update all profiles"
    ON profiles FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid() AND p.role = 'admin'
      )
    );
  END IF;

  -- Política: system puede insertar perfiles
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'System can insert profiles'
    AND tablename = 'profiles'
  ) THEN
    CREATE POLICY "System can insert profiles"
    ON profiles FOR INSERT
    WITH CHECK (true);
  END IF;
END
$$;

-- Comentarios
COMMENT ON TABLE profiles IS 'Tabla principal de usuarios con información de perfil, suscripción, LinkedIn y gamificación';
COMMENT ON COLUMN profiles.xp IS 'Puntos de experiencia del usuario (sistema de gamificación)';
COMMENT ON COLUMN profiles.level IS 'Nivel del usuario calculado a partir de XP';
COMMENT ON COLUMN profiles.streak_days IS 'Días consecutivos con actividad';

-- Verificación
DO $$
BEGIN
  RAISE NOTICE '✅ Tabla profiles creada correctamente';
END $$;
