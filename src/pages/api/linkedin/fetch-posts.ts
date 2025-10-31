import type { NextApiRequest, NextApiResponse} from "next";
import { supabase } from "@/lib/supabase";

/**
 * Fetch LinkedIn Posts
 * Retrieves user's LinkedIn posts for writing style analysis
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Get user from auth header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Get user profile with LinkedIn token
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("linkedin_access_token, linkedin_token_expires_at, linkedin_id, preferred_language")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    if (!profile.linkedin_access_token || !profile.linkedin_id) {
      return res.status(400).json({ error: "LinkedIn not connected" });
    }

    // Check if token is expired
    const expiresAt = new Date(profile.linkedin_token_expires_at);
    if (expiresAt < new Date()) {
      return res.status(401).json({
        error: "LinkedIn token expired. Please reconnect your account.",
      });
    }

    // Fetch posts from LinkedIn API
    // Note: LinkedIn API v2 for posts requires specific permissions
    const postsResponse = await fetch(
      `https://api.linkedin.com/v2/ugcPosts?q=authors&authors=List(urn:li:person:${profile.linkedin_id})&count=50&sortBy=LAST_MODIFIED`,
      {
        headers: {
          Authorization: `Bearer ${profile.linkedin_access_token}`,
          "X-Restli-Protocol-Version": "2.0.0",
        },
      }
    );

    if (!postsResponse.ok) {
      const errorText = await postsResponse.text();
      console.error("Failed to fetch LinkedIn posts:", errorText);

      if (postsResponse.status === 401) {
        return res.status(401).json({
          error: "LinkedIn token invalid. Please reconnect your account.",
        });
      }

      return res.status(500).json({
        error: "Failed to fetch posts from LinkedIn",
      });
    }

    const postsData = await postsResponse.json() as {
      elements?: Array<{
        id: string;
        specificContent?: {
          "com.linkedin.ugc.ShareContent"?: {
            shareCommentary?: { text?: string };
          };
        };
        created?: { time: number };
        lastModified?: { time: number };
        visibility?: string;
      }>;
    };

    // Extract text content from posts
    const posts = postsData.elements?.map((post) => {
      const text = post.specificContent?.["com.linkedin.ugc.ShareContent"]?.shareCommentary?.text || "";
      return {
        id: post.id,
        text,
        created: post.created?.time,
        lastModified: post.lastModified?.time,
        visibility: post.visibility,
      };
    }) || [];

    // Store posts as writing samples for AI learning
    const writingSamples = posts
      .filter((p) => p.text && p.text.length > 50) // Only meaningful posts
      .map((post) => ({
        user_id: user.id,
        content: post.text,
        source: "linkedin",
        language: profile.preferred_language || "es-ES",
        created_at: new Date(post.created || 0).toISOString(),
      }));

    if (writingSamples.length > 0) {
      // Insert writing samples (on conflict do nothing to avoid duplicates)
      const { error: insertError } = await supabase
        .from("writing_samples")
        .upsert(writingSamples, {
          onConflict: "user_id,content",
          ignoreDuplicates: true,
        });

      if (insertError) {
        console.error("Error storing writing samples:", insertError);
      }
    }

    return res.status(200).json({
      success: true,
      posts_count: posts.length,
      samples_saved: writingSamples.length,
      posts: posts.slice(0, 10), // Return first 10 for preview
    });
  } catch (error) {
    console.error("Error fetching LinkedIn posts:", error);
    return res.status(500).json({ error: "An unexpected error occurred" });
  }
}
