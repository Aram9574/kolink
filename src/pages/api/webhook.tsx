import type { NextApiRequest, NextApiResponse } from "next";
import { buffer } from "micro";
import { createClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";
import { getResendClient, FROM_EMAIL } from "@/lib/resend";
import * as Sentry from "@sentry/nextjs";
import fs from "fs/promises";
import path from "path";
import { logger } from '@/lib/logger';

export const config = {
  api: { bodyParser: false },
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

type PlanInfo = { plan: string; credits: number; displayName: string; price: number };

const ALL_PLANS: PlanInfo[] = [
  { plan: "basic", credits: 50, displayName: "Basic", price: 9 },
  { plan: "standard", credits: 150, displayName: "Standard", price: 19 },
  { plan: "premium", credits: 500, displayName: "Premium", price: 29 },
];

const PLAN_MAPPING: Record<string, PlanInfo> = ALL_PLANS.reduce(
  (acc, plan) => {
    const priceId =
      plan.plan === "basic"
        ? process.env.STRIPE_PRICE_ID_BASIC
        : plan.plan === "standard"
          ? process.env.STRIPE_PRICE_ID_STANDARD
          : process.env.STRIPE_PRICE_ID_PREMIUM;

    if (priceId) {
      acc[priceId] = plan;
    }

    return acc;
  },
  {} as Record<string, PlanInfo>
);

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
 * Sends payment successful email (direct, no API call)
 */
async function sendPaymentEmail(
  to: string,
  userName: string,
  planInfo: { plan: string; credits: number; displayName: string; price: number },
  invoiceId: string
) {
  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://kolink.es";
    const templatePath = path.join(process.cwd(), "src", "emails", "payment-successful.html");

    const html = await fs.readFile(templatePath, "utf-8");

    const emailData = {
      userName,
      planName: planInfo.displayName,
      creditsAdded: String(planInfo.credits),
      paymentMethod: "Tarjeta",
      transactionDate: new Date().toLocaleDateString("es-ES", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      amount: planInfo.price.toFixed(2),
      currency: "USD",
      invoiceNumber: invoiceId || "N/A",
      dashboardUrl: `${siteUrl}/dashboard`,
      siteUrl,
    };

    const processedHtml = replaceTemplateVars(html, emailData);

    const resendClient = getResendClient();

    await resendClient.emails.send({
      from: FROM_EMAIL,
      to,
      subject: "¡Pago exitoso! Tu plan está activo 🎉",
      html: processedHtml,
    });

    logger.debug(`📧 Payment confirmation email sent to ${to}`);
  } catch (error) {
    logger.error("Failed to send payment email:", error);
    // Don't throw - email failure shouldn't fail the webhook
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    logger.error("❌ Supabase server keys missing.");
    return res.status(500).send("Configuración de Supabase incompleta (requiere clave service role).");
  }

  if (!webhookSecret) {
    logger.error("❌ STRIPE_WEBHOOK_SECRET no configurado.");
    return res.status(500).send("Configuración de Stripe incompleta.");
  }

  const signature = req.headers["stripe-signature"];

  if (!signature) {
    logger.warn("⚠️ Webhook recibido sin firma.");
    return res.status(400).send("Falta la firma de Stripe");
  }

  let event;

  try {
    const rawBody = await buffer(req);
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    logger.debug(`📦 Evento recibido: ${event.type}`);

    // Log successful webhook verification
    Sentry.addBreadcrumb({
      category: "payment",
      message: "Webhook event verified",
      level: "info",
      data: { eventType: event.type, eventId: event.id }
    });
  } catch (error) {
    const err = error as Error;
    logger.error("⚠️ Webhook signature verification failed:", err.message);

    // Log signature verification failure
    Sentry.captureException(error, {
      tags: {
        endpoint: "webhook",
        error_type: "signature_verification_failed"
      },
      level: "error"
    });

    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as {
      metadata?: { user_id?: string; selected_plan?: string };
      amount_total?: number;
      id?: string;
      line_items?: {
        data: Array<{
          price?: {
            id?: string;
          };
        }>;
      };
    };

    const userId = session.metadata?.user_id;

    if (!userId) {
      logger.warn("⚠️ checkout.session.completed sin user_id en metadata.");
      return res.status(400).send("user_id faltante en metadata.");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false },
    });

    try {
      // Get current profile
      const { data: profile, error: fetchError } = await supabase
        .from("profiles")
        .select("credits, plan, email")
        .eq("id", userId)
        .single();

      if (fetchError) {
        logger.error(`❌ Error obteniendo perfil ${userId}:`, fetchError.message);
        // await logError(userId, "Failed to fetch profile during payment processing", { error: fetchError.message });

        // Log profile fetch error
        Sentry.captureException(new Error("Failed to fetch profile"), {
          tags: {
            endpoint: "webhook",
            event_type: "checkout.session.completed",
            error_type: "profile_fetch_failed"
          },
          extra: { userId, error: fetchError.message }
        });

        return res.status(500).send("No se pudo obtener el perfil del usuario.");
      }

      // Determine plan and credits from Stripe line items
      let planInfo: { plan: string; credits: number; displayName: string; price: number } = {
        plan: "basic",
        credits: 50,
        displayName: "Basic",
        price: 9
      };

      // Try to get price ID from session line items
      try {
        const sessionWithLineItems = await stripe.checkout.sessions.retrieve(
          session.id || "",
          { expand: ["line_items"] }
        );

        const priceId = sessionWithLineItems.line_items?.data[0]?.price?.id;

        if (priceId) {
          const mappedPlan = PLAN_MAPPING[priceId];
          if (mappedPlan) {
            planInfo = mappedPlan;
          }
        } else if (session.metadata?.selected_plan) {
          // Fallback to metadata
          const selectedPlan = session.metadata.selected_plan.toLowerCase();
          const foundPlan = ALL_PLANS.find((p) => p.plan === selectedPlan);
          if (foundPlan) {
            planInfo = foundPlan;
          }
        }
      } catch (_error) {
        logger.warn("⚠️ Could not retrieve line items, using fallback plan mapping");
      }

      // Calculate new credits
      const currentCredits = profile?.credits || 0;
      const newCredits = currentCredits + planInfo.credits;

      // Update profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          plan: planInfo.plan,
          credits: newCredits,
        })
        .eq("id", userId);

      if (updateError) {
        logger.error(
          `❌ Error actualizando plan para ${userId}:`,
          updateError.message
        );
        

        // Log profile update error
        Sentry.captureException(new Error("Failed to update profile"), {
          tags: {
            endpoint: "webhook",
            event_type: "checkout.session.completed",
            error_type: "profile_update_failed"
          },
          extra: { userId, plan: planInfo.plan, error: updateError.message }
        });

        return res.status(500).send("Error actualizando plan.");
      }

      logger.debug(
        `✅ Plan actualizado a ${planInfo.displayName} para usuario ${userId} (${profile?.email})`
      );
      logger.debug(`   Créditos: ${currentCredits} → ${newCredits} (+${planInfo.credits})`);

      // Log successful payment processing
      Sentry.addBreadcrumb({
        category: "payment",
        message: "Payment processed successfully",
        level: "info",
        data: {
          userId,
          plan: planInfo.plan,
          creditsAdded: planInfo.credits,
          newCredits,
          email: profile?.email
        }
      });

      // Log successful payment
      

      logger.debug(`📝 Payment logged for user ${userId}`);

      // Send payment confirmation email
      if (profile?.email) {
        // Extract first name from email if no name in profile
        const userName = profile.email.split('@')[0];
        await sendPaymentEmail(
          profile.email,
          userName,
          planInfo,
          session.id || 'unknown'
        );
      }
    } catch (error) {
      const err = error as Error;
      logger.error("❌ Excepción procesando webhook:", err.message);
      

      // Log general exception
      Sentry.captureException(error, {
        tags: {
          endpoint: "webhook",
          event_type: "checkout.session.completed",
          error_type: "general_exception"
        },
        extra: { userId, errorMessage: err.message, stack: err.stack }
      });

      return res.status(500).send("Error procesando webhook.");
    }
  }

  return res.status(200).send("success");
}
