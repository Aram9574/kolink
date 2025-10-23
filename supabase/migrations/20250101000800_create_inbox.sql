-- ============================================================================
-- MIGRACIÓN 9: CREAR TABLAS DE INBOX Y GAMIFICACIÓN
-- ============================================================================
-- Fecha: 2025-01-01
-- Descripción: inbox_messages y user_achievements
-- ============================================================================

-- PASO 13: TABLA INBOX_MESSAGES (MENSAJES DE LINKEDIN)
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

DO $
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
END
$;

-- ============================================================================
-- PASO 14: TABLA USER_ACHIEVEMENTS (LOGROS Y GAMIFICACIÓN)
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

DO $
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
END
$;

-- ============================================================================

-- Verificación
DO $$
BEGIN
  RAISE NOTICE '✅ Migración completada correctamente';
END $$;
