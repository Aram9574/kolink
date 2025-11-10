/**
 * LinkedIn OAuth - Start Endpoint
 * Inicia el flujo PKCE con LinkedIn
 */

import { logger } from '@/lib/logger';
import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { buildLinkedInAuthorizationUrl, generatePkcePair } from "@/lib/linkedin";

function baseState(userId: string) {
  const nonce = crypto.randomBytes(16).toString("hex");
  return { state: `${userId}:${nonce}`, nonce };
}

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const admin = getSupabaseAdminClient();

    // Obtener token de sesión
    let token: string | null = null;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.replace("Bearer ", "");
    }
    if (!token && typeof req.query.token === "string") {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({ error: "No autorizado - Token requerido" });
    }

    const {
      data: { user },
      error: authError,
    } = await admin.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: "Sesión inválida" });
    }

    const { data: profileData, error: profileError } = await admin
      .from("profiles")
      .select("features")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      logger.error("[LinkedIn Start] Error fetching profile:", profileError);
      return res.status(500).json({ error: "No se pudo preparar la autenticación" });
    }

    const features =
      (profileData?.features && typeof profileData.features === "object"
        ? (profileData.features as Record<string, unknown>)
        : {}) ?? {};

    const { codeVerifier, codeChallenge } = generatePkcePair();
    const { state, nonce } = baseState(user.id);

    const updatedFeatures = {
      ...features,
      linkedin_oauth: {
        state: nonce,
        code_verifier: codeVerifier,
        started_at: new Date().toISOString(),
      },
    };

    const { error: updateError } = await admin
      .from("profiles")
      .update({ features: updatedFeatures })
      .eq("id", user.id);

    if (updateError) {
      logger.error("[LinkedIn Start] Error storing OAuth metadata:", updateError);
      return res.status(500).json({ error: "No se pudo preparar la autenticación" });
    }

    const authorizationUrl = buildLinkedInAuthorizationUrl(state, codeChallenge);
    return res.redirect(authorizationUrl);
  } catch (error) {
    logger.error("[LinkedIn Start] Unexpected error:", error);
    return res.status(500).json({ error: "Error inesperado" });
  }
};

export default handler;
