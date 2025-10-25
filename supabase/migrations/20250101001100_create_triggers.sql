-- ============================================================================
-- MIGRACIÓN 12: CREAR TRIGGERS AUTOMÁTICOS
-- ============================================================================
-- Fecha: 2025-01-01
-- Descripción: Triggers para XP automático, timestamps, etc.
-- ============================================================================

-- PASO 16: TRIGGERS AUTOMÁTICOS
-- ============================================================================

-- Trigger: actualizar updated_at en profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger: actualizar updated_at en posts
DROP TRIGGER IF EXISTS update_posts_updated_at ON posts;
CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger: actualizar updated_at en usage_stats
DROP TRIGGER IF EXISTS update_usage_stats_updated_at ON usage_stats;
CREATE TRIGGER update_usage_stats_updated_at
  BEFORE UPDATE ON usage_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger: actualizar updated_at en calendar_events
DROP TRIGGER IF EXISTS update_calendar_events_updated_at ON calendar_events;
CREATE TRIGGER update_calendar_events_updated_at
  BEFORE UPDATE ON calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger: actualizar updated_at en saved_searches
DROP TRIGGER IF EXISTS update_saved_searches_updated_at ON saved_searches;
CREATE TRIGGER update_saved_searches_updated_at
  BEFORE UPDATE ON saved_searches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger: otorgar XP al crear post
CREATE OR REPLACE FUNCTION grant_xp_on_post_create()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM grant_xp(NEW.user_id, 10, 'post_created');
  PERFORM update_streak(NEW.user_id);

  UPDATE profiles
  SET total_posts = total_posts + 1
  WHERE id = NEW.user_id;

  IF NOT EXISTS (
    SELECT 1 FROM user_achievements
    WHERE user_id = NEW.user_id AND achievement_type = 'first_post'
  ) THEN
    INSERT INTO user_achievements (user_id, achievement_type, achievement_name, achievement_description, xp_earned, icon)
    VALUES (NEW.user_id, 'first_post', 'Primer Post', 'Creaste tu primer post con IA', 50, '🎉');

    PERFORM grant_xp(NEW.user_id, 50, 'first_post');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_grant_xp_on_post_create ON posts;
CREATE TRIGGER trigger_grant_xp_on_post_create
  AFTER INSERT ON posts
  FOR EACH ROW
  EXECUTE FUNCTION grant_xp_on_post_create();

-- ============================================================================

-- Verificación
DO $$
BEGIN
  RAISE NOTICE '✅ Migración completada correctamente';
END $$;
