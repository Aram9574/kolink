/**
 * LinkedIn OAuth - Callback Endpoint
 * Valida state, intercambia el código por tokens y sincroniza el perfil del usuario.
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { exchangeCodeForToken, fetchLinkedInProfile, updateProfileWithLinkedInData } from "@/lib/linkedin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { code, state, error: oauthError, error_description } = req.query;

  if (oauthError) {
    const message = typeof error_description === "string" ? error_description : "Autenticación cancelada";
    return res.redirect(`/profile?section=integrations&linkedin_error=${encodeURIComponent(message)}`);
  }

  if (typeof code !== "string" || typeof state !== "string") {
    return res.redirect(
      "/profile?section=integrations&linkedin_error=" + encodeURIComponent("Parámetros inválidos")
    );
  }

  const [userId, nonce] = state.split(":");
  if (!userId || !nonce) {
    return res.redirect(
      "/profile?section=integrations&linkedin_error=" + encodeURIComponent("Estado de sesión inválido")
    );
  }

  try {
    const admin = getSupabaseAdminClient();

    const { data: profileRow, error: profileError } = await admin
      .from("profiles")
      .select("features")
      .eq("id", userId)
      .maybeSingle();

    if (profileError || !profileRow) {
      console.error("[LinkedIn Callback] Profile not found:", profileError);
      return res.redirect(
        "/profile?section=integrations&linkedin_error=" + encodeURIComponent("No se encontró el usuario")
      );
    }

    const features =
      (profileRow.features && typeof profileRow.features === "object"
        ? (profileRow.features as Record<string, unknown>)
        : {}) ?? {};

    const oauthRaw = features.linkedin_oauth;
    const oauthData =
      oauthRaw && typeof oauthRaw === "object"
        ? (oauthRaw as { state?: string; code_verifier?: string; started_at?: string })
        : undefined;

    if (!oauthData?.state || oauthData.state !== nonce || !oauthData.code_verifier) {
      console.error("[LinkedIn Callback] State mismatch or missing verifier");
      return res.redirect(
        "/profile?section=integrations&linkedin_error=" +
          encodeURIComponent("Estado inválido o expirado. Intenta de nuevo.")
      );
    }

    if (oauthData.started_at) {
      const startedAt = new Date(oauthData.started_at);
      if (Number.isFinite(startedAt.getTime())) {
        const minutes = (Date.now() - startedAt.getTime()) / (1000 * 60);
        if (minutes > 10) {
          return res.redirect(
            "/profile?section=integrations&linkedin_error=" +
              encodeURIComponent("La sesión de autenticación expiró. Intenta nuevamente.")
          );
        }
      }
    }

    // Intercambiar código por tokens
    const tokens = await exchangeCodeForToken(code, oauthData.code_verifier);

    // Obtener información del perfil
    const profile = await fetchLinkedInProfile(tokens.accessToken);

    // Persistir datos en Supabase
    await updateProfileWithLinkedInData(admin, userId, tokens, profile);

    // Limpiar metadatos temporales
    const cleanedFeatures = { ...features };
    delete cleanedFeatures.linkedin_oauth;
    await admin.from("profiles").update({ features: cleanedFeatures }).eq("id", userId);

    return res.redirect("/profile?section=integrations&linkedin_success=1");
  } catch (error) {
    console.error("[LinkedIn Callback] Unexpected error:", error);
    return res.redirect(
      "/profile?section=integrations&linkedin_error=" + encodeURIComponent("No se pudo conectar LinkedIn")
    );
  }
}
