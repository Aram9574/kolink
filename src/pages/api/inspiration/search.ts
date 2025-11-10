import { logger } from '@/lib/logger';
import type { NextApiRequest, NextApiResponse } from "next";
import { generateCacheKey, withCache } from "@/lib/redis";
import { openai } from "@/lib/openai";
import { limiter } from "@/lib/rateLimiter";
import { getSupabaseServerClient } from "@/lib/supabaseServerClient";
import { z } from "zod";

const searchRequestSchema = z.object({
  query: z.string().optional(),
  filters: z
    .object({
      platform: z.string().optional(),
      tags: z.array(z.string()).max(20).optional(),
    })
    .optional(),
  limit: z.number().int().positive().max(100).optional(),
});

type SearchRequest = z.infer<typeof searchRequestSchema>;

function normalizeSearchRequest(request: SearchRequest) {
  const trimmedQuery = request.query?.trim() || undefined;

  const platform = request.filters?.platform?.trim();
  const tags = request.filters?.tags?.map((tag) => tag.trim()).filter(Boolean);

  return {
    query: trimmedQuery,
    filters:
      platform || (tags && tags.length > 0)
        ? {
            ...(platform ? { platform } : {}),
            ...(tags && tags.length > 0 ? { tags } : {}),
          }
        : undefined,
    limit: request.limit,
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "No autorizado" });
  }

  const token = authHeader.replace("Bearer ", "");
  let supabase;
  try {
    supabase = getSupabaseServerClient(token);
  } catch (error) {
    logger.error("[api/inspiration/search] Supabase initialization error:", error);
    return res.status(500).json({ error: "Configuración de Supabase inválida" });
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  if (userError) {
    logger.error("[api/inspiration/search] Error autenticando usuario:", userError);
    return res.status(401).json({ error: "Sesión inválida" });
  }

  if (!user) {
    return res.status(401).json({ error: "Sesión inválida" });
  }

  // Rate limiting: 20 búsquedas cada 60 segundos por usuario
  try {
    const { success, reset } = await limiter.limit(`inspiration_search_${user.id}`);

    if (!success) {
      res.setHeader("Retry-After", Math.ceil(reset / 1000));
      return res.status(429).json({
        error: "Demasiadas búsquedas. Intenta de nuevo más tarde.",
        retryAfter: Math.ceil(reset / 1000),
      });
    }
  } catch (error) {
    logger.error("❌ Error en rate limiter:", error);
    // Continuar sin rate limiting si hay error
  }

  const parseResult = searchRequestSchema.safeParse(req.body);

  if (!parseResult.success) {
    return res.status(400).json({
      error: "Datos de búsqueda inválidos",
      details: parseResult.error.flatten(),
    });
  }

  const body = normalizeSearchRequest(parseResult.data);
  const limit = Math.min(body.limit ?? 20, 50);

  // Generate cache key from search parameters
  const cacheKey = generateCacheKey("inspiration:search", {
    query: body.query || "",
    platform: body.filters?.platform || "",
    tags: body.filters?.tags ?? [],
    limit,
  });

  // Use cache wrapper for search results (5 minute TTL)
  try {
    const results = await withCache(cacheKey, 300, async () => {
      // If there's a search query, use semantic search with embeddings
      if (body.query) {
        try {
          // Generate embedding for the search query
          // Using text-embedding-3-small for consistency with stored embeddings
          const embeddingResponse = await openai.embeddings.create({
            model: "text-embedding-3-small",
            input: body.query,
          });

          const queryEmbedding = embeddingResponse.data[0]?.embedding;

          if (queryEmbedding) {
            // Use pgvector cosine similarity search
            // Format: embedding <-> '[...]'::vector
            const embeddingStr = `[${queryEmbedding.join(",")}]`;

            let rpcQuery = supabase.rpc("search_inspiration_posts", {
              query_embedding: embeddingStr,
              match_threshold: 0.3, // Minimum similarity threshold
              match_count: limit,
            });

            // Apply filters
            if (body.filters?.platform) {
              rpcQuery = rpcQuery.eq("platform", body.filters.platform);
            }

            const { data: semanticResults, error: semanticError } = await rpcQuery;

            if (!semanticError && semanticResults && semanticResults.length > 0) {
              return semanticResults.map((item: {
                id: string;
                platform: string;
                author: string;
                title?: string;
                content: string;
                summary?: string;
                tags: string[];
                metrics: { likes?: number; shares?: number; comments?: number };
                captured_at: string;
                similarity?: number;
              }) => ({
                id: item.id,
                platform: item.platform,
                author: item.author,
                title: item.title,
                content: item.content,
                summary: item.summary,
                tags: item.tags,
                metrics: item.metrics,
                capturedAt: item.captured_at,
                similarity: item.similarity || 0.0,
              }));
            }

            logger.warn("[api/inspiration/search] RPC function not found, falling back to text search");
          }
        } catch (embeddingError) {
          logger.error("[api/inspiration/search] Embedding error:", embeddingError);
          // Fall through to text search
        }
      }

      // Fallback to traditional text search (ILIKE)
      let queryBuilder = supabase
        .from("inspiration_posts")
        .select("*")
        .order("captured_at", { ascending: false })
        .limit(limit);

      if (body.query) {
        const ilikeQuery = `%${body.query}%`;
        queryBuilder = queryBuilder.or(
          `content.ilike.${ilikeQuery},title.ilike.${ilikeQuery},author.ilike.${ilikeQuery}`
        );
      }

      if (body.filters?.platform) {
        queryBuilder = queryBuilder.eq("platform", body.filters.platform);
      }

      if (body.filters?.tags?.length) {
        queryBuilder = queryBuilder.contains("tags", body.filters.tags);
      }

      const { data, error } = await queryBuilder;

      if (error) {
        logger.error("[api/inspiration/search] Error:", error);
        throw error;
      }

      return (data ?? []).map((item) => ({
        id: item.id,
        platform: item.platform,
        author: item.author,
        title: item.title,
        content: item.content,
        summary: item.summary,
        tags: item.tags,
        metrics: item.metrics,
        capturedAt: item.captured_at,
        similarity: 0.0, // Text search has no similarity score
      }));
    });

    return res.status(200).json({
      ok: true,
      results,
      cached: true, // Indicates if result was from cache
    });
  } catch (error) {
    logger.error("[api/inspiration/search] Error:", error);
    return res.status(500).json({ error: "No se pudieron obtener resultados" });
  }
}
