-- ============================================================================
-- KOLINK COMPLETE SYSTEM MIGRATION
-- Date: 2025-10-31
-- Description: Complete database schema for all features
-- ============================================================================

-- ============================================================================
-- 1. ENHANCED PROFILES TABLE
-- ============================================================================

-- Add LinkedIn integration columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS linkedin_id VARCHAR(255) UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS linkedin_access_token TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS linkedin_refresh_token TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS linkedin_token_expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS linkedin_profile_data JSONB DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS linkedin_connected_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(10) DEFAULT 'es-ES';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS timezone VARCHAR(100) DEFAULT 'America/Mexico_City';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS writing_style_profile JSONB DEFAULT '{}';

-- Create index for LinkedIn lookups
CREATE INDEX IF NOT EXISTS idx_profiles_linkedin_id ON profiles(linkedin_id);

-- ============================================================================
-- 2. USER BEHAVIOR TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_behaviors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  behavior_type VARCHAR(50) NOT NULL, -- 'post_created', 'post_edited', 'post_deleted', 'post_scheduled', 'search_performed', 'feedback_given', 'content_liked', 'content_shared'
  context JSONB DEFAULT '{}', -- Stores additional context about the behavior
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for behavior tracking
CREATE INDEX IF NOT EXISTS idx_user_behaviors_user_id ON user_behaviors(user_id);
CREATE INDEX IF NOT EXISTS idx_user_behaviors_type ON user_behaviors(behavior_type);
CREATE INDEX IF NOT EXISTS idx_user_behaviors_created_at ON user_behaviors(created_at DESC);

-- ============================================================================
-- 3. ENHANCED POSTS TABLE
-- ============================================================================

-- Add learning and tracking columns to posts
ALTER TABLE posts ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS linkedin_post_id VARCHAR(255);
ALTER TABLE posts ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'draft'; -- 'draft', 'scheduled', 'published', 'archived'
ALTER TABLE posts ADD COLUMN IF NOT EXISTS tone VARCHAR(50) DEFAULT 'professional';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS formality INTEGER DEFAULT 50; -- 0-100 scale
ALTER TABLE posts ADD COLUMN IF NOT EXISTS length_target INTEGER DEFAULT 200; -- target word count
ALTER TABLE posts ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS linkedin_metrics JSONB DEFAULT '{}'; -- likes, comments, shares, impressions
ALTER TABLE posts ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE;
-- Note: embedding vector field will be added in a separate migration after pgvector is enabled

-- Indexes for posts
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_scheduled_at ON posts(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_linkedin_post_id ON posts(linkedin_post_id);

-- ============================================================================
-- 4. USER WRITING SAMPLES (for AI learning)
-- ============================================================================

CREATE TABLE IF NOT EXISTS writing_samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  source VARCHAR(50) NOT NULL, -- 'linkedin', 'manual_input', 'edited_post', 'approved_generation'
  language VARCHAR(10),
  tone VARCHAR(50),
  detected_style JSONB DEFAULT '{}', -- vocabulary, sentence_structure, punctuation_patterns, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for writing samples
CREATE INDEX IF NOT EXISTS idx_writing_samples_user_id ON writing_samples(user_id);
CREATE INDEX IF NOT EXISTS idx_writing_samples_source ON writing_samples(source);

-- ============================================================================
-- 5. USER PREFERENCES & LEARNING
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  preference_type VARCHAR(100) NOT NULL, -- 'content_topic', 'writing_style', 'posting_time', 'hashtag_preference', 'tone_preference'
  preference_value TEXT NOT NULL,
  confidence_score DECIMAL(3,2) DEFAULT 0.5, -- 0.0 to 1.0 - how confident we are about this preference
  learned_from VARCHAR(50), -- 'behavior', 'explicit', 'linkedin_profile', 'feedback'
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, preference_type, preference_value)
);

-- Indexes for preferences
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_type ON user_preferences(preference_type);
CREATE INDEX IF NOT EXISTS idx_user_preferences_confidence ON user_preferences(confidence_score DESC);

-- ============================================================================
-- 6. CONTENT FEEDBACK (for AI improvement)
-- ============================================================================

CREATE TABLE IF NOT EXISTS content_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  feedback_type VARCHAR(50) NOT NULL, -- 'liked', 'edited', 'rejected', 'rating', 'comment'
  feedback_value TEXT, -- For comments or specific feedback
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  before_text TEXT, -- Original generated text
  after_text TEXT, -- User's edited version
  edits_analysis JSONB DEFAULT '{}', -- Analysis of what changed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for feedback
CREATE INDEX IF NOT EXISTS idx_content_feedback_user_id ON content_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_content_feedback_post_id ON content_feedback(post_id);
CREATE INDEX IF NOT EXISTS idx_content_feedback_type ON content_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_content_feedback_created_at ON content_feedback(created_at DESC);

-- ============================================================================
-- 7. LINKEDIN VIRAL CONTENT LIBRARY
-- ============================================================================

CREATE TABLE IF NOT EXISTS viral_content_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  author_profile JSONB DEFAULT '{}', -- Name, title, industry, follower count
  metrics JSONB NOT NULL, -- likes, comments, shares, impressions, engagement_rate
  viral_score DECIMAL(10,2), -- Calculated viral score
  post_type VARCHAR(50), -- 'article', 'image', 'video', 'carousel', 'poll', 'text'
  topics TEXT[] DEFAULT '{}',
  hashtags TEXT[] DEFAULT '{}',
  language VARCHAR(10),
  industry VARCHAR(100),
  detected_patterns JSONB DEFAULT '{}', -- Hook patterns, CTA patterns, structure patterns
  scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  linkedin_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for viral content
CREATE INDEX IF NOT EXISTS idx_viral_content_viral_score ON viral_content_library(viral_score DESC);
CREATE INDEX IF NOT EXISTS idx_viral_content_language ON viral_content_library(language);
CREATE INDEX IF NOT EXISTS idx_viral_content_industry ON viral_content_library(industry);

-- ============================================================================
-- 8. AI GENERATION HISTORY (detailed tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS generation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  system_prompt TEXT,
  model_used VARCHAR(50) DEFAULT 'gpt-4o-mini',
  temperature DECIMAL(3,2),
  max_tokens INTEGER,
  context_used JSONB DEFAULT '{}', -- What context was used: writing_samples, preferences, viral_patterns
  generated_text TEXT NOT NULL,
  tokens_used INTEGER,
  generation_time_ms INTEGER,
  user_accepted BOOLEAN,
  user_feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for generation history
CREATE INDEX IF NOT EXISTS idx_generation_history_user_id ON generation_history(user_id);
CREATE INDEX IF NOT EXISTS idx_generation_history_post_id ON generation_history(post_id);
CREATE INDEX IF NOT EXISTS idx_generation_history_created_at ON generation_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generation_history_user_accepted ON generation_history(user_accepted);

-- ============================================================================
-- 9. SCHEDULED POSTS QUEUE
-- ============================================================================

CREATE TABLE IF NOT EXISTS post_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  timezone VARCHAR(100),
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'published', 'failed', 'cancelled'
  retry_count INTEGER DEFAULT 0,
  last_error TEXT,
  published_at TIMESTAMP WITH TIME ZONE,
  linkedin_post_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for post queue
CREATE INDEX IF NOT EXISTS idx_post_queue_user_id ON post_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_post_queue_status ON post_queue(status);
CREATE INDEX IF NOT EXISTS idx_post_queue_scheduled_for ON post_queue(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_post_queue_created_at ON post_queue(created_at DESC);

-- ============================================================================
-- 10. OPTIMAL POSTING TIMES (AI-learned per user)
-- ============================================================================

CREATE TABLE IF NOT EXISTS optimal_posting_times (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Sunday, 6 = Saturday
  hour_of_day INTEGER NOT NULL CHECK (hour_of_day >= 0 AND hour_of_day <= 23),
  timezone VARCHAR(100),
  average_engagement_rate DECIMAL(5,2),
  post_count INTEGER DEFAULT 0,
  confidence_score DECIMAL(3,2) DEFAULT 0.5,
  last_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, day_of_week, hour_of_day)
);

-- Indexes for optimal posting times
CREATE INDEX IF NOT EXISTS idx_optimal_posting_times_user_id ON optimal_posting_times(user_id);
CREATE INDEX IF NOT EXISTS idx_optimal_posting_times_engagement ON optimal_posting_times(average_engagement_rate DESC);
CREATE INDEX IF NOT EXISTS idx_optimal_posting_times_confidence ON optimal_posting_times(confidence_score DESC);

-- ============================================================================
-- 11. RLS POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE user_behaviors ENABLE ROW LEVEL SECURITY;
ALTER TABLE writing_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE viral_content_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE optimal_posting_times ENABLE ROW LEVEL SECURITY;

-- User Behaviors Policies
CREATE POLICY "Users can view their own behaviors" ON user_behaviors
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own behaviors" ON user_behaviors
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Writing Samples Policies
CREATE POLICY "Users can view their own writing samples" ON writing_samples
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own writing samples" ON writing_samples
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own writing samples" ON writing_samples
  FOR DELETE USING (auth.uid() = user_id);

-- User Preferences Policies
CREATE POLICY "Users can view their own preferences" ON user_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own preferences" ON user_preferences
  FOR ALL USING (auth.uid() = user_id);

-- Content Feedback Policies
CREATE POLICY "Users can view their own feedback" ON content_feedback
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create feedback" ON content_feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Viral Content Library (Public read for learning)
CREATE POLICY "Everyone can view viral content" ON viral_content_library
  FOR SELECT USING (true);

-- Generation History Policies
CREATE POLICY "Users can view their own generation history" ON generation_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert generation history" ON generation_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Post Queue Policies
CREATE POLICY "Users can view their own post queue" ON post_queue
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own post queue" ON post_queue
  FOR ALL USING (auth.uid() = user_id);

-- Optimal Posting Times Policies
CREATE POLICY "Users can view their own optimal times" ON optimal_posting_times
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own optimal times" ON optimal_posting_times
  FOR ALL USING (auth.uid() = user_id);

-- Posts table policies (update existing)
DROP POLICY IF EXISTS "Users can view their own posts" ON posts;
DROP POLICY IF EXISTS "Users can insert their own posts" ON posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON posts;

CREATE POLICY "Users can view their own posts" ON posts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own posts" ON posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts" ON posts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts" ON posts
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- 12. HELPER FUNCTIONS
-- ============================================================================

-- Function to calculate viral score
CREATE OR REPLACE FUNCTION calculate_viral_score(
  p_likes INTEGER,
  p_comments INTEGER,
  p_shares INTEGER,
  p_impressions INTEGER
)
RETURNS DECIMAL(10,2) AS $$
DECLARE
  engagement_rate DECIMAL(5,2);
  viral_score DECIMAL(10,2);
BEGIN
  -- Avoid division by zero
  IF p_impressions = 0 OR p_impressions IS NULL THEN
    engagement_rate := 0;
  ELSE
    engagement_rate := ((p_likes + p_comments * 2 + p_shares * 3)::DECIMAL / p_impressions) * 100;
  END IF;

  -- Calculate viral score (weighted engagement)
  viral_score := (p_likes * 1) + (p_comments * 5) + (p_shares * 10) + (engagement_rate * 100);

  RETURN viral_score;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get user's writing style profile
CREATE OR REPLACE FUNCTION get_user_writing_style(user_uuid UUID)
RETURNS JSONB AS $$
DECLARE
  style_profile JSONB;
BEGIN
  SELECT jsonb_build_object(
    'sample_count', COUNT(*),
    'common_tones', jsonb_agg(DISTINCT tone),
    'languages', jsonb_agg(DISTINCT language),
    'avg_length', AVG(LENGTH(content)),
    'last_updated', MAX(created_at)
  )
  INTO style_profile
  FROM writing_samples
  WHERE user_id = user_uuid;

  RETURN COALESCE(style_profile, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to track user behavior
CREATE OR REPLACE FUNCTION track_behavior(
  p_user_id UUID,
  p_behavior_type VARCHAR(50),
  p_context JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  behavior_id UUID;
BEGIN
  INSERT INTO user_behaviors (user_id, behavior_type, context)
  VALUES (p_user_id, p_behavior_type, p_context)
  RETURNING id INTO behavior_id;

  RETURN behavior_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update writing style profile in profiles table
CREATE OR REPLACE FUNCTION update_writing_style_profile()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET writing_style_profile = get_user_writing_style(NEW.user_id)
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update writing style profile
DROP TRIGGER IF EXISTS update_writing_style_on_sample ON writing_samples;
CREATE TRIGGER update_writing_style_on_sample
  AFTER INSERT OR UPDATE ON writing_samples
  FOR EACH ROW
  EXECUTE FUNCTION update_writing_style_profile();

-- Function to get optimal posting time suggestions
CREATE OR REPLACE FUNCTION get_optimal_posting_times(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  day_of_week INTEGER,
  hour_of_day INTEGER,
  engagement_rate DECIMAL(10,2),
  confidence DECIMAL(3,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    opt.day_of_week,
    opt.hour_of_day,
    opt.average_engagement_rate,
    opt.confidence_score
  FROM optimal_posting_times opt
  WHERE opt.user_id = p_user_id
    AND opt.confidence_score > 0.3
  ORDER BY opt.average_engagement_rate DESC, opt.confidence_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 13. TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_post_queue_updated_at ON post_queue;
CREATE TRIGGER update_post_queue_updated_at BEFORE UPDATE ON post_queue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-track post status changes
CREATE OR REPLACE FUNCTION track_post_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status != OLD.status THEN
    PERFORM track_behavior(
      NEW.user_id,
      'post_status_changed',
      jsonb_build_object(
        'post_id', NEW.id,
        'old_status', OLD.status,
        'new_status', NEW.status
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS track_post_status ON posts;
CREATE TRIGGER track_post_status AFTER UPDATE ON posts
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION track_post_status_change();

-- ============================================================================
-- 14. INITIAL DATA SETUP
-- ============================================================================

-- Insert some viral content patterns for learning (examples)
INSERT INTO viral_content_library (content, metrics, viral_score, post_type, topics, hashtags, language, industry, detected_patterns) VALUES
  (
    'The 3 mistakes I made that cost me $100K 🧵\n\n1. Not validating my idea\n2. Hiring too fast\n3. Ignoring customer feedback\n\nHere''s what I learned...',
    '{"likes": 2500, "comments": 180, "shares": 450, "impressions": 50000}'::jsonb,
    5830.00,
    'text',
    ARRAY['entrepreneurship', 'lessons', 'mistakes'],
    ARRAY['startup', 'entrepreneur', 'business'],
    'en',
    'Technology',
    '{"hook_pattern": "mistake_list", "has_thread": true, "personal_story": true, "specific_numbers": true}'::jsonb
  ),
  (
    'Pasé 5 años construyendo mi marca personal en LinkedIn.\n\nEstos son los 7 principios que me ayudaron a conseguir +50K seguidores:\n\n1. Consistencia > Perfección\n2. Historias > Teoría\n...',
    '{"likes": 1800, "comments": 120, "shares": 320, "impressions": 35000}'::jsonb,
    4260.00,
    'text',
    ARRAY['linkedin', 'personal_branding', 'social_media'],
    ARRAY['linkedin', 'marca_personal', 'redes_sociales'],
    'es',
    'Marketing',
    '{"hook_pattern": "time_investment", "numbered_list": true, "promise_of_results": true}'::jsonb
  )
ON CONFLICT DO NOTHING;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
