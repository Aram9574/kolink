import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/lib/supabase";

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
    // Get user from Authorization header or cookies
    const authHeader = req.headers.authorization;
    let userId: string | undefined;

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const {
        data: { user },
      } = await supabase.auth.getUser(token);
      userId = user?.id;
    }

    // If no user from header, try to get from cookies
    if (!userId) {
      const cookies = req.headers.cookie?.split(";").reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split("=");
        acc[key] = value;
        return acc;
      }, {} as Record<string, string>);

      const supabaseAuthCookie = Object.keys(cookies || {}).find(key =>
        key.startsWith('sb-') && key.includes('-auth-token')
      );

      if (supabaseAuthCookie && cookies && cookies[supabaseAuthCookie]) {
        try {
          const session = JSON.parse(decodeURIComponent(cookies[supabaseAuthCookie]));
          const accessToken = session?.access_token || session?.[0];
          if (accessToken) {
            const { data: { user } } = await supabase.auth.getUser(accessToken);
            userId = user?.id;
          }
        } catch (e) {
          console.error("Failed to parse session cookie:", e);
        }
      }
    }

    if (!userId) {
      return res.redirect(
        "/signin?error=" + encodeURIComponent("Debes iniciar sesión primero")
      );
    }

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
