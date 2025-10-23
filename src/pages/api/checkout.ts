import type { NextApiRequest, NextApiResponse } from "next";
import type Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";

type PlanTier = "basic" | "standard" | "premium";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Dynamic domain configuration for Stripe redirects
const YOUR_DOMAIN = process.env.NEXT_PUBLIC_SITE_URL || 'https://kolink.es';

const priceMap: Record<PlanTier, string | undefined> = {
  basic: process.env.STRIPE_PRICE_ID_BASIC,
  standard: process.env.STRIPE_PRICE_ID_STANDARD,
  premium: process.env.STRIPE_PRICE_ID_PREMIUM,
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("❌ Supabase env vars missing.");
    return res.status(500).json({ error: "Error de configuración del servidor." });
  }

  // Log the domain being used for redirects (helpful for debugging)
  console.log(`🌐 Using domain for Stripe redirects: ${YOUR_DOMAIN}`);

  const { userId, plan } = req.body as { userId?: string; plan?: string };
  const normalizedPlan = typeof plan === "string" ? plan.toLowerCase() : undefined;

  const isValidPlan = (value: string): value is PlanTier =>
    (["basic", "standard", "premium"] as const).includes(value as PlanTier);

  if (!normalizedPlan || !isValidPlan(normalizedPlan)) {
    console.warn(`⚠️ Plan inválido recibido en checkout: ${plan}`);
    return res.status(400).json({ error: "Plan seleccionado inválido." });
  }

  const priceId = priceMap[normalizedPlan];

  if (!priceId) {
    console.error(`❌ Price ID no configurado para el plan ${normalizedPlan}.`);
    return res.status(500).json({ error: "Plan no disponible temporalmente." });
  }

  console.log(
    `🧾 Checkout request recibida. userId=${userId ?? "undefined"} plan=${normalizedPlan} priceId=${priceId}`
  );

  if (!userId) {
    console.warn("⚠️ userId faltante en petición de checkout.");
    return res.status(400).json({ error: "Usuario requerido" });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  let customerEmail: string | undefined;

  try {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", userId)
      .single();

    if (profileError) {
      console.error("❌ Error obteniendo perfil en checkout:", profileError.message);
    } else {
      customerEmail = profile?.email ?? undefined;

      if (!customerEmail && profile?.full_name) {
        // Stripe requiere un email, así que sólo usamos full_name para logging en caso de ausencia.
        console.warn(`⚠️ Usuario ${userId} no tiene email registrado, continuando sin customer_email.`);
      }
    }
  } catch (error) {
    const err = error as Error;
    console.error("❌ Excepción consultando perfil:", err.message);
  }

  try {
    // Construct Stripe checkout session with dynamic domain
    // This ensures redirects always point to the correct deployment URL
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      // Include {CHECKOUT_SESSION_ID} for server-side verification if needed
      success_url: `${YOUR_DOMAIN}/dashboard?status=success&plan=${encodeURIComponent(normalizedPlan)}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${YOUR_DOMAIN}/dashboard?status=cancelled`,
      metadata: { user_id: userId, selected_plan: normalizedPlan },
    };

    if (customerEmail) {
      sessionParams.customer_email = customerEmail;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    console.log(
      `✅ Sesión de checkout creada para ${userId}: sessionId=${session.id} priceId=${priceId} redirectTo=${YOUR_DOMAIN}`
    );
    return res.status(200).json({ url: session.url });
  } catch (error) {
    const err = error as Error;
    console.error("❌ Error creando sesión de checkout:", err.message);
    return res.status(500).json({ error: "No se pudo iniciar el checkout." });
  }
}
