import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import React from "react";
import { supabase } from "@/lib/supabase";
import { sendEmail } from "@/emails/sendEmail";
import { PasswordResetEmail } from "@/emails/password-reset";

/**
 * POST /api/auth/reset-password
 * Generates a reset token and emails the recovery link.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email } = req.body as { email?: string };

    if (!email) {
      return res.status(400).json({ error: "El correo electrónico es obligatorio" });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, email")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (profileError) {
      console.error("Error fetching user for reset:", profileError);
    }

    if (!profile) {
      return res.status(200).json({
        success: true,
        message: "Si el correo existe, recibirás un enlace de recuperación",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const forwardedFor = req.headers["x-forwarded-for"];
    const requestIp =
      (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor) ??
      req.socket.remoteAddress ??
      null;

    const { error: insertError } = await supabase.from("password_reset_tokens").insert({
      user_id: profile.id,
      token_hash: tokenHash,
      expires_at: expiresAt,
      ip_address: requestIp,
      user_agent: req.headers["user-agent"],
    });

    if (insertError) {
      throw insertError;
    }

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "http://localhost:3000";
    const resetUrl = `${appUrl}/reset?token=${resetToken}`;

    try {
      await sendEmail({
        to: profile.email,
        subject: "Recupera tu contraseña de Kolink",
        react: <PasswordResetEmail
          resetUrl={resetUrl}
          expiresIn="1 hora"
        />,
      });
    } catch (emailError) {
      console.error("Error enviando correo de recuperación:", emailError);
    }

    const { error: alertError } = await supabase.rpc("create_security_alert", {
      p_user_id: profile.id,
      p_alert_type: "password_reset_requested",
      p_severity: "medium",
      p_title: "Solicitud de recuperación de contraseña",
      p_message:
        "Se solicitó un enlace de recuperación de contraseña para tu cuenta. Si no fuiste tú, ignora este mensaje.",
      p_metadata: {
        ip_address: requestIp,
      },
    });

    if (alertError) {
      console.error("Error registrando alerta de seguridad (password reset):", alertError);
    }

    return res.status(200).json({
      success: true,
      message: "Si el correo existe, recibirás un enlace de recuperación",
    });
  } catch (error) {
    console.error("Password reset initiation error:", error);
    return res.status(500).json({
      error: "No se pudo iniciar el proceso de recuperación",
    });
  }
}
