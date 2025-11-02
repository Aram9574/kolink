/**
 * KOLINK PERSONALIZATION - OPENAI TEXT GENERATION UTILITIES
 *
 * Funciones para generar contenido usando GPT-4o con contexto RAG.
 */

import OpenAI from 'openai';
import type { GenerationConfig, ChatMessage, SimilarPost } from '@/types/personalization';

// Inicializar cliente de OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Construye el prompt del sistema para generar posts de LinkedIn
 * Incluye contexto sobre el estilo del usuario y ejemplos virales
 *
 * @param userExamples - Posts del usuario para aprender su estilo
 * @param viralExamples - Posts virales para inspiración
 * @returns Mensaje del sistema
 */
function buildSystemPrompt(userExamples: SimilarPost[], viralExamples: SimilarPost[]): string {
  let systemPrompt = `Eres un experto en crear contenido viral para LinkedIn. Tu misión es generar posts que:

1. Mantengan el estilo y voz únicos del usuario
2. Incorporen técnicas comprobadas de contenido viral
3. Sean auténticos y genuinos, no genéricos ni forzados
4. Generen engagement real (likes, comentarios, shares)

## CONTEXTO DEL USUARIO\n\n`;

  // Añadir ejemplos del usuario si existen
  if (userExamples.length > 0) {
    systemPrompt += `A continuación están ejemplos de posts anteriores del usuario. Analiza su:
- Tono y voz (formal/informal, serio/humorístico)
- Estructura (párrafos cortos/largos, uso de emojis, etc.)
- Temas recurrentes
- Forma de conectar con la audiencia\n\n`;

    userExamples.forEach((example, index) => {
      systemPrompt += `### Ejemplo del Usuario ${index + 1} (Similitud: ${(example.similarity * 100).toFixed(1)}%)\n`;
      systemPrompt += `${example.content}\n\n`;
    });
  } else {
    systemPrompt += `No hay posts anteriores del usuario. Usa un tono profesional pero accesible.\n\n`;
  }

  // Añadir ejemplos virales
  systemPrompt += `## EJEMPLOS DE CONTENIDO VIRAL\n\n`;
  systemPrompt += `Estos posts han generado alto engagement. Identifica patrones exitosos:\n\n`;

  viralExamples.forEach((example, index) => {
    systemPrompt += `### Ejemplo Viral ${index + 1} (Engagement: ${example.engagement_rate?.toFixed(2)}%, Similitud: ${(example.similarity * 100).toFixed(1)}%)\n`;
    systemPrompt += `${example.content}\n\n`;
  });

  // Instrucciones finales
  systemPrompt += `## INSTRUCCIONES DE GENERACIÓN\n\n`;
  systemPrompt += `1. Genera DOS versiones diferentes (A y B) del post
2. Mantén la autenticidad del usuario (basándote en sus ejemplos)
3. Incorpora técnicas virales (ganchos, storytelling, CTA, etc.)
4. Usa formato LinkedIn: párrafos cortos, espacios en blanco, emojis estratégicos
5. Longitud ideal: 150-300 palabras para versión A, 300-600 palabras para versión B
6. NO uses hashtags excesivos (máximo 3)
7. Incluye un gancho fuerte en las primeras 2 líneas
8. Termina con una pregunta o CTA para generar comentarios

## FORMATO DE RESPUESTA\n\n`;
  systemPrompt += `Responde ÚNICAMENTE con un JSON válido con esta estructura exacta:
{
  "variantA": "Texto completo de la variante A...",
  "variantB": "Texto completo de la variante B..."
}

NO incluyas comentarios adicionales, explicaciones ni markdown. Solo el JSON.`;

  return systemPrompt;
}

/**
 * Genera dos variantes de un post de LinkedIn usando GPT-4o
 *
 * @param topic - Tema del post
 * @param intent - Intención del contenido
 * @param userExamples - Posts del usuario para mantener su estilo
 * @param viralExamples - Posts virales para inspiración
 * @param additionalContext - Contexto adicional del usuario
 * @param config - Configuración del modelo
 * @returns Objeto con variantA y variantB
 */
export async function generateLinkedInPost(
  topic: string,
  intent: string,
  userExamples: SimilarPost[],
  viralExamples: SimilarPost[],
  additionalContext?: string,
  config: GenerationConfig = {
    model: 'gpt-4o',
    temperature: 0.7,
    max_tokens: 2000,
  }
): Promise<{ variantA: string; variantB: string }> {
  try {
    // Construir mensajes para el chat
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: buildSystemPrompt(userExamples, viralExamples),
      },
      {
        role: 'user',
        content: buildUserPrompt(topic, intent, additionalContext),
      },
    ];

    // Llamar a OpenAI
    const response = await openai.chat.completions.create({
      model: config.model,
      messages: messages,
      temperature: config.temperature,
      max_tokens: config.max_tokens,
      top_p: config.top_p,
      frequency_penalty: config.frequency_penalty ?? 0.3, // Evitar repeticiones
      presence_penalty: config.presence_penalty ?? 0.2, // Fomentar diversidad
      response_format: { type: 'json_object' }, // Forzar respuesta JSON
    });

    // Extraer y parsear la respuesta
    const content = response.choices[0].message.content;

    if (!content) {
      throw new Error('La respuesta de OpenAI está vacía');
    }

    const parsed = JSON.parse(content);

    // Validar la estructura de la respuesta
    if (!parsed.variantA || !parsed.variantB) {
      throw new Error('La respuesta no contiene variantA y variantB');
    }

    return {
      variantA: parsed.variantA.trim(),
      variantB: parsed.variantB.trim(),
    };
  } catch (error: any) {
    console.error('Error al generar contenido:', error);

    // Si hay error de parsing JSON, intentar extraer manualmente
    if (error instanceof SyntaxError) {
      throw new Error('Error al parsear respuesta de OpenAI. Formato JSON inválido.');
    }

    throw new Error(`Error en generación de contenido: ${error.message}`);
  }
}

/**
 * Construye el prompt del usuario con el tema y contexto
 *
 * @param topic - Tema del post
 * @param intent - Intención del contenido
 * @param additionalContext - Contexto adicional
 * @returns Prompt del usuario
 */
function buildUserPrompt(topic: string, intent: string, additionalContext?: string): string {
  let userPrompt = `Genera dos versiones de un post de LinkedIn sobre el siguiente tema:\n\n`;
  userPrompt += `**Tema:** ${topic}\n`;
  userPrompt += `**Intención:** ${intent}\n\n`;

  if (additionalContext) {
    userPrompt += `**Contexto Adicional:** ${additionalContext}\n\n`;
  }

  userPrompt += `Recuerda:
- Variante A: Versión más corta y directa (150-300 palabras)
- Variante B: Versión más profunda y elaborada (300-600 palabras)
- Mantén el estilo del usuario basándote en sus ejemplos
- Incorpora técnicas de los posts virales
- Usa un gancho fuerte al inicio
- Incluye un CTA o pregunta al final

Responde únicamente con el JSON solicitado.`;

  return userPrompt;
}

/**
 * Genera un análisis del estilo de escritura del usuario
 * Útil para mostrar insights al usuario sobre su contenido
 *
 * @param userPosts - Posts del usuario
 * @returns Análisis del estilo
 */
export async function analyzeUserStyle(
  userPosts: SimilarPost[]
): Promise<{
  tone: string;
  avg_length: number;
  common_themes: string[];
  uses_emojis: boolean;
  engagement_patterns: string;
}> {
  try {
    if (userPosts.length === 0) {
      throw new Error('No hay posts para analizar');
    }

    const systemPrompt = `Eres un experto en analizar contenido de LinkedIn. Analiza los siguientes posts y extrae:
1. Tono general (formal, informal, inspiracional, educativo, etc.)
2. Longitud promedio en palabras
3. Temas comunes (máximo 5)
4. Si usa emojis frecuentemente
5. Patrones de engagement (qué tipo de contenido funciona mejor)

Responde ÚNICAMENTE con JSON:
{
  "tone": "descripción del tono",
  "avg_length": número,
  "common_themes": ["tema1", "tema2", ...],
  "uses_emojis": boolean,
  "engagement_patterns": "descripción de patrones"
}`;

    const userPrompt = userPosts
      .map((post, i) => `### Post ${i + 1}\n${post.content}`)
      .join('\n\n');

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Modelo más económico para análisis
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3, // Baja temperatura para análisis objetivo
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('Respuesta vacía de OpenAI');
    }

    return JSON.parse(content);
  } catch (error: any) {
    console.error('Error al analizar estilo del usuario:', error);
    throw new Error(`Error en análisis de estilo: ${error.message}`);
  }
}

/**
 * Mejora un post existente con sugerencias específicas
 *
 * @param originalPost - Post original
 * @param improvementGoals - Objetivos de mejora
 * @returns Post mejorado con explicación
 */
export async function improvePost(
  originalPost: string,
  improvementGoals: string[]
): Promise<{ improved: string; changes: string[] }> {
  try {
    const systemPrompt = `Eres un experto en optimización de contenido para LinkedIn.
Mejora el post siguiendo los objetivos especificados, pero mantén la voz auténtica del autor.

Responde con JSON:
{
  "improved": "post mejorado completo",
  "changes": ["cambio 1 explicado", "cambio 2 explicado", ...]
}`;

    const userPrompt = `Post original:
${originalPost}

Objetivos de mejora:
${improvementGoals.map((goal, i) => `${i + 1}. ${goal}`).join('\n')}

Mejora el post manteniendo la autenticidad del autor.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.6,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('Respuesta vacía de OpenAI');
    }

    return JSON.parse(content);
  } catch (error: any) {
    console.error('Error al mejorar post:', error);
    throw new Error(`Error en mejora de post: ${error.message}`);
  }
}
