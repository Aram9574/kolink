/**
 * LinkedIn Sync Profile
 * Actualiza datos del perfil usando los tokens almacenados.
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import {
  decryptStoredTokens,
  fetchLinkedInProfile,
  refreshAccessToken,
  updateProfileWithLinkedInData,
} from "@/lib/linkedin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const admin = getSupabaseAdminClient();
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No autorizado" });
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await admin.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: "Sesión inválida" });
    }

    const { data: profileRow, error: profileError } = await admin
      .from("profiles")
      .select(
        "linkedin_access_token, linkedin_refresh_token, linkedin_token_expires_at"
      )
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profileRow) {
      console.error("[LinkedIn Sync] Profile fetch error:", profileError);
      return res.status(500).json({ error: "No se pudo obtener tu perfil" });
    }

    const storedTokens = decryptStoredTokens(profileRow);
    if (!storedTokens) {
      return res.status(400).json({ error: "LinkedIn no está conectado" });
    }

    let accessToken = storedTokens.accessToken;
    let refreshToken = storedTokens.refreshToken ?? undefined;
    let expiresAtIso = storedTokens.expiresAt ?? null;
    let expiresIn: number | undefined;

    const expiresAtDate = expiresAtIso ? new Date(expiresAtIso) : null;
    const now = new Date();
    const needsRefresh = expiresAtDate ? now.getTime() > expiresAtDate.getTime() - 60 * 1000 : false;

    if (needsRefresh && refreshToken) {
      try {
        const refreshed = await refreshAccessToken(refreshToken);
        accessToken = refreshed.accessToken;
        refreshToken = refreshed.refreshToken ?? refreshToken;
        expiresIn = refreshed.expiresIn;
        expiresAtIso = typeof refreshed.expiresIn === "number"
          ? new Date(Date.now() + refreshed.expiresIn * 1000).toISOString()
          : null;
      } catch (refreshError) {
        console.warn("[LinkedIn Sync] Refresh token failed:", refreshError);
      }
    }

    let profile;
    try {
      profile = await fetchLinkedInProfile(accessToken);
    } catch (profileError) {
      const message = profileError instanceof Error ? profileError.message : String(profileError);
      if (/401|unauthorized/i.test(message)) {
        return res.status(401).json({ error: "Tu sesión de LinkedIn expiró. Vuelve a conectar la cuenta." });
      }
      throw profileError;
    }
    await updateProfileWithLinkedInData(
      admin,
      user.id,
      {
        accessToken,
        refreshToken,
        expiresIn,
        expiresAtIso,
      },
      profile
    );

    return res.status(200).json({ success: true, profile });
  } catch (error) {
    console.error("[LinkedIn Sync] Unexpected error:", error);
    return res.status(500).json({ error: "Error al sincronizar con LinkedIn" });
  }
}
