# Sistema de Aprendizaje IA y LinkedIn Integration

## Descripción General

Este documento describe el sistema completo de aprendizaje de IA que personaliza la generación de contenido basándose en:

1. **Perfil de LinkedIn** del usuario (bio, headline, industria)
2. **Historial de posts** del usuario en LinkedIn
3. **Comportamientos y preferencias** aprendidas
4. **Contenido viral** analizado de LinkedIn
5. **Feedback explícito** del usuario

---

## Arquitectura del Sistema

### Base de Datos (Supabase)

#### Nuevas Tablas Creadas

1. **user_behaviors** - Tracking de comportamientos del usuario
2. **writing_samples** - Muestras de escritura del usuario (posts de LinkedIn, etc.)
3. **user_preferences** - Preferencias aprendidas automáticamente
4. **content_feedback** - Feedback del usuario sobre contenido generado
5. **viral_content_library** - Biblioteca de contenido viral para aprender patrones
6. **generation_history** - Historial detallado de generaciones IA
7. **post_queue** - Cola de posts programados
8. **optimal_posting_times** - Mejores horarios de publicación (aprendidos)

#### Tablas Mejoradas

- **profiles** - Añadidos campos de LinkedIn OAuth y preferencias
- **posts** - Añadidos campos de métricas, tags, embeddings, estado

### API Endpoints

#### LinkedIn OAuth

```
GET  /api/auth/linkedin/authorize   - Inicia flujo OAuth
GET  /api/auth/linkedin/callback    - Callback de OAuth
POST /api/auth/linkedin/disconnect  - Desconectar LinkedIn
```

#### LinkedIn Data

```
GET  /api/linkedin/fetch-posts      - Obtiene posts del usuario
POST /api/linkedin/publish          - Publica en LinkedIn
POST /api/linkedin/sync-metrics     - Sincroniza métricas de engagement
```

#### Generación Inteligente

```
POST /api/generate-smart            - Generación con aprendizaje personalizado
```

---

## Flujo de Uso

### 1. Conectar LinkedIn

**Usuario:**
```javascript
// En la UI, botón "Conectar LinkedIn"
window.location.href = "/api/auth/linkedin/authorize";
```

**Backend:**
- Redirige a LinkedIn OAuth
- Usuario autoriza la aplicación
- LinkedIn devuelve código
- Sistema intercambia código por access token
- Guarda token y datos de perfil en database

**Scopes de LinkedIn Requeridos:**
- `openid` - Autenticación básica
- `profile` - Datos de perfil
- `email` - Email del usuario
- `w_member_social` - Publicar contenido en nombre del usuario

### 2. Importar Posts de LinkedIn

```javascript
// Frontend
const response = await fetch("/api/linkedin/fetch-posts", {
  headers: {
    Authorization: `Bearer ${session.access_token}`,
  },
});

const { posts_count, samples_saved } = await response.json();
```

**Proceso Backend:**
1. Valida token de LinkedIn
2. Obtiene últimos 50 posts del usuario
3. Extrae texto de cada post
4. Guarda como `writing_samples` en database
5. Analiza patrones de escritura (tono, vocabulario, estructura)

### 3. Generar Contenido Personalizado

```javascript
const response = await fetch("/api/generate-smart", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session.access_token}`,
  },
  body: JSON.stringify({
    prompt: "Estrategias de growth marketing para SaaS B2B",
    tone: "professional",
    formality: 70,
    length_target: 250,
  }),
});

const { post, credits_remaining, personalization } = await response.json();
```

**Proceso de Generación Inteligente:**

1. **Recopila Contexto:**
   - Perfil de LinkedIn (headline, bio)
   - Últimos 10 writing samples
   - Top 20 preferencias aprendidas
   - Top 5 posts virales en su idioma/industria

2. **Construye System Prompt Personalizado:**
   ```
   - Idioma y tono preferidos
   - Estilo de escritura del usuario (ejemplos reales)
   - Temas de interés
   - Hashtags preferidos
   - Patrones virales probados
   ```

3. **Genera con OpenAI:**
   - Usa GPT-4o-mini
   - Temperature 0.8 para creatividad
   - Max tokens según longitud objetivo

4. **Guarda y Analiza:**
   - Guarda post en database
   - Registra en generation_history
   - Calcula viral score predicho
   - Deduce crédito

5. **Retorna:**
   - Post generado
   - Viral score
   - Créditos restantes
   - Info de personalización usada

### 4. Publicar en LinkedIn

```javascript
const response = await fetch("/api/linkedin/publish", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session.access_token}`,
  },
  body: JSON.stringify({
    postId: "uuid-del-post", // O content directo
  }),
});

const { linkedin_post_id } = await response.json();
```

### 5. Sincronizar Métricas

```javascript
const response = await fetch("/api/linkedin/sync-metrics", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${session.access_token}`,
  },
});

const { synced_count, total_posts } = await response.json();
```

**Métricas Sincronizadas:**
- Likes
- Comentarios
- Shares
- Impresiones
- Clicks
- Engagement rate
- Viral score calculado

**Aprendizaje Automático:**
- Actualiza `optimal_posting_times` basándose en engagement
- Identifica patrones de contenido exitoso
- Ajusta preferencias de temas y hashtags

---

## Sistema de Aprendizaje

### 1. Tracking de Comportamientos

Cada acción del usuario se registra en `user_behaviors`:

```sql
INSERT INTO user_behaviors (user_id, behavior_type, context)
VALUES (
  'user-uuid',
  'post_created',
  '{"prompt_length": 50, "tone": "professional"}'
);
```

**Tipos de Comportamientos Tracked:**
- `post_created` - Genera un post
- `post_edited` - Edita contenido generado
- `post_deleted` - Elimina un post
- `post_scheduled` - Programa publicación
- `post_published` - Publica en LinkedIn
- `search_performed` - Busca inspiración
- `feedback_given` - Da feedback explícito
- `content_liked` - Marca como favorito
- `content_shared` - Comparte contenido

### 2. Análisis de Preferencias

El sistema aprende automáticamente:

**Temas Preferidos:**
```sql
-- Analiza palabras clave en prompts y posts editados
INSERT INTO user_preferences (user_id, preference_type, preference_value, confidence_score, learned_from)
VALUES ('user-uuid', 'content_topic', 'growth_marketing', 0.85, 'behavior');
```

**Hashtags Favoritos:**
```sql
-- Extrae hashtags de posts editados/aprobados
INSERT INTO user_preferences (user_id, preference_type, preference_value, confidence_score)
VALUES ('user-uuid', 'hashtag_preference', '#growthhacking', 0.75);
```

**Horarios Óptimos:**
```sql
-- Aprende de posts con mejor engagement
UPDATE optimal_posting_times
SET average_engagement_rate = 0.08,
    confidence_score = 0.9
WHERE user_id = 'user-uuid' AND day_of_week = 2 AND hour_of_day = 10;
```

### 3. Análisis de Estilo de Escritura

Cuando se importan posts de LinkedIn o el usuario edita contenido:

```javascript
{
  "vocabulary_level": "professional",
  "avg_sentence_length": 15,
  "paragraph_structure": "short_paragraphs",
  "emoji_usage": "moderate",
  "punctuation_patterns": ["exclamation_moderate", "question_common"],
  "common_phrases": ["sin embargo", "por otro lado", "en mi experiencia"],
  "tone_distribution": {
    "professional": 0.7,
    "inspirational": 0.2,
    "casual": 0.1
  }
}
```

Este análisis se guarda en `writing_samples.detected_style` y se agrega en `profiles.writing_style_profile`.

### 4. Biblioteca de Contenido Viral

Posts virales se analizan y almacenan:

```sql
INSERT INTO viral_content_library (
  content,
  metrics,
  viral_score,
  post_type,
  topics,
  hashtags,
  language,
  industry,
  detected_patterns
) VALUES (
  'Los 7 errores que cometí...',
  '{"likes": 2500, "comments": 180, "shares": 450, "impressions": 50000}',
  5830.00,
  'text',
  ARRAY['entrepreneurship', 'lessons'],
  ARRAY['startup', 'entrepreneur'],
  'es',
  'Technology',
  '{"hook_pattern": "mistake_list", "has_thread": true, "numbered_list": true}'
);
```

**Patrones Virales Detectados:**
- `mistake_list` - Listas de errores/lecciones
- `numbered_list` - Contenido numerado
- `personal_story` - Storytelling personal
- `specific_numbers` - Datos concretos
- `time_investment` - "Pasé X años..."
- `promise_of_results` - Promesa de valor
- `hook_pattern` - Tipo de gancho usado
- `has_thread` - Post con hilo (🧵)

---

## Cálculo de Viral Score

```javascript
function calculateViralScore(metrics) {
  const { likes, comments, shares, impressions } = metrics;

  // Engagement rate
  const engagementRate =
    impressions > 0
      ? ((likes + comments * 2 + shares * 3) / impressions) * 100
      : 0;

  // Weighted score
  // Likes: 1 punto
  // Comments: 5 puntos (más valiosos - indican interacción)
  // Shares: 10 puntos (máximo valor - amplifican alcance)
  // Engagement rate: x100 puntos
  const viralScore =
    likes * 1 + comments * 5 + shares * 10 + engagementRate * 100;

  return viralScore;
}
```

**Rangos de Viral Score:**
- `0-100`: Bajo engagement
- `100-500`: Engagement moderado
- `500-1000`: Buen engagement
- `1000-5000`: Alto engagement
- `5000+`: Contenido viral

---

## Configuración Requerida

### Variables de Entorno

Ya configuradas en `.env.local`:

```env
# LinkedIn OAuth
LINKEDIN_CLIENT_ID=78s77xwy9xh8ib
LINKEDIN_CLIENT_SECRET=<your_linkedin_client_secret>
LINKEDIN_REDIRECT_URI=https://kolink.es/api/auth/linkedin/callback

# OpenAI
OPENAI_API_KEY=sk-proj-...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://crdtxyfvbosjiddirtzc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJI...
```

### Migración de Base de Datos

Aplicar migración cuando la conexión a Supabase se restablezca:

```bash
supabase db push
```

Esto creará todas las tablas necesarias en:
`/supabase/migrations/20251031120000_complete_system.sql`

### Configurar LinkedIn App

En [LinkedIn Developers](https://www.linkedin.com/developers/apps):

1. **Redirect URLs:** Añadir `https://kolink.es/api/auth/linkedin/callback`
2. **Scopes:** Solicitar `openid`, `profile`, `email`, `w_member_social`
3. **Verificar:** Que la app esté en modo "Published" (no Development)

---

## Mejores Prácticas

### 1. Privacidad y Seguridad

- ✅ Nunca expongas tokens de LinkedIn en frontend
- ✅ Usa RLS policies de Supabase para seguridad
- ✅ Valida autenticación en cada endpoint
- ✅ Maneja expiración de tokens (refresh si es necesario)

### 2. Rate Limiting

LinkedIn tiene límites de API:
- **Lectura:** ~100 requests/día por usuario
- **Escritura:** ~100 posts/día por usuario

Implementa rate limiting en tu aplicación.

### 3. User Experience

- ✅ Muestra claramente qué datos se están usando
- ✅ Permite al usuario ver/editar preferencias aprendidas
- ✅ Opción de "olvidar" datos de escritura
- ✅ Transparencia en el proceso de aprendizaje

### 4. Optimización

- Cachea tokens de LinkedIn (no hagas requests innecesarios)
- Usa batch processing para sync de métricas
- Implementa queue para posts programados
- Usa indexes de database eficientemente

---

## Próximos Pasos de Implementación

### Fase 1: Testing (Actual)
- [ ] Aplicar migración de database
- [ ] Probar flujo OAuth de LinkedIn
- [ ] Verificar importación de posts
- [ ] Testear generación personalizada

### Fase 2: UI/UX
- [ ] Botón "Conectar LinkedIn" en Profile
- [ ] Dashboard de preferencias aprendidas
- [ ] Vista de métricas de posts publicados
- [ ] Timeline de mejores horarios

### Fase 3: Aprendizaje Avanzado
- [ ] Implementar embeddings con pgvector
- [ ] Búsqueda semántica de contenido similar
- [ ] Recomendaciones automáticas de temas
- [ ] A/B testing de diferentes estilos

### Fase 4: Automatización
- [ ] Cron job para sync automático de métricas
- [ ] Queue worker para publicaciones programadas
- [ ] Notificaciones de mejores horarios
- [ ] Resumen semanal de performance

---

## Troubleshooting

### Error: "LinkedIn token expired"

```javascript
// Implementar refresh token flow
if (tokenExpired) {
  const newToken = await refreshLinkedInToken(refresh_token);
  // Actualizar en database
}
```

### Error: "No writing samples"

Primer uso - sistema funcionará con defaults. Mejorará con uso.

### Baja personalización

Necesitas:
- Mínimo 5 writing samples
- Al menos 10 posts generados/editados
- 2+ semanas de uso para aprender horarios

### Posts no virales

El sistema aprende. Más datos = mejores predicciones. Considera:
- Sincronizar métricas regularmente
- Dar feedback explícito
- Experimentar con diferentes tones/formats

---

## Soporte

Para dudas o problemas:
1. Revisar logs en `/api/generate-smart`
2. Verificar RLS policies en Supabase
3. Comprobar rate limits de LinkedIn
4. Revisar generation_history para debugging

---

**Última actualización:** 2025-10-31
**Versión:** 1.0
