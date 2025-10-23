-- ============================================================================
-- MIGRACIÓN 5: CREAR TABLAS DE ADMINISTRACIÓN
-- ============================================================================
-- Fecha: 2025-01-01
-- Descripción: admin_notifications y admin_audit_logs
-- ============================================================================

-- PASO 5: TABLA ADMIN_NOTIFICATIONS (NOTIFICACIONES DE ADMIN A USUARIOS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days')
);

ALTER TABLE admin_notifications ADD CONSTRAINT check_notification_type
  CHECK (type IN ('info', 'warning', 'success', 'error'));

CREATE INDEX IF NOT EXISTS idx_admin_notifications_user_id ON admin_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_read ON admin_notifications(read);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at ON admin_notifications(created_at DESC);

ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

DO $
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Users can read own notifications'
    AND tablename = 'admin_notifications'
  ) THEN
    CREATE POLICY "Users can read own notifications"
    ON admin_notifications FOR SELECT
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Users can update own notifications'
    AND tablename = 'admin_notifications'
  ) THEN
    CREATE POLICY "Users can update own notifications"
    ON admin_notifications FOR UPDATE
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Admins can insert notifications'
    AND tablename = 'admin_notifications'
  ) THEN
    CREATE POLICY "Admins can insert notifications"
    ON admin_notifications FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
      )
    );
  END IF;
END
$;

-- Habilitar Realtime para notificaciones instantáneas
ALTER PUBLICATION supabase_realtime ADD TABLE admin_notifications;

-- ============================================================================
-- PASO 6: TABLA ADMIN_AUDIT_LOGS (REGISTRO DE ACCIONES DE ADMIN)
-- ============================================================================

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  details JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_user_id ON admin_audit_logs(target_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON admin_audit_logs(action);

ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

DO $
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Admins can view audit logs'
    AND tablename = 'admin_audit_logs'
  ) THEN
    CREATE POLICY "Admins can view audit logs"
    ON admin_audit_logs FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'System can insert audit logs'
    AND tablename = 'admin_audit_logs'
  ) THEN
    CREATE POLICY "System can insert audit logs"
    ON admin_audit_logs FOR INSERT
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
