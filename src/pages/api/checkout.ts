import type { NextApiRequest, NextApiResponse } from "next";
import type Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const priceId = process.env.STRIPE_PRO_PLAN_PRICE_ID;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("❌ Supabase env vars missing.");
    return res.status(500).json({ error: "Error de configuración del servidor." });
  }

  if (!priceId) {
    console.error("❌ STRIPE_PRO_PLAN_PRICE_ID no configurado.");
    return res.status(500).json({ error: "Precio de Stripe no configurado." });
  }

  if (!siteUrl) {
    console.error("❌ NEXT_PUBLIC_SITE_URL no configurado.");
    return res.status(500).json({ error: "URL del sitio no configurada." });
  }

  console.log(
    `🧾 Checkout request recibida. userId=${req.body?.userId ?? "undefined"} priceId=${priceId}`
  );

  const { userId } = req.body as { userId?: string };

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
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
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
      metadata: { user_id: userId },
    };

    if (customerEmail) {
      sessionParams.customer_email = customerEmail;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    console.log(
      `✅ Sesión de checkout creada para ${userId}: sessionId=${session.id} priceId=${priceId}`
    );
    return res.status(200).json({ url: session.url });
  } catch (error) {
    const err = error as Error;
    console.error("❌ Error creando sesión de checkout:", err.message);
    return res.status(500).json({ error: "No se pudo iniciar el checkout." });
  }
}
