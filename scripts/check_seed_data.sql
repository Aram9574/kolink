-- Verificar si hay posts de inspiración en la base de datos

SELECT
  COUNT(*) as total_posts,
  COUNT(DISTINCT platform) as num_platforms,
  COUNT(DISTINCT author) as num_authors
FROM inspiration_posts;

-- Ver los primeros 5 posts si existen
SELECT
  id,
  platform,
  author,
  title,
  created_at
FROM inspiration_posts
ORDER BY created_at DESC
LIMIT 5;
