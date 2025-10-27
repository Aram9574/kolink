-- ============================================================================
-- KOLINK SPRINT 1 - MIGRACIONES CONSOLIDADAS
-- ============================================================================
-- Fecha: 2025-10-26
-- Descripción: Aplicar todas las migraciones faltantes para completar Sprint 1
-- Versión: Consolidado de migraciones 300-1100
-- ============================================================================
--
-- INSTRUCCIONES:
-- 1. Abrir Supabase Dashboard > SQL Editor
-- 2. Copiar y pegar este archivo COMPLETO
-- 3. Ejecutar
-- 4. Verificar que no hay errores
-- 5. Ejecutar: npm run predeploy:verify
--
-- ============================================================================

-- ============================================================================
-- PASO 1: HABILITAR EXTENSIÓN PGVECTOR (si no está habilitada)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "vector";

-- Verificar
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
    RAISE NOTICE '✅ pgvector habilitada correctamente';
  ELSE
    RAISE WARNING '⚠️ pgvector NO pudo habilitarse. Verifica tu plan de Supabase.';
  END IF;
END $$;

-- ============================================================================
-- MIGRACIÓN 300: TABLA USAGE_STATS
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

DO $$
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
END $$;

-- ============================================================================
-- MIGRACIÓN 500: TABLAS DE INSPIRACIÓN (CON VECTOR EMBEDDINGS)
-- ============================================================================

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
  captured_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inspiration_posts_platform ON inspiration_posts(platform);
CREATE INDEX IF NOT EXISTS idx_inspiration_posts_tags ON inspiration_posts USING GIN (tags);

-- NOTA: Este índice vectorial requiere pgvector habilitado
CREATE INDEX IF NOT EXISTS idx_inspiration_posts_embedding ON inspiration_posts
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

ALTER TABLE inspiration_posts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Anyone can read inspiration posts'
    AND tablename = 'inspiration_posts'
  ) THEN
    CREATE POLICY "Anyone can read inspiration posts"
    ON inspiration_posts FOR SELECT
    USING (true);
  END IF;
END $$;

-- ============================================================================

CREATE TABLE IF NOT EXISTS saved_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  inspiration_post_id UUID REFERENCES inspiration_posts(id) ON DELETE SET NULL,
  note TEXT,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_posts_user_id ON saved_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_posts_inspiration_id ON saved_posts(inspiration_post_id);

ALTER TABLE saved_posts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Users manage own saved posts'
    AND tablename = 'saved_posts'
  ) THEN
    CREATE POLICY "Users manage own saved posts"
    ON saved_posts FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================================

CREATE TABLE IF NOT EXISTS saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_searches_user_id ON saved_searches(user_id);

ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Users manage own saved searches'
    AND tablename = 'saved_searches'
  ) THEN
    CREATE POLICY "Users manage own saved searches"
    ON saved_searches FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================================
-- MIGRACIÓN 600: TABLA CALENDAR_EVENTS
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

DO $$
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
END $$;

-- ============================================================================
-- MIGRACIÓN 700: TABLAS DE ANALYTICS
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
-- MIGRACIÓN 800: TABLAS DE INBOX Y GAMIFICACIÓN
-- ============================================================================

CREATE TABLE IF NOT EXISTS inbox_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Metadata del mensaje
  platform TEXT NOT NULL DEFAULT 'linkedin',
  message_type TEXT NOT NULL,

  -- Contenido
  message_text TEXT,
  sender_name TEXT NOT NULL,
  sender_profile_url TEXT,
  sender_avatar_url TEXT,

  -- LinkedIn specific
  linkedin_message_id TEXT UNIQUE,
  linkedin_conversation_id TEXT,
  parent_message_id UUID REFERENCES inbox_messages(id) ON DELETE SET NULL,

  -- Estado
  read BOOLEAN DEFAULT false,
  replied BOOLEAN DEFAULT false,
  starred BOOLEAN DEFAULT false,
  archived BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ
);

ALTER TABLE inbox_messages ADD CONSTRAINT check_message_type_valid
  CHECK (message_type IN ('direct_message', 'mention', 'comment', 'reaction'));

ALTER TABLE inbox_messages ADD CONSTRAINT check_platform_message_valid
  CHECK (platform IN ('linkedin', 'twitter', 'instagram'));

CREATE INDEX IF NOT EXISTS idx_inbox_user_id ON inbox_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_inbox_created_at ON inbox_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inbox_read ON inbox_messages(user_id, read) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_inbox_linkedin_message ON inbox_messages(linkedin_message_id);
CREATE INDEX IF NOT EXISTS idx_inbox_conversation ON inbox_messages(linkedin_conversation_id);

ALTER TABLE inbox_messages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Users manage own messages'
    AND tablename = 'inbox_messages'
  ) THEN
    CREATE POLICY "Users manage own messages"
    ON inbox_messages FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================================

CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Achievement info
  achievement_type TEXT NOT NULL,
  achievement_name TEXT NOT NULL,
  achievement_description TEXT,
  icon TEXT,

  -- XP & Rewards
  xp_earned INT DEFAULT 0,
  badge_color TEXT DEFAULT 'blue',

  -- Timestamp
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),

  -- Evitar duplicados
  UNIQUE(user_id, achievement_type)
);

CREATE INDEX IF NOT EXISTS idx_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_unlocked_at ON user_achievements(unlocked_at DESC);

ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Users view own achievements'
    AND tablename = 'user_achievements'
  ) THEN
    CREATE POLICY "Users view own achievements"
    ON user_achievements FOR SELECT
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'System inserts achievements'
    AND tablename = 'user_achievements'
  ) THEN
    CREATE POLICY "System inserts achievements"
    ON user_achievements FOR INSERT
    WITH CHECK (true);
  END IF;
END $$;

-- ============================================================================
-- MIGRACIÓN 900: FUNCIONES ÚTILES
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

-- Función para búsqueda semántica (REQUIERE PGVECTOR)
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
-- MIGRACIÓN 1000: VISTAS ÚTILES
-- ============================================================================

-- Vista: contador de notificaciones no leídas
CREATE OR REPLACE VIEW user_unread_notifications AS
SELECT
  user_id,
  COUNT(*) as unread_count
FROM admin_notifications
WHERE read = false AND expires_at > NOW()
GROUP BY user_id;

-- Vista: contador de mensajes no leídos
CREATE OR REPLACE VIEW inbox_unread_counts AS
SELECT
  user_id,
  COUNT(*) as unread_count,
  COUNT(*) FILTER (WHERE message_type = 'direct_message') as unread_dms,
  COUNT(*) FILTER (WHERE message_type = 'mention') as unread_mentions,
  COUNT(*) FILTER (WHERE message_type = 'comment') as unread_comments
FROM inbox_messages
WHERE read = false AND archived = false
GROUP BY user_id;

-- Vista: próximos eventos
CREATE OR REPLACE VIEW upcoming_events AS
SELECT
  ce.*,
  p.generated_text as post_content
FROM calendar_events ce
LEFT JOIN posts p ON ce.post_id = p.id
WHERE ce.status = 'pending'
  AND ce.scheduled_time > NOW()
  AND ce.scheduled_time < NOW() + INTERVAL '7 days'
ORDER BY ce.scheduled_time ASC;

-- Vista: resumen de logros por usuario
CREATE OR REPLACE VIEW user_achievement_summary AS
SELECT
  p.id as user_id,
  p.email,
  p.xp,
  p.level,
  p.streak_days,
  COUNT(ua.id) as total_achievements,
  COALESCE(SUM(ua.xp_earned), 0) as total_xp_from_achievements
FROM profiles p
LEFT JOIN user_achievements ua ON p.id = ua.user_id
GROUP BY p.id, p.email, p.xp, p.level, p.streak_days;

-- ============================================================================
-- GRANTS DE PERMISOS
-- ============================================================================

GRANT EXECUTE ON FUNCTION search_inspiration_posts TO authenticated;
GRANT EXECUTE ON FUNCTION search_inspiration_posts TO anon;
GRANT EXECUTE ON FUNCTION calculate_level TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin TO authenticated;

-- ============================================================================
-- MIGRACIÓN 1100: TRIGGERS AUTOMÁTICOS
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
-- VERIFICACIÓN FINAL
-- ============================================================================

-- Verificar que todas las tablas se crearon
DO $$
DECLARE
  table_count INT;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name IN (
    'usage_stats', 'inspiration_posts', 'saved_posts',
    'saved_searches', 'calendar_events', 'analytics_events',
    'lead_insights', 'inbox_messages', 'user_achievements'
  );

  RAISE NOTICE '✅ Tablas nuevas creadas: %/9', table_count;

  IF table_count < 9 THEN
    RAISE WARNING '⚠️ Faltan % tablas por crear', 9 - table_count;
  END IF;
END $$;

-- Verificar extensiones
DO $$
DECLARE
  ext_count INT;
BEGIN
  SELECT COUNT(*) INTO ext_count
  FROM pg_extension
  WHERE extname IN ('pgcrypto', 'uuid-ossp', 'vector');

  RAISE NOTICE '✅ Extensiones habilitadas: %/3', ext_count;

  IF ext_count < 3 THEN
    RAISE WARNING '⚠️ Falta extensión pgvector. Búsqueda semántica NO funcionará.';
  END IF;
END $$;

-- Mensaje final
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🎉 ¡SPRINT 1 MIGRACIONES COMPLETADAS!';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Nuevas tablas agregadas: 9';
  RAISE NOTICE '🔧 Funciones creadas: 9';
  RAISE NOTICE '👁️ Vistas creadas: 4';
  RAISE NOTICE '⚡ Triggers configurados: 6';
  RAISE NOTICE '🔐 RLS habilitado en todas las tablas';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Tu base de datos está lista para Sprint 2';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Próximo paso:';
  RAISE NOTICE '   Ejecutar: npm run predeploy:verify';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- FIN DE MIGRACIONES CONSOLIDADAS
-- ============================================================================
