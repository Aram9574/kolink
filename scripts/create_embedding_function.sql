-- ============================================================================
-- CREATE FUNCTION TO UPDATE POST EMBEDDINGS
-- ============================================================================
-- This function allows updating embeddings bypassing RLS
-- Execute in Supabase SQL Editor
-- ============================================================================

CREATE OR REPLACE FUNCTION update_post_embedding(
  post_id UUID,
  embedding_vector TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE inspiration_posts
  SET embedding = embedding_vector::vector(1536)
  WHERE id = post_id;
END;
$$;

-- Grant execute permission to anon role (for API access)
GRANT EXECUTE ON FUNCTION update_post_embedding TO anon;
GRANT EXECUTE ON FUNCTION update_post_embedding TO authenticated;

-- Verify function was created
SELECT proname, proowner::regrole, prosecdef
FROM pg_proc
WHERE proname = 'update_post_embedding';

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

-- Test the function (optional - comentar si no quieres probar)
-- SELECT update_post_embedding(
--   (SELECT id FROM inspiration_posts LIMIT 1),
--   '[0.1, 0.2, 0.3, ...]'  -- 1536 dimensions required
-- );

-- ============================================================================
-- NOTA: Esta función permite actualizar embeddings incluso con RLS activo
-- ============================================================================
