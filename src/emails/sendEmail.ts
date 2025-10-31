import { render } from "@react-email/render";
import type { ReactElement } from "react";
import { getResendClient, FROM_EMAIL } from "@/lib/resend";

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  react: ReactElement;
}

/**
 * Renders a React Email component and sends it using Resend.
 */
export async function sendEmail({ to, subject, react }: SendEmailParams) {
  const resend = getResendClient();

  const html = await render(react);
  const text = await render(react, { plainText: true });

  const response = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject,
    html,
    text,
  });

  if (response.error) {
    throw new Error(response.error.message);
  }

  return response;
}
