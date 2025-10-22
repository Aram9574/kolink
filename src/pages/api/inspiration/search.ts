import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { generateCacheKey, withCache } from "@/lib/redis";
import { openai } from "@/lib/openai";

type SearchRequest = {
  query?: string;
  filters?: {
    platform?: string;
    tags?: string[];
  };
  limit?: number;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "No autorizado" });
  }

  const token = authHeader.replace("Bearer ", "");
  const supabase = getSupabaseAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser(token);

  if (!user) {
    return res.status(401).json({ error: "Sesión inválida" });
  }

  const body = req.body as SearchRequest;
  const limit = Math.min(body.limit ?? 20, 50);

  // Generate cache key from search parameters
  const cacheKey = generateCacheKey("inspiration:search", {
    query: body.query || "",
    platform: body.filters?.platform || "",
    tags: body.filters?.tags || [],
    limit,
  });

  // Use cache wrapper for search results (5 minute TTL)
  try {
    const results = await withCache(cacheKey, 300, async () => {
      // If there's a search query, use semantic search with embeddings
      if (body.query && body.query.trim().length > 0) {
        try {
          // Generate embedding for the search query
          const embeddingResponse = await openai.embeddings.create({
            model: "text-embedding-3-large",
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

            console.warn("[api/inspiration/search] RPC function not found, falling back to text search");
          }
        } catch (embeddingError) {
          console.error("[api/inspiration/search] Embedding error:", embeddingError);
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
        console.error("[api/inspiration/search] Error:", error);
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
    console.error("[api/inspiration/search] Error:", error);
    return res.status(500).json({ error: "No se pudieron obtener resultados" });
  }
}
