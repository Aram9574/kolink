/**
 * API ENDPOINT: POST /api/viral/ingest
 *
 * Ingesta posts virales al corpus de inspiración.
 * Este endpoint es para uso ADMIN únicamente.
 * Permite cargar posts de alto engagement para que el sistema
 * aprenda patrones de viralidad.
 *
 * Flujo:
 * 1. Valida que el usuario sea administrador
 * 2. Inserta posts en viral_corpus
 * 3. Genera embeddings para cada post
 * 4. Guarda embeddings en viral_embeddings
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { generateBatchEmbeddings } from '@/lib/ai/embeddings';
import type {
  IngestViralPostsRequest,
  IngestViralPostsResponse,
} from '@/types/personalization';

// Inicializar cliente de Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Lista de emails de administradores (mover a variable de entorno en producción)
const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(',') || [];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IngestViralPostsResponse | { error: string }>
) {
  // Solo permitir POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    // 1. VALIDAR AUTENTICACIÓN Y PERMISOS DE ADMIN
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

    // Verificar que el usuario sea administrador
    if (!ADMIN_EMAILS.includes(user.email || '')) {
      console.warn(`[Viral Ingest] Usuario no autorizado: ${user.email}`);
      return res.status(403).json({
        error: 'Acceso denegado. Solo administradores pueden usar este endpoint.',
      });
    }

    const curatorId = user.id;

    // 2. VALIDAR REQUEST BODY
    const body: IngestViralPostsRequest = req.body;

    if (!body.posts || !Array.isArray(body.posts) || body.posts.length === 0) {
      return res.status(400).json({
        error: 'El campo "posts" es requerido y debe ser un array no vacío',
      });
    }

    // Limitar a 50 posts por request
    if (body.posts.length > 50) {
      return res.status(400).json({
        error: 'Máximo 50 posts virales por request',
      });
    }

    // Validar cada post viral
    for (let i = 0; i < body.posts.length; i++) {
      const post = body.posts[i];

      if (!post.content || post.content.trim().length === 0) {
        return res.status(400).json({
          error: `Post en índice ${i}: contenido vacío`,
        });
      }

      if (!post.topics || post.topics.length === 0) {
        return res.status(400).json({
          error: `Post en índice ${i}: debe tener al menos un topic`,
        });
      }

      if (!post.intent) {
        return res.status(400).json({
          error: `Post en índice ${i}: intent es requerido`,
        });
      }

      if (
        typeof post.likes !== 'number' ||
        typeof post.comments !== 'number' ||
        typeof post.shares !== 'number'
      ) {
        return res.status(400).json({
          error: `Post en índice ${i}: métricas de engagement inválidas`,
        });
      }
    }

    console.log(`[Viral Ingest] Admin ${user.email} ingresando ${body.posts.length} posts virales`);

    // 3. INSERTAR POSTS VIRALES EN LA BASE DE DATOS
    const viralPostsToInsert = body.posts.map((post) => ({
      content: post.content.trim(),
      author_industry: post.author_industry,
      author_follower_range: post.author_follower_range,
      likes: post.likes,
      comments: post.comments,
      shares: post.shares,
      views: post.views,
      topics: post.topics,
      intent: post.intent,
      post_format: post.post_format,
      has_hook: post.has_hook ?? false,
      has_cta: post.has_cta ?? false,
      uses_emojis: post.uses_emojis ?? false,
      uses_hashtags: post.uses_hashtags ?? false,
      word_count: post.content.trim().split(/\s+/).length,
      published_at: post.published_at,
      source_url: post.source_url,
      curated_by: curatorId,
      is_active: true,
      // engagement_rate se calcula automáticamente con trigger
    }));

    const { data: insertedPosts, error: insertError } = await supabase
      .from('viral_corpus')
      .insert(viralPostsToInsert)
      .select('id, content');

    if (insertError) {
      console.error('[Viral Ingest] Error al insertar posts:', insertError);
      return res.status(500).json({
        error: `Error al guardar posts virales: ${insertError.message}`,
      });
    }

    if (!insertedPosts || insertedPosts.length === 0) {
      return res.status(500).json({
        error: 'No se pudieron insertar los posts virales',
      });
    }

    console.log(`[Viral Ingest] ${insertedPosts.length} posts virales insertados`);

    // 4. GENERAR EMBEDDINGS EN BATCH
    const contents = insertedPosts.map((p) => p.content);
    let embeddings: number[][];

    try {
      embeddings = await generateBatchEmbeddings(contents);
      console.log(`[Viral Ingest] ${embeddings.length} embeddings generados`);
    } catch (embeddingError: any) {
      console.error('[Viral Ingest] Error al generar embeddings:', embeddingError);
      // Eliminar posts si falla la generación de embeddings
      await supabase.from('viral_corpus').delete().in(
        'id',
        insertedPosts.map((p) => p.id)
      );
      return res.status(500).json({
        error: `Error al generar embeddings: ${embeddingError.message}`,
      });
    }

    // 5. GUARDAR EMBEDDINGS
    const embeddingsToInsert = insertedPosts.map((post, index) => ({
      viral_post_id: post.id,
      embedding: embeddings[index],
      model_version: 'text-embedding-3-small',
    }));

    const { data: insertedEmbeddings, error: embeddingInsertError } = await supabase
      .from('viral_embeddings')
      .insert(embeddingsToInsert)
      .select('id');

    if (embeddingInsertError) {
      console.error('[Viral Ingest] Error al guardar embeddings:', embeddingInsertError);
      // Rollback: eliminar posts virales
      await supabase.from('viral_corpus').delete().in(
        'id',
        insertedPosts.map((p) => p.id)
      );
      return res.status(500).json({
        error: `Error al guardar embeddings: ${embeddingInsertError.message}`,
      });
    }

    console.log(`[Viral Ingest] ${insertedEmbeddings?.length ?? 0} embeddings guardados`);

    // 6. RETORNAR RESPUESTA EXITOSA
    const response: IngestViralPostsResponse = {
      success: true,
      posts_created: insertedPosts.length,
      embeddings_created: insertedEmbeddings?.length ?? 0,
      post_ids: insertedPosts.map((p) => p.id),
    };

    return res.status(201).json(response);
  } catch (error: any) {
    console.error('[Viral Ingest] Error inesperado:', error);
    return res.status(500).json({
      error: `Error interno del servidor: ${error.message}`,
    });
  }
}
