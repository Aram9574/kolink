# Sistema de Personalización Kolink

## Descripción General

El sistema de personalización de Kolink utiliza **RAG (Retrieval-Augmented Generation)** para generar posts de LinkedIn virales y personalizados. Combina:

1. **El estilo único del usuario** (aprendido de sus posts históricos)
2. **Patrones de contenido viral** (corpus curado de posts de alto engagement)
3. **IA generativa (GPT-4o)** para crear contenido auténtico y optimizado

---

## Stack Tecnológico

- **Next.js 15** (Pages Router)
- **TypeScript**
- **Supabase** (PostgreSQL + Auth + pgvector)
- **OpenAI API**:
  - `text-embedding-3-large` (3072 dimensiones) - Embeddings
  - `gpt-4o` - Generación de contenido

---

## Arquitectura del Sistema

### 1. Base de Datos (Supabase + pgvector)

#### Tablas Principales:

**`user_posts`**
- Posts históricos del usuario importados desde LinkedIn
- Métricas de engagement originales
- Análisis automático de temas y intención

**`user_post_embeddings`**
- Vectores de 3072 dimensiones de cada post del usuario
- Índice HNSW para búsqueda de similitud ultrarrápida

**`viral_corpus`**
- Posts virales curados (alto engagement)
- Metadatos: industria, formato, características (hook, CTA, emojis)
- Clasificación por intent y topics

**`viral_embeddings`**
- Embeddings del corpus viral
- Índice HNSW para búsqueda semántica

**`generations`**
- Registro de todas las generaciones
- Variantes A/B para cada generación
- Referencias a ejemplos usados (trazabilidad)

**`post_metrics`**
- Métricas de engagement de posts publicados
- Snapshots históricos para análisis temporal
- Análisis de sentimiento

**`rag_cache`**
- Caché de resultados de búsqueda RAG
- Reduce latencia y costos de OpenAI
- Expiración configurable (24h default)

#### Funciones SQL:

- `search_similar_user_posts(user_id, embedding, limit)` - Busca posts similares del usuario
- `search_similar_viral_posts(embedding, intent, limit)` - Busca posts virales similares
- `calculate_engagement_rate(likes, comments, shares, views)` - Calcula engagement

---

### 2. API Endpoints

#### POST `/api/user-style/ingest`
Importa posts históricos del usuario y genera embeddings.

**Request:**
```json
{
  "posts": [
    {
      "content": "Contenido del post...",
      "linkedin_post_id": "123456789",
      "published_at": "2025-01-15T10:00:00Z",
      "likes": 150,
      "comments": 12,
      "shares": 5,
      "views": 3000
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "posts_created": 1,
  "embeddings_created": 1,
  "post_ids": ["uuid-1", "uuid-2"]
}
```

**Headers:**
```
Authorization: Bearer <supabase_token>
```

**Límites:**
- Máximo 100 posts por request
- Autenticación obligatoria

---

#### POST `/api/viral/ingest`
Ingesta posts virales al corpus (SOLO ADMIN).

**Request:**
```json
{
  "posts": [
    {
      "content": "Post viral completo...",
      "author_industry": "tech",
      "author_follower_range": "50k-100k",
      "likes": 5000,
      "comments": 300,
      "shares": 150,
      "views": 100000,
      "topics": ["AI", "LinkedIn", "Growth"],
      "intent": "educativo",
      "post_format": "medium",
      "has_hook": true,
      "has_cta": true,
      "uses_emojis": true,
      "published_at": "2025-01-10T12:00:00Z",
      "source_url": "https://linkedin.com/posts/..."
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "posts_created": 1,
  "embeddings_created": 1,
  "post_ids": ["uuid-3"]
}
```

**Headers:**
```
Authorization: Bearer <admin_supabase_token>
```

**Límites:**
- Máximo 50 posts por request
- Solo emails en `ADMIN_EMAILS` env var

---

#### POST `/api/rag/retrieve`
Recupera ejemplos similares usando búsqueda vectorial.

**Request:**
```json
{
  "topic": "cómo la IA está transformando la medicina",
  "intent": "educativo",
  "top_k_user": 3,
  "top_k_viral": 5,
  "use_cache": true
}
```

**Response:**
```json
{
  "success": true,
  "user_posts": [
    {
      "id": "uuid-1",
      "content": "Post del usuario sobre IA...",
      "similarity": 0.87,
      "type": "user"
    }
  ],
  "viral_posts": [
    {
      "id": "uuid-3",
      "content": "Post viral sobre medicina...",
      "similarity": 0.82,
      "engagement_rate": 8.5,
      "type": "viral"
    }
  ],
  "cache_hit": false,
  "query_hash": "abc123..."
}
```

**Headers:**
```
Authorization: Bearer <supabase_token>
```

---

#### POST `/api/personalized/generate`
Endpoint principal: genera variantes A/B de posts personalizados.

**Request:**
```json
{
  "userId": "uuid-user",
  "topic": "cómo la IA está transformando la medicina",
  "intent": "educativo",
  "additional_context": "Enfocado en diagnóstico temprano de cáncer",
  "temperature": 0.7,
  "top_k_user": 3,
  "top_k_viral": 5
}
```

**Response:**
```json
{
  "success": true,
  "generation_id": "uuid-gen-1",
  "variantA": "Texto completo de variante A (150-300 palabras)...",
  "variantB": "Texto completo de variante B (300-600 palabras)...",
  "user_examples_used": ["uuid-1", "uuid-2"],
  "viral_examples_used": ["uuid-3", "uuid-4", "uuid-5"],
  "created_at": "2025-02-11T12:00:00Z"
}
```

**Headers:**
```
Authorization: Bearer <supabase_token>
```

**Notas:**
- Descuenta 1 crédito del usuario
- Requiere créditos > 0
- Tiempo estimado: 5-15 segundos

---

## Flujo de Uso Completo

### 1. Onboarding del Usuario

```typescript
// Importar posts históricos del usuario
const response = await fetch('/api/user-style/ingest', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    posts: userLinkedInPosts, // Array de posts
  }),
});

const result = await response.json();
console.log(`${result.posts_created} posts importados`);
```

### 2. Generar Contenido Personalizado

```typescript
// Generar post sobre un tema específico
const response = await fetch('/api/personalized/generate', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    userId: session.user.id,
    topic: 'El futuro del trabajo remoto en 2025',
    intent: 'thought-leadership',
    additional_context: 'Enfocado en equipos distribuidos',
    temperature: 0.7,
  }),
});

const generation = await response.json();

// El usuario ve 2 variantes
console.log('Variante A:', generation.variantA);
console.log('Variante B:', generation.variantB);

// Usuario selecciona una y la publica
```

### 3. (Admin) Agregar Posts Virales al Corpus

```typescript
// Solo administradores
const response = await fetch('/api/viral/ingest', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${adminSession.access_token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    posts: [
      {
        content: viralPostContent,
        topics: ['leadership', 'team'],
        intent: 'inspiracional',
        likes: 10000,
        comments: 500,
        shares: 200,
        views: 200000,
        has_hook: true,
        has_cta: true,
      },
    ],
  }),
});
```

---

## Variables de Entorno Requeridas

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

# OpenAI
OPENAI_API_KEY=sk-xxx...

# Admin (separados por comas)
ADMIN_EMAILS=admin@kolink.com,admin2@kolink.com
```

---

## Setup Inicial

### 1. Crear Base de Datos

```bash
# Ejecutar el schema SQL en Supabase SQL Editor
psql -h db.xxx.supabase.co -U postgres -d postgres -f docs/database/personalization_schema.sql
```

O copiar y pegar el contenido de `docs/database/personalization_schema.sql` en el SQL Editor de Supabase.

### 2. Instalar Dependencias

```bash
npm install openai @supabase/supabase-js
```

### 3. Verificar Configuración

```bash
# Probar conexión a Supabase
npm run dev

# Verificar que pgvector está habilitado
# En Supabase SQL Editor:
SELECT * FROM pg_extension WHERE extname = 'vector';
```

---

## Optimizaciones de Rendimiento

### 1. Índices HNSW
Los índices HNSW (Hierarchical Navigable Small World) son **10-100x más rápidos** que IVFFlat para búsqueda de similitud:

```sql
CREATE INDEX idx_user_embeddings_vector ON user_post_embeddings
  USING hnsw (embedding vector_cosine_ops);
```

### 2. Caché de RAG
El sistema cachea resultados de búsqueda durante 24h:
- Reduce latencia de ~5s a ~500ms
- Reduce costos de OpenAI Embeddings
- Incrementa `hit_count` para analytics

### 3. Batch Embeddings
La función `generateBatchEmbeddings()` procesa hasta 100 posts por llamada:
- Reduce latencia total
- Optimiza uso de tokens de OpenAI

---

## Seguridad

### 1. Row Level Security (RLS)
Todas las tablas de usuario tienen RLS habilitado:
- Usuarios solo ven sus propios posts
- Usuarios solo ven sus propias generaciones
- Corpus viral es público (read-only)

### 2. Autenticación
Todos los endpoints requieren:
```typescript
Authorization: Bearer <supabase_jwt_token>
```

### 3. Validaciones
- Límites de posts por request (100 para users, 50 para viral)
- Validación de campos obligatorios
- Sanitización de inputs
- Rate limiting (implementar con Upstash/Redis)

---

## Métricas y Analytics

### 1. Tracking de Generaciones

```sql
-- Posts más generados por tema
SELECT topic, COUNT(*) as count
FROM generations
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY topic
ORDER BY count DESC
LIMIT 10;
```

### 2. Efectividad del Sistema

```sql
-- Engagement promedio de posts generados vs. posts históricos
SELECT
  'Generated' as source,
  AVG(pm.engagement_rate) as avg_engagement
FROM post_metrics pm
JOIN generations g ON pm.generation_id = g.id
UNION ALL
SELECT
  'Historical' as source,
  AVG(engagement_rate) as avg_engagement
FROM user_posts
WHERE engagement_rate IS NOT NULL;
```

### 3. Uso de Caché

```sql
-- Tasa de cache hit
SELECT
  SUM(hit_count) as total_hits,
  COUNT(*) as total_queries,
  ROUND(SUM(hit_count)::DECIMAL / COUNT(*) * 100, 2) as hit_rate_pct
FROM rag_cache;
```

---

## Costos Estimados (OpenAI)

### Embeddings (text-embedding-3-large)
- **$0.00013 per 1K tokens**
- Post promedio: ~200 tokens
- 1000 posts: ~$0.026

### Generación (gpt-4o)
- **Input: $2.50 per 1M tokens**
- **Output: $10.00 per 1M tokens**
- Generación promedio:
  - Input: ~1500 tokens (prompts + ejemplos)
  - Output: ~600 tokens (variantes A + B)
- **Costo por generación: ~$0.01**

### Total Mensual Estimado (1000 usuarios activos)
- 50 generaciones/mes por usuario: **$500**
- Caché reduce costos en ~30%: **$350**

---

## Mejoras Futuras

### 1. Fine-tuning de Modelos
- Fine-tune GPT-4o con posts de alto engagement
- Mejorar calidad de generación
- Reducir costos (~70% más barato)

### 2. Análisis de Sentimiento en Comentarios
- Usar GPT-4o-mini para analizar comentarios
- Identificar qué variantes generan mejor conversación
- Ajustar prompts basándose en feedback

### 3. A/B Testing Automático
- Trackear qué variante (A o B) se publica más
- Qué variante genera mejor engagement
- Ajustar temperatura y estrategia de generación

### 4. Integración con LinkedIn API
- Importación automática de posts
- Publicación directa desde Kolink
- Tracking automático de métricas

### 5. Recomendaciones de Timing
- Analizar mejores horarios para publicar
- Basado en audiencia del usuario
- Integracion con calendario

---

## Troubleshooting

### Error: "pgvector extension not found"
```sql
-- Ejecutar en Supabase SQL Editor
CREATE EXTENSION IF NOT EXISTS vector;
```

### Error: "Embeddings dimension mismatch"
Verificar que todos los embeddings usen `dimensions: 3072`:
```typescript
await generateEmbedding(text, {
  model: 'text-embedding-3-large',
  dimensions: 3072, // Importante
});
```

### Error: "RPC function not found"
Asegurarse de que todas las funciones SQL están creadas:
```sql
SELECT proname FROM pg_proc WHERE proname LIKE 'search_similar%';
```

### Generación muy lenta (>30s)
- Reducir `top_k_user` y `top_k_viral`
- Verificar índices HNSW
- Usar caché de RAG
- Considerar usar `gpt-4o-mini` para drafts rápidos

---

## Contacto y Soporte

Para preguntas sobre la implementación:
- Revisar código en `/src/pages/api/personalized/`
- Consultar tipos en `/src/types/personalization.ts`
- Ver ejemplos de uso en esta documentación

---

## Licencia

Este sistema es parte de Kolink v1.0 y está protegido por la licencia del proyecto.
