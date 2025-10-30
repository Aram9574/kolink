-- Sprint 3 Task 6: Saved Searches Table
-- Run this in Supabase Dashboard SQL Editor

CREATE TABLE IF NOT EXISTS saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_searches_user_id ON saved_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_searches_updated_at ON saved_searches(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_searches_filters ON saved_searches USING GIN (filters);

ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own saved searches"
  ON saved_searches FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own saved searches"
  ON saved_searches FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved searches"
  ON saved_searches FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved searches"
  ON saved_searches FOR DELETE USING (auth.uid() = user_id);

SELECT 'Saved searches table created!' AS status;
