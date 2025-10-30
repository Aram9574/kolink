import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * POST /api/admin/bulk-embeddings
 * Generate embeddings for inspiration posts without them
 * Admin-only endpoint
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "No authorization header" });
  }

  const token = authHeader.replace("Bearer ", "");
  const supabase = getSupabaseAdminClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return res.status(401).json({ error: "Invalid token" });
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return res.status(403).json({ error: "Admin access required" });
  }

  const { limit = 50, skipExisting = true } = req.body as {
    limit?: number;
    skipExisting?: boolean;
  };

  try {
    // Get posts without embeddings (or all if skipExisting=false)
    let query = supabase
      .from("inspiration_posts")
      .select("id, content, summary")
      .order("created_at", { ascending: false })
      .limit(Math.min(limit, 200)); // Max 200 per run

    if (skipExisting) {
      query = query.is("embedding", null);
    }

    const { data: posts, error: fetchError } = await query;

    if (fetchError) throw fetchError;

    if (!posts || posts.length === 0) {
      return res.status(200).json({
        ok: true,
        message: "No posts need embedding",
        processed: 0,
        skipped: 0,
        errors: 0,
      });
    }

    let processed = 0;
    const skipped = 0;
    let errors = 0;
    const errorDetails: Array<{ id: string; error: string }> = [];

    // Process in batches of 10 to avoid rate limits
    const batchSize = 10;
    for (let i = 0; i < posts.length; i += batchSize) {
      const batch = posts.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (post) => {
          try {
            // Use summary if available, otherwise content (truncated)
            const textToEmbed = post.summary || post.content.substring(0, 8000);

            // Generate embedding with OpenAI
            const embeddingResponse = await openai.embeddings.create({
              model: "text-embedding-3-small",
              input: textToEmbed,
              encoding_format: "float",
            });

            const embedding = embeddingResponse.data[0].embedding;

            // Update post with embedding
            const { error: updateError } = await supabase
              .from("inspiration_posts")
              .update({ embedding })
              .eq("id", post.id);

            if (updateError) {
              throw updateError;
            }

            processed++;
          } catch (error) {
            errors++;
            errorDetails.push({
              id: post.id,
              error: error instanceof Error ? error.message : "Unknown error",
            });
            console.error(`Error embedding post ${post.id}:`, error);
          }
        })
      );

      // Small delay between batches to respect rate limits
      if (i + batchSize < posts.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return res.status(200).json({
      ok: true,
      message: `Processed ${processed} embeddings`,
      processed,
      skipped,
      errors,
      errorDetails: errors > 0 ? errorDetails : undefined,
      total: posts.length,
    });
  } catch (error) {
    console.error("[bulk-embeddings] Error:", error);
    return res.status(500).json({
      error: "Error generating embeddings",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
