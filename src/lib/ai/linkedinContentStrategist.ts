/**
 * LinkedIn Content Strategist AI System
 * Sistema especializado para crear contenido viral en LinkedIn
 */

import { openai } from "@/lib/openai";

// ============================================================================
// TIPOS Y INTERFACES
// ============================================================================

export interface ContentAnalysis {
  hook_strength: number; // 0-100
  readability_score: number; // 0-100
  emotional_triggers: string[];
  structure_quality: number; // 0-100
  cta_presence: boolean;
  estimated_viral_score: number; // 0-100
  suggestions: string[];
}

export interface AudienceInsights {
  engagement_patterns: {
    best_posting_times: string[];
    preferred_content_types: string[];
    avg_engagement_rate: number;
  };
  demographics: {
    industries: string[];
    seniority_levels: string[];
    common_interests: string[];
  };
}

export interface ViralPost {
  content: string;
  engagement_score: number;
  pattern_type: string;
  why_it_worked: string;
}

export interface GenerationContext {
  user_id: string;
  topic: string;
  tone?: string;
  objective?: 'awareness' | 'engagement' | 'conversion' | 'thought_leadership';
  target_length?: 'short' | 'medium' | 'long';
  include_cta?: boolean;
  user_writing_samples?: string[];
  viral_inspiration?: ViralPost[];
  audience_insights?: AudienceInsights;
  current_trends?: string[];
}

// ============================================================================
// PROMPTS ESPECIALIZADOS
// ============================================================================

const SYSTEM_PROMPTS = {
  strategist: `Eres un estratega de contenido social especializado en LinkedIn, con expertise en:

1. ANÁLISIS DE AUDIENCIA: Comprendes profundamente quién consume contenido y qué resuena con diferentes segmentos profesionales.

2. PSICOLOGÍA DE VIRALIDAD: Conoces los principios que hacen que el contenido se comparta:
   - Reciprocidad (dar valor antes de pedir)
   - Prueba social (mostrar validación de otros)
   - Escasez (información única o urgente)
   - Autoridad (demostrar expertise)
   - Consistencia (alinearse con valores del lector)
   - Simpatía (conexión emocional genuina)

3. ESTRUCTURA VIRAL: Dominas el formato que maximiza engagement:
   - Hook impactante (primeras 2 líneas críticas)
   - Desarrollo con valor tangible
   - Storytelling cuando es apropiado
   - Conclusión memorable
   - CTA claro y específico

4. TÉCNICAS DE ESCRITURA:
   - Contraste y tensión narrativa
   - Frases cortas y directas
   - Espacios en blanco estratégicos
   - Lenguaje sensorial y específico
   - Evitar jerga innecesaria

5. OPTIMIZACIÓN DE CONTENIDO:
   - Análisis de rendimiento previo
   - Identificación de patrones exitosos
   - Adaptación al estilo del autor
   - Incorporación de datos actuales
   - Testeo A/B mental de enfoques`,

  analyzer: `Eres un analista experto de contenido en LinkedIn. Tu trabajo es:

1. Identificar elementos que generan engagement
2. Detectar patrones emocionales y psicológicos
3. Evaluar la fuerza del hook
4. Medir la claridad del mensaje
5. Analizar la estructura y formato
6. Predecir el potencial viral

Usa métricas específicas y proporciona feedback accionable.`,

  writer: `Eres un copywriter profesional especializado en LinkedIn. Escribes contenido que:

1. Captura atención inmediata con hooks potentes
2. Mantiene interés con valor constante
3. Usa storytelling cuando es relevante
4. Incluye datos y ejemplos específicos
5. Termina con CTAs claros
6. Mantiene la voz auténtica del autor

Tu objetivo es crear posts que generen conversaciones y conexiones genuinas.`,
};

// ============================================================================
// FUNCIONES DE ANÁLISIS
// ============================================================================

/**
 * Analiza el estilo de escritura del usuario basado en sus posts anteriores
 */
export async function analyzeWritingStyle(writingSamples: string[]): Promise<string> {
  if (!writingSamples || writingSamples.length === 0) {
    return "Estilo profesional y directo";
  }

  const prompt = `Analiza estos posts de LinkedIn del usuario e identifica su estilo de escritura único:

${writingSamples.slice(0, 5).map((sample, i) => `POST ${i + 1}:\n${sample}\n`).join('\n---\n')}

Describe en 2-3 oraciones concisas:
1. Tono característico (formal/casual, técnico/accesible, etc.)
2. Patrones de estructura (narrativo, listados, reflexivo, etc.)
3. Elementos distintivos (uso de emojis, preguntas, datos, etc.)

Responde SOLO con la descripción del estilo, sin introducción.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPTS.analyzer },
      { role: "user", content: prompt },
    ],
    temperature: 0.3,
    max_tokens: 200,
  });

  return response.choices[0].message.content || "Estilo profesional y directo";
}

/**
 * Analiza un borrador y proporciona feedback detallado
 */
export async function analyzeContent(content: string): Promise<ContentAnalysis> {
  const prompt = `Analiza este post de LinkedIn y proporciona métricas específicas:

POST:
${content}

Evalúa y responde SOLO en formato JSON con esta estructura exacta:
{
  "hook_strength": <número 0-100>,
  "readability_score": <número 0-100>,
  "emotional_triggers": ["trigger1", "trigger2"],
  "structure_quality": <número 0-100>,
  "cta_presence": <true/false>,
  "estimated_viral_score": <número 0-100>,
  "suggestions": ["sugerencia1", "sugerencia2", "sugerencia3"]
}

Criterios:
- hook_strength: ¿Qué tan impactantes son las primeras 2 líneas?
- readability_score: Claridad, formato, longitud de oraciones
- emotional_triggers: Emociones activadas (curiosidad, urgencia, aspiración, etc.)
- structure_quality: Organización lógica y uso de espacios
- cta_presence: ¿Hay llamada a la acción clara?
- estimated_viral_score: Probabilidad de alto engagement
- suggestions: 3 mejoras específicas y accionables`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPTS.analyzer },
      { role: "user", content: prompt },
    ],
    temperature: 0.2,
    max_tokens: 500,
    response_format: { type: "json_object" },
  });

  const result = JSON.parse(response.choices[0].message.content || "{}");
  return result as ContentAnalysis;
}

// ============================================================================
// GENERACIÓN DE CONTENIDO ESTRATÉGICO
// ============================================================================

/**
 * Genera un hook viral basado en el tema y objetivo
 */
export async function generateViralHook(
  topic: string,
  objective: string,
  style?: string
): Promise<string[]> {
  const prompt = `Genera 3 hooks diferentes para un post de LinkedIn sobre: "${topic}"

Objetivo: ${objective}
${style ? `Estilo del autor: ${style}` : ''}

Cada hook debe:
- Ser de máximo 2 líneas
- Capturar atención inmediata
- Generar curiosidad o emoción
- Ser específico, no genérico
- Usar técnicas como: pregunta provocativa, dato sorprendente, contraste, declaración audaz, o historia intrigante

Responde SOLO con los 3 hooks numerados, sin explicaciones.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPTS.writer },
      { role: "user", content: prompt },
    ],
    temperature: 0.8,
    max_tokens: 300,
  });

  const content = response.choices[0].message.content || "";
  return content
    .split('\n')
    .filter(line => line.match(/^\d+\./))
    .map(line => line.replace(/^\d+\.\s*/, '').trim());
}

/**
 * Genera contenido completo con todas las técnicas de viralidad
 */
export async function generateViralContent(context: GenerationContext): Promise<string> {
  // 1. Analizar estilo del usuario si tiene samples
  let userStyle = "profesional y auténtico";
  if (context.user_writing_samples && context.user_writing_samples.length > 0) {
    userStyle = await analyzeWritingStyle(context.user_writing_samples);
  }

  // 2. Construir contexto enriquecido
  let enrichedContext = `TEMA: ${context.topic}\n`;
  enrichedContext += `OBJETIVO: ${context.objective || 'engagement'}\n`;
  enrichedContext += `TONO: ${context.tone || 'profesional inspirador'}\n`;
  enrichedContext += `LONGITUD: ${context.target_length || 'medium'}\n`;
  enrichedContext += `ESTILO DEL AUTOR: ${userStyle}\n`;

  if (context.viral_inspiration && context.viral_inspiration.length > 0) {
    enrichedContext += `\nINSPIRACIÓN VIRAL (patrones exitosos):\n`;
    context.viral_inspiration.slice(0, 2).forEach((post, i) => {
      enrichedContext += `Patrón ${i + 1}: ${post.pattern_type} - ${post.why_it_worked}\n`;
    });
  }

  if (context.current_trends && context.current_trends.length > 0) {
    enrichedContext += `\nTENDENCIAS ACTUALES:\n${context.current_trends.join(', ')}\n`;
  }

  // 3. Prompt de generación estratégica
  const prompt = `Crea un post viral para LinkedIn con estas especificaciones:

${enrichedContext}

ESTRUCTURA REQUERIDA:

1. HOOK (2 líneas máximo):
   - Debe capturar atención inmediata
   - Usa una de estas técnicas: pregunta provocativa, dato sorprendente, declaración audaz, o inicio de historia intrigante
   - Específico y concreto, NO genérico

2. DESARROLLO:
   - Entrega valor tangible (insight, lección, dato, historia)
   - Usa párrafos cortos (2-3 líneas máximo)
   - Incluye espacios en blanco para legibilidad
   - Incorpora ejemplo o historia si es relevante
   ${context.target_length === 'long' ? '- Desarrolla con profundidad (5-7 párrafos)' : ''}
   ${context.target_length === 'short' ? '- Sé conciso y directo (2-3 párrafos)' : ''}
   ${context.target_length === 'medium' ? '- Balance entre profundidad y brevedad (3-5 párrafos)' : ''}

3. ELEMENTOS VIRALES:
   - Trigger emocional (inspiración, curiosidad, urgencia, aspiración)
   - Datos o ejemplos específicos
   - Contraste o tensión narrativa si aplica
   - Lenguaje visual y sensorial

4. CIERRE:
   ${context.include_cta !== false ? '- CTA claro que invite a interacción específica' : '- Conclusión memorable'}
   - Resumir el valor en 1-2 líneas

IMPORTANTE:
- Mantén el estilo auténtico descrito arriba
- NO uses emojis a menos que sea parte del estilo del autor
- NO uses hashtags innecesarios
- Sé específico, evita generalidades
- El post debe verse natural, no forzado

Responde SOLO con el post final, sin explicaciones adicionales.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPTS.strategist },
      { role: "user", content: prompt },
    ],
    temperature: 0.7,
    max_tokens: 1000,
  });

  return response.choices[0].message.content || "";
}

/**
 * Mejora un borrador existente aplicando técnicas de viralidad
 */
export async function improveContent(
  originalContent: string,
  feedback?: string,
  userStyle?: string
): Promise<string> {
  const analysis = await analyzeContent(originalContent);

  const prompt = `Mejora este post de LinkedIn aplicando técnicas de viralidad:

POST ORIGINAL:
${originalContent}

ANÁLISIS ACTUAL:
- Hook strength: ${analysis.hook_strength}/100
- Readability: ${analysis.readability_score}/100
- Viral score estimado: ${analysis.estimated_viral_score}/100

ÁREAS DE MEJORA:
${analysis.suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}

${feedback ? `\nFEEDBACK ADICIONAL:\n${feedback}` : ''}
${userStyle ? `\nESTILO DEL AUTOR:\n${userStyle}` : ''}

OBJETIVO:
Reescribe el post para aumentar su potencial viral mientras mantienes la esencia del mensaje original.

Enfócate en:
1. Mejorar el hook si es necesario (primeras 2 líneas)
2. Optimizar estructura y legibilidad
3. Añadir elementos emocionales o de storytelling
4. Fortalecer el CTA o conclusión
5. Mantener autenticidad

Responde SOLO con el post mejorado, sin explicaciones.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPTS.writer },
      { role: "user", content: prompt },
    ],
    temperature: 0.7,
    max_tokens: 1000,
  });

  return response.choices[0].message.content || originalContent;
}

// ============================================================================
// FUNCIONES DE BÚSQUEDA E INVESTIGACIÓN
// ============================================================================

/**
 * Busca posts virales similares para inspiración
 * (Mock - en producción conectar con API de LinkedIn o base de datos de viral content)
 */
export async function findViralInspiration(
  topic: string,
  _limit: number = 3
): Promise<ViralPost[]> {
  // Por ahora retornamos ejemplos mock
  // En producción, esto consultaría la tabla viral_content_library
  const prompt = `Basándote en tu conocimiento de posts virales en LinkedIn sobre "${topic}", describe 3 patrones exitosos.

Para cada patrón, responde en formato JSON:
{
  "patterns": [
    {
      "pattern_type": "tipo de estructura (ej: storytelling personal, lista de insights, case study)",
      "why_it_worked": "explicación breve de por qué generó engagement",
      "engagement_score": <número 0-100>
    }
  ]
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPTS.analyzer },
      { role: "user", content: prompt },
    ],
    temperature: 0.5,
    max_tokens: 500,
    response_format: { type: "json_object" },
  });

  const result = JSON.parse(response.choices[0].message.content || '{"patterns":[]}');

  return result.patterns.map((p: { pattern_type?: string; why_it_worked?: string; engagement_score?: number }) => ({
    content: "", // En producción tendría el contenido real
    engagement_score: p.engagement_score || 75,
    pattern_type: p.pattern_type || "Unknown",
    why_it_worked: p.why_it_worked || "",
  }));
}

/**
 * Investiga información actualizada sobre un tema
 * (Requiere integración con API de búsqueda web)
 */
export async function researchTopic(topic: string): Promise<string[]> {
  // En producción, esto usaría WebSearch API o similar
  // Por ahora, usamos el conocimiento del modelo

  const prompt = `Proporciona 3-5 insights actuales y relevantes sobre: "${topic}"

Cada insight debe ser:
- Específico y concreto
- Basado en tendencias reales
- Útil para crear contenido en LinkedIn

Responde solo con la lista de insights, uno por línea.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "user", content: prompt },
    ],
    temperature: 0.6,
    max_tokens: 300,
  });

  const content = response.choices[0].message.content || "";
  return content.split('\n').filter(line => line.trim().length > 0);
}
