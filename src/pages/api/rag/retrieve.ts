/**
 * API ENDPOINT: POST /api/rag/retrieve
 *
 * Recupera ejemplos similares usando RAG (Retrieval-Augmented Generation).
 * Busca posts del usuario y posts virales que sean semánticamente similares
 * al tema proporcionado.
 *
 * Flujo:
 * 1. Valida autenticación del usuario
 * 2. Genera embedding del query (tema)
 * 3. Verifica si existe en caché
 * 4. Busca posts similares del usuario (pgvector cosine similarity)
 * 5. Busca posts virales similares
 * 6. Guarda resultado en caché
 * 7. Retorna posts similares ordenados por relevancia
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { generateEmbedding } from '@/lib/ai/embeddings';
import type {
  RagRetrieveRequest,
  RagRetrieveResponse,
  SimilarPost,
} from '@/types/personalization';
import crypto from 'crypto';

// Inicializar cliente de Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Duración del caché en horas
const CACHE_DURATION_HOURS = 24;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RagRetrieveResponse | { error: string }>
) {
  // Solo permitir POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

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
    const body: RagRetrieveRequest = req.body;

    if (!body.topic || body.topic.trim().length === 0) {
      return res.status(400).json({
        error: 'El campo "topic" es requerido',
      });
    }

    const topic = body.topic.trim();
    const intent = body.intent;
    const topKUser = Math.min(body.top_k_user ?? 3, 10); // Máximo 10
    const topKViral = Math.min(body.top_k_viral ?? 5, 20); // Máximo 20
    const useCache = body.use_cache ?? true;

    console.log(`[RAG Retrieve] Usuario ${userId} buscando: "${topic}"`);

    // 3. GENERAR HASH DEL QUERY PARA CACHÉ
    const queryString = `${userId}:${topic}:${intent ?? 'all'}`;
    const queryHash = crypto.createHash('md5').update(queryString).digest('hex');

    // 4. VERIFICAR CACHÉ SI ESTÁ HABILITADO
    if (useCache) {
      const { data: cachedResult } = await supabase
        .from('rag_cache')
        .select('top_user_posts, top_viral_posts, created_at')
        .eq('query_hash', queryHash)
        .eq('user_id', userId)
        .single();

      if (cachedResult) {
        const cacheAge = Date.now() - new Date(cachedResult.created_at).getTime();
        const cacheAgeHours = cacheAge / (1000 * 60 * 60);

        if (cacheAgeHours < CACHE_DURATION_HOURS) {
          console.log(`[RAG Retrieve] Cache hit para query hash ${queryHash}`);

          // Recuperar posts completos desde caché
          const userPosts = await fetchPostsByIds(cachedResult.top_user_posts, 'user');
          const viralPosts = await fetchPostsByIds(cachedResult.top_viral_posts, 'viral');

          // Incrementar hit_count
          await supabase
            .from('rag_cache')
            .update({ hit_count: supabase.rpc('increment', { row_id: queryHash }) })
            .eq('query_hash', queryHash);

          return res.status(200).json({
            success: true,
            user_posts: userPosts,
            viral_posts: viralPosts,
            cache_hit: true,
            query_hash: queryHash,
          });
        }
      }
    }

    // 5. GENERAR EMBEDDING DEL QUERY
    let queryEmbedding: number[];

    try {
      queryEmbedding = await generateEmbedding(topic);
      console.log(`[RAG Retrieve] Embedding generado (${queryEmbedding.length} dimensiones)`);
    } catch (embeddingError: any) {
      console.error('[RAG Retrieve] Error al generar embedding:', embeddingError);
      return res.status(500).json({
        error: `Error al generar embedding: ${embeddingError.message}`,
      });
    }

    // 6. BUSCAR POSTS SIMILARES DEL USUARIO
    // Usa la función SQL search_similar_user_posts
    const { data: userPostsData, error: userError } = await supabase.rpc(
      'search_similar_user_posts',
      {
        p_user_id: userId,
        p_query_embedding: queryEmbedding,
        p_limit: topKUser,
      }
    );

    if (userError) {
      console.error('[RAG Retrieve] Error en búsqueda de posts de usuario:', userError);
    }

    const userPosts: SimilarPost[] = (userPostsData ?? []).map((row: any) => ({
      id: row.post_id,
      content: row.content,
      similarity: row.similarity,
      type: 'user' as const,
    }));

    console.log(`[RAG Retrieve] ${userPosts.length} posts de usuario encontrados`);

    // 7. BUSCAR POSTS VIRALES SIMILARES
    // Usa la función SQL search_similar_viral_posts
    const { data: viralPostsData, error: viralError } = await supabase.rpc(
      'search_similar_viral_posts',
      {
        p_query_embedding: queryEmbedding,
        p_intent: intent ?? null,
        p_limit: topKViral,
      }
    );

    if (viralError) {
      console.error('[RAG Retrieve] Error en búsqueda de posts virales:', viralError);
    }

    const viralPosts: SimilarPost[] = (viralPostsData ?? []).map((row: any) => ({
      id: row.viral_id,
      content: row.content,
      similarity: row.similarity,
      engagement_rate: parseFloat(row.engagement_rate),
      type: 'viral' as const,
    }));

    console.log(`[RAG Retrieve] ${viralPosts.length} posts virales encontrados`);

    // 8. GUARDAR EN CACHÉ PARA FUTURAS CONSULTAS
    if (useCache && (userPosts.length > 0 || viralPosts.length > 0)) {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + CACHE_DURATION_HOURS);

      await supabase
        .from('rag_cache')
        .upsert(
          {
            query_hash: queryHash,
            user_id: userId,
            query_embedding: queryEmbedding,
            top_user_posts: userPosts.map((p) => p.id),
            top_viral_posts: viralPosts.map((p) => p.id),
            hit_count: 0,
            expires_at: expiresAt.toISOString(),
          },
          {
            onConflict: 'query_hash',
          }
        );

      console.log(`[RAG Retrieve] Resultado guardado en caché`);
    }

    // 9. RETORNAR RESULTADOS
    const response: RagRetrieveResponse = {
      success: true,
      user_posts: userPosts,
      viral_posts: viralPosts,
      cache_hit: false,
      query_hash: queryHash,
    };

    return res.status(200).json(response);
  } catch (error: any) {
    console.error('[RAG Retrieve] Error inesperado:', error);
    return res.status(500).json({
      error: `Error interno del servidor: ${error.message}`,
    });
  }
}

/**
 * Recupera posts completos desde sus IDs
 * Helper function para reconstruir posts desde caché
 */
async function fetchPostsByIds(
  ids: string[],
  type: 'user' | 'viral'
): Promise<SimilarPost[]> {
  if (!ids || ids.length === 0) {
    return [];
  }

  if (type === 'user') {
    const { data, error } = await supabase
      .from('user_posts')
      .select('id, content, engagement_rate')
      .in('id', ids);

    if (error || !data) {
      console.error('[fetchPostsByIds] Error al recuperar posts de usuario:', error);
      return [];
    }

    return data.map((post) => ({
      id: post.id,
      content: post.content,
      similarity: 1, // La similitud exacta se perdió, pero el orden se mantiene
      engagement_rate: post.engagement_rate ?? undefined,
      type: 'user' as const,
    }));
  } else {
    const { data, error } = await supabase
      .from('viral_corpus')
      .select('id, content, engagement_rate')
      .in('id', ids)
      .eq('is_active', true);

    if (error || !data) {
      console.error('[fetchPostsByIds] Error al recuperar posts virales:', error);
      return [];
    }

    return data.map((post) => ({
      id: post.id,
      content: post.content,
      similarity: 1,
      engagement_rate: parseFloat(post.engagement_rate as any),
      type: 'viral' as const,
    }));
  }
}
