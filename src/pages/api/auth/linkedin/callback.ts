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

    let userId: string;

    // Check if user exists by looking up in profiles table (faster than listUsers)
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id, email")
      .eq("email", email)
      .maybeSingle();

    if (existingProfile) {
      // User exists - enrich with LinkedIn data
      userId = existingProfile.id;
      await enrichProfileFromLinkedIn(userId, profile, tokenResponse);
    } else {
      // New user - create account using admin API
      const { data: newUser, error: createUserError } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true, // Auto-confirm email for OAuth users
        user_metadata: {
          full_name: `${profile.localizedFirstName} ${profile.localizedLastName}`,
          linkedin_id: profile.id,
        },
      });

      if (createUserError || !newUser.user) {
        console.error("[LinkedIn Callback] Create user error:", createUserError);
        return res.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/signin?error=signup_failed`);
      }

      userId = newUser.user.id;

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

    // Create a session for the user using admin API
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.createSession({
      user_id: userId,
    });

    if (sessionError || !sessionData.session) {
      console.error("[LinkedIn Callback] Session creation error:", sessionError);
      return res.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/signin?error=session_failed`);
    }

    // Clear state cookie
    res.setHeader(
      "Set-Cookie",
      "linkedin_oauth_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0"
    );

    // Redirect to dashboard with tokens in hash fragment (standard OAuth approach)
    // The Supabase client will automatically detect and store these
    const redirectUrl = new URL(`${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`);
    redirectUrl.hash = `access_token=${sessionData.session.access_token}&refresh_token=${sessionData.session.refresh_token}&expires_in=${sessionData.session.expires_in}&token_type=bearer`;

    // Add query param to show success message
    redirectUrl.searchParams.set('linkedin', 'connected');

    return res.redirect(redirectUrl.toString());
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
