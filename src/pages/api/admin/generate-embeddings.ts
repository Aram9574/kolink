/**
 * API Endpoint: Generate Embeddings for Inspiration Posts
 *
 * Admin-only endpoint to generate embeddings for posts without them.
 *
 * Usage: POST /api/admin/generate-embeddings
 * Body: { adminKey: "your-secret-key" }
 */

import { logger } from '@/lib/logger';
import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

const ADMIN_KEY = process.env.ADMIN_SECRET_KEY || "dev-admin-key-change-in-production";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";
const EMBEDDING_DELAY_MS = Number(process.env.OPENAI_EMBEDDING_DELAY_MS || 300);

type InspirationPost = {
  id: string;
  title: string | null;
  content: string | null;
  summary: string | null;
  author: string | null;
  tags: string[] | null;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Simple admin authentication
  const { adminKey } = req.body;
  if (adminKey !== ADMIN_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: "OpenAI API key not configured" });
  }

  try {
    const supabase = getSupabaseAdminClient();
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

    // Get posts without embeddings (anyone can read due to RLS policy)
    const { data: posts, error: fetchError } = await supabase
      .from("inspiration_posts")
      .select("id, title, content, summary, author, tags")
      .is("embedding", null);

    if (fetchError) {
      logger.error("Error fetching posts:", fetchError);
      return res.status(500).json({ error: "Failed to fetch posts", details: fetchError });
    }

    if (!posts || posts.length === 0) {
      return res.status(200).json({
        message: "No posts without embeddings",
        processed: 0,
      });
    }

    // Process each post
    const results = [];
    let processed = 0;
    let errors = 0;

    for (const rawPost of posts as InspirationPost[]) {
      const postId = rawPost.id;
      const postTitle = rawPost.title ?? "";

      try {
        const post = {
          ...rawPost,
          title: postTitle,
          content: rawPost.content ?? "",
          summary: rawPost.summary ?? "",
          author: rawPost.author ?? "",
          tags: rawPost.tags ?? [],
        };

        // Generate embedding
        const textToEmbed = [
          post.title,
          post.content,
          post.summary,
          post.author,
          post.tags.join(", "),
        ].join(" | ");

        const embeddingResponse = await openai.embeddings.create({
          model: EMBEDDING_MODEL,
          input: textToEmbed,
          encoding_format: "float",
        });

        const embedding = embeddingResponse.data[0].embedding;

        const { error: updateError } = await supabase
          .from("inspiration_posts")
          .update({ embedding })
          .eq("id", post.id);

        if (updateError) {
          throw updateError;
        }

        processed++;
        results.push({
          id: postId,
          title: postTitle,
          status: "success",
        });

        // Small delay to avoid rate limiting
        if (EMBEDDING_DELAY_MS > 0) {
          await new Promise((resolve) => setTimeout(resolve, EMBEDDING_DELAY_MS));
        }
      } catch (error) {
        errors++;
        results.push({
          id: postId,
          title: postTitle,
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return res.status(200).json({
      message: "Embedding generation completed",
      total: posts.length,
      processed,
      errors,
      results,
    });
  } catch (error) {
    logger.error("Fatal error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
