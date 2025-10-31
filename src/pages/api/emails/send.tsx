import type { NextApiRequest, NextApiResponse } from "next";
import { getResendClient, FROM_EMAIL } from "@/lib/resend";
import { supabaseClient } from "@/lib/supabaseClient";
import { rateLimit, RATE_LIMIT_CONFIGS } from "@/lib/rateLimit";
import fs from "fs/promises";
import path from "path";

type EmailType = "welcome" | "weekly" | "reset-password" | "payment-successful" | "credits-low";

interface EmailParams {
  to: string;
  type: EmailType;
  data?: Record<string, unknown>;
}

/**
 * Replaces template variables in HTML string
 * Example: {{userName}} -> actual user name
 */
function replaceTemplateVars(html: string, data: Record<string, unknown>): string {
  let result = html;

  // Replace simple variables like {{userName}}
  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`{{${key}}}`, "g");
    result = result.replace(regex, String(value ?? ""));
  }

  // Handle conditional blocks like {{#if hasLowCredits}}...{{/if}}
  result = result.replace(/{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g, (match, condition, content) => {
    return data[condition] ? content : "";
  });

  return result;
}

/**
 * Loads and processes email template
 */
async function loadEmailTemplate(type: EmailType, data: Record<string, unknown>): Promise<string> {
  const templatePath = path.join(process.cwd(), "src", "emails", `${type}.html`);

  try {
    const html = await fs.readFile(templatePath, "utf-8");
    return replaceTemplateVars(html, data);
  } catch (error) {
    console.error(`Error loading email template ${type}:`, error);
    throw new Error(`Email template ${type} not found`);
  }
}

/**
 * Sends welcome email to new user
 */
async function sendWelcomeEmail(to: string, data: Record<string, unknown>) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://kolink.es";

  const emailData = {
    userName: data.userName || "Usuario",
    credits: data.credits || 0,
    dashboardUrl: `${siteUrl}/dashboard`,
    siteUrl,
    ...data,
  };

  const html = await loadEmailTemplate("welcome", emailData);

  const resendClient = getResendClient();
  const result = await resendClient.emails.send({
    from: FROM_EMAIL,
    to,
    subject: "¡Bienvenido a Kolink! 🎉",
    html,
  });

  return result;
}

/**
 * Sends weekly summary email to user
 */
async function sendWeeklyEmail(to: string, data: Record<string, unknown>) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://kolink.es";

  const emailData = {
    userName: data.userName || "Usuario",
    postsGenerated: data.postsGenerated || 0,
    creditsUsed: data.creditsUsed || 0,
    creditsRemaining: data.creditsRemaining || 0,
    currentPlan: data.currentPlan || "Free",
    hasLowCredits: Number(data.creditsRemaining || 0) < 10,
    hasHighActivity: Number(data.postsGenerated || 0) >= 5,
    dashboardUrl: `${siteUrl}/dashboard`,
    siteUrl,
    ...data,
  };

  const html = await loadEmailTemplate("weekly", emailData);

  const resendClient = getResendClient();
  const result = await resendClient.emails.send({
    from: FROM_EMAIL,
    to,
    subject: "Tu Resumen Semanal de Kolink 📊",
    html,
  });

  return result;
}

/**
 * Sends reset password email
 */
async function sendResetPasswordEmail(to: string, data: Record<string, unknown>) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://kolink.es";

  const emailData = {
    userName: data.userName || "Usuario",
    userEmail: to,
    resetUrl: data.resetUrl || `${siteUrl}/reset-password`,
    expiryMinutes: data.expiryMinutes || 60,
    siteUrl,
    ...data,
  };

  const html = await loadEmailTemplate("reset-password", emailData);

  const resendClient = getResendClient();
  const result = await resendClient.emails.send({
    from: FROM_EMAIL,
    to,
    subject: "Restablece tu contraseña - Kolink 🔐",
    html,
  });

  return result;
}

/**
 * Sends payment successful email
 */
async function sendPaymentSuccessfulEmail(to: string, data: Record<string, unknown>) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://kolink.es";

  const emailData = {
    userName: data.userName || "Usuario",
    planName: data.planName || "Basic",
    creditsAdded: data.creditsAdded || 0,
    paymentMethod: data.paymentMethod || "Tarjeta",
    transactionDate: data.transactionDate || new Date().toLocaleDateString("es-ES"),
    amount: data.amount || "0.00",
    currency: data.currency || "USD",
    invoiceNumber: data.invoiceNumber || "N/A",
    dashboardUrl: `${siteUrl}/dashboard`,
    siteUrl,
    ...data,
  };

  const html = await loadEmailTemplate("payment-successful", emailData);

  const resendClient = getResendClient();
  const result = await resendClient.emails.send({
    from: FROM_EMAIL,
    to,
    subject: "¡Pago exitoso! Tu plan está activo 🎉",
    html,
  });

  return result;
}

/**
 * Sends credits low warning email
 */
async function sendCreditsLowEmail(to: string, data: Record<string, unknown>) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://kolink.es";

  const emailData = {
    userName: data.userName || "Usuario",
    creditsRemaining: data.creditsRemaining || 0,
    postsThisMonth: data.postsThisMonth || 0,
    creditsUsed: data.creditsUsed || 0,
    upgradeUrl: `${siteUrl}/dashboard#plans`,
    dashboardUrl: `${siteUrl}/dashboard`,
    siteUrl,
    ...data,
  };

  const html = await loadEmailTemplate("credits-low", emailData);

  const resendClient = getResendClient();
  const result = await resendClient.emails.send({
    from: FROM_EMAIL,
    to,
    subject: "⚠️ Tus créditos de Kolink están por agotarse",
    html,
  });

  return result;
}

/**
 * Main API handler
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Apply rate limiting (AUTH config: 5 requests per 5 minutes)
  const rateLimitResult = await rateLimit(req, res, RATE_LIMIT_CONFIGS.AUTH);
  if (!rateLimitResult.allowed) return;

  try {
    // Verify authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const { to, type, data }: EmailParams = req.body;

    if (!to || !type) {
      return res.status(400).json({ error: "Missing required fields: to, type" });
    }

    const validTypes = ["welcome", "weekly", "reset-password", "payment-successful", "credits-low"];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        error: "Invalid email type",
        validTypes,
        received: type
      });
    }

    let result;

    switch (type) {
      case "welcome":
        result = await sendWelcomeEmail(to, data || {});
        break;
      case "weekly":
        result = await sendWeeklyEmail(to, data || {});
        break;
      case "reset-password":
        result = await sendResetPasswordEmail(to, data || {});
        break;
      case "payment-successful":
        result = await sendPaymentSuccessfulEmail(to, data || {});
        break;
      case "credits-low":
        result = await sendCreditsLowEmail(to, data || {});
        break;
      default:
        return res.status(400).json({ error: "Invalid email type" });
    }

    if (result.error) {
      console.error("Resend error:", result.error);
      return res.status(500).json({ error: "Failed to send email", details: result.error });
    }

    return res.status(200).json({
      success: true,
      messageId: result.data?.id,
      message: `${type} email sent successfully`,
    });
  } catch (error) {
    console.error("Email send error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
