import type { NextApiRequest, NextApiResponse } from "next";
import { generateLinkedInAuthUrl } from "@/lib/linkedin";
import { randomBytes } from "crypto";

/**
 * Initiates LinkedIn OAuth2 flow
 * GET /api/auth/linkedin/login
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Generate a random state for CSRF protection
    const state = randomBytes(32).toString("hex");

    // Store state in httpOnly cookie for validation in callback
    res.setHeader(
      "Set-Cookie",
      `linkedin_oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`
    );

    // Generate LinkedIn authorization URL
    const authUrl = generateLinkedInAuthUrl(state);

    // Redirect user to LinkedIn
    return res.redirect(302, authUrl);
  } catch (error) {
    console.error("[LinkedIn Login] Error:", error);
    return res.status(500).json({ error: "Failed to initiate LinkedIn login" });
  }
}
