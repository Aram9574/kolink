-- ============================================================================
-- MIGRACIÓN 3: CREAR TABLA POSTS
-- ============================================================================
-- Fecha: 2025-01-01
-- Descripción: Tabla para almacenar contenido generado con IA
-- ============================================================================

-- PASO 3: TABLA POSTS (CONTENIDO GENERADO POR IA)
-- ============================================================================
-- Almacena todo el contenido generado con OpenAI

CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Contenido
  prompt TEXT NOT NULL,
  generated_text TEXT NOT NULL,
  content TEXT,

  -- Metadata
  style TEXT,
  hashtags TEXT[] DEFAULT ARRAY[]::TEXT[],
  metadata JSONB DEFAULT '{}'::JSONB,

  -- IA
  embedding VECTOR(1536),
  source_post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  viral_score NUMERIC(5,2),
  cta_suggestions JSONB DEFAULT '[]'::JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_style ON posts(style);
CREATE INDEX IF NOT EXISTS idx_posts_embedding ON posts
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- RLS
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Users can view own posts'
    AND tablename = 'posts'
  ) THEN
    CREATE POLICY "Users can view own posts"
    ON posts FOR SELECT
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Users can insert own posts'
    AND tablename = 'posts'
  ) THEN
    CREATE POLICY "Users can insert own posts"
    ON posts FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Users can update own posts'
    AND tablename = 'posts'
  ) THEN
    CREATE POLICY "Users can update own posts"
    ON posts FOR UPDATE
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Users can delete own posts'
    AND tablename = 'posts'
  ) THEN
    CREATE POLICY "Users can delete own posts"
    ON posts FOR DELETE
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================================

-- Verificación
DO $$
BEGIN
  RAISE NOTICE '✅ Migración completada correctamente';
END $$;
