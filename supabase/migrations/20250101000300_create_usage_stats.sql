-- ============================================================================
-- MIGRACIÓN 4: CREAR TABLA USAGE_STATS
-- ============================================================================
-- Fecha: 2025-01-01
-- Descripción: Estadísticas de uso por usuario
-- ============================================================================

-- PASO 4: TABLA USAGE_STATS (ESTADÍSTICAS DE USO)
-- ============================================================================

CREATE TABLE IF NOT EXISTS usage_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  posts_generated INT DEFAULT 0,
  credits_used INT DEFAULT 0,
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_usage_stats_user_id ON usage_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_stats_created_at ON usage_stats(created_at);

ALTER TABLE usage_stats ENABLE ROW LEVEL SECURITY;

DO $
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Users can view own stats'
    AND tablename = 'usage_stats'
  ) THEN
    CREATE POLICY "Users can view own stats"
    ON usage_stats FOR SELECT
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Users can update own stats'
    AND tablename = 'usage_stats'
  ) THEN
    CREATE POLICY "Users can update own stats"
    ON usage_stats FOR UPDATE
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'System can insert stats'
    AND tablename = 'usage_stats'
  ) THEN
    CREATE POLICY "System can insert stats"
    ON usage_stats FOR INSERT
    WITH CHECK (true);
  END IF;
END
$;

-- ============================================================================

-- Verificación
DO $$
BEGIN
  RAISE NOTICE '✅ Migración completada correctamente';
END $$;
