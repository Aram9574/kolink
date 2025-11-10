import { logger } from '@/lib/logger';
import type { NextApiRequest, NextApiResponse } from "next";
import React from "react";
import { supabase } from "@/lib/supabase";
import { validatePassword } from "@/lib/security/passwordValidation";
import { sendEmail } from "@/emails/sendEmail";
import { PasswordChangedEmail } from "@/emails/password-changed";
import crypto from "crypto";

/**
 * POST /api/security/password/reset
 * Reset password with token
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { token, newPassword } = req.body as { token?: string; newPassword?: string };

    if (!token || !newPassword) {
      return res.status(400).json({ error: "Token and new password are required" });
    }

    // Validate password strength
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        error: "Password does not meet requirements",
        feedback: passwordValidation.feedback,
      });
    }

    // Hash the token
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    // Find valid token
    const { data: tokens, error: tokenError } = await supabase
      .from("password_reset_tokens")
      .select("*")
      .eq("token_hash", tokenHash)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .limit(1);

    if (tokenError || !tokens || tokens.length === 0) {
      return res.status(400).json({
        error: "Token inválido o expirado",
      });
    }

    const resetToken = tokens[0];

    // Update password using Supabase Admin API
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      resetToken.user_id,
      { password: newPassword }
    );

    if (updateError) {
      throw updateError;
    }

    // Mark token as used
    await supabase
      .from("password_reset_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("id", resetToken.id);

    // Store password in history
    const passwordHash = crypto.createHash("sha256").update(newPassword).digest("hex");
    await supabase
      .from("password_history")
      .insert({
        user_id: resetToken.user_id,
        password_hash: passwordHash,
      });

    const forwardedFor = req.headers["x-forwarded-for"];
    const requestIp =
      (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor) ??
      req.socket.remoteAddress ??
      null;

    // Create security alert
    const { error: alertError } = await supabase.rpc("create_security_alert", {
      p_user_id: resetToken.user_id,
      p_alert_type: "password_change",
      p_severity: "high",
      p_title: "Contraseña cambiada",
      p_message:
        "Tu contraseña ha sido cambiada exitosamente. Si no realizaste este cambio, contacta a soporte inmediatamente.",
      p_metadata: {
        ip_address: requestIp,
        method: "password_reset",
      },
    });

    if (alertError) {
      logger.error("Error registrando alerta de seguridad (reset password):", alertError);
    }

    // Send confirmation email
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", resetToken.user_id)
      .single();

    if (profile?.email) {
      try {
        await sendEmail({
          to: profile.email,
          subject: "Tu contraseña ha sido cambiada",
          react: <PasswordChangedEmail
            accountEmail={profile.email}
            changeDate={new Date().toISOString()}
          />,
        });
      } catch (emailError) {
        logger.error("Failed to send confirmation email:", emailError);
      }
    }

    res.status(200).json({
      success: true,
      message: "Contraseña cambiada exitosamente",
    });
  } catch (error) {
    logger.error("Password reset error:", error);
    res.status(500).json({
      error: "Failed to reset password",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
