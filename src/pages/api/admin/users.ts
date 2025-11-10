import { logger } from '@/lib/logger';
import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/lib/supabase";

/**
 * Admin API: Get all users
 * GET /api/admin/users
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];

    // Verify the user session
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: "Invalid token" });
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || profile.role !== "admin") {
      return res.status(403).json({ error: "Forbidden: Admin access required" });
    }

    // Fetch all users with their stats
    const { data: users, error: usersError } = await supabase
      .from("profiles")
      .select(
        `
        id,
        email,
        plan,
        credits,
        role,
        last_login,
        created_at,
        stripe_customer_id
      `
      )
      .order("created_at", { ascending: false });

    if (usersError) {
      throw usersError;
    }

    // Fetch usage stats for all users
    const { data: usageStats, error: statsError } = await supabase
      .from("usage_stats")
      .select("user_id, posts_generated, credits_used, last_activity");

    if (statsError) {
      logger.error("Error fetching usage stats:", statsError);
    }

    // Fetch post counts for all users
    const { data: postCounts, error: postsError } = await supabase
      .from("posts")
      .select("user_id");

    if (postsError) {
      logger.error("Error fetching post counts:", postsError);
    }

    // Merge stats with users
    const usersWithStats = users.map((user) => {
      const stats = usageStats?.find((s) => s.user_id === user.id);
      const postCount =
        postCounts?.filter((p) => p.user_id === user.id).length || 0;

      return {
        ...user,
        posts_generated: stats?.posts_generated || postCount,
        credits_used: stats?.credits_used || 0,
        last_activity: stats?.last_activity || user.last_login || user.created_at,
      };
    });

    return res.status(200).json({ users: usersWithStats });
  } catch (error) {
    logger.error("Admin users error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
