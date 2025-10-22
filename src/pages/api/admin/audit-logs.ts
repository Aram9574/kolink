import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/lib/supabase";

/**
 * Admin API: Get audit logs
 * GET /api/admin/audit-logs?limit=50
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

    const limit = parseInt((req.query.limit as string) || "50", 10);

    // Fetch audit logs with admin and target user info
    const { data: logs, error: logsError } = await supabase
      .from("admin_audit_logs")
      .select(
        `
        id,
        action,
        details,
        created_at,
        admin:admin_id (
          id,
          email
        ),
        target_user:target_user_id (
          id,
          email
        )
      `
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (logsError) {
      throw logsError;
    }

    return res.status(200).json({ logs });
  } catch (error) {
    console.error("Admin audit-logs error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
