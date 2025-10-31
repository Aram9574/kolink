import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/lib/supabase";

/**
 * Sync LinkedIn Metrics
 * Fetches engagement metrics for published posts
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
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
      .select("linkedin_access_token, linkedin_token_expires_at")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    if (!profile.linkedin_access_token) {
      return res.status(400).json({ error: "LinkedIn not connected" });
    }

    // Check if token is expired
    const expiresAt = new Date(profile.linkedin_token_expires_at);
    if (expiresAt < new Date()) {
      return res.status(401).json({
        error: "LinkedIn token expired. Please reconnect your account.",
      });
    }

    // Get all published posts that need metrics sync
    const { data: publishedPosts, error: postsError } = await supabase
      .from("posts")
      .select("id, linkedin_post_id, published_at")
      .eq("user_id", user.id)
      .eq("status", "published")
      .not("linkedin_post_id", "is", null)
      .order("published_at", { ascending: false })
      .limit(20);

    if (postsError || !publishedPosts || publishedPosts.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No posts to sync",
        synced_count: 0,
      });
    }

    let syncedCount = 0;
    const errors: string[] = [];

    // Fetch metrics for each post
    for (const post of publishedPosts) {
      try {
        // Get post statistics from LinkedIn
        const statsResponse = await fetch(
          `https://api.linkedin.com/v2/socialActions/${post.linkedin_post_id}`,
          {
            headers: {
              Authorization: `Bearer ${profile.linkedin_access_token}`,
              "X-Restli-Protocol-Version": "2.0.0",
            },
          }
        );

        if (!statsResponse.ok) {
          console.error(
            `Failed to fetch stats for post ${post.id}:`,
            await statsResponse.text()
          );
          errors.push(`Failed to sync post ${post.id.substring(0, 8)}`);
          continue;
        }

        const statsData = await statsResponse.json();

        // Extract metrics
        const metrics = {
          likes: statsData.likesSummary?.totalLikes || 0,
          comments: statsData.commentsSummary?.totalComments || 0,
          shares: statsData.sharesSummary?.totalShares || 0,
          impressions: statsData.impressionCount || 0,
          clicks: statsData.clickCount || 0,
          engagement_rate:
            statsData.impressionCount > 0
              ? (
                  ((statsData.likesSummary?.totalLikes || 0) +
                    (statsData.commentsSummary?.totalComments || 0) +
                    (statsData.sharesSummary?.totalShares || 0)) /
                  statsData.impressionCount
                ).toFixed(4)
              : 0,
          last_synced: new Date().toISOString(),
        };

        // Calculate viral score
        const likes = metrics.likes || 0;
        const comments = metrics.comments || 0;
        const shares = metrics.shares || 0;
        const impressions = metrics.impressions || 0;

        const engagementRate =
          impressions > 0
            ? ((likes + comments * 2 + shares * 3) / impressions) * 100
            : 0;

        const viralScore =
          likes * 1 + comments * 5 + shares * 10 + engagementRate * 100;

        // Update post with metrics
        await supabase
          .from("posts")
          .update({
            linkedin_metrics: metrics,
            viral_score: viralScore,
            last_synced_at: new Date().toISOString(),
          })
          .eq("id", post.id);

        syncedCount++;

        // Update optimal posting times based on performance
        const publishedDate = new Date(post.published_at);
        const dayOfWeek = publishedDate.getDay();
        const hourOfDay = publishedDate.getHours();

        // Update or insert optimal posting time
        await supabase.from("optimal_posting_times").upsert(
          {
            user_id: user.id,
            day_of_week: dayOfWeek,
            hour_of_day: hourOfDay,
            average_engagement_rate: parseFloat(metrics.engagement_rate as string),
            post_count: 1, // Will be incremented by trigger
            confidence_score: Math.min(syncedCount / 10, 1), // Increase confidence with more data
          },
          {
            onConflict: "user_id,day_of_week,hour_of_day",
          }
        );
      } catch (error) {
        console.error(`Error syncing post ${post.id}:`, error);
        errors.push(`Error syncing post ${post.id.substring(0, 8)}`);
      }
    }

    return res.status(200).json({
      success: true,
      synced_count: syncedCount,
      total_posts: publishedPosts.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Error syncing LinkedIn metrics:", error);
    return res.status(500).json({ error: "An unexpected error occurred" });
  }
}
