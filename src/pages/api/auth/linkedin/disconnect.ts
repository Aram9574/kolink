/**
 * LinkedIn OAuth - Disconnect
 * Elimina tokens y metadatos almacenados del usuario.
 */

import { logger } from '@/lib/logger';
import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { clearLinkedInConnection } from "@/lib/linkedin";

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

    await clearLinkedInConnection(admin, user.id);

    const { data: profileRow, error: profileError } = await admin
      .from("profiles")
      .select("features")
      .eq("id", user.id)
      .maybeSingle();

    if (!profileError && profileRow?.features && typeof profileRow.features === "object") {
      const features = { ...(profileRow.features as Record<string, unknown>) };
      delete features.linkedin_oauth;
      await admin.from("profiles").update({ features }).eq("id", user.id);
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    logger.error("[LinkedIn Disconnect] Unexpected error:", error);
    return res.status(500).json({ error: "Error inesperado al desconectar LinkedIn" });
  }
}
