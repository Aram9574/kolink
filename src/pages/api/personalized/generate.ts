/**
 * API ENDPOINT: POST /api/personalized/generate
 *
 * Genera contenido personalizado para LinkedIn usando RAG.
 * Este es el endpoint principal que combina todo el sistema:
 * - Recupera ejemplos del estilo del usuario
 * - Recupera posts virales similares
 * - Genera 2 variantes (A/B) usando GPT-4o
 * - Guarda la generación en la base de datos
 *
 * Flujo completo:
 * 1. Autenticar usuario
 * 2. Generar embedding del topic
 * 3. Recuperar posts similares (RAG)
 * 4. Generar variantes A/B con GPT-4o
 * 5. Guardar generación en BD
 * 6. Retornar variantes al usuario
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { generateEmbedding } from '@/lib/ai/embeddings';
import { generateLinkedInPost } from '@/lib/ai/generation';
import { logger } from '@/lib/logger';
import { apiEndpointSchemas, validateRequest, formatZodErrors } from '@/lib/validation';
import { applyRateLimit } from '@/lib/middleware/rateLimit';
import { withErrorHandler, safeExternalApiCall, safeDatabaseOperation } from '@/lib/middleware/errorHandler';
import { UnauthorizedError, InsufficientCreditsError, NotFoundError } from '@/lib/errors/ApiError';
import type {
  GenerateContentRequest,
  GenerateContentResponse,
  SimilarPost,
} from '@/types/personalization';

// Inicializar cliente de Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GenerateContentResponse | { error: string; details?: Record<string, string[]> }>
) {
  // Solo permitir POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  // Apply rate limiting for generation endpoints
  const rateLimitPassed = await applyRateLimit(req, res, 'generation');
  if (!rateLimitPassed) {
    return; // Response already sent
  }

  const startTime = Date.now();

  try {
    // 1. VALIDAR AUTENTICACIÓN
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Token requerido');
    }

    const token = authHeader.replace('Bearer ', '');

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new UnauthorizedError('Token inválido o expirado');
    }

    const userId = user.id;

    // 2. VALIDAR REQUEST BODY con Zod
    const validation = validateRequest(apiEndpointSchemas.personalizedGenerate, {
      ...req.body,
      userId,
    });

    if (!validation.success) {
      const errors = formatZodErrors(validation.errors);
      logger.warn('[personalized/generate] Invalid request', { userId, errors });
      return res.status(400).json({
        error: 'Datos de solicitud inválidos',
        details: errors,
      });
    }

    const { topic, intent } = validation.data;
    const body: GenerateContentRequest = req.body;
    const additionalContext = body.additional_context?.trim();
    const temperature = body.temperature ?? 0.7;
    const topKUser = Math.min(body.top_k_user ?? 3, 10);
    const topKViral = Math.min(body.top_k_viral ?? 5, 20);

    logger.debug(`[Generate] Usuario ${userId} | Topic: "${topic}" | Intent: "${intent}"`);

    // 3. VERIFICAR QUE EL USUARIO TENGA CRÉDITOS
    // (Integración con el sistema de créditos existente)
    const { data: profile } = await supabase
      .from('profiles')
      .select('credits, plan')
      .eq('id', userId)
      .single();

    if (!profile) {
      throw new NotFoundError('Perfil de usuario');
    }

    if (profile.credits <= 0) {
      throw new InsufficientCreditsError(1, 0);
    }

    logger.debug(`[Generate] Usuario tiene ${profile.credits} créditos`);

    // 4. GENERAR EMBEDDING DEL TOPIC
    const queryEmbedding = await safeExternalApiCall(
      () => generateEmbedding(topic),
      'OpenAI Embeddings'
    );

    // 5. RECUPERAR POSTS SIMILARES DEL USUARIO (RAG)
    const { data: userPostsData } = await supabase.rpc('search_similar_user_posts', {
      p_user_id: userId,
      p_query_embedding: queryEmbedding,
      p_limit: topKUser,
    });

    const userPosts: SimilarPost[] = (userPostsData ?? []).map((row: Record<string, unknown>) => ({
      id: String(row.post_id),
      content: String(row.content),
      similarity: Number(row.similarity),
      type: 'user' as const,
    }));

    logger.debug(`[Generate] Recuperados ${userPosts.length} posts de usuario`);

    // 6. RECUPERAR POSTS VIRALES SIMILARES
    const { data: viralPostsData } = await supabase.rpc('search_similar_viral_posts', {
      p_query_embedding: queryEmbedding,
      p_intent: intent,
      p_limit: topKViral,
    });

    const viralPosts: SimilarPost[] = (viralPostsData ?? []).map((row: Record<string, unknown>) => ({
      id: String(row.viral_id),
      content: String(row.content),
      similarity: Number(row.similarity),
      engagement_rate: parseFloat(String(row.engagement_rate)),
      type: 'viral' as const,
    }));

    logger.debug(`[Generate] Recuperados ${viralPosts.length} posts virales`);

    // Si no hay ejemplos virales, usar posts virales generales del mismo intent
    if (viralPosts.length === 0) {
      const { data: fallbackViral } = await supabase
        .from('viral_corpus')
        .select('id, content, engagement_rate')
        .eq('intent', intent)
        .eq('is_active', true)
        .order('engagement_rate', { ascending: false })
        .limit(topKViral);

      if (fallbackViral) {
        viralPosts.push(
          ...fallbackViral.map((post) => ({
            id: post.id,
            content: post.content,
            similarity: 0.5, // Similitud arbitraria
            engagement_rate: typeof post.engagement_rate === 'number' ? post.engagement_rate : parseFloat(String(post.engagement_rate)),
            type: 'viral' as const,
          }))
        );
      }
    }

    // 7. GENERAR VARIANTES A/B CON GPT-4o
    const generation = await safeExternalApiCall(
      () => generateLinkedInPost(
        topic,
        intent,
        userPosts,
        viralPosts,
        additionalContext,
        {
          model: 'gpt-4o',
          temperature: temperature,
          max_tokens: 2000,
        }
      ),
      'OpenAI GPT-4o'
    );

    const variantA = generation.variantA;
    const variantB = generation.variantB;

    logger.debug(`[Generate] Variantes generadas exitosamente`);

    // 8. GUARDAR GENERACIÓN EN LA BASE DE DATOS
    const { data: generationRecord, error: saveError } = await supabase
      .from('generations')
      .insert({
        user_id: userId,
        topic: topic,
        intent: intent,
        additional_context: additionalContext,
        variant_a: variantA,
        variant_b: variantB,
        model_used: 'gpt-4o',
        temperature: temperature,
        user_examples_used: userPosts.map((p) => p.id),
        viral_examples_used: viralPosts.map((p) => p.id),
      })
      .select('id, created_at')
      .single();

    if (saveError || !generationRecord) {
      logger.error('[Generate] Error al guardar generación:', saveError);
      // No fallar si no se puede guardar, retornar contenido de todos modos
    }

    // 9. DESCONTAR 1 CRÉDITO AL USUARIO
    const { error: creditError } = await supabase
      .from('profiles')
      .update({ credits: profile.credits - 1 })
      .eq('id', userId);

    if (creditError) {
      logger.error('[Generate] Error al descontar crédito:', creditError);
      // No fallar si no se puede descontar
    }

    const duration = Date.now() - startTime;
    logger.debug(`[Generate] Completado en ${duration}ms | Créditos restantes: ${profile.credits - 1}`);

    // 10. RETORNAR RESPUESTA
    const response: GenerateContentResponse = {
      success: true,
      generation_id: generationRecord?.id ?? '',
      variantA: variantA,
      variantB: variantB,
      user_examples_used: userPosts.map((p) => p.id),
      viral_examples_used: viralPosts.map((p) => p.id),
      created_at: generationRecord?.created_at ?? new Date().toISOString(),
    };

    return res.status(200).json(response);
  } catch (error) {
    logger.error('[Generate] Error inesperado:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({
      error: `Error interno del servidor: ${errorMessage}`,
    });
  }
}

export default withErrorHandler(handler);
