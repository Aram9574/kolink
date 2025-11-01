import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/lib/supabase";

/**
 * LinkedIn OAuth Callback Endpoint
 * Handles the redirect from LinkedIn after user authorization
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { code, state, error, error_description } = req.query;

    // Check for OAuth errors
    if (error) {
      console.error("LinkedIn OAuth error:", error, error_description);
      return res.redirect(
        `/profile?error=${encodeURIComponent(
          error_description as string || "LinkedIn authentication failed"
        )}`
      );
    }

    // Verify state (CSRF protection)
    const cookies = req.headers.cookie?.split(";").reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split("=");
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);

    const storedState = cookies?.linkedin_oauth_state;

    if (!storedState || !state) {
      console.error("Missing state parameter or cookie");
      return res.redirect(
        "/profile?error=" +
          encodeURIComponent("Authentication failed - security check")
      );
    }

    // Decode both states for comparison (LinkedIn may URL-encode the state)
    const decodedStoredState = decodeURIComponent(storedState);
    const decodedReceivedState = decodeURIComponent(state as string);

    if (decodedStoredState !== decodedReceivedState) {
      console.error("State mismatch - possible CSRF attack");
      console.error("Stored:", decodedStoredState);
      console.error("Received:", decodedReceivedState);
      return res.redirect(
        "/profile?error=" +
          encodeURIComponent("Authentication failed - security check")
      );
    }

    if (!code) {
      return res.redirect(
        "/profile?error=" + encodeURIComponent("No authorization code received")
      );
    }

    // Exchange code for access token
    const tokenResponse = await fetch(
      "https://www.linkedin.com/oauth/v2/accessToken",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: code as string,
          redirect_uri: process.env.LINKEDIN_REDIRECT_URI!,
          client_id: process.env.LINKEDIN_CLIENT_ID!,
          client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
        }),
      }
    );

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Failed to exchange code for token:", errorText);
      return res.redirect(
        "/profile?error=" +
          encodeURIComponent("Failed to complete LinkedIn authentication")
      );
    }

    const tokenData = await tokenResponse.json();
    const { access_token, expires_in, refresh_token } = tokenData;

    // Get user profile from LinkedIn
    const profileResponse = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    if (!profileResponse.ok) {
      const errorText = await profileResponse.text();
      console.error("Failed to fetch LinkedIn profile:", errorText);
      return res.redirect(
        "/profile?error=" +
          encodeURIComponent("Failed to fetch LinkedIn profile")
      );
    }

    const linkedInProfile = await profileResponse.json();

    // Extract userId from state parameter
    let userId: string;
    try {
      const stateData = JSON.parse(Buffer.from(state as string, 'base64').toString());
      userId = stateData.userId;

      if (!userId) {
        throw new Error("No userId in state");
      }
    } catch (e) {
      console.error("Failed to parse state parameter:", e);
      return res.redirect(
        "/signin?error=" +
          encodeURIComponent("Sesión inválida. Por favor, inicia sesión de nuevo.")
      );
    }

    // Calculate token expiration
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + expires_in);

    // Update user profile with LinkedIn data
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        linkedin_id: linkedInProfile.sub,
        linkedin_access_token: access_token,
        linkedin_refresh_token: refresh_token || null,
        linkedin_token_expires_at: expiresAt.toISOString(),
        linkedin_profile_data: linkedInProfile,
        linkedin_connected_at: new Date().toISOString(),
        headline: linkedInProfile.headline || null,
        bio: linkedInProfile.description || null,
        linkedin_profile_url: linkedInProfile.profile || null,
      })
      .eq("id", userId);

    if (updateError) {
      console.error("Failed to update profile with LinkedIn data:", updateError);
      return res.redirect(
        "/profile?error=" +
          encodeURIComponent("Failed to save LinkedIn connection")
      );
    }

    // Success! Redirect to profile page
    return res.redirect(
      "/profile?success=" +
        encodeURIComponent("LinkedIn connected successfully!")
    );
  } catch (error) {
    console.error("Error in LinkedIn callback:", error);
    return res.redirect(
      "/profile?error=" +
        encodeURIComponent("An unexpected error occurred")
    );
  }
}
