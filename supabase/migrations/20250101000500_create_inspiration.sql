-- ============================================================================
-- MIGRACIÓN 6: CREAR TABLAS DE INSPIRACIÓN
-- ============================================================================
-- Fecha: 2025-01-01
-- Descripción: inspiration_posts, saved_posts, saved_searches
-- ============================================================================

-- PASO 7: TABLA INSPIRATION_POSTS (HUB DE INSPIRACIÓN)
-- ============================================================================

CREATE TABLE IF NOT EXISTS inspiration_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL,
  author TEXT,
  title TEXT,
  content TEXT NOT NULL,
  summary TEXT,
  metrics JSONB DEFAULT '{}'::JSONB,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  embedding VECTOR(1536),
  source_url TEXT,
  captured_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inspiration_posts_platform ON inspiration_posts(platform);
CREATE INDEX IF NOT EXISTS idx_inspiration_posts_tags ON inspiration_posts USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_inspiration_posts_embedding ON inspiration_posts
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

ALTER TABLE inspiration_posts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Anyone can read inspiration posts'
    AND tablename = 'inspiration_posts'
  ) THEN
    CREATE POLICY "Anyone can read inspiration posts"
    ON inspiration_posts FOR SELECT
    USING (true);
  END IF;
END $$;

-- ============================================================================
-- PASO 8: TABLA SAVED_POSTS (POSTS GUARDADOS POR USUARIOS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS saved_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  inspiration_post_id UUID REFERENCES inspiration_posts(id) ON DELETE SET NULL,
  note TEXT,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_posts_user_id ON saved_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_posts_inspiration_id ON saved_posts(inspiration_post_id);

ALTER TABLE saved_posts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Users manage own saved posts'
    AND tablename = 'saved_posts'
  ) THEN
    CREATE POLICY "Users manage own saved posts"
    ON saved_posts FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================================
-- PASO 9: TABLA SAVED_SEARCHES (BÚSQUEDAS GUARDADAS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_searches_user_id ON saved_searches(user_id);

ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Users manage own saved searches'
    AND tablename = 'saved_searches'
  ) THEN
    CREATE POLICY "Users manage own saved searches"
    ON saved_searches FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================================

-- Verificación
DO $$
BEGIN
  RAISE NOTICE '✅ Migración completada correctamente';
END $$;
