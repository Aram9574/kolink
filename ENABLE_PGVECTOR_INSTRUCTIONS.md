# Instrucciones para Habilitar pgvector

## Problema Actual

El CLI de Supabase intentó aplicar las migraciones pero falló con este error:

```
ERROR: type vector does not exist (SQLSTATE 42704)
```

Esto significa que la extensión **pgvector** no está habilitada en tu base de datos remota de Supabase.

## Estado de Migraciones

✅ Migración `20251030000000` (función de embeddings) aplicada exitosamente
❌ Migración `20251030000100` (función de búsqueda semántica) FALLÓ

## Solución: Habilitar pgvector Manualmente

### Opción 1: Via Supabase Dashboard (RECOMENDADO)

1. **Ir a Database Extensions:**
   ```
   https://app.supabase.com/project/crdtxyfvbosjiddirtzc/database/extensions
   ```

2. **Buscar "vector":**
   - En el buscador de extensiones, escribe: `vector`
   - Deberías ver: `pgvector` (versión 0.5.1 o superior)

3. **Habilitar la extensión:**
   - Click en el toggle para habilitar `pgvector`
   - Espera la confirmación (puede tomar 5-10 segundos)

4. **Verificar:**
   - La extensión debería aparecer en "Installed extensions"
   - Status: ✅ Enabled

### Opción 2: Via SQL Editor

Si no ves la opción en Extensions UI:

1. **Ir a SQL Editor:**
   ```
   https://app.supabase.com/project/crdtxyfvbosjiddirtzc/sql/new
   ```

2. **Ejecutar este SQL:**
   ```sql
   -- Habilitar extensión pgvector
   CREATE EXTENSION IF NOT EXISTS vector;

   -- Verificar que se habilitó correctamente
   SELECT extname, extversion
   FROM pg_extension
   WHERE extname = 'vector';
   ```

3. **Resultado esperado:**
   ```
   extname | extversion
   --------|------------
   vector  | 0.5.1
   ```

## ⚠️ Importante: Compatibilidad de Planes

La extensión `pgvector` está disponible en:
- ✅ **Pro Plan** ($25/mes)
- ✅ **Team Plan** ($599/mes)
- ✅ **Enterprise Plan**
- ❌ **Free Plan** (NO disponible)

Si estás en el plan gratuito, necesitarás:

### Alternativas para Free Plan:

1. **Upgrade a Pro Plan:**
   - Costo: $25/mes
   - Incluye pgvector + más recursos

2. **Usar búsqueda de texto tradicional:**
   - Modificar el endpoint `/api/inspiration/search.ts`
   - Eliminar la búsqueda semántica
   - Usar solo búsqueda con `ILIKE` (ya está implementado como fallback)

3. **Migrar a otro hosting:**
   - Railway + PostgreSQL con pgvector
   - Neon Database (incluye pgvector en plan gratuito)
   - Supabase self-hosted

## Después de Habilitar pgvector

Una vez habilitada la extensión:

### 1. Aplicar migraciones pendientes

```bash
supabase db push
```

Esto aplicará la migración `20251030000100` que falló.

### 2. Verificar funciones creadas

```bash
supabase db inspect --schema public | grep -E "(update_post_embedding|search_inspiration_posts)"
```

O en SQL Editor:

```sql
-- Verificar funciones
SELECT
  proname as function_name,
  pronargs as num_arguments
FROM pg_proc
WHERE proname IN ('update_post_embedding', 'search_inspiration_posts');
```

**Resultado esperado:**
```
function_name              | num_arguments
---------------------------|---------------
update_post_embedding      | 2
search_inspiration_posts   | 3
```

### 3. Generar embeddings

```bash
# Terminal 1: Dev server
npm run dev

# Terminal 2: Llamar API
npx ts-node scripts/call_embedding_api.ts
```

### 4. Probar búsqueda semántica

```bash
# Con el servidor dev corriendo
curl -X POST http://localhost:3000/api/inspiration/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"query": "leadership", "limit": 5}'
```

## Troubleshooting

### Error: "extension vector is not available"

Si recibes este error después de intentar habilitar:

1. Verifica tu plan de Supabase: `https://app.supabase.com/project/crdtxyfvbosjiddirtzc/settings/billing`
2. Si estás en Free Plan → necesitas upgrade o usar alternativa

### Error: "permission denied to create extension"

Si ves este error:

1. Usa el Supabase Dashboard en lugar de SQL directo
2. O contacta soporte de Supabase para habilitar permisos

## Resumen de Pasos

```bash
# 1. Habilitar pgvector en Dashboard (manual)
# https://app.supabase.com/project/crdtxyfvbosjiddirtzc/database/extensions

# 2. Aplicar migraciones
supabase db push

# 3. Verificar migraciones
supabase migration list

# 4. Generar embeddings
npm run dev
# En otra terminal:
npx ts-node scripts/call_embedding_api.ts

# 5. Probar búsqueda
curl -X POST http://localhost:3000/api/inspiration/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"query": "leadership"}'
```

## Contacto

Si tienes problemas:
1. Verifica logs de Supabase: `https://app.supabase.com/project/crdtxyfvbosjiddirtzc/logs`
2. Revisa plan actual: `https://app.supabase.com/project/crdtxyfvbosjiddirtzc/settings/billing`
3. Soporte Supabase: https://supabase.com/dashboard/support
