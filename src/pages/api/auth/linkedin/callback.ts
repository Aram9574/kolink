/**
 * LinkedIn OAuth - Callback Endpoint
 * Procesa la respuesta de LinkedIn después de la autenticación
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/lib/supabase";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { code, state, error: oauthError, error_description } = req.query;

    // 1. Verificar errores de OAuth
    if (oauthError) {
      console.error("[LinkedIn Callback] OAuth error:", oauthError, error_description);
      return res.redirect(
        `/profile?error=${encodeURIComponent(
          error_description as string || "Error al conectar con LinkedIn"
        )}`
      );
    }

    // 2. Validar parámetros requeridos
    if (!code || !state) {
      console.error("[LinkedIn Callback] Missing code or state");
      return res.redirect(
        "/profile?error=" + encodeURIComponent("Parámetros inválidos")
      );
    }

    // 3. Extraer userId del state
    const stateStr = state as string;
    const [userId, expectedState] = stateStr.split(":");

    if (!userId || !expectedState) {
      console.error("[LinkedIn Callback] Invalid state format");
      return res.redirect(
        "/profile?error=" + encodeURIComponent("Estado inválido")
      );
    }

    // 4. Verificar state (CSRF protection)
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("linkedin_oauth_state, linkedin_oauth_started_at")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      console.error("[LinkedIn Callback] Profile not found:", profileError);
      return res.redirect(
        "/profile?error=" + encodeURIComponent("Usuario no encontrado")
      );
    }

    if (profile.linkedin_oauth_state !== expectedState) {
      console.error("[LinkedIn Callback] State mismatch");
      return res.redirect(
        "/profile?error=" + encodeURIComponent("Estado no coincide - posible ataque CSRF")
      );
    }

    // 5. Verificar que no haya expirado (máximo 10 minutos)
    const startedAt = new Date(profile.linkedin_oauth_started_at);
    const now = new Date();
    const diffMinutes = (now.getTime() - startedAt.getTime()) / (1000 * 60);

    if (diffMinutes > 10) {
      console.error("[LinkedIn Callback] OAuth expired");
      return res.redirect(
        "/profile?error=" + encodeURIComponent("Sesión expirada. Intenta de nuevo.")
      );
    }

    // 6. Intercambiar código por access_token
    const { LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET, LINKEDIN_REDIRECT_URI } = process.env;

    if (!LINKEDIN_CLIENT_ID || !LINKEDIN_CLIENT_SECRET || !LINKEDIN_REDIRECT_URI) {
      console.error("[LinkedIn Callback] Missing OAuth config");
      return res.redirect(
        "/profile?error=" + encodeURIComponent("Configuración incompleta")
      );
    }

    const tokenResponse = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: code as string,
        redirect_uri: LINKEDIN_REDIRECT_URI,
        client_id: LINKEDIN_CLIENT_ID,
        client_secret: LINKEDIN_CLIENT_SECRET,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("[LinkedIn Callback] Token exchange failed:", errorText);
      return res.redirect(
        "/profile?error=" + encodeURIComponent("Error al obtener token de LinkedIn")
      );
    }

    const tokenData = await tokenResponse.json();
    const { access_token, expires_in } = tokenData;

    // 7. Obtener perfil de LinkedIn
    const profileResponse = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    if (!profileResponse.ok) {
      const errorText = await profileResponse.text();
      console.error("[LinkedIn Callback] Profile fetch failed:", errorText);
      return res.redirect(
        "/profile?error=" + encodeURIComponent("Error al obtener perfil de LinkedIn")
      );
    }

    const linkedInProfile = await profileResponse.json();

    // 8. Calcular fecha de expiración del token
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + expires_in);

    // 9. Guardar conexión en la base de datos
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        linkedin_id: linkedInProfile.sub,
        linkedin_access_token: access_token,
        linkedin_token_expires_at: expiresAt.toISOString(),
        linkedin_profile_data: linkedInProfile,
        linkedin_connected_at: new Date().toISOString(),
        // Limpiar datos temporales de OAuth
        linkedin_oauth_state: null,
        linkedin_oauth_started_at: null,
        // Datos adicionales del perfil
        linkedin_email: linkedInProfile.email,
        linkedin_name: linkedInProfile.name,
        linkedin_picture: linkedInProfile.picture,
      })
      .eq("id", userId);

    if (updateError) {
      console.error("[LinkedIn Callback] Update failed:", updateError);
      return res.redirect(
        "/profile?error=" + encodeURIComponent("Error al guardar conexión")
      );
    }

    console.log(`[LinkedIn Callback] Successfully connected for user ${userId}`);

    // 10. Redirigir al perfil con éxito
    return res.redirect(
      "/profile?linkedin_success=" + encodeURIComponent("LinkedIn conectado exitosamente")
    );
  } catch (error) {
    console.error("[LinkedIn Callback] Unexpected error:", error);
    return res.redirect(
      "/profile?error=" + encodeURIComponent("Error inesperado")
    );
  }
}
