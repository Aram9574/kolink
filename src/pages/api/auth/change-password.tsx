import { logger } from '@/lib/logger';
import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import React from "react";
import { supabase } from "@/lib/supabase";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { validatePassword } from "@/lib/security/passwordValidation";
import { sendEmail } from "@/emails/sendEmail";
import { PasswordChangedEmail } from "@/emails/password-changed";

/**
 * POST /api/auth/change-password
 * Updates the password for the authenticated user and sends a confirmation email.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { currentPassword, newPassword } = req.body as {
      currentPassword?: string;
      newPassword?: string;
    };

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Debes proporcionar la contraseña actual y la nueva contraseña" });
    }

    const validation = validatePassword(newPassword);
    if (!validation.isValid) {
      return res.status(400).json({
        error: "La nueva contraseña no cumple con los requisitos de seguridad",
        feedback: validation.feedback,
      });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No autorizado" });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userResponse, error: userError } = await supabase.auth.getUser(token);

    const user = userResponse?.user;
    if (userError || !user || !user.email) {
      return res.status(401).json({ error: "Sesión no válida" });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Supabase no está configurado correctamente");
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { error: verifyError } = await authClient.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (verifyError) {
      return res.status(400).json({ error: "La contraseña actual no es correcta" });
    }

    const adminClient = getSupabaseAdminClient();
    const { error: updateError } = await adminClient.auth.admin.updateUserById(user.id, {
      password: newPassword,
    });

    if (updateError) {
      throw updateError;
    }

    const passwordHash = crypto.createHash("sha256").update(newPassword).digest("hex");
    const { error: historyError } = await supabase.from("password_history").insert({
      user_id: user.id,
      password_hash: passwordHash,
    });

    if (historyError) {
      logger.error("Error guardando el historial de contraseñas:", historyError);
    }

    const forwardedFor = req.headers["x-forwarded-for"];
    const requestIp =
      (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor) ??
      req.socket.remoteAddress ??
      null;

    const { error: alertError } = await supabase.rpc("create_security_alert", {
      p_user_id: user.id,
      p_alert_type: "password_change",
      p_severity: "high",
      p_title: "Contraseña cambiada exitosamente",
      p_message:
        "La contraseña de tu cuenta se actualizó correctamente. Si no realizaste este cambio, restablece tu contraseña de inmediato.",
      p_metadata: {
        ip_address: requestIp,
        method: "manual_change",
      },
    });

    if (alertError) {
      logger.error("Error registrando alerta de seguridad (password change):", alertError);
    }

    try {
      await sendEmail({
        to: user.email,
        subject: "Tu contraseña en Kolink se actualizó correctamente",
        react: <PasswordChangedEmail
          accountEmail={user.email}
          changeDate={new Date().toLocaleString("es-ES", { timeZone: "UTC" })}
        />,
      });
    } catch (emailError) {
      logger.error("Error enviando correo de confirmación de contraseña:", emailError);
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    logger.error("Password change error:", error);
    return res.status(500).json({
      error: "No se pudo actualizar la contraseña",
    });
  }
}
