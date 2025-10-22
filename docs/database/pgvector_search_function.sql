-- pgvector Semantic Search Function for Inspiration Posts
-- This function performs cosine similarity search using embeddings
-- Requires pgvector extension to be enabled

-- Create the search function
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
  captured_at timestamptz,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ip.id,
    ip.platform,
    ip.author,
    ip.title,
    ip.content,
    ip.summary,
    ip.tags,
    ip.metrics,
    ip.captured_at,
    1 - (ip.embedding <=> query_embedding) AS similarity
  FROM inspiration_posts ip
  WHERE ip.embedding IS NOT NULL
    AND 1 - (ip.embedding <=> query_embedding) > match_threshold
  ORDER BY ip.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION search_inspiration_posts TO authenticated;
GRANT EXECUTE ON FUNCTION search_inspiration_posts TO anon;

-- Example usage:
-- SELECT * FROM search_inspiration_posts(
--   '[0.1, 0.2, ...]'::vector(1536),
--   0.3,
--   20
-- );

COMMENT ON FUNCTION search_inspiration_posts IS 'Performs semantic similarity search on inspiration posts using pgvector cosine distance';
