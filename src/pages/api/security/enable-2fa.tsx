import { logger } from '@/lib/logger';
import type { NextApiRequest, NextApiResponse } from "next";
import React from "react";
import { supabase } from "@/lib/supabase";
import { sendEmail } from "@/emails/sendEmail";
import { TwoFAEnabledEmail } from "@/emails/twofa-enabled";

/**
 * POST /api/security/enable-2fa
 * Marks 2FA as enabled for the current user and sends a confirmation email.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No autorizado" });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: session, error: userError } = await supabase.auth.getUser(token);
    const user = session?.user;

    if (userError || !user || !user.email) {
      return res.status(401).json({ error: "Sesión no válida" });
    }

    const { method = "totp" } = (req.body ?? {}) as { method?: string };

    const verificationTimestamp = new Date().toISOString();

    const { data: updatedSettings, error: updateError } = await supabase
      .from("user_2fa_settings")
      .update({
        enabled: true,
        verified_at: verificationTimestamp,
        method,
      })
      .eq("user_id", user.id)
      .select("user_id")
      .maybeSingle();

    if (updateError) {
      throw updateError;
    }

    if (!updatedSettings) {
      return res.status(404).json({ error: "No se encontró la configuración de 2FA para el usuario" });
    }

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "http://localhost:3000";

    const { error: alertError } = await supabase.rpc("create_security_alert", {
      p_user_id: user.id,
      p_alert_type: "2fa_enabled",
      p_severity: "medium",
      p_title: "Autenticación en dos pasos activada",
      p_message:
        "La autenticación en dos pasos se activó correctamente en tu cuenta. Asegúrate de conservar tus códigos de respaldo en un lugar seguro.",
      p_metadata: {
        method,
      },
    });

    if (alertError) {
      logger.error("Error registrando alerta de seguridad (2FA):", alertError);
    }

    try {
      await sendEmail({
        to: user.email,
        subject: "Autenticación en dos pasos activada en Kolink",
        react: <TwoFAEnabledEmail
          accountEmail={user.email}
          userName={(user.user_metadata?.full_name as string | undefined) ?? undefined}
          securityCenterUrl={`${appUrl}/security`}
        />,
      });
    } catch (emailError) {
      logger.error("Error enviando correo de 2FA activado:", emailError);
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    logger.error("Enable 2FA error:", error);
    return res.status(500).json({
      error: "No se pudo activar la autenticación en dos pasos",
    });
  }
}
