# FASE 3 - Plan de Implementación (Sin LinkedIn OAuth)

**Fecha:** 30 de Octubre, 2025
**Duración Estimada:** 3.5 semanas
**LinkedIn OAuth:** OMITIDO (sin acceso a API)

---

## 🎯 Objetivos de FASE 3

Hacer funcionales las features core prometidas en el roadmap:

1. ✅ ~~LinkedIn OAuth~~ - OMITIDO (sin acceso a API)
2. 🎯 **Inspiration Hub** - Búsqueda semántica de posts virales
3. 🎯 **Calendar AI** - Agendamiento inteligente con IA
4. 🎯 **Analytics Predictivos** - Forecasting y predicciones

---

## ⚠️ PREREQUISITO: Habilitar pgvector (3 minutos)

**IMPORTANTE:** Antes de empezar FASE 3, DEBES completar este paso manualmente.

### Paso 1: Habilitar pgvector en Supabase

1. Ve a [Supabase Dashboard](https://app.supabase.com)
2. Selecciona tu proyecto Kolink
3. Menú lateral → **Database** → **Extensions**
4. Busca **"vector"** o **"pgvector"**
5. Clic en **"Enable"**
6. Espera 10-30 segundos hasta que aparezca "Enabled" ✅

### Paso 2: Aplicar migración inspiration_posts

**Opción A: Desde SQL Editor (Recomendado)**

1. Menú lateral → **SQL Editor**
2. Clic en **"New Query"**
3. Abre el archivo: `supabase/migrations/20250101000500_create_inspiration.sql`
4. Copia TODO el contenido
5. Pega en el SQL Editor
6. Clic en **"Run"** (esquina inferior derecha)
7. Verifica que dice "Success" sin errores

**Opción B: Desde Terminal (si tienes Supabase CLI)**

```bash
# Si tienes supabase CLI conectado
supabase db push

# O manualmente con psql
cat supabase/migrations/20250101000500_create_inspiration.sql | psql $DATABASE_URL
```

### Paso 3: Verificar que funcionó

```bash
# Ejecuta el script de verificación
npx ts-node scripts/verify_migrations.ts

# Deberías ver:
# ✅ Tablas existentes: 10/10
# ✅ pgvector habilitado
```

---

## 📋 Item 1: Inspiration Hub con Seed Data (1.5 semanas)

### Estado Actual

- ✅ Tabla `inspiration_posts` existe (después de prerequisito)
- ✅ Tabla `saved_posts` existe
- ✅ Tabla `saved_searches` existe
- ❌ **0 posts** en la base de datos
- ✅ API endpoint `/api/inspiration/search` existe (con rate limiting)
- ❌ Búsqueda semántica NO funciona (embeddings faltantes)
- ❌ Página `/inspiration` visible pero sin datos

### Tareas

#### 1.1 Crear Script de Seed Data (2 días)
**Archivos a crear:**
- `scripts/seed_inspiration_posts.ts` - Generar posts curados
- `data/inspiration_posts.json` - 50-100 posts virales de ejemplo

**Contenido de ejemplo:**
```json
[
  {
    "platform": "linkedin",
    "author": "Simon Sinek",
    "title": "The Infinite Game",
    "content": "Leaders who play the infinite game...",
    "summary": "Leadership requires long-term thinking",
    "metrics": {
      "likes": 15234,
      "comments": 892,
      "shares": 3401,
      "viralScore": 87
    },
    "tags": ["leadership", "business", "strategy"],
    "source_url": "https://linkedin.com/posts/simonsinek/..."
  }
]
```

#### 1.2 Generar Embeddings (3 días)
**Archivos a modificar:**
- `scripts/generate_embeddings.ts` - Script para generar embeddings con OpenAI
- Usar `text-embedding-3-small` (económico, $0.02/1M tokens)

**Proceso:**
```typescript
// Para cada post:
const embedding = await openai.embeddings.create({
  model: "text-embedding-3-small",
  input: post.content + " " + post.summary
});

// Guardar en DB
await supabase
  .from('inspiration_posts')
  .update({ embedding: embedding.data[0].embedding })
  .eq('id', post.id);
```

#### 1.3 Implementar Búsqueda Semántica (2 días)
**Archivos a modificar:**
- `src/pages/api/inspiration/search.ts` - Agregar búsqueda por embeddings

**Query SQL con pgvector:**
```sql
SELECT *,
  1 - (embedding <=> $queryEmbedding) AS similarity
FROM inspiration_posts
WHERE 1 - (embedding <=> $queryEmbedding) > 0.7
ORDER BY similarity DESC
LIMIT 20;
```

#### 1.4 UI para Inspiration Hub (2 días)
**Archivos a modificar:**
- `src/pages/inspiration.tsx` - Conectar con API real
- Mostrar posts con métricas
- Filtros por tags, platform
- Botón "Save" para guardar posts

**Tiempo total:** 9 días (1.5 semanas)

---

## 📋 Item 2: Calendar AI Scheduling (1 semana)

### Estado Actual

- ✅ Tabla `scheduled_posts` existe
- ✅ API endpoint `/api/calendar/schedule` existe (con rate limiting)
- ❌ IA de scheduling NO implementada
- ❌ Página `/calendar` básica sin funcionalidad real

### Tareas

#### 2.1 Implementar IA de Optimal Timing (3 días)
**Archivos a crear:**
- `src/server/services/calendarAI.ts` - Lógica de scheduling con IA

**Features:**
```typescript
// Analizar mejores horarios basado en:
- Historial de engagement del usuario
- Día de la semana óptimo
- Hora del día óptima
- Frecuencia recomendada
- Espaciado entre posts

// Usar GPT-4 mini para sugerencias
const suggestion = await openai.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [{
    role: "system",
    content: "You are a LinkedIn posting schedule optimizer..."
  }]
});
```

#### 2.2 UI de Calendar (2 días)
**Archivos a modificar:**
- `src/pages/calendar.tsx` - Calendario interactivo
- Usar `react-big-calendar` o similar
- Drag & drop para agendar
- Vista de timeline

#### 2.3 Cron Job para Publicación (2 días)
**Archivos a crear:**
- `src/pages/api/cron/publish-scheduled.ts` - Vercel Cron job

**Configuración en `vercel.json`:**
```json
{
  "crons": [{
    "path": "/api/cron/publish-scheduled",
    "schedule": "*/15 * * * *"
  }]
}
```

**Tiempo total:** 7 días (1 semana)

---

## 📋 Item 3: Analytics Predictivos (1 semana)

### Estado Actual

- ✅ Tabla `post_analytics` existe
- ✅ Tabla `usage_stats` existe
- ✅ API endpoint `/api/analytics/stats` existe (con rate limiting)
- ❌ Forecasting NO implementado
- ❌ Predicciones NO implementadas

### Tareas

#### 3.1 Implementar Forecasting (3 días)
**Archivos a crear:**
- `src/server/services/analyticsAI.ts` - Predicciones con IA

**Métricas a predecir:**
```typescript
interface Prediction {
  metric: 'engagement' | 'followers' | 'posts';
  current: number;
  predicted: number;
  trend: 'up' | 'down' | 'stable';
  confidence: number;
  timeframe: '7d' | '30d' | '90d';
}

// Usar series temporales o GPT-4 para análisis
```

#### 3.2 Dashboard de Analytics (2 días)
**Archivos a modificar:**
- `src/pages/analytics.tsx` - Crear página de analytics
- Gráficos con Recharts
- KPIs principales
- Predicciones visuales

#### 3.3 Recomendaciones Personalizadas (2 días)
**Archivos a crear:**
- `src/server/services/recommendationsAI.ts` - Sistema de recomendaciones

**Recomendaciones:**
```typescript
interface Recommendation {
  type: 'content' | 'timing' | 'frequency' | 'style';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  actionable: string;
}

// "Tu engagement sube 30% los martes a las 9am"
// "Posts con imágenes tienen 2x más reach"
// "Aumenta frecuencia a 3 posts/semana para +50% reach"
```

**Tiempo total:** 7 días (1 semana)

---

## 🗓️ Timeline de FASE 3

```
Semana 1:
  Día 1:    Prerequisito pgvector (manual)
  Día 1-2:  Seed data inspiration posts
  Día 3-5:  Generar embeddings

Semana 2:
  Día 6-7:  Búsqueda semántica
  Día 8-9:  UI Inspiration Hub
  Día 10:   Testing Inspiration

Semana 3:
  Día 11-13: Calendar AI logic
  Día 14-15: Calendar UI
  Día 16-17: Cron job publicación

Semana 4:
  Día 18-20: Analytics forecasting
  Día 21-22: Analytics dashboard
  Día 23-24: Recomendaciones AI
  Día 25:    Testing & polish
```

**Total:** 25 días (~3.5 semanas)

---

## 📊 Métricas de Éxito

Al final de FASE 3, el usuario debería poder:

### Inspiration Hub ✅
- [ ] Buscar "leadership tips" y ver 20+ posts relevantes
- [ ] Filtrar por tags (leadership, marketing, tech)
- [ ] Guardar posts favoritos
- [ ] Ver métricas de engagement de cada post

### Calendar AI ✅
- [ ] Ver calendario con posts agendados
- [ ] Recibir sugerencia de "mejor momento para publicar"
- [ ] Agendar post con drag & drop
- [ ] Publicación automática en horario programado

### Analytics ✅
- [ ] Ver dashboard con KPIs (engagement, reach, posts/semana)
- [ ] Ver predicción de crecimiento para próximos 30 días
- [ ] Recibir 3-5 recomendaciones personalizadas
- [ ] Ver gráficos de tendencias

---

## 💰 Costos Estimados

### OpenAI API
- Embeddings: ~$0.50 para 100 posts (one-time)
- Calendar AI: ~$0.01 por análisis
- Analytics AI: ~$0.02 por predicción
- **Estimado mensual:** $5-10/mes

### Supabase
- pgvector requiere plan Pro: $25/mes
- **Total:** $25/mes

**Total FASE 3:** ~$30-35/mes recurring

---

## 🚀 Próximos Pasos INMEDIATOS

1. ⚠️ **AHORA:** Completar prerequisito pgvector (3 minutos)
2. ✅ Verificar con `npx ts-node scripts/verify_migrations.ts`
3. 🎯 Empezar Item 1.1: Crear seed data

**¿Listo para empezar? Confirma que completaste el prerequisito pgvector.**

---

## 📝 Notas

- LinkedIn OAuth se puede agregar después cuando tengas acceso a la API
- Los posts de seed data pueden ser ficticios/curados de fuentes públicas
- Embeddings se generan una vez y se reutilizan
- Calendar puede funcionar sin LinkedIn API (solo scheduling interno)
- Analytics funciona con datos sintéticos inicialmente
