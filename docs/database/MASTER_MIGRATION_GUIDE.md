# 🗄️ Guía Maestra de Migraciones SQL - Kolink

## 📋 Resumen

Este documento lista **TODOS** los scripts SQL que debes ejecutar en Supabase en el orden correcto para tener la base de datos completa de Kolink v0.6.

**Total de scripts:** 8 archivos SQL
**Tiempo estimado:** 15-20 minutos
**Requisitos:** Acceso a Supabase SQL Editor con permisos de administrador

---

## ⚠️ IMPORTANTE: Orden de Ejecución

**Debes ejecutar los scripts en este orden específico** porque algunos dependen de tablas/funciones creadas por scripts anteriores.

---

## 📝 Scripts SQL por Orden de Ejecución

### 🔹 FASE 1: Extensiones y Core (OBLIGATORIO)

#### 1. `phase6_core_schema.sql` ⭐ **EJECUTAR PRIMERO**

**Ubicación:** `/docs/database/phase6_core_schema.sql`

**Qué hace:**
- ✅ Habilita extensiones: `pgcrypto`, `vector` (para embeddings)
- ✅ Enriquece tabla `profiles`:
  - Bio, headline, expertise
  - Tone profile (preferencias de tono)
  - Profile embedding (vector semántico)
  - LinkedIn tokens (access_token, refresh_token)
  - Features JSONB
- ✅ Enriquece tabla `posts`:
  - Style, content, hashtags
  - Metadata JSONB
  - Embedding (vector 1536 dimensiones)
  - Viral score
  - CTA suggestions
- ✅ Crea tabla `inspiration_posts` (hub de inspiración)
- ✅ Crea tabla `saved_posts` (posts guardados por usuario)
- ✅ Crea tabla `saved_searches` (búsquedas guardadas)
- ✅ Crea tabla `calendar_events` (eventos programados)
- ✅ Crea tabla `analytics_events` (eventos de analytics)
- ✅ Crea tabla `lead_insights` (insights de leads)
- ✅ Crea materialized views para analytics
- ✅ RLS policies completas
- ✅ Índices optimizados (incluye ivfflat para vector search)

**Dependencias:** Ninguna (ejecutar primero)

**Nota crítica:** Este script usa embeddings con `pgvector`. Si no tienes la extensión, verás un error. Instálala desde Supabase Dashboard → Database → Extensions → Enable "vector".

---

#### 2. `token_encryption_functions.sql` ⭐ **EJECUTAR SEGUNDO**

**Ubicación:** `/docs/database/token_encryption_functions.sql`

**Qué hace:**
- ✅ Habilita extensión `pgcrypto`
- ✅ Crea función `encrypt_token()` (encriptar tokens OAuth)
- ✅ Crea función `decrypt_token()` (desencriptar tokens)
- ✅ Grants de permisos para authenticated y service_role
- ⚠️ Incluye script de migración one-time (comentado)

**Dependencias:** Requiere que `profiles` tenga columnas de LinkedIn tokens (creadas en script #1)

**Uso:**
```sql
-- Encriptar token
UPDATE profiles
SET linkedin_access_token = encrypt_token(linkedin_access_token, 'YOUR_32_CHAR_KEY')
WHERE id = 'user-uuid';

-- Desencriptar token
SELECT decrypt_token(linkedin_access_token, 'YOUR_32_CHAR_KEY')
FROM profiles
WHERE id = 'user-uuid';
```

**⚠️ ADVERTENCIA:** Si ejecutas el bloque comentado de migración, encriptará TODOS los tokens existentes. Hazlo solo si ya tienes tokens en plaintext.

---

### 🔹 FASE 2: Analytics & Stats (OBLIGATORIO)

#### 3. `usage_stats_migration.sql` **EJECUTAR TERCERO**

**Ubicación:** `/docs/database/usage_stats_migration.sql`

**Qué hace:**
- ✅ Crea tabla `usage_stats`:
  - posts_generated
  - credits_used
  - last_activity
- ✅ Índices en user_id y created_at
- ✅ RLS policies (usuarios ven solo sus stats)
- ✅ Trigger para auto-actualizar `updated_at`
- ✅ Función `upsert_usage_stats()` para incrementar stats

**Dependencias:** Requiere tabla `profiles` (creada en script #1)

**Uso:**
```sql
-- Incrementar posts y créditos
SELECT upsert_usage_stats(
  'user-uuid',
  1,  -- +1 post
  1   -- -1 crédito
);
```

---

#### 4. `pgvector_search_function.sql` **EJECUTAR CUARTO**

**Ubicación:** `/docs/database/pgvector_search_function.sql`

**Qué hace:**
- ✅ Crea función `search_inspiration_posts()`:
  - Busca posts similares usando cosine similarity
  - Parámetros: query_embedding, threshold, limit
  - Retorna posts ordenados por similaridad
- ✅ Grants de permisos para authenticated y anon

**Dependencias:**
- Requiere extensión `vector` (habilitada en script #1)
- Requiere tabla `inspiration_posts` (creada en script #1)

**Uso:**
```sql
-- Buscar posts similares
SELECT * FROM search_inspiration_posts(
  '[0.1, 0.2, ...]'::vector(1536),  -- Tu embedding
  0.3,  -- threshold
  20    -- limit
);
```

---

### 🔹 FASE 3: Notificaciones & Admin (OBLIGATORIO)

#### 5. `admin_notifications_migration.sql` **EJECUTAR QUINTO**

**Ubicación:** `/docs/database/admin_notifications_migration.sql`

**Qué hace:**
- ✅ Crea tabla `admin_notifications`:
  - Mensajes de admin a usuarios
  - Tipos: info, warning, success, error
  - Campo `read` (leído/no leído)
  - Expiración automática (7 días)
- ✅ Índices en user_id, read, created_at
- ✅ RLS policies (usuarios leen solo sus notificaciones)
- ✅ Habilita Realtime (notificaciones instantáneas)
- ✅ Función `cleanup_expired_notifications()`
- ✅ Vista `user_unread_notifications` (contador de no leídas)

**Dependencias:** Requiere tabla `profiles` (creada en script #1)

**Uso (desde backend):**
```sql
-- Enviar notificación a usuario
INSERT INTO admin_notifications (user_id, message, type)
VALUES ('user-uuid', 'Nueva funcionalidad disponible!', 'info');
```

---

#### 6. `admin_system_migration.sql` **EJECUTAR SEXTO**

**Ubicación:** `/docs/database/admin_system_migration.sql`

**Qué hace:**
- ✅ Agrega columna `role` a `profiles` (user/admin)
- ✅ Agrega columna `last_login` a `profiles`
- ✅ Crea tabla `admin_audit_logs`:
  - Registro de acciones de admin
  - Campos: admin_id, action, target_user_id, details (JSONB)
- ✅ Índices en admin_id, target_user_id, action
- ✅ RLS policies (solo admins ven audit logs)
- ✅ Actualiza policies de `profiles` (admins pueden ver/editar todos)
- ✅ Función `log_admin_action()` (log automático)
- ✅ Función `is_admin()` (verificar si es admin)
- ✅ Trigger para actualizar `last_login` (comentado - requiere superuser)

**Dependencias:** Requiere tabla `profiles` (creada en script #1)

**Crear primer admin:**
```sql
-- Reemplaza con tu email
UPDATE profiles
SET role = 'admin'
WHERE email = 'tu-email@example.com';
```

**Uso:**
```sql
-- Verificar si es admin
SELECT is_admin('user-uuid');

-- Log acción de admin
SELECT log_admin_action(
  'admin-uuid',
  'modify_plan',
  'target-user-uuid',
  '{"old_plan": "basic", "new_plan": "premium"}'::jsonb
);
```

---

### 🔹 FASE 4: Emails & Gamificación (OBLIGATORIO)

#### 7. `welcome_email_trigger.sql` **EJECUTAR SÉPTIMO**

**Ubicación:** `/docs/database/welcome_email_trigger.sql`

**Qué hace:**
- ⚠️ Contiene 3 opciones de implementación (elige una):

  **Opción 1: Edge Function (Recomendada)**
  - Código TypeScript para Supabase Edge Function
  - Llama a `/api/emails/welcome-webhook` cuando se crea perfil

  **Opción 2: Database Trigger con pg_net**
  - Requiere extensión `pg_net`
  - Trigger SQL que hace HTTP request al webhook
  - Necesita configurar `app.supabase_service_role_key`

  **Opción 3: Manual Testing**
  - Query SQL manual para testing

**Dependencias:**
- Requiere tabla `profiles` (creada en script #1)
- Requiere API endpoint `/api/emails/welcome-webhook` (ya existe en tu código)

**Recomendación:** Usa **Opción 1 (Edge Function)** desde Supabase Dashboard → Edge Functions.

**⚠️ IMPORTANTE:** Este script está comentado con opciones. **Lee el archivo completo** antes de ejecutar.

---

#### 8. `inbox_schema.sql` ⭐ **EJECUTAR OCTAVO (NUEVO)**

**Ubicación:** `/docs/database/inbox_schema.sql`

**Qué hace:**
- ✅ Crea tabla `inbox_messages`:
  - Mensajes de LinkedIn (DM, menciones, comentarios)
  - Campos: platform, message_type, sender info
  - Estados: read, replied, starred, archived
  - LinkedIn IDs para threading
- ✅ Crea tabla `calendar_events` (extendida):
  - Posts agendados para publicación
  - Status: pending, published, failed, cancelled
  - Campos: platform, scheduled_time, ai_score
- ✅ Crea tabla `user_achievements`:
  - Sistema de gamificación
  - Tipos: first_post, streak_7, streak_30, power_user, etc.
  - XP, badges, iconos
- ✅ Agrega columnas a `profiles`:
  - `xp` (puntos de experiencia)
  - `level` (nivel del usuario)
  - `streak_days` (días consecutivos)
  - `last_activity_date`
  - `total_posts`
- ✅ Crea views útiles:
  - `inbox_unread_counts` (mensajes no leídos)
  - `upcoming_events` (eventos próximos)
  - `user_achievement_summary` (resumen de logros)
- ✅ Crea funciones:
  - `calculate_level()` (nivel basado en XP)
  - `grant_xp()` (otorgar XP y calcular nivel)
  - `update_streak()` (actualizar racha de días)
- ✅ Triggers automáticos:
  - XP al crear post
  - Logros automáticos (first_post, streak_7, etc.)
  - Updated_at automático
- ✅ RLS policies completas
- ✅ Índices optimizados

**Dependencias:** Requiere tabla `profiles` y `posts` (creadas en script #1)

**Características destacadas:**
- Sistema de gamificación completo
- Inbox de LinkedIn
- Calendar con status tracking
- Logros automáticos al crear posts

---

## 🎯 Orden de Ejecución Resumido

```sql
-- 1. Core schema (extensiones + tablas base)
phase6_core_schema.sql

-- 2. Encriptación de tokens
token_encryption_functions.sql

-- 3. Stats de uso
usage_stats_migration.sql

-- 4. Búsqueda semántica
pgvector_search_function.sql

-- 5. Notificaciones admin
admin_notifications_migration.sql

-- 6. Sistema admin completo
admin_system_migration.sql

-- 7. Trigger de email bienvenida (opcional)
welcome_email_trigger.sql

-- 8. Inbox + Gamificación (NUEVO)
inbox_schema.sql
```

---

## 🚀 Cómo Ejecutar

### Método 1: Supabase SQL Editor (Recomendado)

1. Ve a tu proyecto en Supabase: https://supabase.com/dashboard
2. Click en **SQL Editor** en el menú izquierdo
3. Click en **New Query**
4. **Para cada script en orden:**
   - Abre el archivo SQL en tu editor
   - Copia TODO el contenido
   - Pega en el SQL Editor de Supabase
   - Click en **Run** (botón verde)
   - Verifica que no hay errores en la consola
   - ✅ Si ves "Success", continúa con el siguiente

### Método 2: Supabase CLI (Avanzado)

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Link a tu proyecto
supabase link --project-ref your-project-ref

# Ejecutar cada script
supabase db execute -f docs/database/phase6_core_schema.sql
supabase db execute -f docs/database/token_encryption_functions.sql
supabase db execute -f docs/database/usage_stats_migration.sql
supabase db execute -f docs/database/pgvector_search_function.sql
supabase db execute -f docs/database/admin_notifications_migration.sql
supabase db execute -f docs/database/admin_system_migration.sql
supabase db execute -f docs/database/inbox_schema.sql
```

---

## ✅ Verificación Post-Migración

Después de ejecutar todos los scripts, verifica que las tablas existen:

```sql
-- Verificar tablas creadas
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'profiles',
  'posts',
  'usage_stats',
  'admin_notifications',
  'admin_audit_logs',
  'inspiration_posts',
  'saved_posts',
  'saved_searches',
  'calendar_events',
  'analytics_events',
  'lead_insights',
  'inbox_messages',
  'user_achievements'
)
ORDER BY table_name;

-- Debería retornar 13 tablas
```

```sql
-- Verificar columnas agregadas a profiles
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name IN (
  'bio', 'headline', 'expertise', 'tone_profile',
  'linkedin_access_token', 'role', 'last_login',
  'xp', 'level', 'streak_days', 'last_activity_date', 'total_posts'
)
ORDER BY column_name;

-- Debería retornar 12 columnas
```

```sql
-- Verificar funciones creadas
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'encrypt_token',
  'decrypt_token',
  'upsert_usage_stats',
  'search_inspiration_posts',
  'cleanup_expired_notifications',
  'log_admin_action',
  'is_admin',
  'calculate_level',
  'grant_xp',
  'update_streak'
)
ORDER BY routine_name;

-- Debería retornar 10 funciones
```

```sql
-- Verificar extensiones
SELECT extname, extversion
FROM pg_extension
WHERE extname IN ('pgcrypto', 'vector');

-- Debería retornar ambas extensiones
```

---

## 🐛 Troubleshooting

### Error: "extension vector does not exist"

**Solución:**
1. Ve a Supabase Dashboard → Database → Extensions
2. Busca "vector"
3. Click en **Enable**
4. Espera 30 segundos
5. Re-ejecuta el script

### Error: "extension pgcrypto does not exist"

**Solución:**
1. Supabase tiene pgcrypto por defecto
2. Si el error persiste, ejecuta manualmente:
   ```sql
   CREATE EXTENSION IF NOT EXISTS pgcrypto;
   ```

### Error: "table profiles does not exist"

**Solución:**
- Significa que no ejecutaste `phase6_core_schema.sql` primero
- Ejecuta los scripts en orden

### Error: "relation already exists"

**Solución:**
- Ya ejecutaste ese script antes
- Puedes saltearlo o usar `DROP TABLE IF EXISTS nombre_tabla CASCADE;` antes de ejecutar

### Error: "permission denied"

**Solución:**
- Necesitas permisos de administrador
- Ve a Supabase Dashboard → Project Settings → Database
- Verifica que estás conectado como usuario con rol `postgres`

---

## 📊 Schema Final Esperado

Después de ejecutar todos los scripts, tu base de datos tendrá:

### Tablas (13 total)
```
✅ profiles (extendida con 12 columnas nuevas)
✅ posts (extendida con 8 columnas nuevas)
✅ usage_stats
✅ admin_notifications
✅ admin_audit_logs
✅ inspiration_posts
✅ saved_posts
✅ saved_searches
✅ calendar_events (2 versiones: phase6 + inbox_schema)
✅ analytics_events
✅ lead_insights
✅ inbox_messages
✅ user_achievements
```

### Funciones (10 total)
```
✅ encrypt_token()
✅ decrypt_token()
✅ upsert_usage_stats()
✅ search_inspiration_posts()
✅ cleanup_expired_notifications()
✅ log_admin_action()
✅ is_admin()
✅ calculate_level()
✅ grant_xp()
✅ update_streak()
```

### Views (4 total)
```
✅ user_unread_notifications
✅ inbox_unread_counts
✅ upcoming_events
✅ user_achievement_summary
✅ vw_post_performance (materialized)
✅ vw_user_engagement (materialized)
```

### Extensiones (2 total)
```
✅ pgcrypto (encriptación)
✅ vector (embeddings)
```

---

## ⚠️ CONFLICTO: calendar_events

**IMPORTANTE:** Hay 2 scripts que crean la tabla `calendar_events`:
1. `phase6_core_schema.sql` (línea 102)
2. `inbox_schema.sql` (línea 55)

**Solución:**
- El script `inbox_schema.sql` usa `CREATE TABLE IF NOT EXISTS`, así que NO dará error
- Pero la tabla de `phase6_core_schema.sql` tiene menos campos
- **Recomendación:** Después de ejecutar ambos, ejecuta esto para agregar los campos faltantes:

```sql
-- Agregar campos de inbox_schema.sql a calendar_events si no existen
ALTER TABLE calendar_events
  ADD COLUMN IF NOT EXISTS content TEXT,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS platform_post_id TEXT,
  ADD COLUMN IF NOT EXISTS platform_post_url TEXT,
  ADD COLUMN IF NOT EXISTS error_message TEXT,
  ADD COLUMN IF NOT EXISTS optimal_time_suggested BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE;

-- Renombrar columna si es necesario
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'calendar_events' AND column_name = 'scheduled_at'
  ) THEN
    ALTER TABLE calendar_events RENAME COLUMN scheduled_at TO scheduled_time;
  END IF;
END $$;
```

---

## 📝 Notas Finales

1. **Backups:** Supabase hace backups automáticos, pero considera hacer uno manual antes de ejecutar
2. **Testing:** Ejecuta primero en un proyecto de testing/desarrollo
3. **Orden:** Respeta el orden de ejecución para evitar errores de dependencias
4. **welcome_email_trigger.sql:** Es opcional y requiere configuración adicional
5. **Encriptación:** No ejecutes el bloque de migración de tokens a menos que tengas tokens existentes

---

## 🎉 ¡Listo!

Después de ejecutar estos 8 scripts, tu base de datos de Kolink estará **100% completa** con:
- ✅ Sistema de gamificación
- ✅ Inbox de LinkedIn
- ✅ Calendar extendido
- ✅ Analytics avanzado
- ✅ Admin panel completo
- ✅ Notificaciones en tiempo real
- ✅ Búsqueda semántica
- ✅ Encriptación de tokens

**Tiempo total estimado:** 15-20 minutos

**Siguiente paso:** Implementar los componentes UI y API routes según `/docs/architecture/INTEGRATION_PLAN.md`

---

**Última actualización:** 2025-10-23
**Versión Kolink:** v0.6
**Autor:** Claude Code
