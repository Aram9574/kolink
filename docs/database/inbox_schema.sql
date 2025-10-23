-- ===================================
-- Kolink Inbox & Calendar Schema
-- ===================================
-- Tablas adicionales para soportar:
-- - Inbox de mensajes LinkedIn
-- - Calendar events extendido
-- - Gamificación (XP, achievements)
-- ===================================

-- ===================================
-- 1. INBOX MESSAGES
-- ===================================
-- Almacena mensajes y menciones de LinkedIn
CREATE TABLE IF NOT EXISTS inbox_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Metadata del mensaje
  platform TEXT NOT NULL DEFAULT 'linkedin', -- 'linkedin', 'twitter' (futuro)
  message_type TEXT NOT NULL, -- 'direct_message', 'mention', 'comment', 'reaction'

  -- Contenido
  message_text TEXT,
  sender_name TEXT NOT NULL,
  sender_profile_url TEXT,
  sender_avatar_url TEXT,

  -- LinkedIn specific
  linkedin_message_id TEXT UNIQUE, -- ID del mensaje en LinkedIn
  linkedin_conversation_id TEXT, -- ID de la conversación
  parent_message_id UUID REFERENCES inbox_messages(id), -- Para threads

  -- Estado
  read BOOLEAN DEFAULT false,
  replied BOOLEAN DEFAULT false,
  starred BOOLEAN DEFAULT false,
  archived BOOLEAN DEFAULT false,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE,
  replied_at TIMESTAMP WITH TIME ZONE,

  -- Índices para búsqueda rápida
  CONSTRAINT check_message_type CHECK (message_type IN ('direct_message', 'mention', 'comment', 'reaction')),
  CONSTRAINT check_platform CHECK (platform IN ('linkedin', 'twitter', 'instagram'))
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_inbox_user_id ON inbox_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_inbox_created_at ON inbox_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inbox_read ON inbox_messages(user_id, read) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_inbox_linkedin_message ON inbox_messages(linkedin_message_id);
CREATE INDEX IF NOT EXISTS idx_inbox_conversation ON inbox_messages(linkedin_conversation_id);

-- RLS Policies
ALTER TABLE inbox_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own messages" ON inbox_messages;
CREATE POLICY "Users can view their own messages"
  ON inbox_messages FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own messages" ON inbox_messages;
CREATE POLICY "Users can insert their own messages"
  ON inbox_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own messages" ON inbox_messages;
CREATE POLICY "Users can update their own messages"
  ON inbox_messages FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own messages" ON inbox_messages;
CREATE POLICY "Users can delete their own messages"
  ON inbox_messages FOR DELETE
  USING (auth.uid() = user_id);

-- ===================================
-- 2. CALENDAR EVENTS (Extended)
-- ===================================
-- Almacena posts agendados para publicación
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE SET NULL,

  -- Scheduling
  scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
  timezone TEXT DEFAULT 'UTC',

  -- Content
  content TEXT NOT NULL,
  title TEXT,

  -- Platform
  platform TEXT NOT NULL DEFAULT 'linkedin',
  platform_post_id TEXT, -- ID del post después de publicar
  platform_post_url TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending',
  -- 'pending': esperando publicación
  -- 'published': publicado exitosamente
  -- 'failed': falló la publicación
  -- 'cancelled': cancelado por usuario
  -- 'draft': borrador sin programar

  error_message TEXT, -- Si falló, mensaje de error

  -- AI Suggestions
  optimal_time_suggested BOOLEAN DEFAULT false,
  ai_score INTEGER, -- Score de viralidad predicho (0-100)

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  published_at TIMESTAMP WITH TIME ZONE,

  CONSTRAINT check_status CHECK (status IN ('pending', 'published', 'failed', 'cancelled', 'draft')),
  CONSTRAINT check_platform CHECK (platform IN ('linkedin', 'twitter', 'instagram'))
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_calendar_user_id ON calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_scheduled_time ON calendar_events(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_calendar_status ON calendar_events(user_id, status);
CREATE INDEX IF NOT EXISTS idx_calendar_upcoming ON calendar_events(user_id, scheduled_time)
  WHERE status = 'pending' AND scheduled_time > NOW();

-- RLS Policies
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own events" ON calendar_events;
CREATE POLICY "Users can view their own events"
  ON calendar_events FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own events" ON calendar_events;
CREATE POLICY "Users can insert their own events"
  ON calendar_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own events" ON calendar_events;
CREATE POLICY "Users can update their own events"
  ON calendar_events FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own events" ON calendar_events;
CREATE POLICY "Users can delete their own events"
  ON calendar_events FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_calendar_events_updated_at ON calendar_events;
CREATE TRIGGER update_calendar_events_updated_at
  BEFORE UPDATE ON calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ===================================
-- 3. USER ACHIEVEMENTS (Gamification)
-- ===================================
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Achievement info
  achievement_type TEXT NOT NULL,
  -- Types:
  -- 'first_post': Primer post generado
  -- 'viral_post': Post con >1000 vistas
  -- 'streak_7': 7 días seguidos generando contenido
  -- 'streak_30': 30 días seguidos
  -- 'power_user': >100 posts generados
  -- 'early_adopter': Usuario beta
  -- 'content_master': >1000 posts generados
  -- 'engagement_king': Promedio >500 likes/post
  -- 'consistent_poster': 3 meses consecutivos activo

  achievement_name TEXT NOT NULL,
  achievement_description TEXT,
  icon TEXT, -- Emoji o nombre de icono

  -- XP & Rewards
  xp_earned INTEGER DEFAULT 0,
  badge_color TEXT DEFAULT 'blue', -- Para UI

  -- Metadata
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Evitar duplicados
  UNIQUE(user_id, achievement_type)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_unlocked_at ON user_achievements(unlocked_at DESC);

-- RLS Policies
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own achievements" ON user_achievements;
CREATE POLICY "Users can view their own achievements"
  ON user_achievements FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own achievements" ON user_achievements;
CREATE POLICY "Users can insert their own achievements"
  ON user_achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ===================================
-- 4. USER STATS (Extended)
-- ===================================
-- Agregar columnas a profiles si no existen
DO $$
BEGIN
  -- XP y nivel
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='profiles' AND column_name='xp') THEN
    ALTER TABLE profiles ADD COLUMN xp INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='profiles' AND column_name='level') THEN
    ALTER TABLE profiles ADD COLUMN level INTEGER DEFAULT 1;
  END IF;

  -- Streak
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='profiles' AND column_name='streak_days') THEN
    ALTER TABLE profiles ADD COLUMN streak_days INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='profiles' AND column_name='last_activity_date') THEN
    ALTER TABLE profiles ADD COLUMN last_activity_date DATE;
  END IF;

  -- Total posts count
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='profiles' AND column_name='total_posts') THEN
    ALTER TABLE profiles ADD COLUMN total_posts INTEGER DEFAULT 0;
  END IF;
END $$;

-- ===================================
-- 5. VIEWS ÚTILES
-- ===================================

-- Vista de mensajes no leídos por usuario
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

-- Vista de próximos eventos
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

-- Vista de logros por usuario
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

-- ===================================
-- 6. FUNCTIONS ÚTILES
-- ===================================

-- Función para calcular nivel basado en XP
CREATE OR REPLACE FUNCTION calculate_level(xp_amount INTEGER)
RETURNS INTEGER AS $$
BEGIN
  -- Fórmula: nivel = raíz cuadrada(xp / 100)
  -- Nivel 1: 0 XP
  -- Nivel 2: 100 XP
  -- Nivel 3: 400 XP
  -- Nivel 4: 900 XP
  -- etc.
  RETURN FLOOR(SQRT(xp_amount / 100.0)) + 1;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Función para otorgar XP y logros
CREATE OR REPLACE FUNCTION grant_xp(
  p_user_id UUID,
  p_xp_amount INTEGER,
  p_reason TEXT DEFAULT NULL
)
RETURNS TABLE(new_xp INTEGER, new_level INTEGER, level_up BOOLEAN) AS $$
DECLARE
  v_old_level INTEGER;
  v_new_level INTEGER;
  v_new_xp INTEGER;
BEGIN
  -- Obtener nivel actual
  SELECT level, xp INTO v_old_level, v_new_xp
  FROM profiles
  WHERE id = p_user_id;

  -- Sumar XP
  v_new_xp := v_new_xp + p_xp_amount;

  -- Calcular nuevo nivel
  v_new_level := calculate_level(v_new_xp);

  -- Actualizar perfil
  UPDATE profiles
  SET xp = v_new_xp,
      level = v_new_level
  WHERE id = p_user_id;

  -- Retornar resultados
  RETURN QUERY SELECT v_new_xp, v_new_level, (v_new_level > v_old_level);
END;
$$ LANGUAGE plpgsql;

-- Función para actualizar streak
CREATE OR REPLACE FUNCTION update_streak(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_last_activity DATE;
  v_current_streak INTEGER;
  v_new_streak INTEGER;
BEGIN
  SELECT last_activity_date, streak_days
  INTO v_last_activity, v_current_streak
  FROM profiles
  WHERE id = p_user_id;

  -- Si es primer día de actividad
  IF v_last_activity IS NULL THEN
    v_new_streak := 1;
  -- Si fue ayer, incrementar streak
  ELSIF v_last_activity = CURRENT_DATE - INTERVAL '1 day' THEN
    v_new_streak := v_current_streak + 1;
  -- Si fue hoy, mantener streak
  ELSIF v_last_activity = CURRENT_DATE THEN
    v_new_streak := v_current_streak;
  -- Si fue hace más de 1 día, resetear
  ELSE
    v_new_streak := 1;
  END IF;

  -- Actualizar perfil
  UPDATE profiles
  SET streak_days = v_new_streak,
      last_activity_date = CURRENT_DATE
  WHERE id = p_user_id;

  -- Otorgar logros si aplica
  IF v_new_streak = 7 AND NOT EXISTS (
    SELECT 1 FROM user_achievements
    WHERE user_id = p_user_id AND achievement_type = 'streak_7'
  ) THEN
    INSERT INTO user_achievements (user_id, achievement_type, achievement_name, achievement_description, xp_earned, icon)
    VALUES (p_user_id, 'streak_7', '🔥 Semana Completa', '7 días seguidos creando contenido', 100, '🔥');

    PERFORM grant_xp(p_user_id, 100, 'streak_7');
  END IF;

  IF v_new_streak = 30 AND NOT EXISTS (
    SELECT 1 FROM user_achievements
    WHERE user_id = p_user_id AND achievement_type = 'streak_30'
  ) THEN
    INSERT INTO user_achievements (user_id, achievement_type, achievement_name, achievement_description, xp_earned, icon)
    VALUES (p_user_id, 'streak_30', '🔥 Mes Completo', '30 días seguidos creando contenido', 500, '🔥');

    PERFORM grant_xp(p_user_id, 500, 'streak_30');
  END IF;

  RETURN v_new_streak;
END;
$$ LANGUAGE plpgsql;

-- ===================================
-- 7. TRIGGERS
-- ===================================

-- Trigger para otorgar XP al crear un post
CREATE OR REPLACE FUNCTION grant_xp_on_post_create()
RETURNS TRIGGER AS $$
BEGIN
  -- Otorgar 10 XP por crear un post
  PERFORM grant_xp(NEW.user_id, 10, 'post_created');

  -- Actualizar streak
  PERFORM update_streak(NEW.user_id);

  -- Actualizar contador de posts
  UPDATE profiles
  SET total_posts = total_posts + 1
  WHERE id = NEW.user_id;

  -- Primer post achievement
  IF NOT EXISTS (
    SELECT 1 FROM user_achievements
    WHERE user_id = NEW.user_id AND achievement_type = 'first_post'
  ) THEN
    INSERT INTO user_achievements (user_id, achievement_type, achievement_name, achievement_description, xp_earned, icon)
    VALUES (NEW.user_id, 'first_post', '🎉 Primer Post', 'Creaste tu primer post con IA', 50, '🎉');

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

-- ===================================
-- 8. SEED DATA (Opcional - para testing)
-- ===================================

-- Comentar en producción
/*
-- Logros predefinidos (catálogo)
INSERT INTO user_achievements (user_id, achievement_type, achievement_name, achievement_description, xp_earned, icon)
VALUES
  ('user-uuid-here', 'early_adopter', '🌟 Early Adopter', 'Usuario beta de Kolink', 200, '🌟'),
  ('user-uuid-here', 'power_user', '⚡ Power User', 'Más de 100 posts generados', 300, '⚡')
ON CONFLICT (user_id, achievement_type) DO NOTHING;
*/

-- ===================================
-- COMENTARIOS FINALES
-- ===================================

COMMENT ON TABLE inbox_messages IS 'Almacena mensajes, menciones y comentarios de LinkedIn';
COMMENT ON TABLE calendar_events IS 'Posts agendados para publicación automática';
COMMENT ON TABLE user_achievements IS 'Logros y gamificación del usuario';
COMMENT ON FUNCTION grant_xp IS 'Otorga XP a un usuario y calcula su nuevo nivel';
COMMENT ON FUNCTION update_streak IS 'Actualiza el streak de días consecutivos';

-- Verificar que todo se creó correctamente
DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name IN ('inbox_messages', 'calendar_events', 'user_achievements');

  RAISE NOTICE '✅ Se crearon % tablas nuevas', table_count;
  RAISE NOTICE '✅ Schema de inbox, calendar y gamificación listo para usar';
END $$;
