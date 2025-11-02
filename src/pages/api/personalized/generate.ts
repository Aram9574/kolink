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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GenerateContentResponse | { error: string }>
) {
  // Solo permitir POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const startTime = Date.now();

  try {
    // 1. VALIDAR AUTENTICACIÓN
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No autorizado. Token requerido.' });
    }

    const token = authHeader.replace('Bearer ', '');

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    const userId = user.id;

    // 2. VALIDAR REQUEST BODY
    const body: GenerateContentRequest = req.body;

    if (!body.topic || body.topic.trim().length === 0) {
      return res.status(400).json({
        error: 'El campo "topic" es requerido',
      });
    }

    if (!body.intent || body.intent.trim().length === 0) {
      return res.status(400).json({
        error: 'El campo "intent" es requerido',
      });
    }

    const topic = body.topic.trim();
    const intent = body.intent.trim();
    const additionalContext = body.additional_context?.trim();
    const temperature = body.temperature ?? 0.7;
    const topKUser = Math.min(body.top_k_user ?? 3, 10);
    const topKViral = Math.min(body.top_k_viral ?? 5, 20);

    console.log(`[Generate] Usuario ${userId} | Topic: "${topic}" | Intent: "${intent}"`);

    // 3. VERIFICAR QUE EL USUARIO TENGA CRÉDITOS
    // (Integración con el sistema de créditos existente)
    const { data: profile } = await supabase
      .from('profiles')
      .select('credits, plan')
      .eq('id', userId)
      .single();

    if (!profile) {
      return res.status(404).json({
        error: 'Perfil de usuario no encontrado',
      });
    }

    if (profile.credits <= 0) {
      return res.status(403).json({
        error: 'Sin créditos disponibles. Por favor, actualiza tu plan.',
      });
    }

    console.log(`[Generate] Usuario tiene ${profile.credits} créditos`);

    // 4. GENERAR EMBEDDING DEL TOPIC
    let queryEmbedding: number[];

    try {
      queryEmbedding = await generateEmbedding(topic);
    } catch (embeddingError) {
      console.error('[Generate] Error al generar embedding:', embeddingError);
      const errorMessage = embeddingError instanceof Error ? embeddingError.message : 'Unknown error';
      return res.status(500).json({
        error: `Error al procesar el tema: ${errorMessage}`,
      });
    }

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

    console.log(`[Generate] Recuperados ${userPosts.length} posts de usuario`);

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

    console.log(`[Generate] Recuperados ${viralPosts.length} posts virales`);

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
    let variantA: string;
    let variantB: string;

    try {
      const generation = await generateLinkedInPost(
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
      );

      variantA = generation.variantA;
      variantB = generation.variantB;

      console.log(`[Generate] Variantes generadas exitosamente`);
    } catch (generationError) {
      console.error('[Generate] Error al generar contenido:', generationError);
      const errorMessage = generationError instanceof Error ? generationError.message : 'Unknown error';
      return res.status(500).json({
        error: `Error al generar contenido: ${errorMessage}`,
      });
    }

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
      console.error('[Generate] Error al guardar generación:', saveError);
      // No fallar si no se puede guardar, retornar contenido de todos modos
    }

    // 9. DESCONTAR 1 CRÉDITO AL USUARIO
    const { error: creditError } = await supabase
      .from('profiles')
      .update({ credits: profile.credits - 1 })
      .eq('id', userId);

    if (creditError) {
      console.error('[Generate] Error al descontar crédito:', creditError);
      // No fallar si no se puede descontar
    }

    const duration = Date.now() - startTime;
    console.log(`[Generate] Completado en ${duration}ms | Créditos restantes: ${profile.credits - 1}`);

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
    console.error('[Generate] Error inesperado:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({
      error: `Error interno del servidor: ${errorMessage}`,
    });
  }
}
