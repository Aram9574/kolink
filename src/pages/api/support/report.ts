import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/lib/supabase";
import { sendEmail } from "@/emails/sendEmail";
import { SupportFeedbackEmail } from "@/emails/support-feedback";

const SUPPORT_EMAIL = process.env.SUPPORT_INBOX || process.env.FROM_EMAIL || "info@kolink.es";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const { category, title, description, includeScreenshot, emailCopy } = req.body as {
      category?: "bug" | "suggestion" | "idea";
      title?: string;
      description?: string;
      includeScreenshot?: boolean;
      emailCopy?: boolean;
    };

    if (!category || !title || !description) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const sanitizedTitle = title.trim().slice(0, 140);
    const sanitizedDescription = description.trim().slice(0, 4000);

    await sendEmail({
      to: SUPPORT_EMAIL,
      subject: `[Kolink Feedback] ${category === "bug" ? "Bug" : category === "suggestion" ? "Sugerencia" : "Idea"} - ${sanitizedTitle}`,
      react: SupportFeedbackEmail({
        reporterEmail: user.email ?? "desconocido",
        category,
        title: sanitizedTitle,
        description: sanitizedDescription,
        includeScreenshot: Boolean(includeScreenshot),
        includeCopy: Boolean(emailCopy),
      }),
    });

    if (emailCopy && user.email) {
      await sendEmail({
        to: user.email,
        subject: "Hemos recibido tu feedback en Kolink",
        react: SupportFeedbackEmail({
          reporterEmail: user.email,
          category,
          title: sanitizedTitle,
          description: sanitizedDescription,
          includeScreenshot: Boolean(includeScreenshot),
          includeCopy: false,
          isAcknowledgement: true,
        }),
      });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("[support/report] Failed to send feedback email:", error);
    return res.status(500).json({
      error: "No pudimos registrar tu feedback. Intenta nuevamente más tarde.",
    });
  }
}
