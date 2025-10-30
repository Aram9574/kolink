-- ============================================================================
-- CREATE SEMANTIC SEARCH FUNCTION FOR INSPIRATION POSTS (FIXED)
-- ============================================================================
-- This version drops the existing function first
-- Execute in Supabase SQL Editor
-- ============================================================================

-- Drop existing function if it exists (with all possible signatures)
DROP FUNCTION IF EXISTS search_inspiration_posts(vector, float, int);
DROP FUNCTION IF EXISTS search_inspiration_posts(vector, double precision, integer);
DROP FUNCTION IF EXISTS search_inspiration_posts;

-- Create the function with correct signature
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
  pronargs as num_arguments,
  proowner::regrole as owner
FROM pg_proc
WHERE proname = 'search_inspiration_posts';

-- Should show: function_name | num_arguments | owner

-- ============================================================================
