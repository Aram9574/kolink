import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

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
    // Create a Supabase client with the request context
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false,
        },
      }
    );

    // Get token from query parameter (preferred) or cookies
    let accessToken: string | null = null;

    // First, check query parameter
    if (req.query.token && typeof req.query.token === 'string') {
      accessToken = req.query.token;
    }

    // If no token from query, try cookies
    if (!accessToken) {
      const cookies = req.headers.cookie || "";
      const cookieArray = cookies.split(";").map(c => c.trim());

      for (const cookie of cookieArray) {
        if (cookie.startsWith("sb-") && cookie.includes("-auth-token=")) {
          try {
            const value = cookie.split("=")[1];
            if (value) {
              const decoded = decodeURIComponent(value);
              const parsed = JSON.parse(decoded);
              accessToken = parsed.access_token || parsed[0];
              break;
            }
          } catch (_e) {
            continue;
          }
        }
      }
    }

    // If no token from cookies, check Authorization header
    if (!accessToken) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        accessToken = authHeader.replace("Bearer ", "");
      }
    }

    if (!accessToken) {
      console.error("No access token found in query, cookies, or headers");
      return res.redirect(
        "/signin?error=" + encodeURIComponent("Debes iniciar sesión primero")
      );
    }

    // Verify the token and get user
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      console.error("Error verifying user session:", error);
      return res.redirect(
        "/signin?error=" + encodeURIComponent("Sesión inválida. Por favor, inicia sesión de nuevo.")
      );
    }

    const userId = user.id;

    const {
      LINKEDIN_CLIENT_ID,
      LINKEDIN_REDIRECT_URI,
    } = process.env;

    if (!LINKEDIN_CLIENT_ID || !LINKEDIN_REDIRECT_URI) {
      console.error("Missing LinkedIn OAuth configuration");
      return res.status(500).json({
        error: "LinkedIn OAuth not configured.",
      });
    }

    // Encode userId in state parameter
    const stateData = {
      random: Math.random().toString(36).substring(7),
      userId,
    };
    const state = Buffer.from(JSON.stringify(stateData)).toString('base64');

    res.setHeader(
      "Set-Cookie",
      `linkedin_oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`
    );

    const scope = "openid profile email w_member_social";
    const authUrl = new URL("https://www.linkedin.com/oauth/v2/authorization");
    authUrl.searchParams.append("response_type", "code");
    authUrl.searchParams.append("client_id", LINKEDIN_CLIENT_ID);
    authUrl.searchParams.append("redirect_uri", LINKEDIN_REDIRECT_URI);
    authUrl.searchParams.append("state", state);
    authUrl.searchParams.append("scope", scope);

    return res.redirect(authUrl.toString());
  } catch (error) {
    console.error("Error initiating LinkedIn OAuth:", error);
    return res.status(500).json({ error: "Failed to initiate LinkedIn authentication" });
  }
}
