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

    // Generate a recovery link to get tokens
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?linkedin=connected`,
      },
    });

    if (linkError || !linkData) {
      console.error("[LinkedIn Callback] Generate link error:", linkError);
      return res.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/signin?error=session_failed`);
    }

    // Extract the token from the action_link
    const actionLink = linkData.properties.action_link;
    const url = new URL(actionLink);
    const token = url.searchParams.get('token');
    const type = url.searchParams.get('type');

    if (!token) {
      console.error("[LinkedIn Callback] No token in generated link");
      return res.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/signin?error=session_failed`);
    }

    // Clear state cookie
    res.setHeader(
      "Set-Cookie",
      "linkedin_oauth_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0"
    );

    // Redirect to auth confirmation page with token
    const redirectUrl = new URL(`${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm`);
    redirectUrl.searchParams.set('token', token);
    redirectUrl.searchParams.set('type', type || 'recovery');
    redirectUrl.searchParams.set('next', '/dashboard?linkedin=connected');

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
