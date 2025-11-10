import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";
import { logger } from '@/lib/logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
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
    // Get user profile with stripe_customer_id
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || !profile.stripe_customer_id) {
      return res.status(404).json({ error: "No active subscription found" });
    }

    // Get active subscription from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: profile.stripe_customer_id,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      return res.status(404).json({ error: "No active subscription found" });
    }

    const subscription = subscriptions.data[0];

    // Cancel subscription at period end (no immediate cancellation)
    await stripe.subscriptions.update(subscription.id, {
      cancel_at_period_end: true,
    });

    logger.debug(
      `✅ Subscription ${subscription.id} marked for cancellation at period end for user ${user.id}`
    );

    return res.status(200).json({
      success: true,
      message: "Subscription will be canceled at the end of the billing period",
    });
  } catch (error) {
    logger.error("Error canceling subscription:", error);
    return res.status(500).json({ error: "Failed to cancel subscription" });
  }
}
