-- ============================================================================
-- MIGRACIÓN 7: CREAR TABLA CALENDAR_EVENTS
-- ============================================================================
-- Fecha: 2025-01-01
-- Descripción: Eventos programados y scheduling
-- ============================================================================

-- PASO 10: TABLA CALENDAR_EVENTS (EVENTOS DE CALENDARIO)
-- ============================================================================

CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE SET NULL,

  -- Scheduling
  scheduled_time TIMESTAMPTZ NOT NULL,
  timezone TEXT DEFAULT 'UTC',

  -- Content
  content TEXT NOT NULL,
  title TEXT,

  -- Platform
  platform TEXT NOT NULL DEFAULT 'linkedin',
  platforms TEXT[] DEFAULT ARRAY[]::TEXT[],
  platform_post_id TEXT,
  platform_post_url TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,

  -- AI
  ai_score NUMERIC(5,2),
  recommendation_reason JSONB DEFAULT '{}'::JSONB,
  optimal_time_suggested BOOLEAN DEFAULT false,

  -- External
  external_event_id TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

ALTER TABLE calendar_events ADD CONSTRAINT check_status_valid
  CHECK (status IN ('pending', 'published', 'failed', 'cancelled', 'draft', 'scheduled'));

ALTER TABLE calendar_events ADD CONSTRAINT check_platform_valid
  CHECK (platform IN ('linkedin', 'twitter', 'instagram', 'facebook'));

CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_scheduled_time ON calendar_events(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_status ON calendar_events(user_id, status);
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_time ON calendar_events(user_id, scheduled_time);

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

DO $
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Users manage own calendar events'
    AND tablename = 'calendar_events'
  ) THEN
    CREATE POLICY "Users manage own calendar events"
    ON calendar_events FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;
END
$;

-- ============================================================================

-- Verificación
DO $$
BEGIN
  RAISE NOTICE '✅ Migración completada correctamente';
END $$;
