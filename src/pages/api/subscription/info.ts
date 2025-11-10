import { logger } from '@/lib/logger';
import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(500).json({ error: "Server configuration error" });
  }

  // Get user from Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authHeader.replace("Bearer ", "");
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  // Verify user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    // Get user profile with stripe_customer_id using service role key
    const supabaseServiceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseServiceUrl || !supabaseServiceKey) {
      return res.status(500).json({ error: "Server configuration error" });
    }

    const supabaseService = createClient(supabaseServiceUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const { data: profile, error: profileError } = await supabaseService
      .from("profiles")
      .select("stripe_customer_id, plan, credits")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      logger.error("Profile fetch error:", profileError);
      return res.status(404).json({ error: "Profile not found" });
    }

    // If no stripe_customer_id, user has no subscription
    if (!profile.stripe_customer_id) {
      return res.status(200).json({
        hasSubscription: false,
        plan: profile.plan || "free",
        credits: profile.credits || 0,
      });
    }

    // Get subscription from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: profile.stripe_customer_id,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      return res.status(200).json({
        hasSubscription: false,
        plan: profile.plan || "free",
        credits: profile.credits || 0,
      });
    }

    const subscription = subscriptions.data[0];
    const priceId = subscription.items.data[0]?.price.id;

    // Get payment method
    const customer = await stripe.customers.retrieve(profile.stripe_customer_id);
    let paymentMethod = null;

    if (customer && !customer.deleted && customer.invoice_settings?.default_payment_method) {
      const pm = await stripe.paymentMethods.retrieve(
        customer.invoice_settings.default_payment_method as string
      );
      paymentMethod = {
        brand: pm.card?.brand,
        last4: pm.card?.last4,
        exp_month: pm.card?.exp_month,
        exp_year: pm.card?.exp_year,
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sub = subscription as any;

    return res.status(200).json({
      hasSubscription: true,
      plan: profile.plan,
      credits: profile.credits,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        current_period_start: sub.current_period_start,
        current_period_end: sub.current_period_end,
        cancel_at_period_end: sub.cancel_at_period_end,
        priceId,
      },
      paymentMethod,
    });
  } catch (error) {
    logger.error("Error fetching subscription info:", error);
    return res.status(500).json({ error: "Failed to fetch subscription info" });
  }
}
