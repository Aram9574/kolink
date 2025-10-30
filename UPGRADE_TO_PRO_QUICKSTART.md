# Guía Rápida: Upgrade a Pro Plan + Habilitar Búsqueda Semántica

**Objetivo:** Activar pgvector y búsqueda semántica en 5 minutos

---

## ⚡ PASOS RÁPIDOS

### 1. Upgrade a Pro Plan (2 min)

```
1. Ve a: https://app.supabase.com/project/crdtxyfvbosjiddirtzc/settings/billing
2. Click en "Upgrade to Pro"
3. Completa pago: $25/mes
4. Espera confirmación de upgrade
```

### 2. Habilitar pgvector (30 seg)

```
1. Ve a: https://app.supabase.com/project/crdtxyfvbosjiddirtzc/database/extensions
2. Busca: "pgvector"
3. Click en toggle para habilitar
4. Espera "Enabled" ✅
```

**Verificación:**
```sql
-- En SQL Editor
SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';

-- Resultado esperado:
-- extname | extversion
-- --------|------------
-- vector  | 0.5.1
```

### 3. Aplicar Migración (1 min)

```bash
cd /Users/aramzakzuk/Proyectos/kolink

# Aplicar migración pendiente
supabase db push

# Verificar que se aplicó
supabase migration list
```

**Resultado esperado:**
```
Local          | Remote         | Time (UTC)
---------------|----------------|---------------------
20251030000100 | 20251030000100 | 2025-10-30 00:01:00 ✅
```

### 4. Generar Embeddings (3 min)

```bash
# Terminal 1: Dev server (si no está corriendo)
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

**Costo:** ~$0.30 USD (one-time, OpenAI API)

### 5. Probar Búsqueda Semántica (30 seg)

```bash
# Abre el navegador
http://localhost:3000/inspiration

# Prueba búsquedas conceptuales:
# - "leadership" → Debería encontrar posts sobre management, influence, teams
# - "innovation" → Debería encontrar posts sobre creativity, disruption, startups
# - "productivity" → Debería encontrar posts sobre time management, focus, habits
```

**Verifica:**
- Los resultados tienen `similarity score > 0%`
- Los posts relacionados aparecen aunque no tengan las palabras exactas
- El ordenamiento es por relevancia (similarity), no por fecha

---

## 🎯 VALIDACIÓN FINAL

### Checklist Post-Upgrade

- [ ] pgvector extension: Enabled ✅
- [ ] Migración 20251030000100: Applied ✅
- [ ] Embeddings generados: 15/15 posts ✅
- [ ] Búsqueda "leadership" retorna posts con similarity > 0.3 ✅
- [ ] Búsqueda "startups" retorna posts relevantes ✅
- [ ] Búsqueda "productivity" retorna posts relevantes ✅

### Verificar en SQL Editor

```sql
-- 1. Ver embeddings generados
SELECT
  COUNT(*) as total_posts,
  COUNT(embedding) as with_embeddings,
  ROUND(100.0 * COUNT(embedding) / COUNT(*), 2) as percentage
FROM inspiration_posts;

-- Resultado esperado:
-- total_posts | with_embeddings | percentage
-- ------------|-----------------|------------
-- 15          | 15              | 100.00


-- 2. Probar función de búsqueda
SELECT
  proname as function_name,
  pronargs as num_arguments
FROM pg_proc
WHERE proname = 'search_inspiration_posts';

-- Resultado esperado:
-- function_name            | num_arguments
-- -------------------------|---------------
-- search_inspiration_posts | 3
```

---

## 🚨 TROUBLESHOOTING

### Error: "extension vector is not available"
**Causa:** Plan no ha sido actualizado o pgvector no disponible en tu región.

**Solución:**
1. Verifica plan actual en Settings → Billing
2. Contacta soporte de Supabase: https://supabase.com/dashboard/support

### Error: "function search_inspiration_posts does not exist"
**Causa:** Migración no se aplicó correctamente.

**Solución:**
```bash
# Verificar estado de migraciones
supabase migration list

# Si 20251030000100 no aparece en Remote, ejecutar:
supabase db push

# Si falla, ejecutar manualmente en SQL Editor:
# Copia contenido de: supabase/migrations/20251030000100_create_semantic_search_function.sql
```

### Error al generar embeddings: "OpenAI API key not configured"
**Causa:** Variable de entorno OPENAI_API_KEY no configurada.

**Solución:**
```bash
# Verificar en .env.local
cat .env.local | grep OPENAI_API_KEY

# Si no existe, agregar:
echo "OPENAI_API_KEY=sk-..." >> .env.local

# Reiniciar dev server
npm run dev
```

### Embeddings generados pero búsqueda no mejora
**Causa:** Puede que el cache esté sirviendo resultados viejos.

**Solución:**
```bash
# Limpiar cache Redis (si tienes acceso)
# O simplemente espera 5 minutos (TTL del cache)

# Probar con query nuevo que nunca hayas buscado:
# "innovation in remote work"
```

---

## 📊 COSTOS POST-UPGRADE

### Supabase Pro Plan
- **Precio:** $25/mes
- **Incluye:**
  - pgvector extension
  - 8GB database
  - 250GB bandwidth
  - 50GB file storage
  - 7 días de backups

### OpenAI API (Embeddings)
- **One-time:** $0.30 (15 posts iniciales)
- **Por búsqueda:** $0.0001 (generar embedding del query)
- **Estimado:** $5-10/mes (100-1000 búsquedas/día)

### Total Mensual
- **Mínimo:** $25/mes (solo Supabase)
- **Con uso moderado:** $30-35/mes (Supabase + OpenAI)
- **Con uso alto:** $40-50/mes (Supabase + OpenAI + más posts)

---

## 🎁 BENEFICIOS INMEDIATOS

### Búsqueda Semántica Activada
✅ Encuentra posts por concepto, no solo palabras
✅ Similarity scores precisos (0.3-1.0)
✅ Mejor experiencia de usuario
✅ Diferenciador competitivo

### Ejemplo de Búsqueda Mejorada

**Query:** "liderazgo efectivo"

**Sin pgvector (texto):**
- Encuentra: Posts que contienen "liderazgo" o "efectivo"
- No encuentra: Posts sobre "management", "influencia", "equipos"
- Resultados: 2-3 posts

**Con pgvector (semántica):**
- Encuentra: Conceptos relacionados con liderazgo
- Incluye: "management", "influencia", "equipos", "cultura organizacional"
- Resultados: 8-12 posts relevantes
- Ordenados por relevancia (similarity)

---

## 🔄 MANTENIMIENTO FUTURO

### Agregar Más Posts

Cuando agregues nuevos posts a `inspiration_posts`:

```bash
# Generar embeddings para posts nuevos
npx ts-node scripts/call_embedding_api.ts

# O via curl
curl -X POST http://localhost:3000/api/admin/generate-embeddings \
  -H "Content-Type: application/json" \
  -d '{"adminKey": "YOUR_ADMIN_KEY"}'
```

### Actualizar Embeddings

Si cambias el contenido de un post:

```sql
-- En SQL Editor, actualizar embedding a NULL
UPDATE inspiration_posts
SET embedding = NULL
WHERE id = 'POST_ID';

-- Luego regenerar con el script
```

### Monitoreo

```sql
-- Ver posts sin embeddings
SELECT id, title, author
FROM inspiration_posts
WHERE embedding IS NULL;

-- Ver estadísticas de búsquedas (futuro)
SELECT
  DATE(created_at) as date,
  COUNT(*) as num_searches
FROM saved_searches
GROUP BY DATE(created_at)
ORDER BY date DESC
LIMIT 7;
```

---

## 📞 SOPORTE

**Si algo falla durante el upgrade:**

1. **Logs de Supabase:** https://app.supabase.com/project/crdtxyfvbosjiddirtzc/logs
2. **Logs locales:** `npm run dev` output
3. **Soporte Supabase:** https://supabase.com/dashboard/support
4. **OpenAI Status:** https://status.openai.com/

**Archivos de referencia:**
- `FASE3_INSPIRATION_HUB_COMPLETO.md` - Documentación completa
- `ENABLE_PGVECTOR_INSTRUCTIONS.md` - Guía detallada pgvector
- `MIGRACIONES_AUTOMATIZADAS_STATUS.md` - Estado de migraciones

---

## ✅ CHECKLIST FINAL

```
[ ] Upgrade a Pro Plan completado
[ ] Factura de $25/mes confirmada
[ ] pgvector extension enabled
[ ] Migración 20251030000100 aplicada
[ ] 15 embeddings generados (100%)
[ ] Búsqueda semántica funciona
[ ] Similarity scores visibles en UI
[ ] Queries conceptuales retornan resultados relevantes
[ ] Cache Redis funciona (5 min TTL)
[ ] Rate limiting funciona (20/min)
[ ] Documentar nueva key de OpenAI en 1Password/Secrets Manager
```

---

**⏱️ Tiempo total:** 5-7 minutos
**💰 Costo total:** $25.30 (primer mes)
**🎯 Resultado:** Búsqueda semántica completamente funcional

---

*Guía creada: 2025-10-30*
*Para uso cuando estés listo para deploy público con marketing*
