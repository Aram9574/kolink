-- ============================================================================
-- MIGRACIÓN 13: TRIGGER AUTOMÁTICO PARA CREAR PERFILES (OAuth + Email)
-- ============================================================================
-- Fecha: 2025-01-01
-- Descripción: Crea automáticamente un perfil cuando un usuario se registra
--              mediante cualquier método (email, LinkedIn OAuth, etc.)
-- ============================================================================

-- Función para crear perfil automáticamente
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_email TEXT;
  user_full_name TEXT;
BEGIN
  -- Obtener email del nuevo usuario
  user_email := NEW.email;

  -- Intentar obtener nombre completo desde metadata
  user_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    SPLIT_PART(user_email, '@', 1)
  );

  -- Insertar perfil solo si no existe
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    plan,
    credits,
    role,
    xp,
    level,
    streak_days,
    total_posts,
    features,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    user_email,
    user_full_name,
    'free',
    10,
    'user',
    0,
    1,
    0,
    0,
    '{}'::JSONB,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  -- Si el usuario viene de LinkedIn OAuth, actualizar datos adicionales
  IF NEW.raw_user_meta_data ? 'provider' AND
     NEW.raw_user_meta_data->>'provider' = 'linkedin_oidc' THEN

    UPDATE public.profiles
    SET
      linkedin_id = NEW.raw_user_meta_data->>'sub',
      headline = NEW.raw_user_meta_data->>'headline',
      bio = NEW.raw_user_meta_data->>'summary',
      linkedin_profile_url = NEW.raw_user_meta_data->>'profile_url',
      updated_at = NOW()
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger en auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Comentarios
COMMENT ON FUNCTION handle_new_user() IS
  'Crea automáticamente un perfil en la tabla profiles cuando un usuario se registra vía email o OAuth';

-- Verificación
DO $$
BEGIN
  RAISE NOTICE '✅ Trigger de creación automática de perfiles configurado correctamente';
  RAISE NOTICE '   - Los nuevos usuarios (email + OAuth) tendrán perfil automático';
  RAISE NOTICE '   - Plan inicial: free con 10 créditos';
END $$;
