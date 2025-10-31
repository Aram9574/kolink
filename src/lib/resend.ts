import { Resend } from "resend";

let cachedResend: Resend | null = null;

export function getResendClient(): Resend {
  if (cachedResend) {
    return cachedResend;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set in environment variables");
  }

  cachedResend = new Resend(apiKey);
  return cachedResend;
}

export const FROM_EMAIL = process.env.FROM_EMAIL || "onboarding@resend.dev";
