-- ============================================================================
-- MIGRACIÓN 8: CREAR TABLAS DE ANALYTICS
-- ============================================================================
-- Fecha: 2025-01-01
-- Descripción: analytics_events y lead_insights
-- ============================================================================

-- PASO 11: TABLA ANALYTICS_EVENTS (EVENTOS DE ANALYTICS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  payload JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_user_type ON analytics_events(user_id, event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at DESC);

ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Users view own analytics events'
    AND tablename = 'analytics_events'
  ) THEN
    CREATE POLICY "Users view own analytics events"
    ON analytics_events FOR SELECT
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'System inserts analytics events'
    AND tablename = 'analytics_events'
  ) THEN
    CREATE POLICY "System inserts analytics events"
    ON analytics_events FOR INSERT
    WITH CHECK (true);
  END IF;
END $$;

-- ============================================================================
-- PASO 12: TABLA LEAD_INSIGHTS (INSIGHTS DE LEADS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS lead_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lead_profile JSONB NOT NULL,
  score NUMERIC(5,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_insights_user_id ON lead_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_insights_score ON lead_insights(score DESC);

ALTER TABLE lead_insights ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Users manage own lead insights'
    AND tablename = 'lead_insights'
  ) THEN
    CREATE POLICY "Users manage own lead insights"
    ON lead_insights FOR ALL
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
