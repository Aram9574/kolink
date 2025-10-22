import type { NextApiRequest, NextApiResponse } from "next";
import { buffer } from "micro";
import { createClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";

export const config = {
  api: { bodyParser: false },
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

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
      metadata?: { user_id?: string };
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
      const { data: profile, error: fetchError } = await supabase
        .from("profiles")
        .select("credits")
        .eq("id", userId)
        .single();

      if (fetchError) {
        console.error(`❌ Error obteniendo perfil ${userId}:`, fetchError.message);
        return res.status(500).send("No se pudo obtener el perfil del usuario.");
      }

      const updates: Record<string, unknown> = { plan: "pro" };

      if (profile && typeof profile.credits === "number") {
        updates.credits = profile.credits + 100;
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", userId);

      if (updateError) {
        console.error(`❌ Error actualizando plan para ${userId}:`, updateError.message);
        return res.status(500).send("Error actualizando plan.");
      }

      console.log(`✅ Plan actualizado a PRO para usuario ${userId}`);
    } catch (error) {
      const err = error as Error;
      console.error("❌ Excepción procesando webhook:", err.message);
      return res.status(500).send("Error procesando webhook.");
    }
  }

  return res.status(200).send("success");
}
