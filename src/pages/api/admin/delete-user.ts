import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/lib/supabase";

/**
 * Admin API: Delete user
 * DELETE /api/admin/delete-user
 * Body: { userId }
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "DELETE") {
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

    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }

    // Prevent admins from deleting themselves
    if (userId === user.id) {
      return res.status(403).json({ error: "Cannot delete your own account" });
    }

    // Get user data for audit log
    const { data: targetUser, error: targetError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (targetError || !targetUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Log admin action before deletion
    const { error: logError } = await supabase.from("admin_audit_logs").insert({
      admin_id: user.id,
      action: "delete_user",
      target_user_id: userId,
      details: {
        deleted_user: {
          email: targetUser.email,
          plan: targetUser.plan,
          credits: targetUser.credits,
          role: targetUser.role,
        },
      },
    });

    if (logError) {
      console.error("Failed to log admin action:", logError);
    }

    // Delete from auth.users (this will cascade to profiles and related tables)
    const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(
      userId
    );

    if (deleteAuthError) {
      // If auth deletion fails, try deleting from profiles table
      console.error("Failed to delete from auth:", deleteAuthError);

      const { error: deleteProfileError } = await supabase
        .from("profiles")
        .delete()
        .eq("id", userId);

      if (deleteProfileError) {
        throw deleteProfileError;
      }
    }

    return res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Admin delete-user error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
