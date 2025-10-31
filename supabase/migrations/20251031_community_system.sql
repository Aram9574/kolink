-- Community System Migration
-- Date: 2025-10-31
-- Description: Tables for community features including posts, forum, mentorship, and feedback

-- ============================================================================
-- 1. COMMUNITY POSTS (Feed)
-- ============================================================================

CREATE TABLE IF NOT EXISTS community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  post_type VARCHAR(50) DEFAULT 'share', -- 'share', 'feedback_request', 'question', 'announcement'
  original_post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'archived', 'flagged'
  visibility VARCHAR(20) DEFAULT 'public', -- 'public', 'members_only', 'premium_only'
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for community_posts
CREATE INDEX IF NOT EXISTS idx_community_posts_user_id ON community_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_type ON community_posts(post_type);
CREATE INDEX IF NOT EXISTS idx_community_posts_created_at ON community_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_status ON community_posts(status);

-- ============================================================================
-- 2. COMMUNITY POST REACTIONS (Votes, Likes, etc)
-- ============================================================================

CREATE TABLE IF NOT EXISTS community_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reaction_type VARCHAR(20) NOT NULL, -- 'upvote', 'downvote', 'heart', 'fire', 'helpful'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id, reaction_type)
);

-- Indexes for community_reactions
CREATE INDEX IF NOT EXISTS idx_community_reactions_post_id ON community_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_community_reactions_user_id ON community_reactions(user_id);

-- ============================================================================
-- 3. COMMUNITY COMMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS community_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES community_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_solution BOOLEAN DEFAULT FALSE, -- For marking helpful answers
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'deleted', 'flagged'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for community_comments
CREATE INDEX IF NOT EXISTS idx_community_comments_post_id ON community_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_community_comments_user_id ON community_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_community_comments_parent ON community_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_community_comments_created_at ON community_comments(created_at DESC);

-- ============================================================================
-- 4. FORUM CATEGORIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS forum_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(50),
  color VARCHAR(20),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default categories
INSERT INTO forum_categories (name, slug, description, icon, color, sort_order) VALUES
  ('Estrategia de Contenido', 'content-strategy', 'Comparte y discute estrategias de contenido', 'lightbulb', 'blue', 1),
  ('Análisis y Métricas', 'analytics', 'Pregunta sobre métricas, KPIs y análisis de rendimiento', 'bar-chart', 'green', 2),
  ('Herramientas y Tech', 'tools-tech', 'Herramientas, automatización y tecnología', 'wrench', 'purple', 3),
  ('Networking y Growth', 'networking', 'Crecimiento de audiencia y networking', 'users', 'orange', 4),
  ('Preguntas Generales', 'general', 'Cualquier pregunta sobre LinkedIn y redes sociales', 'message-circle', 'gray', 5)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- 5. FORUM THREADS
-- ============================================================================

CREATE TABLE IF NOT EXISTS forum_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES forum_categories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_locked BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'closed', 'flagged'
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for forum_threads
CREATE INDEX IF NOT EXISTS idx_forum_threads_category_id ON forum_threads(category_id);
CREATE INDEX IF NOT EXISTS idx_forum_threads_user_id ON forum_threads(user_id);
CREATE INDEX IF NOT EXISTS idx_forum_threads_created_at ON forum_threads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_threads_status ON forum_threads(status);
CREATE INDEX IF NOT EXISTS idx_forum_threads_pinned ON forum_threads(is_pinned DESC);

-- ============================================================================
-- 6. FORUM REPLIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS forum_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  parent_reply_id UUID REFERENCES forum_replies(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_solution BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for forum_replies
CREATE INDEX IF NOT EXISTS idx_forum_replies_thread_id ON forum_replies(thread_id);
CREATE INDEX IF NOT EXISTS idx_forum_replies_user_id ON forum_replies(user_id);
CREATE INDEX IF NOT EXISTS idx_forum_replies_created_at ON forum_replies(created_at DESC);

-- ============================================================================
-- 7. MENTORSHIP SESSIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS mentorship_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  mentor_name VARCHAR(100),
  mentor_title VARCHAR(150),
  mentor_image_url TEXT,
  session_type VARCHAR(50) DEFAULT 'recorded', -- 'recorded', 'live', 'upcoming'
  video_url TEXT,
  thumbnail_url TEXT,
  duration_minutes INTEGER,
  category VARCHAR(100),
  tags TEXT[] DEFAULT '{}',
  is_premium_only BOOLEAN DEFAULT FALSE,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  recording_date TIMESTAMP WITH TIME ZONE,
  view_count INTEGER DEFAULT 0,
  rating_avg DECIMAL(3,2) DEFAULT 0.0,
  rating_count INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'published', -- 'draft', 'published', 'archived'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for mentorship_sessions
CREATE INDEX IF NOT EXISTS idx_mentorship_sessions_type ON mentorship_sessions(session_type);
CREATE INDEX IF NOT EXISTS idx_mentorship_sessions_category ON mentorship_sessions(category);
CREATE INDEX IF NOT EXISTS idx_mentorship_sessions_created_at ON mentorship_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mentorship_sessions_rating ON mentorship_sessions(rating_avg DESC);

-- Insert sample mentorship sessions
INSERT INTO mentorship_sessions (title, description, mentor_name, mentor_title, session_type, duration_minutes, category, tags, video_url, thumbnail_url) VALUES
  ('Cómo crear contenido viral en LinkedIn', 'Aprende las estrategias probadas para crear posts que generen engagement', 'María González', 'LinkedIn Top Voice | Marketing Digital', 'recorded', 45, 'content-strategy', ARRAY['linkedin', 'viral', 'engagement'], 'https://example.com/video1', 'https://example.com/thumb1.jpg'),
  ('Análisis de métricas: De datos a decisiones', 'Convierte tus métricas en insights accionables', 'Carlos Ruiz', 'Data Analyst | Growth Expert', 'recorded', 60, 'analytics', ARRAY['metrics', 'analytics', 'growth'], 'https://example.com/video2', 'https://example.com/thumb2.jpg'),
  ('Automatización de LinkedIn con IA', 'Descubre cómo usar IA para optimizar tu presencia', 'Ana Martínez', 'AI Specialist | Automation Expert', 'recorded', 50, 'tools-tech', ARRAY['ai', 'automation', 'tools'], 'https://example.com/video3', 'https://example.com/thumb3.jpg')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 8. SESSION ATTENDANCE (Track who watched what)
-- ============================================================================

CREATE TABLE IF NOT EXISTS session_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES mentorship_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  progress_seconds INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(session_id, user_id)
);

-- Indexes for session_attendance
CREATE INDEX IF NOT EXISTS idx_session_attendance_user_id ON session_attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_session_attendance_session_id ON session_attendance(session_id);

-- ============================================================================
-- 9. MODERATION & REPORTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS community_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reported_type VARCHAR(50) NOT NULL, -- 'post', 'comment', 'thread', 'reply'
  reported_id UUID NOT NULL,
  reason VARCHAR(100) NOT NULL, -- 'spam', 'harassment', 'inappropriate', 'off-topic', 'other'
  description TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'reviewed', 'resolved', 'dismissed'
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for community_reports
CREATE INDEX IF NOT EXISTS idx_community_reports_status ON community_reports(status);
CREATE INDEX IF NOT EXISTS idx_community_reports_type ON community_reports(reported_type);
CREATE INDEX IF NOT EXISTS idx_community_reports_created_at ON community_reports(created_at DESC);

-- ============================================================================
-- 10. RLS POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentorship_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_reports ENABLE ROW LEVEL SECURITY;

-- Community Posts Policies
CREATE POLICY "Users can view active community posts" ON community_posts
  FOR SELECT USING (status = 'active');

CREATE POLICY "Users can create their own posts" ON community_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts" ON community_posts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts" ON community_posts
  FOR DELETE USING (auth.uid() = user_id);

-- Reactions Policies
CREATE POLICY "Users can view all reactions" ON community_reactions
  FOR SELECT USING (true);

CREATE POLICY "Users can add reactions" ON community_reactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own reactions" ON community_reactions
  FOR DELETE USING (auth.uid() = user_id);

-- Comments Policies
CREATE POLICY "Users can view active comments" ON community_comments
  FOR SELECT USING (status = 'active');

CREATE POLICY "Users can create comments" ON community_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments" ON community_comments
  FOR UPDATE USING (auth.uid() = user_id);

-- Forum Categories (Read-only for users)
CREATE POLICY "Everyone can view active categories" ON forum_categories
  FOR SELECT USING (is_active = true);

-- Forum Threads Policies
CREATE POLICY "Users can view active threads" ON forum_threads
  FOR SELECT USING (status = 'active');

CREATE POLICY "Users can create threads" ON forum_threads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own threads" ON forum_threads
  FOR UPDATE USING (auth.uid() = user_id);

-- Forum Replies Policies
CREATE POLICY "Users can view active replies" ON forum_replies
  FOR SELECT USING (status = 'active');

CREATE POLICY "Users can create replies" ON forum_replies
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own replies" ON forum_replies
  FOR UPDATE USING (auth.uid() = user_id);

-- Mentorship Sessions (Public read)
CREATE POLICY "Everyone can view published sessions" ON mentorship_sessions
  FOR SELECT USING (status = 'published');

-- Session Attendance
CREATE POLICY "Users can view their own attendance" ON session_attendance
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own attendance" ON session_attendance
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own attendance" ON session_attendance
  FOR UPDATE USING (auth.uid() = user_id);

-- Reports (Users can only see their own reports)
CREATE POLICY "Users can view their own reports" ON community_reports
  FOR SELECT USING (auth.uid() = reporter_id);

CREATE POLICY "Users can create reports" ON community_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- ============================================================================
-- 11. HELPER FUNCTIONS
-- ============================================================================

-- Function to get post stats
CREATE OR REPLACE FUNCTION get_community_post_stats(post_uuid UUID)
RETURNS TABLE (
  reactions_count BIGINT,
  comments_count BIGINT,
  upvotes_count BIGINT,
  user_has_upvoted BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM community_reactions WHERE post_id = post_uuid)::BIGINT,
    (SELECT COUNT(*) FROM community_comments WHERE post_id = post_uuid AND status = 'active')::BIGINT,
    (SELECT COUNT(*) FROM community_reactions WHERE post_id = post_uuid AND reaction_type = 'upvote')::BIGINT,
    (SELECT EXISTS(SELECT 1 FROM community_reactions WHERE post_id = post_uuid AND user_id = auth.uid() AND reaction_type = 'upvote'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_thread_views(thread_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE forum_threads
  SET view_count = view_count + 1
  WHERE id = thread_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment session views
CREATE OR REPLACE FUNCTION increment_session_views(session_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE mentorship_sessions
  SET view_count = view_count + 1
  WHERE id = session_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 12. TRIGGERS
-- ============================================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_community_posts_updated_at BEFORE UPDATE ON community_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_community_comments_updated_at BEFORE UPDATE ON community_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_forum_threads_updated_at BEFORE UPDATE ON forum_threads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_forum_replies_updated_at BEFORE UPDATE ON forum_replies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mentorship_sessions_updated_at BEFORE UPDATE ON mentorship_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_session_attendance_updated_at BEFORE UPDATE ON session_attendance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
