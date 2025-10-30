-- ============================================================================
-- MIGRACIÓN: FUNCIÓN PARA ACTUALIZAR EMBEDDINGS
-- ============================================================================
-- Fecha: 2025-10-30
-- Descripción: Crea función update_post_embedding con SECURITY DEFINER para
--              permitir actualización de embeddings desde API sin conflictos RLS
-- ============================================================================

-- Drop function if exists (en caso de re-ejecución)
DROP FUNCTION IF EXISTS update_post_embedding(UUID, TEXT);

-- Crear función con SECURITY DEFINER
CREATE OR REPLACE FUNCTION update_post_embedding(
  post_id UUID,
  embedding_vector TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Actualizar el embedding del post
  UPDATE inspiration_posts
  SET embedding = embedding_vector::vector(1536)
  WHERE id = post_id;
END;
$$;

-- Otorgar permisos de ejecución
GRANT EXECUTE ON FUNCTION update_post_embedding TO anon;
GRANT EXECUTE ON FUNCTION update_post_embedding TO authenticated;
GRANT EXECUTE ON FUNCTION update_post_embedding TO service_role;

-- Comentario descriptivo
COMMENT ON FUNCTION update_post_embedding IS 'Updates embedding vector for an inspiration post. Uses SECURITY DEFINER to bypass RLS.';

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

-- Verificar que la función fue creada
DO $$
DECLARE
  function_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'update_post_embedding'
  ) INTO function_exists;

  IF function_exists THEN
    RAISE NOTICE '✅ Función update_post_embedding creada exitosamente';
  ELSE
    RAISE EXCEPTION '❌ Error: Función update_post_embedding no fue creada';
  END IF;
END $$;

-- ============================================================================
