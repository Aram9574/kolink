/**
 * API Endpoint: Generate Embeddings for Inspiration Posts
 *
 * Admin-only endpoint to generate embeddings for posts without them.
 *
 * Usage: POST /api/admin/generate-embeddings
 * Body: { adminKey: "your-secret-key" }
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const ADMIN_KEY = process.env.ADMIN_SECRET_KEY || 'dev-admin-key-change-in-production';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;

interface InspirationPost {
  id: string;
  title: string;
  content: string;
  summary: string;
  author: string;
  tags: string[];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Simple admin authentication
  const { adminKey } = req.body;
  if (adminKey !== ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OpenAI API key not configured' });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

    // Get posts without embeddings (anyone can read due to RLS policy)
    const { data: posts, error: fetchError } = await supabase
      .from('inspiration_posts')
      .select('id, title, content, summary, author, tags')
      .is('embedding', null);

    if (fetchError) {
      console.error('Error fetching posts:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch posts', details: fetchError });
    }

    if (!posts || posts.length === 0) {
      return res.status(200).json({
        message: 'No posts without embeddings',
        processed: 0,
      });
    }

    // Process each post
    const results = [];
    let processed = 0;
    let errors = 0;

    for (const post of posts) {
      try {
        // Generate embedding
        const textToEmbed = [
          post.title,
          post.content,
          post.summary,
          post.author,
          (post.tags || []).join(', '),
        ].join(' | ');

        const embeddingResponse = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: textToEmbed,
          encoding_format: 'float',
        });

        const embedding = embeddingResponse.data[0].embedding;
        const embeddingString = `[${embedding.join(',')}]`;

        // Update post with embedding using a server-side update
        // We'll use a Supabase function or RPC for this
        const { error: updateError } = await supabase.rpc('update_post_embedding', {
          post_id: post.id,
          embedding_vector: embeddingString,
        });

        if (updateError) {
          // If RPC doesn't exist, try direct update (may fail due to RLS)
          const { error: directUpdateError } = await supabase
            .from('inspiration_posts')
            .update({ embedding: embeddingString })
            .eq('id', post.id);

          if (directUpdateError) {
            throw directUpdateError;
          }
        }

        processed++;
        results.push({
          id: post.id,
          title: post.title,
          status: 'success',
        });

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        errors++;
        results.push({
          id: post.id,
          title: post.title,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return res.status(200).json({
      message: 'Embedding generation completed',
      total: posts.length,
      processed,
      errors,
      results,
    });
  } catch (error) {
    console.error('Fatal error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
