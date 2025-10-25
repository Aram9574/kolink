import type { NextApiRequest, NextApiResponse } from "next";
import { buffer } from "micro";
import { createClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";
import { logPayment, logError } from "@/lib/logger";

export const config = {
  api: { bodyParser: false },
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Map Stripe Price IDs to plans and credits
const PLAN_MAPPING: Record<
  string,
  { plan: string; credits: number; displayName: string }
> = {
  [process.env.STRIPE_PRICE_ID_BASIC || ""]: {
    plan: "basic",
    credits: 50,
    displayName: "Basic",
  },
  [process.env.STRIPE_PRICE_ID_STANDARD || ""]: {
    plan: "standard",
    credits: 150,
    displayName: "Standard",
  },
  [process.env.STRIPE_PRICE_ID_PREMIUM || ""]: {
    plan: "premium",
    credits: 500,
    displayName: "Premium",
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error("❌ Supabase server keys missing.");
    return res.status(500).send("Configuración de Supabase incompleta.");
  }

  if (!webhookSecret) {
    console.error("❌ STRIPE_WEBHOOK_SECRET no configurado.");
    return res.status(500).send("Configuración de Stripe incompleta.");
  }

  const signature = req.headers["stripe-signature"];

  if (!signature) {
    console.warn("⚠️ Webhook recibido sin firma.");
    return res.status(400).send("Falta la firma de Stripe");
  }

  let event;

  try {
    const rawBody = await buffer(req);
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    console.log(`📦 Evento recibido: ${event.type}`);
  } catch (error) {
    const err = error as Error;
    console.error("⚠️ Webhook signature verification failed:", err.message);
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
      console.warn("⚠️ checkout.session.completed sin user_id en metadata.");
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
        console.error(`❌ Error obteniendo perfil ${userId}:`, fetchError.message);
        await logError(
          userId,
          "Failed to fetch profile during payment processing",
          { error: fetchError.message }
        );
        return res.status(500).send("No se pudo obtener el perfil del usuario.");
      }

      // Determine plan and credits from Stripe line items
      let planInfo = { plan: "basic", credits: 50, displayName: "Basic" };

      // Try to get price ID from session line items
      try {
        const sessionWithLineItems = await stripe.checkout.sessions.retrieve(
          session.id || "",
          { expand: ["line_items"] }
        );

        const priceId = sessionWithLineItems.line_items?.data[0]?.price?.id;

        if (priceId && PLAN_MAPPING[priceId]) {
          planInfo = PLAN_MAPPING[priceId];
        } else if (session.metadata?.selected_plan) {
          // Fallback to metadata
          const selectedPlan = session.metadata.selected_plan.toLowerCase();
          const foundPlan = Object.values(PLAN_MAPPING).find(
            (p) => p.plan === selectedPlan
          );
          if (foundPlan) {
            planInfo = foundPlan;
          }
        }
      } catch (_error) {
        console.warn("⚠️ Could not retrieve line items, using fallback plan mapping");
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
        console.error(
          `❌ Error actualizando plan para ${userId}:`,
          updateError.message
        );
        await logError(
          userId,
          "Failed to update profile after payment",
          { error: updateError.message, plan: planInfo.plan }
        );
        return res.status(500).send("Error actualizando plan.");
      }

      console.log(
        `✅ Plan actualizado a ${planInfo.displayName} para usuario ${userId} (${profile?.email})`
      );
      console.log(`   Créditos: ${currentCredits} → ${newCredits} (+${planInfo.credits})`);

      // Log successful payment
      await logPayment(
        userId,
        planInfo.plan,
        session.amount_total || 0,
        session.id
      );

      console.log(`📝 Payment logged for user ${userId}`);
    } catch (error) {
      const err = error as Error;
      console.error("❌ Excepción procesando webhook:", err.message);
      await logError(
        userId,
        "Exception during payment processing",
        { error: err.message, stack: err.stack }
      );
      return res.status(500).send("Error procesando webhook.");
    }
  }

  return res.status(200).send("success");
}
