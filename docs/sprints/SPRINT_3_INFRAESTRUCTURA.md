# 🏗️ SPRINT 3: INFRAESTRUCTURA

**Duración Estimada:** 1 día (4 horas)
**Prioridad:** ALTA - FUNCIONALIDAD Y ESCALABILIDAD
**Objetivo:** Asegurar que toda la infraestructura es funcional y preparada para escalar

---

## 📋 RESUMEN DEL SPRINT

Este sprint se enfoca en garantizar que todos los componentes de infraestructura estén correctamente configurados: Redis/Upstash para rate limiting, migraciones de base de datos aplicadas, backups configurados, y corrección de configuraciones menores.

**Impacto si no se resuelve:**
- ⚠️ Rate limiting no distribuido → Posible abuso de APIs
- ⚠️ Tablas faltantes → Funcionalidades no disponibles
- ⚠️ Sin backups → Riesgo de pérdida de datos
- ⚠️ Analytics no funcionan → Sin visibilidad de métricas

---

## 🎯 OBJETIVOS DEL SPRINT

1. ✅ Configurar y validar Upstash Redis
2. ✅ Aplicar todas las migraciones de base de datos
3. ✅ Verificar y documentar backups de Supabase
4. ✅ Corregir typo en PostHog Host
5. ✅ Validar rate limiting distribuido

---

## 📝 TAREAS DETALLADAS

### TAREA 3.1: Configurar Upstash Redis
**Tiempo estimado:** 1 hora
**Prioridad:** ALTA

#### Problema identificado:
```env
REDIS_URL=redis://default:YOUR_PASSWORD@YOUR_REDIS_HOST:PORT
```
Variable con valor placeholder, lo que causa que el rate limiter caiga a modo in-memory.

#### Paso 1: Validar Upstash existente

Las credenciales ya configuradas:
```env
UPSTASH_REDIS_REST_URL="https://regular-magpie-13186.upstash.io"
UPSTASH_REDIS_REST_TOKEN="ATOCAAIncDJhNjg1ZjE5ZjQ5NjQ0ZDkyYTRhNDFmNzEzYjFhNWE0OXAyMTMxODY"
```

**Test de conexión:**
```bash
curl https://regular-magpie-13186.upstash.io \
  -H "Authorization: Bearer ATOCAAIncDJhNjg1ZjE5ZjQ5NjQ0ZDkyYTRhNDFmNzEzYjFhNWE0OXAyMTMxODY" \
  -d '["PING"]'

# Respuesta esperada: ["PONG"]
```

**Si funciona:**
```bash
# Remover variable REDIS_URL del .env.local
# (solo dejar Upstash)

# Verificar en Vercel
vercel env ls | grep -E "(REDIS|UPSTASH)"

# Debe mostrar:
# UPSTASH_REDIS_REST_URL (production)
# UPSTASH_REDIS_REST_TOKEN (production)
```

**Si NO funciona, crear nuevo:**

#### Paso 2: Crear nueva instancia en Upstash (si es necesario)

1. Ir a https://console.upstash.com/
2. Login / Signup
3. Click "Create Database"
4. Configurar:
   - **Name:** kolink-production
   - **Type:** Redis
   - **Region:** us-east-1 (cerca de Vercel)
   - **TLS:** Enabled
   - **Eviction:** allkeys-lru
5. Click "Create"

6. Copiar credenciales REST:
   - **UPSTASH_REDIS_REST_URL:** `https://xxx.upstash.io`
   - **UPSTASH_REDIS_REST_TOKEN:** `AxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxPxxxxx`

7. Configurar en Vercel:
```bash
vercel env rm UPSTASH_REDIS_REST_URL production
vercel env rm UPSTASH_REDIS_REST_TOKEN production

vercel env add UPSTASH_REDIS_REST_URL production
# Pegar URL

vercel env add UPSTASH_REDIS_REST_TOKEN production
# Pegar token

# Remover variable placeholder
vercel env rm REDIS_URL production
```

#### Paso 3: Validar en código

Verificar `src/lib/rateLimiter.ts`:

```typescript
import { Redis } from '@upstash/redis';

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

let redis: Redis | null = null;
let redisEnabled = false;

if (redisUrl && redisToken) {
  redis = new Redis({
    url: redisUrl,
    token: redisToken,
  });
  redisEnabled = true;

  // Test de conexión al inicializar
  redis.ping().then(() => {
    console.log('[RateLimiter] ✅ Redis connected successfully');
  }).catch(err => {
    console.error('[RateLimiter] ❌ Redis connection failed:', err);
    redisEnabled = false;
  });
} else {
  console.warn('[RateLimiter] ⚠️ Redis not configured, falling back to in-memory');
}

export async function rateLimit(userId: string, limit = 10): Promise<boolean> {
  if (!redisEnabled || !redis) {
    // Fallback to in-memory (temporal)
    console.warn('[RateLimiter] Using in-memory rate limiting');
    return true;
  }

  const key = `rate_limit:${userId}`;
  const now = Date.now();
  const windowMs = 60000; // 1 minuto

  try {
    // Implementación con Redis
    const count = await redis.incr(key);

    if (count === 1) {
      await redis.expire(key, Math.ceil(windowMs / 1000));
    }

    return count <= limit;
  } catch (error) {
    console.error('[RateLimiter] Error:', error);
    return true; // Fail open (permitir en caso de error)
  }
}
```

#### Paso 4: Probar rate limiting

```bash
# Deploy
vercel --prod

# Esperar...

# Probar con 15 requests seguidas
for i in {1..15}; do
  curl -X POST https://kolink.es/api/generate \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer YOUR_JWT" \
    -d '{"prompt":"test"}' &
done

# Las últimas 5 deberían retornar 429 Too Many Requests
```

#### Verificar logs:
```bash
vercel logs --follow | grep RateLimiter

# Debe aparecer:
# [RateLimiter] ✅ Redis connected successfully
# (NO debe aparecer "Using in-memory")
```

#### Checklist Tarea 3.1:
- [ ] Conexión a Upstash validada con `curl`
- [ ] Variables configuradas en Vercel (2 variables)
- [ ] Variable `REDIS_URL` removida
- [ ] Código de rate limiter actualizado
- [ ] Logs muestran "Redis connected successfully"
- [ ] Test de rate limiting: 10+ requests son bloqueadas

---

### TAREA 3.2: Aplicar Migraciones de Base de Datos
**Tiempo estimado:** 2 horas
**Prioridad:** CRÍTICA

#### Problema identificado:
18 migraciones SQL en `supabase/migrations/` sin evidencia de ejecución en producción.

**Migración duplicada ya resuelta:**
- ✅ `20250309T120000Z_create_admin_notifications.sql` modificada para ser idempotente

#### Paso 1: Instalar Supabase CLI

```bash
# macOS
brew install supabase/tap/supabase

# Verificar instalación
supabase --version
```

#### Paso 2: Login y vincular proyecto

```bash
# Login
supabase login

# Vincular proyecto
supabase link --project-ref crdtxyfvbosjiddirtzc

# Ingresar contraseña de DB cuando se solicite
```

#### Paso 3: Ver estado de migraciones

```bash
# Ver migraciones remotas aplicadas
supabase db remote list

# Ver migraciones locales pendientes
ls -la supabase/migrations/
```

#### Paso 4: Validar migraciones localmente (opcional)

```bash
# Iniciar Supabase local
supabase start

# Aplicar migraciones localmente para probar
supabase db reset

# Verificar que no hay errores
# Si todo está OK, proceder a producción
```

#### Paso 5: Aplicar migraciones a producción

```bash
# IMPORTANTE: Hacer backup antes (ver Tarea 3.3)

# Aplicar todas las migraciones pendientes
supabase db push

# Esperar confirmación...
# ✅ All migrations applied successfully
```

#### Paso 6: Verificar tablas creadas

```bash
# Conectar a DB de producción
psql "postgresql://postgres:[PASSWORD]@db.crdtxyfvbosjiddirtzc.supabase.co:5432/postgres"
```

```sql
-- Verificar todas las tablas
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Expected (mínimo):
-- admin_audit_logs
-- admin_notifications
-- calendar_events
-- generations
-- inspiration
-- login_history
-- password_history
-- password_policies
-- password_reset_tokens
-- payment_logs (si se creó en Sprint 2)
-- post_metrics
-- posts
-- profiles
-- rag_cache
-- security_alerts
-- security_metrics
-- usage_stats
-- user_2fa_attempts
-- user_2fa_settings
-- user_post_embeddings
-- user_posts
-- user_sessions
-- viral_corpus
-- viral_embeddings
```

#### Paso 7: Verificar funciones de RAG

```sql
-- Verificar funciones creadas
SELECT proname, proargnames
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND (proname LIKE '%semantic%' OR proname LIKE '%embedding%')
ORDER BY proname;

-- Expected:
-- semantic_search_posts
-- semantic_search_viral
-- update_post_embedding
-- etc.
```

#### Paso 8: Verificar índices

```sql
-- Verificar índices HNSW para vector search
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE '%hnsw%';

-- Expected:
-- user_post_embeddings_hnsw_idx
-- viral_embeddings_hnsw_idx
```

#### Paso 9: Verificar RLS policies

```sql
-- Verificar políticas de seguridad
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Verificar que cada tabla tiene policies adecuadas
```

#### Paso 10: Ejecutar script de verificación

```bash
# Ejecutar script de pre-deployment
npm run predeploy:verify

# Debe retornar:
# ✅ All migrations applied
# ✅ All tables created
# ✅ All functions exist
# ✅ All indices created
# ✅ RLS policies configured
```

#### Checklist Tarea 3.2:
- [ ] Supabase CLI instalado
- [ ] Proyecto vinculado correctamente
- [ ] Migraciones validadas localmente (opcional)
- [ ] 18 migraciones aplicadas exitosamente
- [ ] Todas las tablas críticas creadas (23+ tablas)
- [ ] Funciones de RAG disponibles (3+ funciones)
- [ ] Índices HNSW creados (2+ índices)
- [ ] RLS policies configuradas
- [ ] Script `predeploy:verify` pasa sin errores

---

### TAREA 3.3: Verificar y Documentar Backups
**Tiempo estimado:** 30 minutos
**Prioridad:** CRÍTICA

#### Paso 1: Verificar backups automáticos en Supabase

1. Ir a Supabase Dashboard
2. Settings → Database → Backups
3. Verificar:
   - ✅ Backups automáticos habilitados
   - ✅ Frecuencia: Diaria
   - ✅ Retención: Mínimo 7 días
   - ✅ Último backup exitoso (debe ser reciente)

#### Paso 2: Probar restauración (desarrollo)

```bash
# Descargar backup más reciente
supabase db dump --db-url "postgresql://postgres:[PASSWORD]@db.crdtxyfvbosjiddirtzc.supabase.co:5432/postgres" > backup_test.sql

# Verificar que el archivo no está vacío
ls -lh backup_test.sql
```

#### Paso 3: Crear script de backup manual

```bash
#!/bin/bash
# scripts/backup-db.sh

set -e

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backups"
BACKUP_FILE="$BACKUP_DIR/backup_$DATE.sql"

# Crear directorio si no existe
mkdir -p "$BACKUP_DIR"

echo "🔄 Creating backup..."

# Backup usando pg_dump
pg_dump "postgresql://postgres:${SUPABASE_DB_PASSWORD}@db.crdtxyfvbosjiddirtzc.supabase.co:5432/postgres" > "$BACKUP_FILE"

# Comprimir
echo "🗜️ Compressing..."
gzip "$BACKUP_FILE"

echo "✅ Backup created: $BACKUP_FILE.gz"
echo "📦 Size: $(du -h "$BACKUP_FILE.gz" | cut -f1)"

# Limpiar backups antiguos (mantener últimos 7)
echo "🧹 Cleaning old backups..."
ls -t "$BACKUP_DIR"/backup_*.sql.gz | tail -n +8 | xargs -r rm

echo "✅ Backup complete!"
```

Hacer ejecutable:
```bash
chmod +x scripts/backup-db.sh
```

#### Paso 4: Documentar procedimiento de restauración

Crear documento:

```markdown
# Procedimiento de Restauración de Base de Datos

## Cuándo restaurar

- Pérdida de datos por error
- Corrupción de base de datos
- Rollback de migración fallida
- Recuperación de desastre

## Pasos para restauración

### 1. Identificar backup a restaurar

```bash
# Listar backups disponibles
ls -lh backups/

# O verificar en Supabase Dashboard → Backups
```

### 2. Descargar backup (si está en Supabase)

1. Dashboard → Database → Backups
2. Seleccionar backup deseado
3. Click "Download"

### 3. Restaurar en nueva base de datos (RECOMENDADO)

```bash
# NUNCA restaurar directamente en producción
# Crear nueva DB temporal primero

# Restaurar
psql "postgresql://postgres:[PASSWORD]@NEW_DB_HOST:5432/postgres" < backup.sql

# Verificar datos
# Si todo está OK, migrar datos a producción
```

### 4. Restaurar en producción (EXTREMA PRECAUCIÓN)

```bash
# ⚠️ ESTO SOBRESCRIBIRÁ TODA LA BASE DE DATOS

# 1. Hacer backup actual primero
./scripts/backup-db.sh

# 2. Notificar a usuarios (poner app en mantenimiento)

# 3. Restaurar
psql "postgresql://postgres:[PASSWORD]@db.crdtxyfvbosjiddirtzc.supabase.co:5432/postgres" < backup.sql

# 4. Verificar
# 5. Quitar modo mantenimiento
```

## Verificación post-restauración

```sql
-- Verificar conteo de tablas
SELECT COUNT(*) FROM profiles;
SELECT COUNT(*) FROM posts;
SELECT COUNT(*) FROM usage_stats;

-- Verificar último registro
SELECT MAX(created_at) FROM profiles;
```
```

Guardar en `/docs/procedures/RESTORE_PROCEDURE.md`

#### Paso 5: Configurar backup programado (opcional)

```bash
# Agregar a crontab (backup diario a las 3 AM)
crontab -e

# Agregar línea:
0 3 * * * /Users/aramzakzuk/Proyectos/kolink/scripts/backup-db.sh >> /Users/aramzakzuk/Proyectos/kolink/logs/backup.log 2>&1
```

#### Checklist Tarea 3.3:
- [ ] Backups automáticos verificados en Supabase
- [ ] Frecuencia: Diaria
- [ ] Retención: Mínimo 7 días
- [ ] Último backup exitoso (< 24 horas)
- [ ] Script de backup manual creado
- [ ] Test de backup manual exitoso
- [ ] Procedimiento de restauración documentado
- [ ] Backup programado configurado (opcional)

---

### TAREA 3.4: Corregir PostHog Host
**Tiempo estimado:** 5 minutos
**Prioridad:** BAJA

#### Problema identificado:
```env
NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.comli  # ❌ Typo
```

#### Solución:

```bash
# Corregir en Vercel
vercel env rm NEXT_PUBLIC_POSTHOG_HOST production

vercel env add NEXT_PUBLIC_POSTHOG_HOST production
# Valor correcto: https://eu.i.posthog.com

# Redeploy
vercel --prod
```

#### Verificar en código:

```typescript
// src/lib/posthog.ts o donde se inicialice
import posthog from 'posthog-js';

if (typeof window !== 'undefined') {
  posthog.init(
    process.env.NEXT_PUBLIC_POSTHOG_API_KEY!,
    {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com',
      loaded: (posthog) => {
        console.log('[PostHog] ✅ Initialized successfully');
      }
    }
  );
}
```

#### Validar en navegador:

1. Abrir https://kolink.es
2. Abrir DevTools → Network
3. Filtrar por "posthog"
4. Debe haber requests a `https://eu.i.posthog.com/e/` (no "comli")

#### Checklist Tarea 3.4:
- [ ] Variable corregida en Vercel
- [ ] Redeploy completado
- [ ] Requests a PostHog funcionando
- [ ] No hay errores en consola de navegador

---

### TAREA 3.5: Validar Rate Limiting Distribuido
**Tiempo estimado:** 30 minutos
**Prioridad:** ALTA

#### Paso 1: Crear script de prueba

```bash
#!/bin/bash
# scripts/test-rate-limit.sh

USER_ID="test-user-$(date +%s)"
ENDPOINT="https://kolink.es/api/generate"
TOKEN="YOUR_JWT_TOKEN" # Reemplazar con token real

echo "🧪 Testing rate limiting for user: $USER_ID"
echo "📊 Sending 15 requests..."

for i in {1..15}; do
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$ENDPOINT" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"prompt\":\"test $i\",\"userId\":\"$USER_ID\"}")

  STATUS=$(echo "$RESPONSE" | tail -n1)

  if [ "$STATUS" -eq 200 ]; then
    echo "✅ Request $i: SUCCESS (200)"
  elif [ "$STATUS" -eq 429 ]; then
    echo "🛑 Request $i: RATE LIMITED (429)"
  else
    echo "❌ Request $i: ERROR ($STATUS)"
  fi

  sleep 0.1
done

echo "✅ Test complete!"
```

Hacer ejecutable:
```bash
chmod +x scripts/test-rate-limit.sh
```

#### Paso 2: Ejecutar prueba

```bash
./scripts/test-rate-limit.sh
```

**Salida esperada:**
```
🧪 Testing rate limiting for user: test-user-1730821234
📊 Sending 15 requests...
✅ Request 1: SUCCESS (200)
✅ Request 2: SUCCESS (200)
...
✅ Request 10: SUCCESS (200)
🛑 Request 11: RATE LIMITED (429)
🛑 Request 12: RATE LIMITED (429)
...
🛑 Request 15: RATE LIMITED (429)
✅ Test complete!
```

#### Paso 3: Verificar en Upstash Dashboard

1. Ir a https://console.upstash.com/
2. Seleccionar database de Kolink
3. Click "Data Browser"
4. Buscar keys con patrón `rate_limit:*`
5. Debe haber entry para el user testeado

#### Paso 4: Verificar logs en Vercel

```bash
vercel logs --follow | grep -E "(RateLimiter|429)"
```

Debe aparecer:
```
[RateLimiter] ✅ Redis connected successfully
[RateLimiter] Rate limit exceeded for user: test-user-1730821234
```

#### Checklist Tarea 3.5:
- [ ] Script de prueba creado
- [ ] Test ejecutado exitosamente
- [ ] Requests 1-10: SUCCESS (200)
- [ ] Requests 11-15: RATE LIMITED (429)
- [ ] Keys visibles en Upstash Dashboard
- [ ] Logs en Vercel confirman rate limiting

---

## ✅ CHECKLIST FINAL DEL SPRINT 3

### Redis / Upstash
- [ ] Conexión validada con `curl`
- [ ] Variables configuradas en Vercel (2 variables)
- [ ] Variable `REDIS_URL` removida
- [ ] Logs muestran "Redis connected successfully"
- [ ] Rate limiting funcional (test con 15 requests)

### Migraciones
- [ ] Supabase CLI instalado
- [ ] 18 migraciones aplicadas exitosamente
- [ ] Todas las tablas críticas creadas (23+ tablas)
- [ ] Funciones de RAG disponibles
- [ ] Índices HNSW creados
- [ ] RLS policies configuradas
- [ ] Script `predeploy:verify` pasa

### Backups
- [ ] Backups automáticos verificados (diarios)
- [ ] Retención: Mínimo 7 días
- [ ] Script de backup manual creado
- [ ] Procedimiento de restauración documentado

### Configuraciones
- [ ] PostHog host corregido
- [ ] PostHog enviando eventos correctamente

---

## 🚨 CRITERIOS DE ÉXITO

Este sprint se considera exitoso cuando:

1. ✅ Redis/Upstash funciona correctamente
2. ✅ Rate limiting distribuido validado
3. ✅ Todas las migraciones aplicadas sin errores
4. ✅ Backups verificados y documentados
5. ✅ PostHog configurado correctamente

---

## 📊 MÉTRICAS

- **Redis uptime:** 99.9%+
- **Migraciones aplicadas:** 18/18
- **Tablas creadas:** 23+
- **Rate limit effectiveness:** 100% (requests 11+ bloqueadas)
- **Backups:** Configurados y validados

---

## 🆘 TROUBLESHOOTING

### Problema: Migración falla con error de duplicación

**Solución:**
```sql
-- Verificar si tabla ya existe
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'TABLE_NAME';

-- Si existe, modificar migración para ser idempotente:
CREATE TABLE IF NOT EXISTS table_name (...);
```

### Problema: Redis no conecta

**Solución:**
```bash
# Verificar credenciales
curl https://UPSTASH_URL \
  -H "Authorization: Bearer UPSTASH_TOKEN" \
  -d '["PING"]'

# Si falla, regenerar credenciales en Upstash Dashboard
```

### Problema: Rate limiting no funciona

**Solución:**
1. Verificar logs: `vercel logs | grep RateLimiter`
2. Si dice "Using in-memory", verificar variables en Vercel
3. Verificar código en `src/lib/rateLimiter.ts`
4. Redesploy: `vercel --prod`

---

## 📞 RECURSOS

- **Upstash Console:** https://console.upstash.com/
- **Supabase Dashboard:** https://supabase.com/dashboard/project/crdtxyfvbosjiddirtzc
- **PostHog Dashboard:** https://app.posthog.com/

---

## 🎯 PRÓXIMO SPRINT

Una vez completado este sprint exitosamente, proceder con:
**[SPRINT 4: MONITOREO Y ALERTAS](./SPRINT_4_MONITOREO.md)**

---

**Creado:** 2025-11-05
**Última actualización:** 2025-11-05
**Sprint Owner:** Equipo Kolink
