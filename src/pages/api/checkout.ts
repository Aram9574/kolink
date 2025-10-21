import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const priceId = process.env.STRIPE_PRO_PLAN_PRICE_ID!;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const { userId } = req.body as { userId?: string };

  if (!userId) {
    return res.status(400).json({ error: "Usuario requerido" });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .single();

  if (profileError) {
    return res.status(500).json({ error: profileError.message });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${siteUrl}/dashboard?status=success`,
      cancel_url: `${siteUrl}/dashboard?status=cancelled`,
      metadata: { userId },
      customer_email: profile?.full_name ?? undefined,
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    const err = error as Error;
    return res.status(500).json({ error: err.message });
  }
}
