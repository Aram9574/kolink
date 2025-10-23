-- ============================================================================
-- KOLINK - SEED DATA (OPCIONAL)
-- ============================================================================
-- Este archivo se ejecuta después de las migraciones si db.seed.enabled = true
-- Se usa principalmente para desarrollo y testing
-- ============================================================================

-- Nota: En producción, el primer usuario admin se crea manualmente
-- Este seed es solo para desarrollo local

-- ============================================================================
-- DATOS DE EJEMPLO PARA TESTING (Solo en desarrollo local)
-- ============================================================================

-- IMPORTANTE: NO ejecutar en producción
-- Estos datos son solo para testing local con `supabase db reset`

DO $$
BEGIN
  RAISE NOTICE '🌱 Seed script ejecutado. No hay datos iniciales configurados.';
  RAISE NOTICE '📝 Para crear el primer admin, usa el dashboard de Supabase después del primer signup.';
END $$;

-- ============================================================================
-- EJEMPLO: Crear usuario admin
-- ============================================================================
-- Descomenta y modifica después del primer signup:

-- UPDATE profiles
-- SET role = 'admin'
-- WHERE email = 'tu_email@example.com';

-- ============================================================================
-- EJEMPLO: Otorgar créditos adicionales para testing
-- ============================================================================

-- UPDATE profiles
-- SET credits = 1000
-- WHERE role = 'admin';

-- ============================================================================
-- EJEMPLO: Crear logro de early adopter para primeros usuarios
-- ============================================================================

-- INSERT INTO user_achievements (user_id, achievement_type, achievement_name, achievement_description, xp_earned, icon)
-- SELECT
--   id,
--   'early_adopter',
--   '🌟 Early Adopter',
--   'Usuario beta de Kolink',
--   200,
--   '🌟'
-- FROM profiles
-- WHERE created_at < NOW() - INTERVAL '30 days'
-- ON CONFLICT (user_id, achievement_type) DO NOTHING;
