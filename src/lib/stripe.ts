import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // @ts-expect-error Stripe types sometimes lag behind
  apiVersion: null,
});

