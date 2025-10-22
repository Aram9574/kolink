import type { NextApiRequest, NextApiResponse } from "next";
import { resend, FROM_EMAIL } from "@/lib/resend";
import { supabaseClient } from "@/lib/supabaseClient";
import fs from "fs/promises";
import path from "path";

/**
 * Replaces template variables in HTML string
 */
function replaceTemplateVars(html: string, data: Record<string, unknown>): string {
  let result = html;

  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`{{${key}}}`, "g");
    result = result.replace(regex, String(value ?? ""));
  }

  return result;
}

/**
 * Webhook endpoint for sending welcome emails (called by Supabase trigger)
 * This endpoint uses a secret key for authentication instead of user tokens
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Verify webhook secret
    const webhookSecret = req.headers["x-webhook-secret"];
    if (webhookSecret !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }

    // Fetch user profile from Supabase
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("email, credits, plan")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      console.error("Error fetching profile:", profileError);
      return res.status(404).json({ error: "User profile not found" });
    }

    // Load welcome email template
    const templatePath = path.join(process.cwd(), "src", "emails", "welcome.html");
    const html = await fs.readFile(templatePath, "utf-8");

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://kolink-gamma.vercel.app";

    const emailData = {
      userName: profile.email?.split("@")[0] || "Usuario",
      credits: profile.credits || 0,
      dashboardUrl: `${siteUrl}/dashboard`,
      siteUrl,
    };

    const processedHtml = replaceTemplateVars(html, emailData);

    // Send email via Resend
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: profile.email,
      subject: "¡Bienvenido a Kolink! 🎉",
      html: processedHtml,
    });

    if (result.error) {
      console.error("Resend error:", result.error);
      return res.status(500).json({ error: "Failed to send email", details: result.error });
    }

    console.log(`Welcome email sent to ${profile.email} (${userId})`);

    return res.status(200).json({
      success: true,
      messageId: result.data?.id,
      message: "Welcome email sent successfully",
    });
  } catch (error) {
    console.error("Welcome email webhook error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
