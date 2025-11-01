# Sistema de IA para Contenido Viral en LinkedIn

## Descripción General

Este sistema implementa una IA especializada en crear contenido viral para LinkedIn, basándose en:

- **Análisis de audiencia**: Comprende quién consume el contenido
- **Búsqueda de inspiración**: Identifica patrones virales exitosos
- **Personalización**: Mantiene el estilo único del usuario
- **Optimización psicológica**: Aplica principios de viralidad comprobados
- **Información actualizada**: Investiga tendencias y datos relevantes

## Arquitectura del Sistema

### 1. Módulo Principal: LinkedIn Content Strategist

**Ubicación**: `/src/lib/ai/linkedinContentStrategist.ts`

Este módulo contiene toda la lógica de generación estratégica:

#### Funciones Principales:

```typescript
// Analizar estilo de escritura del usuario
analyzeWritingStyle(writingSamples: string[]): Promise<string>

// Analizar calidad y potencial viral de un post
analyzeContent(content: string): Promise<ContentAnalysis>

// Generar hooks virales
generateViralHook(topic, objective, style): Promise<string[]>

// Generar contenido completo con todas las técnicas
generateViralContent(context: GenerationContext): Promise<string>

// Mejorar un borrador existente
improveContent(originalContent, feedback, userStyle): Promise<string>

// Buscar inspiración en posts virales
findViralInspiration(topic, limit): Promise<ViralPost[]>

// Investigar información actualizada
researchTopic(topic: string): Promise<string[]>
```

### 2. Endpoints API

#### `/api/ai/generate-viral` (POST)

Endpoint principal para generación de contenido viral.

**Parámetros**:

```json
{
  "topic": "string (requerido para generate)",
  "tone": "profesional | casual | inspirador | técnico",
  "objective": "awareness | engagement | conversion | thought_leadership",
  "target_length": "short | medium | long",
  "include_cta": true | false,
  "mode": "generate | improve | analyze | hooks",
  "existing_content": "string (requerido para improve/analyze)",
  "feedback": "string (opcional para improve)"
}
```

**Modos de Uso**:

1. **`generate`** (Por defecto): Genera un post completo desde cero
   ```bash
   POST /api/ai/generate-viral
   {
     "topic": "Importancia de la IA en startups",
     "objective": "engagement",
     "target_length": "medium",
     "tone": "profesional inspirador"
   }
   ```

2. **`hooks`**: Genera solo hooks virales
   ```bash
   POST /api/ai/generate-viral
   {
     "topic": "Productividad en equipos remotos",
     "mode": "hooks",
     "objective": "engagement"
   }
   ```

3. **`analyze`**: Analiza un post existente
   ```bash
   POST /api/ai/generate-viral
   {
     "mode": "analyze",
     "existing_content": "Tu post aquí..."
   }
   ```

4. **`improve`**: Mejora un borrador
   ```bash
   POST /api/ai/generate-viral
   {
     "mode": "improve",
     "existing_content": "Tu borrador aquí...",
     "feedback": "Hazlo más inspirador y añade datos"
   }
   ```

**Respuesta**:

```json
{
  "success": true,
  "mode": "generate",
  "content": "Post generado...",
  "analysis": {
    "hook_strength": 85,
    "readability_score": 92,
    "emotional_triggers": ["curiosidad", "aspiración"],
    "structure_quality": 88,
    "cta_presence": true,
    "estimated_viral_score": 87,
    "suggestions": ["...", "...", "..."]
  },
  "context": {
    "topic": "...",
    "tone": "...",
    "objective": "...",
    "inspiration_patterns": ["storytelling personal", "case study"]
  },
  "credits_remaining": 45,
  "timestamp": "2025-10-31T..."
}
```

#### `/api/ai/analyze-audience` (GET)

Analiza la audiencia del usuario basándose en engagement histórico.

**Autenticación**: Bearer token requerido

**Respuesta**:

```json
{
  "success": true,
  "insights": {
    "engagement_patterns": {
      "best_posting_times": ["9:00 AM", "2:00 PM"],
      "preferred_content_types": ["storytelling", "insights prácticos"],
      "avg_engagement_rate": 4.2,
      "insights": [
        "Tu audiencia responde mejor a historias personales",
        "Posts publicados a media mañana obtienen 60% más engagement"
      ]
    },
    "audience_demographics": {
      "likely_industries": ["Tech", "Marketing"],
      "seniority_levels": ["Mid-level", "Senior"],
      "common_interests": ["IA", "Productividad", "Liderazgo"],
      "insights": ["Tu audiencia valora contenido práctico y accionable"]
    },
    "content_recommendations": {
      "topics_to_explore": ["IA aplicada", "Gestión de equipos"],
      "formats_to_try": ["Case studies", "Listas accionables"],
      "tone_suggestions": "Profesional pero accesible, con toques personales",
      "cta_strategies": ["Preguntas abiertas", "Invitación a compartir experiencias"]
    },
    "growth_opportunities": [
      "Incrementar uso de datos específicos",
      "Experimentar con formatos más largos",
      "Incorporar más CTAs que fomenten conversación"
    ]
  },
  "data_summary": {
    "total_posts": 25,
    "posts_with_engagement": 18,
    "behaviors_analyzed": 45,
    "feedback_count": 8
  }
}
```

## Técnicas de Viralidad Implementadas

### 1. Estructura Optimizada

El sistema aplica automáticamente:

- **Hook impactante** (2 líneas máximo)
  - Pregunta provocativa
  - Dato sorprendente
  - Declaración audaz
  - Inicio de historia intrigante

- **Desarrollo con valor**
  - Párrafos cortos (2-3 líneas)
  - Espacios en blanco estratégicos
  - Ejemplos y datos específicos
  - Storytelling cuando es relevante

- **Cierre memorable**
  - CTA claro y específico
  - Resumen del valor
  - Invitación a interacción

### 2. Principios Psicológicos

- **Reciprocidad**: Dar valor antes de pedir
- **Prueba social**: Mostrar validación
- **Escasez**: Información única
- **Autoridad**: Demostrar expertise
- **Consistencia**: Alinearse con valores
- **Simpatía**: Conexión emocional

### 3. Elementos Emocionales

- Curiosidad
- Urgencia
- Aspiración
- Inspiración
- Validación
- Pertenencia

## Flujo de Trabajo Recomendado

### Para Usuarios Nuevos (Sin historial)

1. **Importar posts de LinkedIn**:
   ```bash
   POST /api/linkedin/fetch-posts
   Headers: Authorization: Bearer {token}
   ```

2. **Generar primer contenido**:
   ```bash
   POST /api/ai/generate-viral
   {
     "topic": "Tu tema",
     "objective": "engagement",
     "target_length": "medium"
   }
   ```

3. **Analizar el resultado**:
   - Revisar el `analysis` en la respuesta
   - Ver `estimated_viral_score`
   - Leer `suggestions` para mejoras

4. **Refinar si es necesario**:
   ```bash
   POST /api/ai/generate-viral
   {
     "mode": "improve",
     "existing_content": "...",
     "feedback": "Hazlo más personal"
   }
   ```

### Para Usuarios con Historial

1. **Analizar audiencia** (cada semana):
   ```bash
   GET /api/ai/analyze-audience
   Headers: Authorization: Bearer {token}
   ```

2. **Generar contenido personalizado**:
   - El sistema automáticamente usa tu estilo aprendido
   - Incorpora insights de tu audiencia
   - Recomienda mejores horarios de publicación

3. **Experimentar con variaciones**:
   ```bash
   # Generar hooks alternativos
   POST /api/ai/generate-viral
   {
     "mode": "hooks",
     "topic": "Tu tema"
   }
   ```

## Integración con Base de Datos

### Tablas Utilizadas

1. **`writing_samples`**: Almacena posts del usuario para análisis de estilo
2. **`posts`**: Guarda contenido generado con metadata y análisis
3. **`user_behaviors`**: Registra interacciones para aprendizaje
4. **`content_feedback`**: Almacena feedback de audiencia
5. **`viral_content_library`**: Biblioteca de patrones exitosos
6. **`profiles.writing_style_profile`**: JSONB con insights de audiencia

### Aprendizaje Continuo

El sistema aprende automáticamente:

- **Estilo de escritura**: De posts importados y generados
- **Preferencias**: De feedback y ediciones
- **Audiencia**: De métricas de engagement
- **Patrones exitosos**: De posts con alto viral score

## Personalización Avanzada

### Configurar Estilo Personal

```typescript
// El sistema analiza automáticamente, pero puedes forzar actualización
POST /api/ai/generate-viral
{
  "mode": "generate",
  "topic": "...",
  // El sistema lee de writing_samples automáticamente
}
```

### Incorporar Feedback de Audiencia

```sql
-- Guardar feedback de LinkedIn
INSERT INTO content_feedback (user_id, post_id, feedback_type, content)
VALUES (
  'user_id',
  'post_id',
  'comment',
  'Excelente post, me gustaría ver más sobre...'
);
```

### Analizar Rendimiento

```typescript
// El análisis de audiencia incorpora automáticamente:
// - Engagement de posts (likes, comments, shares)
// - Horarios de mejor rendimiento
// - Tipos de contenido preferidos
// - Feedback recibido
```

## Mejores Prácticas

### 1. Para Máxima Personalización

- Importa al menos 10-15 posts anteriores
- Proporciona feedback específico al mejorar contenido
- Usa el modo `analyze` antes de publicar
- Actualiza métricas de engagement después de publicar

### 2. Para Máxima Viralidad

- Genera múltiples hooks y elige el mejor
- Usa `target_length: medium` para LinkedIn (150-300 palabras)
- Siempre incluye CTA (`include_cta: true`)
- Prueba diferentes objetivos según tu meta

### 3. Para Coherencia de Marca

- Mantén el mismo `tone` en posts relacionados
- Revisa que el contenido generado suene auténtico
- Usa el modo `improve` para ajustar el tono
- Importa regularmente nuevos posts para mantener actualizado tu estilo

## Ejemplo Completo de Uso

```typescript
// 1. Analizar audiencia
const audienceResponse = await fetch('/api/ai/analyze-audience', {
  headers: { Authorization: `Bearer ${token}` }
});
const { insights } = await audienceResponse.json();

// 2. Generar contenido basado en insights
const generateResponse = await fetch('/api/ai/generate-viral', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify({
    topic: insights.content_recommendations.topics_to_explore[0],
    tone: insights.content_recommendations.tone_suggestions,
    objective: 'engagement',
    target_length: 'medium',
    include_cta: true
  })
});

const { content, analysis } = await generateResponse.json();

// 3. Evaluar resultado
if (analysis.estimated_viral_score < 80) {
  // Mejorar con feedback
  const improveResponse = await fetch('/api/ai/generate-viral', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      mode: 'improve',
      existing_content: content,
      feedback: 'Hazlo más impactante y añade un dato sorprendente'
    })
  });

  const { improved_content } = await improveResponse.json();
  // Usar improved_content
}

// 4. Publicar en LinkedIn
await fetch('/api/linkedin/publish', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify({
    content: content // o improved_content
  })
});
```

## Próximas Mejoras

1. **Integración con búsqueda web real** para información actualizada
2. **Análisis A/B** de variaciones de posts
3. **Predicción de mejor hora de publicación** con ML
4. **Generación de imágenes** complementarias
5. **Sugerencias de hashtags** basadas en tendencias
6. **Análisis de competencia** automático

## Soporte y Troubleshooting

### Problema: Contenido muy genérico

**Solución**: Asegúrate de tener writing_samples importados
```bash
POST /api/linkedin/fetch-posts
```

### Problema: Viral score bajo

**Solución**: Usa el modo `improve` con feedback específico
```bash
POST /api/ai/generate-viral
{
  "mode": "improve",
  "existing_content": "...",
  "feedback": "Añade storytelling personal y datos específicos"
}
```

### Problema: Estilo no coincide

**Solución**: Importa más posts o ajusta manualmente el tono
```bash
{
  "tone": "descripción detallada del tono deseado"
}
```

## Conclusión

Este sistema de IA para contenido viral integra:

✅ Análisis psicológico de viralidad
✅ Personalización basada en estilo del usuario
✅ Aprendizaje de audiencia real
✅ Optimización continua
✅ Múltiples modos de generación
✅ Métricas y feedback accionable

**Resultado**: Contenido profesional, auténtico y optimizado para máximo engagement en LinkedIn.
