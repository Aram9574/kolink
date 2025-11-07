-- ============================================================================
-- MIGRACIÓN SEGURA: admin_notifications (Idempotente)
-- ============================================================================
-- Esta migración verifica que la tabla existe y solo agrega campos faltantes
-- ============================================================================

-- Crear extensión solo si no existe
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- La tabla ya existe de migración anterior (20250101000400)
-- Solo verificamos y agregamos campos faltantes si es necesario

DO $$
BEGIN
  -- Verificar que la tabla existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'admin_notifications'
  ) THEN
    RAISE EXCEPTION 'La tabla admin_notifications no existe. Ejecutar migración 20250101000400 primero.';
  END IF;

  -- Agregar columna 'title' si no existe (nueva columna de la migración de marzo)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_notifications'
    AND column_name = 'title'
  ) THEN
    ALTER TABLE public.admin_notifications ADD COLUMN title TEXT;
    RAISE NOTICE '✅ Columna "title" agregada a admin_notifications';
  ELSE
    RAISE NOTICE '⚠️  Columna "title" ya existe en admin_notifications';
  END IF;

  -- Renombrar 'message' a 'message' si es necesario (compatibilidad)
  -- La tabla original tiene 'message', la nueva también, así que no hay conflicto

  -- Verificar que RLS está habilitado
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'admin_notifications'
    AND rowsecurity = true
  ) THEN
    ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE '✅ RLS habilitado en admin_notifications';
  END IF;

END $$;

-- Crear índice compuesto si no existe (optimización de la nueva migración)
CREATE INDEX IF NOT EXISTS admin_notifications_user_read_idx
  ON public.admin_notifications (user_id, read, created_at DESC);

-- Las políticas ya existen de la migración anterior, son idénticas

-- Verificación final
DO $$
BEGIN
  RAISE NOTICE '✅ Migración 20250309T120000Z completada (modo seguro/idempotente)';
END $$;
