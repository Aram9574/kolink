import type { NextApiRequest, NextApiResponse } from "next";
import { buffer } from "micro";
import { createClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";

export const config = {
  api: { bodyParser: false },
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const signature = req.headers["stripe-signature"];

  if (!signature) {
    return res.status(400).send("Falta la firma de Stripe");
  }

  let event;

  try {
    const rawBody = await buffer(req);
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    const err = error as Error;
    console.error("⚠️ Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as {
      metadata?: { userId?: string };
    };

    const userId = session.metadata?.userId;

    if (userId) {
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      const { error } = await supabase
        .from("profiles")
        .update({ plan: "pro", credits: 100 })
        .eq("id", userId);

      if (error) {
        console.error(`Error actualizando plan para ${userId}:`, error.message);
        return res.status(500).send("Error actualizando plan.");
      }

      console.log(`✅ Plan actualizado a PRO para usuario ${userId}`);
    }
  }

  return res.status(200).send("success");
}
