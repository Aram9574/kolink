import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/lib/supabase";

/**
 * LinkedIn Disconnect Endpoint
 * Removes LinkedIn connection from user profile
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

    // Clear LinkedIn data from profile
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        linkedin_id: null,
        linkedin_access_token: null,
        linkedin_refresh_token: null,
        linkedin_token_expires_at: null,
        linkedin_profile_data: {},
        linkedin_connected_at: null,
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("Failed to disconnect LinkedIn:", updateError);
      return res.status(500).json({ error: "Failed to disconnect LinkedIn" });
    }

    return res.status(200).json({ success: true, message: "LinkedIn disconnected successfully" });
  } catch (error) {
    console.error("Error disconnecting LinkedIn:", error);
    return res.status(500).json({ error: "An unexpected error occurred" });
  }
}
