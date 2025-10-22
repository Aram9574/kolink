import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { generatePostWithContext } from "@/server/services/writerService";

type GenerateRequestBody = {
  prompt?: string;
  style?: string;
  metadata?: {
    objective?: string;
    audience?: string;
    callToAction?: string;
    format?: string;
    extraInstructions?: string[];
  };
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "No autorizado" });
  }

  const token = authHeader.replace("Bearer ", "");
  const supabase = getSupabaseAdminClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return res.status(401).json({ error: "Sesión inválida" });
  }

  const body = req.body as GenerateRequestBody;
  if (!body.prompt || body.prompt.trim().length < 10) {
    return res.status(400).json({ error: "Prompt inválido. Proporciona más contexto." });
  }

  try {
    const result = await generatePostWithContext({
      userId: user.id,
      prompt: body.prompt,
      style: body.style,
      metadata: body.metadata,
    });

    return res.status(200).json({
      ok: true,
      postId: result.postId,
      content: result.content,
      hashtags: result.hashtags,
      metadata: result.metadata,
      viralScore: result.viralScore,
      recommendations: result.recommendations,
      remainingCredits: result.remainingCredits,
    });
  } catch (error) {
    const err = error as Error & { code?: string; plan?: string };

    if (err.code === "NO_CREDITS") {
      return res.status(402).json({
        ok: false,
        error: err.message,
        plan: err.plan,
      });
    }

    console.error("[api/post/generate] Error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
