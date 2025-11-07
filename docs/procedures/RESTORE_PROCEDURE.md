# Procedimiento de Restauración de Base de Datos - Kolink

**Última actualización:** 2025-11-07

---

## 📋 Cuándo Restaurar

Considera restaurar la base de datos en estos escenarios:

1. **Pérdida de datos por error humano**
   - Eliminación accidental de registros
   - UPDATE/DELETE incorrectos

2. **Corrupción de base de datos**
   - Inconsistencias en datos
   - Índices corruptos

3. **Rollback de migración fallida**
   - Migración que causó errores
   - Cambios de schema incorrectos

4. **Recuperación de desastre**
   - Fallo total del servidor
   - Problema en Supabase

5. **Ambiente de pruebas**
   - Clonar producción a desarrollo
   - Testing de migraciones

---

## ⚠️ IMPORTANTE: Antes de Empezar

### Precauciones Críticas

1. **NUNCA restaurar directamente en producción** sin probar primero
2. **Siempre hacer backup del estado actual** antes de restaurar
3. **Notificar a usuarios** si la app estará en mantenimiento
4. **Verificar el backup** antes de usarlo
5. **Tener plan B** en caso de que la restauración falle

### Información Necesaria

Antes de comenzar, ten a mano:
- [ ] Backup file (`.sql` o `.sql.gz`)
- [ ] Timestamp del backup (para verificar fecha correcta)
- [ ] Acceso a Supabase Dashboard
- [ ] Supabase CLI instalado y configurado
- [ ] Acceso al proyecto vinculado

---

## 🔍 Paso 1: Identificar Backup a Restaurar

### Opción A: Listar backups locales

```bash
# Ver backups disponibles
ls -lh backups/

# Ver detalles del backup
gunzip -c backups/backup_20251107_143022.sql.gz | head -n 20
```

### Opción B: Descargar desde Supabase Dashboard

1. Ir a: https://supabase.com/dashboard/project/crdtxyfvbosjiddirtzc
2. Click en **Database** en el sidebar
3. Click en **Backups**
4. Ver lista de backups automáticos disponibles
5. Seleccionar backup deseado (verificar fecha/hora)
6. Click **"Download"** o **"Restore"**

### Verificar Integridad del Backup

```bash
# Si está comprimido, descomprimir
gunzip -c backups/backup_20251107_143022.sql.gz > temp_backup.sql

# Verificar que no está vacío
wc -l temp_backup.sql
# Debe mostrar > 1000 líneas

# Ver primeras líneas (debe tener estructura SQL)
head -n 50 temp_backup.sql

# Ver tablas incluidas
grep "CREATE TABLE" temp_backup.sql | wc -l
# Debe mostrar ~23+ tablas
```

---

## 🧪 Paso 2: Probar Restauración en Ambiente de Desarrollo

**⚠️ CRÍTICO:** SIEMPRE probar primero en desarrollo/staging antes de producción

### Opción A: Restaurar en Supabase local

```bash
# 1. Iniciar Supabase local (si no está corriendo)
supabase start

# 2. Descomprimir backup
gunzip backups/backup_20251107_143022.sql.gz

# 3. Restaurar en DB local
supabase db reset --linked < backups/backup_20251107_143022.sql

# 4. Verificar datos
supabase db diff
```

### Opción B: Crear proyecto temporal en Supabase

1. Ir a https://supabase.com/dashboard
2. Click **"New Project"**
3. Nombre: `kolink-restore-test-YYYYMMDD`
4. Configurar y esperar a que se cree
5. Restaurar backup en este proyecto temporal
6. Verificar datos
7. Si todo OK, proceder con producción
8. Eliminar proyecto temporal después

---

## 📊 Paso 3: Verificar Datos del Backup

Antes de aplicar en producción, verificar que el backup contiene los datos esperados:

### Verificar conteo de registros

```sql
-- Conectar a DB temporal
psql "postgresql://postgres:[PASSWORD]@[TEMP_HOST]:5432/postgres"

-- Verificar conteos principales
SELECT 'profiles' as table_name, COUNT(*) as count FROM profiles
UNION ALL
SELECT 'posts', COUNT(*) FROM posts
UNION ALL
SELECT 'usage_stats', COUNT(*) FROM usage_stats
UNION ALL
SELECT 'generations', COUNT(*) FROM generations;

-- Resultado esperado (ejemplo):
--   table_name   | count
-- ---------------+-------
--   profiles     |   142
--   posts        |  1523
--   usage_stats  |   304
--   generations  |   856
```

### Verificar timestamps

```sql
-- Verificar último registro creado (debe coincidir con fecha del backup)
SELECT
  'profiles' as table_name,
  MAX(created_at) as last_record
FROM profiles
UNION ALL
SELECT 'posts', MAX(created_at) FROM posts
UNION ALL
SELECT 'generations', MAX(created_at) FROM generations;

-- Ejemplo de resultado:
--   table_name | last_record
-- -------------+---------------------
--   profiles   | 2025-11-07 14:22:31
--   posts      | 2025-11-07 14:28:45
--   generations| 2025-11-07 14:30:12
```

### Verificar integridad referencial

```sql
-- Verificar que no hay referencias rotas
SELECT
  COUNT(*) as broken_refs
FROM posts p
LEFT JOIN profiles pr ON p.user_id = pr.id
WHERE pr.id IS NULL;

-- Debe retornar: broken_refs = 0
```

---

## 🚨 Paso 4: Backup del Estado Actual (Producción)

**ANTES de restaurar en producción, hacer backup del estado actual**

```bash
# Ejecutar script de backup
./scripts/backup-db.sh

# O manualmente
DATE=$(date +%Y%m%d_%H%M%S)
supabase db dump --linked > backups/pre_restore_backup_$DATE.sql
gzip backups/pre_restore_backup_$DATE.sql

# Verificar que el backup se creó
ls -lh backups/pre_restore_backup_*.sql.gz
```

---

## 🔒 Paso 5: Poner Aplicación en Modo Mantenimiento

### Opción A: Vercel Maintenance Mode

```bash
# Crear página de mantenimiento
cat > public/maintenance.html <<'EOF'
<!DOCTYPE html>
<html>
<head>
  <title>Kolink - Mantenimiento</title>
  <meta charset="utf-8">
  <style>
    body { font-family: system-ui; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #1a1a1a; color: #fff; }
    .container { text-align: center; }
    h1 { font-size: 3rem; margin: 0; }
    p { font-size: 1.2rem; color: #999; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚧 Mantenimiento</h1>
    <p>Kolink está en mantenimiento. Volveremos pronto.</p>
    <p>Tiempo estimado: 15 minutos</p>
  </div>
</body>
</html>
EOF

# Redireccionar todo el tráfico a maintenance.html
# (Configurar en vercel.json o middleware)
```

### Opción B: Vercel Environment Variable

```bash
# Agregar variable de mantenimiento
vercel env add MAINTENANCE_MODE production
# Valor: true

# Redeploy
vercel --prod

# La app debe mostrar página de mantenimiento
```

### Opción C: Notificar en Dashboard

Agregar banner en dashboard:
```javascript
// En src/pages/_app.tsx o dashboard
{process.env.MAINTENANCE_MODE === 'true' && (
  <div className="bg-yellow-500 text-black p-2 text-center">
    🚧 Mantenimiento en progreso. Algunas funciones pueden no estar disponibles.
  </div>
)}
```

---

## 🔄 Paso 6: Ejecutar Restauración en Producción

### Método 1: Usando Supabase Dashboard (Recomendado)

1. Ir a: https://supabase.com/dashboard/project/crdtxyfvbosjiddirtzc/database/backups
2. Seleccionar backup a restaurar
3. Click **"Restore"**
4. Confirmar (leer advertencia)
5. Esperar a que complete (puede tomar 5-15 minutos)
6. Verificar que el status cambió a "Completed"

### Método 2: Usando Supabase CLI

```bash
# 1. Asegurarse de estar vinculado al proyecto correcto
supabase link --project-ref crdtxyfvbosjiddirtzc

# 2. Descomprimir backup
gunzip backups/backup_20251107_143022.sql.gz

# 3. Aplicar backup (CUIDADO: Esto sobrescribirá TODA la DB)
supabase db push --include-all < backups/backup_20251107_143022.sql

# O usando supabase db reset (recrea DB desde migraciones + data)
supabase db reset --linked < backups/backup_20251107_143022.sql
```

### Método 3: Manual via SQL (Solo si otros métodos fallan)

```bash
# Conectar directamente con psql (necesita instalación)
psql "postgresql://postgres:[PASSWORD]@db.crdtxyfvbosjiddirtzc.supabase.co:5432/postgres" < backups/backup_20251107_143022.sql
```

---

## ✅ Paso 7: Verificación Post-Restauración

### Verificar conteos

```sql
-- Conectar a producción
-- Dashboard → SQL Editor

-- Verificar que los conteos coinciden con el backup
SELECT 'profiles' as table, COUNT(*) FROM profiles
UNION ALL
SELECT 'posts', COUNT(*) FROM posts
UNION ALL
SELECT 'generations', COUNT(*) FROM generations;

-- Comparar con los conteos verificados en Paso 3
```

### Verificar timestamps

```sql
-- Verificar último registro (debe coincidir con fecha del backup)
SELECT MAX(created_at) FROM profiles;
SELECT MAX(created_at) FROM posts;
SELECT MAX(created_at) FROM generations;
```

### Verificar funcionalidad crítica

```sql
-- Test de login (verificar que usuarios existen)
SELECT id, email, plan, credits
FROM profiles
LIMIT 5;

-- Test de posts (verificar relaciones)
SELECT p.id, p.prompt, pr.email
FROM posts p
JOIN profiles pr ON p.user_id = pr.id
LIMIT 5;

-- Test de analytics
SELECT COUNT(*) FROM usage_stats
WHERE created_at > NOW() - INTERVAL '7 days';
```

### Verificar índices y constraints

```sql
-- Verificar índices HNSW (para RAG)
SELECT indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE '%hnsw%';

-- Debe mostrar:
-- user_post_embeddings_hnsw_idx
-- viral_embeddings_hnsw_idx

-- Verificar constraints
SELECT conname, contype
FROM pg_constraint
WHERE conrelid = 'public.profiles'::regclass;
```

---

## 🎯 Paso 8: Pruebas de Funcionalidad

### Tests Manuales

1. **Login**
   - Ir a https://kolink.es/signin
   - Intentar login con usuario de prueba
   - Verificar que redirige a dashboard

2. **Dashboard**
   - Verificar que muestra plan y créditos correctos
   - Verificar que muestra historial de posts

3. **Generación de Contenido**
   - Intentar generar un post nuevo
   - Verificar que se deduce crédito
   - Verificar que aparece en historial

4. **Pagos** (Test Mode)
   - Intentar hacer checkout
   - Verificar que Stripe funciona
   - Verificar webhook (sin completar pago)

### Tests Automatizados

```bash
# Ejecutar test suite
npm test

# O test end-to-end
npm run test:e2e

# Verificar que todos pasan
```

---

## 🔓 Paso 9: Remover Modo Mantenimiento

### Si usaste variable de entorno:

```bash
# Remover variable
vercel env rm MAINTENANCE_MODE production

# Redeploy
vercel --prod
```

### Si usaste página estática:

```bash
# Remover archivo de mantenimiento
rm public/maintenance.html

# Commit y deploy
git add public/
git commit -m "chore: remove maintenance mode"
git push
```

### Verificar que la app está accesible

```bash
# Test de conectividad
curl -I https://kolink.es

# Debe retornar 200 OK
```

---

## 📧 Paso 10: Notificar a Usuarios (Opcional)

### Email de notificación

```javascript
// Usar Resend para enviar email
import { getResendClient, FROM_EMAIL } from '@/lib/resend';

await resendClient.emails.send({
  from: FROM_EMAIL,
  to: allActiveUsers, // Array de emails
  subject: 'Kolink - Mantenimiento completado',
  html: `
    <h2>Mantenimiento Completado</h2>
    <p>El mantenimiento de Kolink ha sido completado exitosamente.</p>
    <p>Todas las funciones están operativas nuevamente.</p>
    <p>Gracias por tu paciencia.</p>
  `
});
```

---

## 🆘 Troubleshooting

### Problema: Restauración falla con error de permisos

**Error:**
```
ERROR:  permission denied for table profiles
```

**Solución:**
```bash
# Asegurarse de usar Service Role Key, no Anon Key
vercel env ls | grep SUPABASE_SERVICE_ROLE_KEY

# O conectar como superusuario en Supabase Dashboard
```

---

### Problema: Tablas duplicadas

**Error:**
```
ERROR:  relation "profiles" already exists
```

**Solución:**
```sql
-- Opción 1: Drop y recrear (CUIDADO: Pérdida de datos)
DROP TABLE IF EXISTS profiles CASCADE;

-- Opción 2: Usar backup que incluya DROP statements
-- Editar backup.sql y agregar al inicio:
-- DROP TABLE IF EXISTS [table_name] CASCADE;
```

---

### Problema: Migraciones no coinciden

**Error:**
```
ERROR:  migration version mismatch
```

**Solución:**
```bash
# Forzar reset de migraciones
supabase db reset --linked --force

# Aplicar todas las migraciones desde cero
supabase db push --include-all
```

---

### Problema: Restauración toma demasiado tiempo

**Síntomas:**
- Proceso corre por > 30 minutos
- Sin progreso visible

**Solución:**
```bash
# Verificar tamaño del backup
du -h backups/backup_*.sql

# Si es > 1GB, considerar:
# 1. Restaurar solo tablas críticas
grep "CREATE TABLE profiles" backup.sql > profiles_only.sql
grep "INSERT INTO profiles" backup.sql >> profiles_only.sql

# 2. Usar método de Supabase Dashboard (más rápido)
# 3. Contactar soporte de Supabase
```

---

### Problema: Datos inconsistentes después de restaurar

**Síntomas:**
- Counts no coinciden
- Referencias rotas
- Timestamps incorrectos

**Solución:**
```sql
-- Verificar transacciones pendientes
SELECT * FROM pg_stat_activity WHERE state != 'idle';

-- Limpiar transacciones colgadas
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle in transaction'
  AND query_start < NOW() - INTERVAL '1 hour';

-- Reindexar todas las tablas
REINDEX DATABASE postgres;

-- Actualizar estadísticas
ANALYZE;
```

---

## 📝 Checklist de Restauración

Usar este checklist para cada restauración:

### Pre-Restauración
- [ ] Backup identificado y verificado
- [ ] Backup probado en desarrollo
- [ ] Datos del backup verificados
- [ ] Backup del estado actual creado
- [ ] Modo mantenimiento activado
- [ ] Usuarios notificados (si aplica)

### Durante Restauración
- [ ] Método de restauración seleccionado
- [ ] Restauración iniciada
- [ ] Progreso monitoreado
- [ ] Errores documentados (si los hay)

### Post-Restauración
- [ ] Conteos verificados
- [ ] Timestamps verificados
- [ ] Índices verificados
- [ ] Constraints verificados
- [ ] Tests manuales completados
- [ ] Tests automatizados pasaron
- [ ] Modo mantenimiento removido
- [ ] App accesible
- [ ] Usuarios notificados

---

## 📊 Logs y Auditoría

### Registrar cada restauración

Crear archivo de log:

```bash
# logs/restore_log.md

## Restauración 2025-11-07 14:30

**Motivo:** [Describir razón]
**Backup usado:** backup_20251107_143022.sql.gz
**Método:** Supabase Dashboard
**Duración:** 12 minutos
**Resultado:** Exitoso

**Problemas encontrados:**
- Ninguno

**Verificaciones:**
- Profiles: 142 registros ✅
- Posts: 1523 registros ✅
- Tests: All passing ✅

**Ejecutado por:** [Nombre]
```

---

## 📞 Contactos de Emergencia

### Si la restauración falla críticamente:

1. **Supabase Support:** https://supabase.com/dashboard/support/new
2. **Vercel Support:** https://vercel.com/support
3. **Team Lead:** [Email/Slack]

### Información a proveer:

- Project ID: `crdtxyfvbosjiddirtzc`
- Timestamp del incidente
- Error messages completos
- Steps para reproducir

---

**Última revisión:** 2025-11-07
**Versión:** 1.0
**Mantenido por:** Equipo Kolink
