import type { NextApiRequest, NextApiResponse } from "next";

/**
 * LinkedIn OAuth Authorization Endpoint
 * Redirects user to LinkedIn OAuth consent screen
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      LINKEDIN_CLIENT_ID,
      LINKEDIN_REDIRECT_URI,
    } = process.env;

    if (!LINKEDIN_CLIENT_ID || !LINKEDIN_REDIRECT_URI) {
      console.error("Missing LinkedIn OAuth configuration");
      return res.status(500).json({
        error: "LinkedIn OAuth not configured. Please add LINKEDIN_CLIENT_ID and LINKEDIN_REDIRECT_URI to your environment variables.",
      });
    }

    // Generate random state for CSRF protection
    const state = Math.random().toString(36).substring(7);

    // Store state in session/cookie for verification on callback
    res.setHeader(
      "Set-Cookie",
      `linkedin_oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`
    );

    // LinkedIn OAuth scopes
    // r_liteprofile: basic profile info
    // r_emailaddress: email address
    // w_member_social: post content on behalf of the user
    const scope = "openid profile email w_member_social";

    // Build LinkedIn authorization URL
    const authUrl = new URL("https://www.linkedin.com/oauth/v2/authorization");
    authUrl.searchParams.append("response_type", "code");
    authUrl.searchParams.append("client_id", LINKEDIN_CLIENT_ID);
    authUrl.searchParams.append("redirect_uri", LINKEDIN_REDIRECT_URI);
    authUrl.searchParams.append("state", state);
    authUrl.searchParams.append("scope", scope);

    // Redirect to LinkedIn
    return res.redirect(authUrl.toString());
  } catch (error) {
    console.error("Error initiating LinkedIn OAuth:", error);
    return res.status(500).json({ error: "Failed to initiate LinkedIn authentication" });
  }
}
