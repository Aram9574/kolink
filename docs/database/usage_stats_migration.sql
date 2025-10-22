-- [Phase 5] Migration: Create usage_stats table
-- Purpose: Track user analytics and metrics for dashboard stats

CREATE TABLE IF NOT EXISTS usage_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    posts_generated INTEGER DEFAULT 0,
    credits_used INTEGER DEFAULT 0,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_usage_stats_user_id ON usage_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_stats_created_at ON usage_stats(created_at);

-- Enable Row Level Security
ALTER TABLE usage_stats ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own stats
CREATE POLICY "Users can view own stats" ON usage_stats
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can update their own stats
CREATE POLICY "Users can update own stats" ON usage_stats
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy: System can insert stats
CREATE POLICY "System can insert stats" ON usage_stats
    FOR INSERT WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_usage_stats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_usage_stats_updated_at
    BEFORE UPDATE ON usage_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_usage_stats_updated_at();

-- Function to initialize or update usage stats
CREATE OR REPLACE FUNCTION upsert_usage_stats(
    p_user_id UUID,
    p_posts_increment INTEGER DEFAULT 0,
    p_credits_increment INTEGER DEFAULT 0
)
RETURNS void AS $$
BEGIN
    INSERT INTO usage_stats (user_id, posts_generated, credits_used, last_activity)
    VALUES (p_user_id, p_posts_increment, p_credits_increment, NOW())
    ON CONFLICT (user_id)
    DO UPDATE SET
        posts_generated = usage_stats.posts_generated + p_posts_increment,
        credits_used = usage_stats.credits_used + p_credits_increment,
        last_activity = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE usage_stats IS '[Phase 5] User analytics and usage tracking';
COMMENT ON FUNCTION upsert_usage_stats IS '[Phase 5] Upsert user usage statistics';
