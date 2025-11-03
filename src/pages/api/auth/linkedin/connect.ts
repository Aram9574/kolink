/**
 * LinkedIn OAuth - Connect Endpoint
 * Inicia el flujo de OAuth con LinkedIn
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/lib/supabase";
import crypto from "crypto";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // 1. Verificar autenticación del usuario (permitir token en header o query)
    let token: string | null = null;

    // Intentar obtener token del header Authorization
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.replace("Bearer ", "");
    }

    // Si no hay token en header, intentar obtenerlo del query parameter
    if (!token && req.query.token) {
      token = req.query.token as string;
    }

    if (!token) {
      return res.status(401).json({ error: "No autorizado - Token requerido" });
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: "Sesión inválida" });
    }

    // 2. Verificar variables de entorno
    const { LINKEDIN_CLIENT_ID, LINKEDIN_REDIRECT_URI } = process.env;

    if (!LINKEDIN_CLIENT_ID || !LINKEDIN_REDIRECT_URI) {
      console.error("Missing LinkedIn OAuth config");
      return res.status(500).json({
        error: "Configuración de LinkedIn no disponible",
      });
    }

    // 3. Generar state único (CSRF protection)
    const state = crypto.randomBytes(32).toString("hex");

    // 4. Guardar state en la tabla de profiles temporalmente
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        linkedin_oauth_state: state,
        linkedin_oauth_started_at: new Date().toISOString()
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("Error saving state:", updateError);
      return res.status(500).json({ error: "Error iniciando autenticación" });
    }

    // 5. Construir URL de LinkedIn OAuth
    const linkedInAuthUrl = new URL(
      "https://www.linkedin.com/oauth/v2/authorization"
    );

    linkedInAuthUrl.searchParams.append("response_type", "code");
    linkedInAuthUrl.searchParams.append("client_id", LINKEDIN_CLIENT_ID);
    linkedInAuthUrl.searchParams.append("redirect_uri", LINKEDIN_REDIRECT_URI);
    linkedInAuthUrl.searchParams.append("state", `${user.id}:${state}`);
    linkedInAuthUrl.searchParams.append("scope", "openid profile email w_member_social");

    console.log(`[LinkedIn] Starting OAuth for user ${user.id}`);

    // 6. Redirigir a LinkedIn
    return res.redirect(linkedInAuthUrl.toString());
  } catch (error) {
    console.error("Error in LinkedIn connect:", error);
    return res.status(500).json({ error: "Error inesperado" });
  }
}
