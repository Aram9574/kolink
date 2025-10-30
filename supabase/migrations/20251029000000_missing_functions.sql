
-- ============================================================================
-- MIGRACIONES FALTANTES - Kolink Database
-- Ejecuta este SQL en Supabase Dashboard → SQL Editor
-- ============================================================================

-- 1. Habilitar extensiones (si no están)
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Crear función cleanup_expired_notifications (solo si admin_notifications existe)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'admin_notifications'
  ) THEN
    EXECUTE '
      CREATE OR REPLACE FUNCTION cleanup_expired_notifications()
      RETURNS void AS $func$
      BEGIN
        DELETE FROM admin_notifications
        WHERE expires_at < now();
      END;
      $func$ LANGUAGE plpgsql;
    ';

    COMMENT ON FUNCTION cleanup_expired_notifications() IS 'Deletes expired admin notifications';
  END IF;
END $$;

-- 3. Crear vista user_unread_notifications (solo si admin_notifications existe)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'admin_notifications'
  ) THEN
    CREATE OR REPLACE VIEW user_unread_notifications AS
    SELECT
      user_id,
      COUNT(*) as unread_count
    FROM admin_notifications
    WHERE read = false AND expires_at > now()
    GROUP BY user_id;
  END IF;
END $$;

-- 4. Otorgar permisos (solo si la función existe)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.routines
    WHERE routine_schema = 'public'
    AND routine_name = 'cleanup_expired_notifications'
  ) THEN
    GRANT EXECUTE ON FUNCTION cleanup_expired_notifications() TO authenticated;
    GRANT EXECUTE ON FUNCTION cleanup_expired_notifications() TO service_role;
  END IF;
END $$;

-- Verificación
SELECT 'Migraciones completadas exitosamente!' AS status;
