# Guía de Deployment - Sistema de Personalización Kolink v1.0

## ✅ Checklist Pre-Deployment

### 1. Base de Datos (Supabase)
- [ ] Ejecutar `docs/database/personalization_schema.sql` en Supabase SQL Editor
- [ ] Verificar que todas las tablas se crearon correctamente
- [ ] Verificar que pgvector está habilitado
- [ ] Verificar índices HNSW creados

### 2. Variables de Entorno
- [ ] `OPENAI_API_KEY` configurada
- [ ] `ADMIN_EMAILS` configurada (emails separados por comas)
- [ ] Todas las variables de Supabase configuradas
- [ ] Variables configuradas en Vercel (si usas Vercel)

### 3. Dependencias
- [ ] `npm install` ejecutado
- [ ] No hay errores de TypeScript
- [ ] Build exitoso localmente

---

## 📋 Pasos de Deployment

### Paso 1: Preparar Base de Datos

```bash
# 1. Ve a Supabase Dashboard > SQL Editor
# 2. Copia el contenido de docs/database/personalization_schema.sql
# 3. Pega y ejecuta

# 4. Verifica tablas creadas:
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND (table_name LIKE '%post%' OR table_name LIKE '%viral%' OR table_name LIKE 'generation%');

# Deberías ver:
# - user_posts
# - user_post_embeddings
# - viral_corpus
# - viral_embeddings
# - generations
# - post_metrics
# - rag_cache

# 5. Verifica índices HNSW:
SELECT indexname FROM pg_indexes
WHERE indexname LIKE '%embedding%';

# Deberías ver:
# - idx_user_embeddings_vector
# - idx_viral_embeddings_vector
```

### Paso 2: Configurar Variables de Entorno

```bash
# .env.local (desarrollo)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
OPENAI_API_KEY=sk-proj-xxx...
ADMIN_EMAILS=admin@kolink.com,admin2@kolink.com
```

**En Vercel:**
1. Ve a tu proyecto > Settings > Environment Variables
2. Agrega todas las variables anteriores
3. Asegúrate de que estén en "Production", "Preview" y "Development"

### Paso 3: Build y Deploy

```bash
# Build local para verificar
npm run build

# Si todo está bien:
git add .
git commit -m "feat: add personalization system v1.0"
git push origin main

# Vercel detectará automáticamente y desplegará
```

---

## 🧪 Testing Post-Deployment

### Test 1: Verificar Páginas Accesibles

```bash
# Visita estas URLs en producción:
https://tu-dominio.com/onboarding/import-posts
https://tu-dominio.com/personalized
https://tu-dominio.com/personalized-analytics

# Todas deberían cargar sin errores 404
```

### Test 2: Importar Posts (Onboarding)

1. Ve a `/onboarding/import-posts`
2. Pega 3-5 posts de LinkedIn en los campos
3. Click "Importar Posts"
4. Deberías ver:
   - Barra de progreso
   - Mensaje de éxito
   - Redirección al dashboard

**Verificar en Supabase:**
```sql
SELECT COUNT(*) FROM user_posts WHERE user_id = 'tu-user-id';
SELECT COUNT(*) FROM user_post_embeddings WHERE user_id = 'tu-user-id';
-- Ambos deberían tener el mismo número
```

### Test 3: Generar Post Personalizado

1. Ve a `/personalized`
2. Ingresa un tema: "El futuro de la IA en educación"
3. Selecciona intent: "educativo"
4. Click "Generar Post Personalizado"
5. Espera 5-15 segundos
6. Deberías ver:
   - Variante A (corta)
   - Variante B (larga)
   - Botones de copiar funcionando

**Verificar en Supabase:**
```sql
SELECT * FROM generations
WHERE user_id = 'tu-user-id'
ORDER BY created_at DESC
LIMIT 1;
-- Debería mostrar la generación con variant_a y variant_b
```

### Test 4: Historial de Generaciones

1. Ve a la pestaña "Historial" en `/personalized`
2. Deberías ver tus generaciones previas
3. Click "Ver variantes" en una
4. Deberías poder ver ambas variantes A y B
5. Click "Copiar" debería funcionar

### Test 5: Analytics

1. Ve a `/personalized-analytics`
2. Deberías ver:
   - Total de posts generados
   - Total de posts importados
   - Intent más usado
   - Gráfica de preferencia de variantes
   - Actividad reciente

---

## 🔍 Troubleshooting

### Error: "RPC function not found"

```sql
-- Verificar funciones creadas:
SELECT proname FROM pg_proc
WHERE proname LIKE 'search_similar%';

-- Si no aparecen, ejecutar nuevamente la sección de funciones del schema
```

### Error: "Invalid embedding dimensions"

```typescript
// Verificar que estás usando 1536 dimensiones
// En src/lib/ai/embeddings.ts:
{
  model: 'text-embedding-3-small',
  dimensions: 1536,  // NO 3072
}
```

### Error: "No posts found" al generar

- Verifica que has importado al menos 1 post
- El sistema puede funcionar sin posts del usuario (usará solo virales)
- Para mejor personalización, importa 5-10 posts

### Error: "OpenAI API Error"

```bash
# Verificar API key en Vercel logs:
vercel logs

# Buscar líneas como:
# [Generate] Error al generar embedding: Invalid API key

# Solución:
# 1. Ve a Vercel > Settings > Environment Variables
# 2. Verifica OPENAI_API_KEY
# 3. Redeploy si es necesario
```

### Generación muy lenta (>30s)

- Normal en primera generación (sin caché)
- Generaciones subsecuentes deberían ser más rápidas
- Verificar OpenAI API tier (Tier 1 tiene rate limits más bajos)

---

## 📊 Monitoreo Post-Deployment

### Métricas Clave

```sql
-- Total de usuarios que han importado posts
SELECT COUNT(DISTINCT user_id) FROM user_posts;

-- Total de generaciones
SELECT COUNT(*) FROM generations;

-- Generaciones en las últimas 24h
SELECT COUNT(*) FROM generations
WHERE created_at > NOW() - INTERVAL '24 hours';

-- Preferencia de variantes
SELECT
  variant_selected,
  COUNT(*)
FROM generations
WHERE variant_selected IS NOT NULL
GROUP BY variant_selected;

-- Intents más usados
SELECT
  intent,
  COUNT(*) as count
FROM generations
GROUP BY intent
ORDER BY count DESC;
```

### Logs Importantes

**En Vercel:**
```bash
vercel logs --follow

# Buscar:
# [Ingest] Usuario xxx ingresando N posts
# [Generate] Usuario xxx | Topic: "..."
# [Generate] Completado en Xms

# Errores comunes:
# Error al generar embedding
# Error en OpenAI
# Sin créditos disponibles
```

---

## 🚀 Optimizaciones Post-Launch

### 1. Seed de Corpus Viral (Recomendado)

```typescript
// Crear script: scripts/seedViralPosts.ts
// Ver ejemplo en docs/personalization/QUICK_START.md

// Ejecutar:
npx ts-node scripts/seedViralPosts.ts
```

### 2. Monitoring con Sentry/PostHog

```typescript
// En src/pages/api/personalized/generate.ts
// Agregar tracking de errores y performance
```

### 3. Rate Limiting

```typescript
// Implementar con Upstash Rate Limit
// Ver docs/personalization/ARCHITECTURE.md
```

---

## 📱 Flujo de Usuario Completo

### Primera Vez (Onboarding):
1. Usuario se registra → `/signup`
2. Redirigido a `/dashboard`
3. Ve banner "Configura tu estilo"
4. Click → `/onboarding/import-posts`
5. Importa 5 posts
6. Redirigido a `/dashboard`

### Uso Regular:
1. Usuario va a `/personalized`
2. Ingresa tema + intent
3. Genera post (5-15s)
4. Ve variantes A y B
5. Copia variante preferida
6. Publica en LinkedIn

### Analytics:
1. Usuario va a `/personalized-analytics`
2. Ve métricas de uso
3. Insights sobre preferencias
4. Actividad reciente

---

## ✅ Checklist Post-Deployment

- [ ] Todas las páginas cargan correctamente
- [ ] Importación de posts funciona
- [ ] Generación de posts funciona
- [ ] Historial se muestra correctamente
- [ ] Analytics muestra datos correctos
- [ ] Links en sidebar funcionan
- [ ] Dark mode funciona en todas las páginas
- [ ] Responsive design funciona (mobile)
- [ ] No hay errores en consola del navegador
- [ ] No hay errores en Vercel logs
- [ ] Seed de posts virales ejecutado (opcional pero recomendado)

---

## 🎉 ¡Listo para Producción!

Tu sistema de personalización está desplegado y funcionando. Los usuarios ahora pueden:

✅ Importar sus posts históricos
✅ Generar contenido personalizado con variantes A/B
✅ Ver historial de generaciones
✅ Analizar sus métricas de uso

**Próximos pasos sugeridos:**
1. Monitorear uso durante la primera semana
2. Seed más posts virales al corpus
3. Recolectar feedback de usuarios
4. Optimizar basándose en datos reales

---

## 📞 Soporte

Si encuentras problemas:
1. Revisa esta guía
2. Consulta `docs/personalization/README.md`
3. Revisa `docs/personalization/TROUBLESHOOTING.md`
4. Abre un issue en GitHub

¡Éxito con el lanzamiento! 🚀
