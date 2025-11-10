/**
 * API ENDPOINT: POST /api/user-style/ingest
 *
 * Ingesta posts del usuario desde LinkedIn y genera sus embeddings.
 * Este endpoint permite al usuario importar su contenido histórico
 * para que el sistema aprenda su estilo de escritura.
 *
 * Flujo:
 * 1. Valida autenticación del usuario
 * 2. Inserta posts en la tabla user_posts
 * 3. Genera embeddings para cada post usando OpenAI
 * 4. Guarda embeddings en user_post_embeddings
 * 5. Retorna IDs de posts creados y métricas
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { generateBatchEmbeddings } from '@/lib/ai/embeddings';
import { logger } from '@/lib/logger';
import type {
  IngestUserPostsRequest,
  IngestUserPostsResponse,
} from '@/types/personalization';

// Inicializar cliente de Supabase con service role para operaciones admin
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IngestUserPostsResponse | { error: string }>
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

    // Verificar token de Supabase
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    const userId = user.id;

    // 2. VALIDAR REQUEST BODY
    const body: IngestUserPostsRequest = req.body;

    if (!body.posts || !Array.isArray(body.posts) || body.posts.length === 0) {
      return res.status(400).json({
        error: 'El campo "posts" es requerido y debe ser un array no vacío',
      });
    }

    // Limitar a 100 posts por request para evitar timeouts
    if (body.posts.length > 100) {
      return res.status(400).json({
        error: 'Máximo 100 posts por request. Divide la importación en múltiples llamadas.',
      });
    }

    // Validar cada post
    for (let i = 0; i < body.posts.length; i++) {
      const post = body.posts[i];
      if (!post.content || post.content.trim().length === 0) {
        return res.status(400).json({
          error: `Post en índice ${i} no tiene contenido válido`,
        });
      }
    }

    logger.debug(`[Ingest] Usuario ${userId} ingresando ${body.posts.length} posts`);

    // 3. INSERTAR POSTS EN LA BASE DE DATOS
    const postsToInsert = body.posts.map((post) => ({
      user_id: userId,
      content: post.content.trim(),
      linkedin_post_id: post.linkedin_post_id,
      published_at: post.published_at,
      likes: post.likes ?? 0,
      comments: post.comments ?? 0,
      shares: post.shares ?? 0,
      views: post.views ?? 0,
      // word_count se puede calcular aquí o con un trigger
      word_count: post.content.trim().split(/\s+/).length,
    }));

    const { data: insertedPosts, error: insertError } = await supabase
      .from('user_posts')
      .insert(postsToInsert)
      .select('id, content');

    if (insertError) {
      logger.error('[Ingest] Error al insertar posts:', insertError);
      return res.status(500).json({
        error: `Error al guardar posts: ${insertError.message}`,
      });
    }

    if (!insertedPosts || insertedPosts.length === 0) {
      return res.status(500).json({
        error: 'No se pudieron insertar los posts',
      });
    }

    logger.debug(`[Ingest] ${insertedPosts.length} posts insertados correctamente`);

    // 4. GENERAR EMBEDDINGS EN BATCH
    const contents = insertedPosts.map((p) => p.content);
    let embeddings: number[][];

    try {
      embeddings = await generateBatchEmbeddings(contents);
      logger.debug(`[Ingest] ${embeddings.length} embeddings generados`);
    } catch (embeddingError) {
      logger.error('[Ingest] Error al generar embeddings:', embeddingError);
      const errorMessage = embeddingError instanceof Error ? embeddingError.message : 'Unknown error';
      // Si falla la generación de embeddings, eliminamos los posts insertados
      await supabase.from('user_posts').delete().in(
        'id',
        insertedPosts.map((p) => p.id)
      );
      return res.status(500).json({
        error: `Error al generar embeddings: ${errorMessage}`,
      });
    }

    // 5. GUARDAR EMBEDDINGS EN LA BASE DE DATOS
    const embeddingsToInsert = insertedPosts.map((post, index) => ({
      post_id: post.id,
      user_id: userId,
      embedding: embeddings[index], // pgvector acepta arrays de números
      model_version: 'text-embedding-3-small',
    }));

    const { data: insertedEmbeddings, error: embeddingInsertError } = await supabase
      .from('user_post_embeddings')
      .insert(embeddingsToInsert)
      .select('id');

    if (embeddingInsertError) {
      logger.error('[Ingest] Error al guardar embeddings:', embeddingInsertError);
      // Eliminar posts si falla el guardado de embeddings
      await supabase.from('user_posts').delete().in(
        'id',
        insertedPosts.map((p) => p.id)
      );
      return res.status(500).json({
        error: `Error al guardar embeddings: ${embeddingInsertError.message}`,
      });
    }

    logger.debug(`[Ingest] ${insertedEmbeddings?.length ?? 0} embeddings guardados`);

    // 6. RETORNAR RESPUESTA EXITOSA
    const response: IngestUserPostsResponse = {
      success: true,
      posts_created: insertedPosts.length,
      embeddings_created: insertedEmbeddings?.length ?? 0,
      post_ids: insertedPosts.map((p) => p.id),
    };

    return res.status(201).json(response);
  } catch (error) {
    logger.error('[Ingest] Error inesperado:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({
      error: `Error interno del servidor: ${errorMessage}`,
    });
  }
}
