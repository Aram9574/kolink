import { logger } from '@/lib/logger';
import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/lib/supabase";

/**
 * Admin API: Update user profile
 * POST /api/admin/update-user
 * Body: { userId, updates: { plan?, credits?, role? } }
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
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

    const { userId, updates } = req.body;

    if (!userId || !updates) {
      return res.status(400).json({ error: "Missing userId or updates" });
    }

    // Get current user data for audit log
    const { data: targetUser, error: targetError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (targetError || !targetUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Prevent admins from downgrading themselves
    if (userId === user.id && updates.role === "user") {
      return res
        .status(403)
        .json({ error: "Cannot remove your own admin role" });
    }

    // Build update object with only allowed fields
    const allowedUpdates: Record<string, unknown> = {};
    const auditDetails: { old_values: Record<string, unknown>; new_values: Record<string, unknown> } = { old_values: {}, new_values: {} };

    if (updates.plan !== undefined) {
      allowedUpdates.plan = updates.plan;
      auditDetails.old_values.plan = targetUser.plan;
      auditDetails.new_values.plan = updates.plan;
    }

    if (updates.credits !== undefined) {
      allowedUpdates.credits = updates.credits;
      auditDetails.old_values.credits = targetUser.credits;
      auditDetails.new_values.credits = updates.credits;
    }

    if (updates.role !== undefined) {
      allowedUpdates.role = updates.role;
      auditDetails.old_values.role = targetUser.role;
      auditDetails.new_values.role = updates.role;
    }

    // Update user
    const { data: updatedUser, error: updateError } = await supabase
      .from("profiles")
      .update(allowedUpdates)
      .eq("id", userId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // Determine action type for audit log
    let action = "update_user";
    if (updates.plan) action = "modify_plan";
    else if (updates.credits) action = "add_credits";
    else if (updates.role) action = "modify_role";

    // Log admin action
    const { error: logError } = await supabase.from("admin_audit_logs").insert({
      admin_id: user.id,
      action,
      target_user_id: userId,
      details: auditDetails,
    });

    if (logError) {
      logger.error("Failed to log admin action:", logError);
    }

    return res.status(200).json({ user: updatedUser });
  } catch (error) {
    logger.error("Admin update-user error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
