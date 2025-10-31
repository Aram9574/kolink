-- ============================================================================
-- MIGRACIÓN: FUNCIÓN DE BÚSQUEDA SEMÁNTICA CON PGVECTOR
-- ============================================================================
-- Fecha: 2025-10-30
-- Descripción: Crea función search_inspiration_posts para búsqueda por
--              similitud coseno usando pgvector
-- ============================================================================

-- Drop existing function if exists (con todas las posibles firmas)
DROP FUNCTION IF EXISTS search_inspiration_posts;

-- Asegurar extensión pgvector disponible
CREATE EXTENSION IF NOT EXISTS "vector";

-- Crear función de búsqueda semántica
CREATE OR REPLACE FUNCTION search_inspiration_posts(
  query_embedding extensions.vector(1536),
  match_threshold float DEFAULT 0.3,
  match_count int DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  platform text,
  author text,
  title text,
  content text,
  summary text,
  tags text[],
  metrics jsonb,
  source_url text,
  captured_at timestamptz,
  created_at timestamptz,
  similarity float
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    inspiration_posts.id,
    inspiration_posts.platform,
    inspiration_posts.author,
    inspiration_posts.title,
    inspiration_posts.content,
    inspiration_posts.summary,
    inspiration_posts.tags,
    inspiration_posts.metrics,
    inspiration_posts.source_url,
    inspiration_posts.captured_at,
    inspiration_posts.created_at,
    -- Calcular similitud (1 - distancia coseno)
    -- <=> es el operador de distancia coseno de pgvector
    (1 - (inspiration_posts.embedding <=> query_embedding))::float as similarity
  FROM inspiration_posts
  WHERE inspiration_posts.embedding IS NOT NULL
    AND (1 - (inspiration_posts.embedding <=> query_embedding)) > match_threshold
  ORDER BY inspiration_posts.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Otorgar permisos de ejecución
GRANT EXECUTE ON FUNCTION search_inspiration_posts TO anon;
GRANT EXECUTE ON FUNCTION search_inspiration_posts TO authenticated;
GRANT EXECUTE ON FUNCTION search_inspiration_posts TO service_role;

-- Comentario descriptivo
COMMENT ON FUNCTION search_inspiration_posts IS 'Performs semantic similarity search on inspiration posts using pgvector cosine distance';

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

-- Verificar que la función fue creada
DO $$
DECLARE
  function_exists BOOLEAN;
  function_args INTEGER;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'search_inspiration_posts'
  ) INTO function_exists;

  IF function_exists THEN
    SELECT pronargs INTO function_args
    FROM pg_proc
    WHERE proname = 'search_inspiration_posts'
    LIMIT 1;

    RAISE NOTICE '✅ Función search_inspiration_posts creada exitosamente con % argumentos', function_args;
  ELSE
    RAISE EXCEPTION '❌ Error: Función search_inspiration_posts no fue creada';
  END IF;
END $$;

-- ============================================================================
-- NOTAS DE USO:
-- ============================================================================
--
-- El operador <=> calcula la distancia coseno entre dos vectores
-- similarity = 1 - distance
-- - similarity = 1.0: vectores idénticos
-- - similarity = 0.0: vectores completamente diferentes
-- - match_threshold filtra resultados con baja similitud
--
-- Ejemplo de uso desde API:
--
-- const { data } = await supabase.rpc('search_inspiration_posts', {
--   query_embedding: '[0.1, 0.2, 0.3, ...]', // 1536 dimensiones
--   match_threshold: 0.3,
--   match_count: 20
-- });
--
-- ============================================================================
