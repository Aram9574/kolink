import type { NextApiRequest, NextApiResponse } from "next";
import { exchangeLinkedInCode, fetchLinkedInProfile, fetchLinkedInEmail } from "@/lib/linkedin";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { enrichProfileFromLinkedIn } from "@/server/services/profileService";

/**
 * LinkedIn OAuth2 callback handler
 * GET /api/auth/linkedin/callback?code=...&state=...
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { code, state, error } = req.query;

  // Check for OAuth errors
  if (error) {
    console.error("[LinkedIn Callback] OAuth error:", error);
    return res.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/signin?error=linkedin_denied`);
  }

  // Validate required parameters
  if (!code || typeof code !== "string") {
    return res.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/signin?error=missing_code`);
  }

  if (!state || typeof state !== "string") {
    return res.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/signin?error=missing_state`);
  }

  // Validate state (CSRF protection)
  const cookies = parseCookies(req.headers.cookie || "");
  const storedState = cookies.linkedin_oauth_state;

  if (!storedState || storedState !== state) {
    console.error("[LinkedIn Callback] State mismatch");
    return res.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/signin?error=state_mismatch`);
  }

  try {
    // Exchange code for access token
    const tokenResponse = await exchangeLinkedInCode(code);

    // Fetch user profile and email
    const [profile, email] = await Promise.all([
      fetchLinkedInProfile(tokenResponse.access_token),
      fetchLinkedInEmail(tokenResponse.access_token),
    ]);

    const supabase = getSupabaseAdminClient();

    // Check if user exists
    const { data: existingUser } = await supabase
      .from("profiles")
      .select("id, email")
      .eq("email", email)
      .maybeSingle();

    let userId: string;

    if (existingUser) {
      // User exists - update with LinkedIn data
      userId = existingUser.id;
      await enrichProfileFromLinkedIn(userId, profile, tokenResponse);

      // Sign in the user
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: generateTemporaryPassword(email), // Note: This is a placeholder - see below
      });

      if (signInError) {
        console.error("[LinkedIn Callback] Sign in error:", signInError);
        // User exists but can't sign in - might need password reset flow
        return res.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/signin?error=signin_failed`);
      }
    } else {
      // New user - create account
      const tempPassword = generateTemporaryPassword(email);

      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password: tempPassword,
        options: {
          data: {
            full_name: `${profile.localizedFirstName} ${profile.localizedLastName}`,
            linkedin_id: profile.id,
          },
        },
      });

      if (signUpError || !authData.user) {
        console.error("[LinkedIn Callback] Sign up error:", signUpError);
        return res.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/signin?error=signup_failed`);
      }

      userId = authData.user.id;

      // Create profile with LinkedIn data
      await supabase.from("profiles").insert({
        id: userId,
        email,
        plan: "basic",
        credits: 10, // Welcome credits
      });

      // Enrich profile with LinkedIn data
      await enrichProfileFromLinkedIn(userId, profile, tokenResponse);
    }

    // Clear state cookie
    res.setHeader(
      "Set-Cookie",
      "linkedin_oauth_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0"
    );

    // Redirect to dashboard with success
    return res.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?linkedin=connected`);
  } catch (error) {
    console.error("[LinkedIn Callback] Error:", error);
    return res.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/signin?error=linkedin_error`);
  }
}

/**
 * Parse cookies from Cookie header
 */
function parseCookies(cookieHeader: string): Record<string, string> {
  return cookieHeader.split(";").reduce(
    (acc, cookie) => {
      const [key, value] = cookie.trim().split("=");
      if (key && value) {
        acc[key] = value;
      }
      return acc;
    },
    {} as Record<string, string>
  );
}

/**
 * Generate a temporary password for LinkedIn users
 * NOTE: In production, consider using Supabase's OAuth providers directly
 * or implement a passwordless flow with magic links
 */
function generateTemporaryPassword(email: string): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const crypto = require("crypto");
  return crypto
    .createHash("sha256")
    .update(email + process.env.LINKEDIN_CLIENT_SECRET)
    .digest("hex")
    .slice(0, 32);
}
