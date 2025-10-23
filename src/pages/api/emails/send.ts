import type { NextApiRequest, NextApiResponse } from "next";
import { resend, FROM_EMAIL } from "@/lib/resend";
import { supabaseClient } from "@/lib/supabaseClient";
import fs from "fs/promises";
import path from "path";

type EmailType = "welcome" | "weekly";

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

  const result = await resend.emails.send({
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

  const result = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: "Tu Resumen Semanal de Kolink 📊",
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

    if (!["welcome", "weekly"].includes(type)) {
      return res.status(400).json({ error: "Invalid email type. Must be 'welcome' or 'weekly'" });
    }

    let result;

    switch (type) {
      case "welcome":
        result = await sendWelcomeEmail(to, data || {});
        break;
      case "weekly":
        result = await sendWeeklyEmail(to, data || {});
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
