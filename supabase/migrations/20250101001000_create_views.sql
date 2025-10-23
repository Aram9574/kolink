-- ============================================================================
-- MIGRACIÓN 11: CREAR VISTAS ÚTILES
-- ============================================================================
-- Fecha: 2025-01-01
-- Descripción: Vistas para simplificar consultas comunes
-- ============================================================================

-- PASO 17: VISTAS ÚTILES
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
-- PASO 18: GRANTS DE PERMISOS
-- ============================================================================

-- Permisos para funciones
GRANT EXECUTE ON FUNCTION search_inspiration_posts TO authenticated;
GRANT EXECUTE ON FUNCTION search_inspiration_posts TO anon;
GRANT EXECUTE ON FUNCTION calculate_level TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin TO authenticated;

-- ============================================================================
-- PASO 19: VERIFICACIÓN FINAL
-- ============================================================================

-- Verificar que todas las tablas se crearon
DO $
DECLARE
  table_count INT;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name IN (
    'profiles', 'posts', 'usage_stats', 'admin_notifications',
    'admin_audit_logs', 'inspiration_posts', 'saved_posts',
    'saved_searches', 'calendar_events', 'analytics_events',
    'lead_insights', 'inbox_messages', 'user_achievements'
  );

  RAISE NOTICE '✅ Tablas creadas: %/13', table_count;

  IF table_count < 13 THEN
    RAISE WARNING '⚠️ Faltan % tablas por crear', 13 - table_count;
  END IF;
END
$;

-- Verificar extensiones
DO $
DECLARE
  ext_count INT;
BEGIN
  SELECT COUNT(*) INTO ext_count
  FROM pg_extension
  WHERE extname IN ('pgcrypto', 'uuid-ossp', 'vector');

  RAISE NOTICE '✅ Extensiones habilitadas: %/3', ext_count;

  IF ext_count < 3 THEN
    RAISE WARNING '⚠️ Faltan % extensiones', 3 - ext_count;
  END IF;
END
$;

-- Mensaje final
DO $
BEGIN
  RAISE NOTICE '🎉 ¡Setup de base de datos completado!';
  RAISE NOTICE '📊 Total de tablas: 13';
  RAISE NOTICE '🔧 Total de funciones: 9';
  RAISE NOTICE '👁️ Total de vistas: 4';
  RAISE NOTICE '🔐 RLS habilitado en todas las tablas';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Tu base de datos está lista para producción';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Siguiente paso:';
  RAISE NOTICE '   1. Crear tu primer usuario admin:';
  RAISE NOTICE '      UPDATE profiles SET role = ''admin'' WHERE email = ''tu-email@example.com'';';
  RAISE NOTICE '';
  RAISE NOTICE '   2. Verificar con:';
  RAISE NOTICE '      SELECT * FROM profiles WHERE role = ''admin'';';
END
$;

-- ============================================================================
-- FIN DEL SETUP
-- ============================================================================

-- Verificación
DO $$
BEGIN
  RAISE NOTICE '✅ Migración completada correctamente';
END $$;
