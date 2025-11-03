/**
 * LinkedIn OAuth - Disconnect Endpoint
 * Desconecta la cuenta de LinkedIn del usuario
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/lib/supabase";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // 1. Verificar autenticación
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No autorizado" });
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: "Sesión inválida" });
    }

    // 2. Limpiar todos los datos de LinkedIn del perfil
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        linkedin_id: null,
        linkedin_access_token: null,
        linkedin_refresh_token: null,
        linkedin_token_expires_at: null,
        linkedin_profile_data: null,
        linkedin_connected_at: null,
        linkedin_oauth_state: null,
        linkedin_oauth_started_at: null,
        linkedin_email: null,
        linkedin_name: null,
        linkedin_picture: null,
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("[LinkedIn Disconnect] Error:", updateError);
      return res.status(500).json({ error: "Error al desconectar LinkedIn" });
    }

    console.log(`[LinkedIn Disconnect] User ${user.id} disconnected`);

    return res.status(200).json({
      success: true,
      message: "LinkedIn desconectado exitosamente",
    });
  } catch (error) {
    console.error("[LinkedIn Disconnect] Unexpected error:", error);
    return res.status(500).json({ error: "Error inesperado" });
  }
}
