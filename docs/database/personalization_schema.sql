-- =====================================================
-- KOLINK PERSONALIZATION SYSTEM - DATABASE SCHEMA
-- =====================================================
-- Sistema de personalización basado en RAG (Retrieval-Augmented Generation)
-- para generar posts virales de LinkedIn usando el estilo del usuario
-- y ejemplos de contenido viral.
--
-- Stack: Supabase + pgvector + OpenAI (text-embedding-3-small)
-- NOTA: Usando 1536 dimensiones debido a límite de HNSW (máx 2000)
-- =====================================================

-- Habilitar la extensión pgvector para embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- =====================================================
-- 1. TABLA: user_posts
-- =====================================================
-- Almacena los posts históricos del usuario importados de LinkedIn
-- Sirven como base para aprender el estilo y voz del usuario

CREATE TABLE user_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Contenido del post
  content TEXT NOT NULL,

  -- Metadatos del post original
  linkedin_post_id TEXT UNIQUE, -- ID del post en LinkedIn (si está disponible)
  published_at TIMESTAMP WITH TIME ZONE,

  -- Métricas de engagement del post original
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  engagement_rate DECIMAL(5,2), -- (likes + comments + shares) / views * 100

  -- Análisis automático del contenido
  detected_topics TEXT[], -- Temas detectados automáticamente
  detected_intent TEXT, -- 'educativo', 'inspiracional', 'personal', 'promocional'
  word_count INTEGER,

  -- Control de versiones
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Índices para búsqueda eficiente
  CONSTRAINT user_posts_user_id_idx CHECK (user_id IS NOT NULL)
);

-- Índices para optimizar consultas
CREATE INDEX idx_user_posts_user_id ON user_posts(user_id);
CREATE INDEX idx_user_posts_published_at ON user_posts(published_at DESC);
CREATE INDEX idx_user_posts_engagement ON user_posts(engagement_rate DESC NULLS LAST);

-- =====================================================
-- 2. TABLA: user_post_embeddings
-- =====================================================
-- Almacena los embeddings vectoriales de los posts del usuario
-- Usa text-embedding-3-small de OpenAI (dimensión: 1536)

CREATE TABLE user_post_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES user_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Vector embedding (OpenAI text-embedding-3-small: 1536 dimensiones)
  embedding vector(1536) NOT NULL,

  -- Metadatos para contexto
  model_version TEXT DEFAULT 'text-embedding-3-small',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Asegurar un solo embedding por post
  CONSTRAINT unique_post_embedding UNIQUE(post_id)
);

-- Índice HNSW para búsqueda de similitud ultrarrápida
-- HNSW (Hierarchical Navigable Small World) es más rápido que IVFFlat
CREATE INDEX idx_user_embeddings_vector ON user_post_embeddings
  USING hnsw (embedding vector_cosine_ops);

-- Índice para filtrar por usuario
CREATE INDEX idx_user_embeddings_user_id ON user_post_embeddings(user_id);

-- =====================================================
-- 3. TABLA: viral_corpus
-- =====================================================
-- Corpus de posts virales de LinkedIn curados manualmente
-- o scrapeados de influencers y creadores exitosos
-- Sirven como ejemplos de alto engagement para inspiración

CREATE TABLE viral_corpus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Contenido del post viral
  content TEXT NOT NULL,

  -- Metadatos del autor (anónimo para privacidad)
  author_industry TEXT, -- 'tech', 'marketing', 'leadership', etc.
  author_follower_range TEXT, -- '1k-10k', '10k-50k', '50k-100k', '100k+'

  -- Métricas de viralidad
  likes INTEGER NOT NULL,
  comments INTEGER NOT NULL,
  shares INTEGER NOT NULL,
  views INTEGER,
  engagement_rate DECIMAL(5,2) NOT NULL,

  -- Clasificación del contenido
  topics TEXT[] NOT NULL, -- Temas principales
  intent TEXT NOT NULL, -- 'educativo', 'inspiracional', 'storytelling', etc.
  post_format TEXT, -- 'short', 'medium', 'long', 'carousel', 'poll'

  -- Características del contenido
  has_hook BOOLEAN DEFAULT FALSE, -- ¿Tiene un gancho inicial fuerte?
  has_cta BOOLEAN DEFAULT FALSE, -- ¿Tiene llamado a la acción?
  uses_emojis BOOLEAN DEFAULT FALSE,
  uses_hashtags BOOLEAN DEFAULT FALSE,
  word_count INTEGER,

  -- Fecha de publicación original
  published_at TIMESTAMP WITH TIME ZONE,

  -- Control
  source_url TEXT, -- URL del post original (opcional)
  curated_by UUID REFERENCES auth.users(id), -- Admin que curó el post
  is_active BOOLEAN DEFAULT TRUE, -- Para desactivar posts obsoletos
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para filtrado y búsqueda
CREATE INDEX idx_viral_corpus_engagement ON viral_corpus(engagement_rate DESC);
CREATE INDEX idx_viral_corpus_topics ON viral_corpus USING GIN(topics);
CREATE INDEX idx_viral_corpus_intent ON viral_corpus(intent);
CREATE INDEX idx_viral_corpus_active ON viral_corpus(is_active) WHERE is_active = TRUE;

-- =====================================================
-- 4. TABLA: viral_embeddings
-- =====================================================
-- Embeddings vectoriales del corpus viral
-- Misma estructura que user_post_embeddings para consistencia

CREATE TABLE viral_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viral_post_id UUID NOT NULL REFERENCES viral_corpus(id) ON DELETE CASCADE,

  -- Vector embedding (OpenAI text-embedding-3-small: 1536 dimensiones)
  embedding vector(1536) NOT NULL,

  -- Metadatos
  model_version TEXT DEFAULT 'text-embedding-3-small',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Un solo embedding por post viral
  CONSTRAINT unique_viral_embedding UNIQUE(viral_post_id)
);

-- Índice HNSW para búsqueda de similitud
CREATE INDEX idx_viral_embeddings_vector ON viral_embeddings
  USING hnsw (embedding vector_cosine_ops);

-- =====================================================
-- 5. TABLA: generations
-- =====================================================
-- Almacena todos los posts generados por el sistema
-- Incluye variantes A/B para testing y optimización

CREATE TABLE generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Input del usuario
  topic TEXT NOT NULL,
  intent TEXT NOT NULL,
  additional_context TEXT, -- Contexto adicional opcional del usuario

  -- Variantes generadas (A/B testing)
  variant_a TEXT NOT NULL,
  variant_b TEXT NOT NULL,

  -- Metadatos de generación
  model_used TEXT DEFAULT 'gpt-4o', -- Modelo de OpenAI usado
  temperature DECIMAL(3,2) DEFAULT 0.7,

  -- Referencias a ejemplos usados en el prompt (RAG)
  user_examples_used UUID[], -- IDs de user_posts usados
  viral_examples_used UUID[], -- IDs de viral_corpus usados

  -- Tracking de uso
  variant_selected TEXT, -- 'A', 'B', o NULL si no se seleccionó
  was_published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMP WITH TIME ZONE,

  -- Control
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraint para variant_selected
  CONSTRAINT valid_variant CHECK (variant_selected IN ('A', 'B') OR variant_selected IS NULL)
);

-- Índices para consultas de usuario
CREATE INDEX idx_generations_user_id ON generations(user_id);
CREATE INDEX idx_generations_created_at ON generations(created_at DESC);
CREATE INDEX idx_generations_published ON generations(was_published, published_at DESC);

-- =====================================================
-- 6. TABLA: post_metrics
-- =====================================================
-- Almacena métricas de engagement de posts generados
-- que fueron publicados en LinkedIn
-- Permite medir la efectividad del sistema y mejorar con el tiempo

CREATE TABLE post_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id UUID NOT NULL REFERENCES generations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Identificación del post en LinkedIn
  linkedin_post_id TEXT UNIQUE,

  -- Métricas de engagement (actualizables)
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  engagement_rate DECIMAL(5,2),

  -- Tracking temporal de métricas
  metrics_snapshots JSONB DEFAULT '[]'::jsonb, -- Array de snapshots con timestamps

  -- Análisis de comentarios (opcional)
  sentiment_score DECIMAL(3,2), -- -1 (negativo) a +1 (positivo)
  top_keywords TEXT[],

  -- Control
  first_tracked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraint para un solo registro de métricas por generación
  CONSTRAINT unique_generation_metrics UNIQUE(generation_id)
);

-- Índices
CREATE INDEX idx_post_metrics_user_id ON post_metrics(user_id);
CREATE INDEX idx_post_metrics_engagement ON post_metrics(engagement_rate DESC NULLS LAST);
CREATE INDEX idx_post_metrics_linkedin_id ON post_metrics(linkedin_post_id);

-- =====================================================
-- 7. TABLA: rag_cache
-- =====================================================
-- Caché de resultados RAG para optimizar rendimiento
-- Evita recalcular similitudes para queries repetidas

CREATE TABLE rag_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Query hash (MD5 del topic + intent + user_id)
  query_hash TEXT NOT NULL,
  query_embedding vector(1536) NOT NULL,

  -- Resultados cacheados
  top_user_posts UUID[], -- IDs de posts del usuario
  top_viral_posts UUID[], -- IDs de posts virales

  -- Metadatos
  hit_count INTEGER DEFAULT 0, -- Número de veces que se usó este caché
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Índice único para evitar duplicados
  CONSTRAINT unique_query_cache UNIQUE(query_hash)
);

-- Índice para expiración automática
CREATE INDEX idx_rag_cache_expires ON rag_cache(expires_at);
CREATE INDEX idx_rag_cache_user_id ON rag_cache(user_id);

-- =====================================================
-- 8. ROW LEVEL SECURITY (RLS)
-- =====================================================
-- Configuración de seguridad para proteger datos de usuarios

-- Habilitar RLS en todas las tablas de usuario
ALTER TABLE user_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_post_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_cache ENABLE ROW LEVEL SECURITY;

-- Políticas para user_posts
CREATE POLICY "Users can view their own posts"
  ON user_posts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own posts"
  ON user_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts"
  ON user_posts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts"
  ON user_posts FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas para user_post_embeddings
CREATE POLICY "Users can view their own embeddings"
  ON user_post_embeddings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own embeddings"
  ON user_post_embeddings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Políticas para generations
CREATE POLICY "Users can view their own generations"
  ON generations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own generations"
  ON generations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own generations"
  ON generations FOR UPDATE
  USING (auth.uid() = user_id);

-- Políticas para post_metrics
CREATE POLICY "Users can view their own metrics"
  ON post_metrics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own metrics"
  ON post_metrics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own metrics"
  ON post_metrics FOR UPDATE
  USING (auth.uid() = user_id);

-- Políticas para rag_cache
CREATE POLICY "Users can view their own cache"
  ON rag_cache FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cache"
  ON rag_cache FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- El corpus viral es público para lectura
ALTER TABLE viral_corpus ENABLE ROW LEVEL SECURITY;
ALTER TABLE viral_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active viral posts"
  ON viral_corpus FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "Anyone can view viral embeddings"
  ON viral_embeddings FOR SELECT
  USING (TRUE);

-- =====================================================
-- 9. FUNCIONES ÚTILES
-- =====================================================

-- Función para calcular engagement_rate automáticamente
CREATE OR REPLACE FUNCTION calculate_engagement_rate(
  p_likes INTEGER,
  p_comments INTEGER,
  p_shares INTEGER,
  p_views INTEGER
)
RETURNS DECIMAL(5,2) AS $$
BEGIN
  IF p_views IS NULL OR p_views = 0 THEN
    RETURN NULL;
  END IF;

  RETURN ROUND(
    ((p_likes + p_comments + p_shares)::DECIMAL / p_views * 100)::NUMERIC,
    2
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Función para buscar posts similares del usuario
-- Usa similitud coseno con pgvector
CREATE OR REPLACE FUNCTION search_similar_user_posts(
  p_user_id UUID,
  p_query_embedding vector(1536),
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE(
  post_id UUID,
  content TEXT,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    up.id,
    up.content,
    1 - (upe.embedding <=> p_query_embedding) AS similarity
  FROM user_post_embeddings upe
  JOIN user_posts up ON upe.post_id = up.id
  WHERE upe.user_id = p_user_id
  ORDER BY upe.embedding <=> p_query_embedding
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Función para buscar posts virales similares
CREATE OR REPLACE FUNCTION search_similar_viral_posts(
  p_query_embedding vector(1536),
  p_intent TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE(
  viral_id UUID,
  content TEXT,
  similarity FLOAT,
  engagement_rate DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    vc.id,
    vc.content,
    1 - (ve.embedding <=> p_query_embedding) AS similarity,
    vc.engagement_rate
  FROM viral_embeddings ve
  JOIN viral_corpus vc ON ve.viral_post_id = vc.id
  WHERE
    vc.is_active = TRUE
    AND (p_intent IS NULL OR vc.intent = p_intent)
  ORDER BY ve.embedding <=> p_query_embedding
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 10. TRIGGERS
-- =====================================================

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_posts_updated_at
  BEFORE UPDATE ON user_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_viral_corpus_updated_at
  BEFORE UPDATE ON viral_corpus
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para calcular engagement_rate automáticamente en user_posts
CREATE OR REPLACE FUNCTION auto_calculate_user_post_engagement()
RETURNS TRIGGER AS $$
BEGIN
  NEW.engagement_rate := calculate_engagement_rate(
    NEW.likes,
    NEW.comments,
    NEW.shares,
    NEW.views
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_user_post_engagement
  BEFORE INSERT OR UPDATE ON user_posts
  FOR EACH ROW
  EXECUTE FUNCTION auto_calculate_user_post_engagement();

-- Trigger para viral_corpus
CREATE OR REPLACE FUNCTION auto_calculate_viral_engagement()
RETURNS TRIGGER AS $$
BEGIN
  NEW.engagement_rate := calculate_engagement_rate(
    NEW.likes,
    NEW.comments,
    NEW.shares,
    NEW.views
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_viral_engagement
  BEFORE INSERT OR UPDATE ON viral_corpus
  FOR EACH ROW
  EXECUTE FUNCTION auto_calculate_viral_engagement();

-- Trigger para post_metrics
CREATE OR REPLACE FUNCTION auto_calculate_post_metrics_engagement()
RETURNS TRIGGER AS $$
BEGIN
  NEW.engagement_rate := calculate_engagement_rate(
    NEW.likes,
    NEW.comments,
    NEW.shares,
    NEW.views
  );
  NEW.last_updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_post_metrics_engagement
  BEFORE INSERT OR UPDATE ON post_metrics
  FOR EACH ROW
  EXECUTE FUNCTION auto_calculate_post_metrics_engagement();

-- =====================================================
-- 11. LIMPIEZA AUTOMÁTICA (OPCIONAL)
-- =====================================================

-- Función para limpiar caché expirado (ejecutar como cron job)
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM rag_cache
  WHERE expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FIN DEL SCHEMA
-- =====================================================
