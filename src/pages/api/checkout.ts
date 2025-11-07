import type { NextApiRequest, NextApiResponse } from "next";
import type Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";
import { limiter } from "@/lib/rateLimiter";
import * as Sentry from "@sentry/nextjs";

type PlanTier = "basic" | "standard" | "premium";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Dominio de producción (fallback a kolink.es si no hay variable definida)
const YOUR_DOMAIN = process.env.NEXT_PUBLIC_SITE_URL || "https://kolink.es";

// Map de precios por plan (IDs configurados en Stripe)
const priceMap: Record<PlanTier, string | undefined> = {
  basic: process.env.STRIPE_PRICE_ID_BASIC,
  standard: process.env.STRIPE_PRICE_ID_STANDARD,
  premium: process.env.STRIPE_PRICE_ID_PREMIUM,
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  // Rate limiting: 5 intentos de checkout cada 60 segundos por IP
  try {
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
    const { success, reset } = await limiter.limit(`checkout_${ip.toString()}`);

    if (!success) {
      res.setHeader("Retry-After", Math.ceil(reset / 1000));
      return res.status(429).json({
        error: "Demasiados intentos de checkout. Intenta de nuevo más tarde.",
        retryAfter: Math.ceil(reset / 1000),
      });
    }
  } catch (error) {
    console.error("❌ Error en rate limiter:", error);
    // Continuar sin rate limiting si hay error
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("❌ Supabase env vars missing.");
    return res.status(500).json({ error: "Error de configuración del servidor." });
  }

  // Log para verificar el dominio activo
  console.log(`🌐 Using domain for Stripe redirects: ${YOUR_DOMAIN}`);
  if (YOUR_DOMAIN.includes("vercel.app")) {
    console.warn("⚠️ Atención: estás usando un dominio temporal de Vercel, no el dominio final kolink.es");
  }

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

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
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
        console.warn(`⚠️ Usuario ${userId} no tiene email registrado, continuando sin customer_email.`);
      }
    }
  } catch (error) {
    const err = error as Error;
    console.error("❌ Excepción consultando perfil:", err.message);
  }

  try {
    // Sesión de Stripe configurada con dominio dinámico (producción segura)
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      // URLs seguras para redirección en dominio propio
      success_url: `${YOUR_DOMAIN}/dashboard?status=success`,
      cancel_url: `${YOUR_DOMAIN}/dashboard?status=cancel`,
      metadata: { user_id: userId, selected_plan: normalizedPlan },
    };

    if (customerEmail) {
      sessionParams.customer_email = customerEmail;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    console.log(
      `✅ Sesión de checkout creada para ${userId}: sessionId=${session.id} priceId=${priceId} redirectTo=${YOUR_DOMAIN}`
    );

    // Log successful checkout session creation
    Sentry.addBreadcrumb({
      category: "payment",
      message: "Checkout session created",
      level: "info",
      data: {
        userId,
        plan: normalizedPlan,
        sessionId: session.id,
        priceId
      }
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    const err = error as Error;
    console.error("❌ Error creando sesión de checkout:", err.message);

    // Log checkout creation error
    Sentry.captureException(error, {
      tags: {
        endpoint: "checkout",
        error_type: "session_creation_failed"
      },
      extra: {
        userId,
        plan: normalizedPlan,
        error: err.message
      }
    });

    return res.status(500).json({ error: "No se pudo iniciar el checkout." });
  }
}
