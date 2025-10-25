-- ============================================================================
-- MIGRACIÓN 10: CREAR FUNCIONES ÚTILES
-- ============================================================================
-- Fecha: 2025-01-01
-- Descripción: Funciones de gamificación, timestamps, y utilidades
-- ============================================================================

-- PASO 15: FUNCIONES ÚTILES
-- ============================================================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para upsert de usage_stats
CREATE OR REPLACE FUNCTION upsert_usage_stats(
  p_user_id UUID,
  p_posts_increment INT DEFAULT 0,
  p_credits_increment INT DEFAULT 0
)
RETURNS VOID AS $$
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

-- Función para calcular nivel basado en XP
CREATE OR REPLACE FUNCTION calculate_level(xp_amount INT)
RETURNS INT AS $$
BEGIN
  RETURN FLOOR(SQRT(xp_amount / 100.0)) + 1;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Función para otorgar XP
CREATE OR REPLACE FUNCTION grant_xp(
  p_user_id UUID,
  p_xp_amount INT,
  p_reason TEXT DEFAULT NULL
)
RETURNS TABLE(new_xp INT, new_level INT, level_up BOOLEAN) AS $$
DECLARE
  v_old_level INT;
  v_new_level INT;
  v_new_xp INT;
BEGIN
  SELECT level, xp INTO v_old_level, v_new_xp
  FROM profiles
  WHERE id = p_user_id;

  v_new_xp := v_new_xp + p_xp_amount;
  v_new_level := calculate_level(v_new_xp);

  UPDATE profiles
  SET xp = v_new_xp,
      level = v_new_level
  WHERE id = p_user_id;

  RETURN QUERY SELECT v_new_xp, v_new_level, (v_new_level > v_old_level);
END;
$$ LANGUAGE plpgsql;

-- Función para actualizar streak
CREATE OR REPLACE FUNCTION update_streak(p_user_id UUID)
RETURNS INT AS $$
DECLARE
  v_last_activity DATE;
  v_current_streak INT;
  v_new_streak INT;
BEGIN
  SELECT last_activity_date, streak_days
  INTO v_last_activity, v_current_streak
  FROM profiles
  WHERE id = p_user_id;

  IF v_last_activity IS NULL THEN
    v_new_streak := 1;
  ELSIF v_last_activity = CURRENT_DATE - INTERVAL '1 day' THEN
    v_new_streak := v_current_streak + 1;
  ELSIF v_last_activity = CURRENT_DATE THEN
    v_new_streak := v_current_streak;
  ELSE
    v_new_streak := 1;
  END IF;

  UPDATE profiles
  SET streak_days = v_new_streak,
      last_activity_date = CURRENT_DATE
  WHERE id = p_user_id;

  RETURN v_new_streak;
END;
$$ LANGUAGE plpgsql;

-- Función para búsqueda semántica
CREATE OR REPLACE FUNCTION search_inspiration_posts(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.3,
  match_count INT DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  platform TEXT,
  author TEXT,
  title TEXT,
  content TEXT,
  summary TEXT,
  tags TEXT[],
  metrics JSONB,
  captured_at TIMESTAMPTZ,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ip.id,
    ip.platform,
    ip.author,
    ip.title,
    ip.content,
    ip.summary,
    ip.tags,
    ip.metrics,
    ip.captured_at,
    1 - (ip.embedding <=> query_embedding) AS similarity
  FROM inspiration_posts ip
  WHERE ip.embedding IS NOT NULL
    AND 1 - (ip.embedding <=> query_embedding) > match_threshold
  ORDER BY ip.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- Función para verificar si es admin
CREATE OR REPLACE FUNCTION is_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para log de acciones de admin
CREATE OR REPLACE FUNCTION log_admin_action(
  p_admin_id UUID,
  p_action TEXT,
  p_target_user_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_admin_id AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'User is not an admin';
  END IF;

  INSERT INTO admin_audit_logs (admin_id, action, target_user_id, details)
  VALUES (p_admin_id, p_action, p_target_user_id, p_details)
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para limpiar notificaciones expiradas
CREATE OR REPLACE FUNCTION cleanup_expired_notifications()
RETURNS VOID AS $$
BEGIN
  DELETE FROM admin_notifications
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================

-- Verificación
DO $$
BEGIN
  RAISE NOTICE '✅ Migración completada correctamente';
END $$;
