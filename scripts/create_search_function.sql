-- ============================================================================
-- CREATE SEMANTIC SEARCH FUNCTION FOR INSPIRATION POSTS
-- ============================================================================
-- This function performs cosine similarity search using pgvector
-- Execute in Supabase SQL Editor
-- ============================================================================

CREATE OR REPLACE FUNCTION search_inspiration_posts(
  query_embedding vector(1536),
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
    1 - (inspiration_posts.embedding <=> query_embedding) as similarity
  FROM inspiration_posts
  WHERE inspiration_posts.embedding IS NOT NULL
    AND 1 - (inspiration_posts.embedding <=> query_embedding) > match_threshold
  ORDER BY inspiration_posts.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION search_inspiration_posts TO anon;
GRANT EXECUTE ON FUNCTION search_inspiration_posts TO authenticated;

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

-- Verify function was created
SELECT
  proname as function_name,
  proowner::regrole as owner,
  prosecdef as security_definer
FROM pg_proc
WHERE proname = 'search_inspiration_posts';

-- ============================================================================
-- TEST (after embeddings are generated)
-- ============================================================================

-- Test semantic search with a random post's embedding
-- SELECT * FROM search_inspiration_posts(
--   (SELECT embedding FROM inspiration_posts WHERE embedding IS NOT NULL LIMIT 1),
--   0.3,
--   5
-- );

-- Expected result: Should return posts similar to the one we selected

-- ============================================================================
-- NOTAS:
-- - <=> es el operador de distancia coseno de pgvector
-- - similarity = 1 - distance (1.0 = idéntico, 0.0 = muy diferente)
-- - match_threshold filtra resultados con baja similitud
-- ============================================================================
