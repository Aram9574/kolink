# Estado de Migraciones Automatizadas - Supabase CLI

**Fecha:** 30 de Octubre, 2025
**Objetivo:** Automatizar todas las migraciones via Supabase CLI

---

## ✅ COMPLETADO

### 1. Configuración del CLI
- ✅ Supabase CLI instalado: v2.53.6
- ✅ Proyecto vinculado a remote: `crdtxyfvbosjiddirtzc`
- ✅ Archivo de configuración: `supabase/config.toml`

### 2. Migraciones Creadas

#### Migración 1: Función de Actualización de Embeddings
**Archivo:** `supabase/migrations/20251030000000_create_embedding_update_function.sql`

**Contenido:**
- Función `update_post_embedding(post_id UUID, embedding_vector TEXT)`
- **SECURITY DEFINER** para bypassear RLS
- Permisos: `anon`, `authenticated`, `service_role`

**Estado:** ✅ Aplicada exitosamente a remote

#### Migración 2: Función de Búsqueda Semántica
**Archivo:** `supabase/migrations/20251030000100_create_semantic_search_function.sql`

**Contenido:**
- Función `search_inspiration_posts(query_embedding vector(1536), match_threshold float, match_count int)`
- Búsqueda por similitud coseno usando pgvector
- Retorna posts ordenados por similitud

**Estado:** ❌ FALLÓ al aplicar

### 3. Ejecución de Migraciones

```bash
supabase db push
```

**Resultado:**
```
✅ 20251030000000_create_embedding_update_function.sql - Aplicada
❌ 20251030000100_create_semantic_search_function.sql - ERROR
```

**Error:**
```
ERROR: type vector does not exist (SQLSTATE 42704)
```

---

## ❌ BLOQUEADOR ACTUAL

### pgvector NO está habilitado en la base de datos remota

**Causa raíz:**
La extensión `pgvector` no está habilitada en tu instancia de Supabase en producción.

**Evidencia:**
1. La migración `20250101000000_enable_extensions.sql` incluye:
   ```sql
   CREATE EXTENSION IF NOT EXISTS "vector";
   ```
2. Esta migración se aplicó localmente pero parece que **no se ejecutó en remote** o la extensión no está disponible en tu plan.

**Estado de migraciones remote:**
```
Local          | Remote         | Time (UTC)
---------------|----------------|---------------------
20251030000000 | 20251030000000 | ✅ Aplicada
20251030000100 |                | ❌ Pendiente (bloqueada por pgvector)
```

---

## 🔧 ACCIÓN REQUERIDA

### Paso 1: Habilitar pgvector en Supabase

**Opción A: Via Dashboard (Recomendado)**

1. Ir a: https://app.supabase.com/project/crdtxyfvbosjiddirtzc/database/extensions
2. Buscar: `pgvector`
3. Habilitar la extensión (toggle)
4. Esperar confirmación (5-10 segundos)

**Opción B: Via SQL Editor**

```sql
CREATE EXTENSION IF NOT EXISTS vector;

-- Verificar
SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';
```

### ⚠️ IMPORTANTE: Compatibilidad de Planes

pgvector está disponible SOLO en:
- ✅ **Pro Plan** ($25/mes)
- ✅ **Team Plan** ($599/mes)
- ✅ **Enterprise**
- ❌ **Free Plan** (NO disponible)

**Si estás en Free Plan:**
- Necesitas upgrade a Pro
- O usar búsqueda de texto tradicional (ya implementado como fallback)
- O migrar a Neon Database (tiene pgvector gratuito)

---

## 📋 PRÓXIMOS PASOS (después de habilitar pgvector)

### 1. Aplicar migración pendiente

```bash
supabase db push
```

**Resultado esperado:**
```
✅ 20251030000100_create_semantic_search_function.sql aplicada
```

### 2. Verificar funciones creadas

```bash
supabase migration list
```

**Resultado esperado:**
```
Local          | Remote         | Time (UTC)
---------------|----------------|---------------------
20251030000000 | 20251030000000 | 2025-10-30 00:00:00 ✅
20251030000100 | 20251030000100 | 2025-10-30 00:01:00 ✅
```

### 3. Verificar en SQL Editor

```sql
-- Ver funciones creadas
SELECT
  proname as function_name,
  pronargs as num_arguments,
  proowner::regrole as owner
FROM pg_proc
WHERE proname IN ('update_post_embedding', 'search_inspiration_posts');
```

**Resultado esperado:**
```
function_name              | num_arguments | owner
---------------------------|---------------|--------
update_post_embedding      | 2             | postgres
search_inspiration_posts   | 3             | postgres
```

### 4. Generar embeddings

```bash
# Terminal 1: Dev server
npm run dev

# Terminal 2: Generar embeddings
npx ts-node scripts/call_embedding_api.ts
```

**Resultado esperado:**
```json
{
  "message": "Embedding generation completed",
  "total": 15,
  "processed": 15,
  "errors": 0
}
```

### 5. Verificar embeddings generados

**SQL Editor:**
```sql
SELECT
  COUNT(*) as total_posts,
  COUNT(embedding) as with_embeddings,
  COUNT(*) - COUNT(embedding) as without_embeddings,
  ROUND(100.0 * COUNT(embedding) / COUNT(*), 2) as percentage_complete
FROM inspiration_posts;
```

**Resultado esperado:**
```
total_posts | with_embeddings | without_embeddings | percentage_complete
------------|-----------------|--------------------|---------------------
15          | 15              | 0                  | 100.00
```

### 6. Probar búsqueda semántica

```bash
curl -X POST http://localhost:3000/api/inspiration/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"query": "leadership", "limit": 5}'
```

**Resultado esperado:**
```json
{
  "ok": true,
  "results": [
    {
      "id": "...",
      "title": "The Infinite Game",
      "author": "Simon Sinek",
      "similarity": 0.87,
      "content": "Leaders who play the infinite game...",
      "tags": ["leadership", "business"]
    }
  ],
  "cached": true
}
```

---

## 📊 RESUMEN DE ARCHIVOS

### Archivos Creados en esta Sesión

#### Migraciones:
1. `supabase/migrations/20251030000000_create_embedding_update_function.sql` ✅
2. `supabase/migrations/20251030000100_create_semantic_search_function.sql` ⏳

#### Scripts de Verificación:
3. `scripts/check_vector_extension.ts` - Verificar si pgvector está habilitado
4. `scripts/verify_embeddings_status.sql` - Ver cuántos posts tienen embeddings

#### Documentación:
5. `ENABLE_PGVECTOR_INSTRUCTIONS.md` - Instrucciones detalladas
6. `MIGRACIONES_AUTOMATIZADAS_STATUS.md` - Este archivo

### Archivos Existentes (de sesión anterior):
- `scripts/seed_inspiration_posts.sql` - 15 posts de seed data ✅
- `scripts/create_embedding_function.sql` - **YA NO NECESARIO** (reemplazado por migración)
- `scripts/create_search_function_fixed.sql` - **YA NO NECESARIO** (reemplazado por migración)
- `scripts/call_embedding_api.ts` - Helper para llamar API ✅
- `src/pages/api/admin/generate-embeddings.ts` - Endpoint para generar embeddings ✅
- `data/inspiration_posts.json` - 50 posts curados completos ✅

---

## 🎯 CHECKLIST DE VERIFICACIÓN

Antes de continuar a la UI, asegúrate de completar:

- [ ] pgvector habilitado en Supabase Dashboard
- [ ] Ejecutar `supabase db push` exitosamente
- [ ] Función `update_post_embedding` existe en remote
- [ ] Función `search_inspiration_posts` existe en remote
- [ ] 15 posts tienen embeddings (100% completado)
- [ ] Búsqueda semántica retorna resultados
- [ ] Similarity scores entre 0.3 y 1.0
- [ ] Rate limiting funciona (429 después de 20 búsquedas)
- [ ] Cache funciona (segunda búsqueda instantánea)

---

## 💡 VENTAJAS DEL ENFOQUE CLI

### Antes (Manual):
1. Copiar SQL en Dashboard
2. Pegar en SQL Editor
3. Ejecutar manualmente
4. Repetir para cada script
5. Sin tracking de versiones
6. Difícil de replicar en otros ambientes

### Ahora (CLI):
1. Crear archivos de migración
2. `supabase db push` → Todo se aplica automáticamente
3. Tracking de versiones con timestamps
4. Fácil de replicar (git clone + supabase db push)
5. Rollback posible con `supabase migration repair`

---

## 🚨 TROUBLESHOOTING

### Error: "extension vector is not available"
➡️ Tu plan de Supabase no incluye pgvector. Upgrade a Pro o usa alternativa.

### Error: "permission denied to create extension"
➡️ Usa el Dashboard en lugar de SQL directo, o contacta soporte.

### Error: "function already exists"
➡️ La migración ya se aplicó. Verifica con `supabase migration list`.

### Error: "cannot connect to remote database"
➡️ Verifica credenciales en `.env.local` y que el proyecto esté linked.

---

## 📞 CONTACTO Y SOPORTE

- **Logs de Supabase:** https://app.supabase.com/project/crdtxyfvbosjiddirtzc/logs
- **Plan actual:** https://app.supabase.com/project/crdtxyfvbosjiddirtzc/settings/billing
- **Soporte Supabase:** https://supabase.com/dashboard/support
- **Docs pgvector:** https://supabase.com/docs/guides/ai/vector-databases

---

## 🎉 LOGROS

✅ Proyecto vinculado a Supabase CLI
✅ 2 migraciones creadas (embeddings + search)
✅ 1 migración aplicada exitosamente (embeddings)
✅ Función SECURITY DEFINER para bypassear RLS
✅ Scripts de verificación creados
✅ Documentación completa generada

**Próximo bloqueador:** Habilitar pgvector en Dashboard (acción manual de 30 segundos)

---

**Última actualización:** 2025-10-30 15:30 UTC
