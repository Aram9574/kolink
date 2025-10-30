-- ============================================================================
-- VERIFICAR ESTADO DE EMBEDDINGS
-- ============================================================================
-- Execute in Supabase SQL Editor to check if embeddings were generated
-- ============================================================================

-- Check total posts and how many have embeddings
SELECT
  COUNT(*) as total_posts,
  COUNT(embedding) as with_embeddings,
  COUNT(*) - COUNT(embedding) as without_embeddings,
  ROUND(100.0 * COUNT(embedding) / COUNT(*), 2) as percentage_complete
FROM inspiration_posts;

-- Should show something like:
-- total_posts: 15
-- with_embeddings: 15 (if successful) or 0 (if not run yet)
-- without_embeddings: 0 (if successful) or 15 (if not run yet)
-- percentage_complete: 100.00 (if successful)

-- ============================================================================
-- See sample of posts with/without embeddings
-- ============================================================================

SELECT
  id,
  title,
  author,
  CASE
    WHEN embedding IS NULL THEN '❌ NO'
    ELSE '✅ YES'
  END as has_embedding,
  CASE
    WHEN embedding IS NOT NULL THEN LEFT(embedding::text, 50) || '...'
    ELSE 'null'
  END as embedding_preview
FROM inspiration_posts
ORDER BY title
LIMIT 10;

-- ============================================================================
