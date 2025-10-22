-- Phase 6 — Core Schema Upgrades for Kolink PRO
-- Applies enriched profiling, embeddings, inspiration hub, calendar, and analytics tables.

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

------------------------------------------------------------------------------
-- Profile enrichment
------------------------------------------------------------------------------

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS headline TEXT,
  ADD COLUMN IF NOT EXISTS expertise TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS tone_profile JSONB DEFAULT '{}'::JSONB,
  ADD COLUMN IF NOT EXISTS profile_embedding VECTOR(1536),
  ADD COLUMN IF NOT EXISTS linkedin_access_token TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_expires_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '{}'::JSONB;

CREATE INDEX IF NOT EXISTS idx_profiles_expertise ON profiles USING GIN (expertise);
CREATE INDEX IF NOT EXISTS idx_profiles_tone_profile ON profiles USING GIN (tone_profile);

------------------------------------------------------------------------------
-- Posts enrichment
------------------------------------------------------------------------------

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS style TEXT,
  ADD COLUMN IF NOT EXISTS content TEXT,
  ADD COLUMN IF NOT EXISTS hashtags TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::JSONB,
  ADD COLUMN IF NOT EXISTS embedding VECTOR(1536),
  ADD COLUMN IF NOT EXISTS source_post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS viral_score NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS cta_suggestions JSONB DEFAULT '[]'::JSONB;

CREATE INDEX IF NOT EXISTS idx_posts_style ON posts(style);
CREATE INDEX IF NOT EXISTS idx_posts_embedding ON posts USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

------------------------------------------------------------------------------
-- Inspiration Hub
------------------------------------------------------------------------------

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
  captured_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE inspiration_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Anyone can read inspiration posts" ON inspiration_posts
  FOR SELECT USING (true);

CREATE INDEX IF NOT EXISTS idx_inspiration_posts_platform ON inspiration_posts(platform);
CREATE INDEX IF NOT EXISTS idx_inspiration_posts_tags ON inspiration_posts USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_inspiration_posts_embedding ON inspiration_posts USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE TABLE IF NOT EXISTS saved_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  inspiration_post_id UUID REFERENCES inspiration_posts(id) ON DELETE SET NULL,
  note TEXT,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE saved_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Users manage own saved posts" ON saved_posts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Users manage own saved searches" ON saved_searches
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

------------------------------------------------------------------------------
-- Calendar & Scheduling
------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  platforms TEXT[] DEFAULT ARRAY[]::TEXT[],
  ai_score NUMERIC(5,2),
  recommendation_reason JSONB DEFAULT '{}'::JSONB,
  status TEXT DEFAULT 'scheduled',
  external_event_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Users manage own calendar events" ON calendar_events
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_calendar_events_user_time
  ON calendar_events(user_id, scheduled_at);

------------------------------------------------------------------------------
-- Analytics & Forecasting
------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  payload JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Users view own analytics events" ON analytics_events
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "System inserts analytics events" ON analytics_events
  FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_analytics_events_user_type
  ON analytics_events(user_id, event_type);

CREATE TABLE IF NOT EXISTS lead_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lead_profile JSONB NOT NULL,
  score NUMERIC(5,2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE lead_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Users manage own lead insights" ON lead_insights
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

------------------------------------------------------------------------------
-- Analytics Views (placeholders – to be refined)
------------------------------------------------------------------------------

CREATE MATERIALIZED VIEW IF NOT EXISTS vw_post_performance AS
SELECT
  p.user_id,
  p.id AS post_id,
  p.created_at,
  (p.metadata ->> 'impressions')::NUMERIC AS impressions,
  (p.metadata ->> 'clicks')::NUMERIC AS clicks,
  (p.metadata ->> 'conversions')::NUMERIC AS conversions,
  p.viral_score
FROM posts p;

CREATE MATERIALIZED VIEW IF NOT EXISTS vw_user_engagement AS
SELECT
  user_id,
  COUNT(*) AS total_posts,
  AVG(viral_score) AS avg_viral_score,
  MAX(created_at) AS last_post_at
FROM posts
GROUP BY user_id;

COMMENT ON MATERIALIZED VIEW vw_post_performance IS 'Aggregated performance metrics per post';
COMMENT ON MATERIALIZED VIEW vw_user_engagement IS 'Engagement summary per user';

------------------------------------------------------------------------------
-- Refresh helper function
------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION refresh_analytics_materialized_views()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY vw_post_performance;
  REFRESH MATERIALIZED VIEW CONCURRENTLY vw_user_engagement;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper to compute average viral score per user
CREATE OR REPLACE FUNCTION avg_viral_score_for_user(p_user_id UUID)
RETURNS NUMERIC AS $$
  SELECT AVG(viral_score)::NUMERIC
  FROM posts
  WHERE user_id = p_user_id;
$$ LANGUAGE sql STABLE;
