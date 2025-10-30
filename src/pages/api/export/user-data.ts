import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Get user from auth token
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "No authorization header" });
  }

  const token = authHeader.replace("Bearer ", "");
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return res.status(401).json({ error: "Invalid token" });
  }

  try {
    // 1. Get profile data
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError) throw profileError;

    // Remove sensitive fields
    const sanitizedProfile = { ...profile };
    delete sanitizedProfile.stripe_customer_id;
    delete sanitizedProfile.linkedin_access_token;
    delete sanitizedProfile.linkedin_refresh_token;
    delete sanitizedProfile.linkedin_access_token_encrypted;
    delete sanitizedProfile.linkedin_refresh_token_encrypted;
    delete sanitizedProfile.linkedin_token_expires_at;

    // 2. Get all posts
    const { data: posts, error: postsError } = await supabase
      .from("posts")
      .select("id, prompt, generated_text, viral_score, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (postsError) throw postsError;

    // 3. Get saved posts
    const { data: savedPosts, error: savedPostsError } = await supabase
      .from("saved_posts")
      .select(`
        id,
        created_at,
        note,
        inspiration_posts (
          id,
          platform,
          author,
          title,
          content,
          tags,
          viral_score,
          metrics
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (savedPostsError) throw savedPostsError;

    // 4. Get usage stats if available
    let usageStats = null;
    try {
      const { data: stats } = await supabase
        .from("usage_stats")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(30);
      usageStats = stats;
    } catch {
      // Usage stats table might not exist yet
      console.log("Usage stats not available");
    }

    // 5. Compile all data
    const exportData = {
      export_date: new Date().toISOString(),
      format_version: "1.0",
      user: {
        id: user.id,
        email: user.email,
      },
      profile: sanitizedProfile,
      posts: posts || [],
      saved_posts: savedPosts || [],
      usage_stats: usageStats || [],
      metadata: {
        total_posts: posts?.length || 0,
        total_saved_posts: savedPosts?.length || 0,
        credits_remaining: profile?.credits || 0,
        plan: profile?.plan || "free",
        account_created: profile?.created_at,
      },
    };

    // Return as JSON
    res.setHeader("Content-Type", "application/json");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=kolink-data-${user.id}-${new Date().toISOString().split("T")[0]}.json`
    );

    return res.status(200).json(exportData);
  } catch (error: unknown) {
    console.error("Export error:", error);
    return res.status(500).json({
      error: "Error exporting data",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
