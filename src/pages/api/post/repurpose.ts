import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { repurposePost } from "@/server/services/writerService";
import { aiGenerationLimiter } from "@/lib/rateLimiter";

type RepurposeRequestBody = {
  postId?: string;
  newStyle?: string;
  newFormat?: string;
  audienceShift?: string;
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

  // Rate limiting: 10 requests per minute (same as generation)
  try {
    const { success, reset } = await aiGenerationLimiter.limit(`repurpose_${user.id}`);

    if (!success) {
      res.setHeader("Retry-After", Math.ceil(reset / 1000));
      return res.status(429).json({
        error: "Demasiados intentos de repurposing. Intenta de nuevo más tarde.",
        retryAfter: Math.ceil(reset / 1000),
      });
    }
  } catch (error) {
    console.error("❌ Error en rate limiter:", error);
    // Continue without rate limiting if error
  }

  const body = req.body as RepurposeRequestBody;
  if (!body.postId) {
    return res.status(400).json({ error: "postId es requerido" });
  }

  try {
    const result = await repurposePost({
      userId: user.id,
      postId: body.postId,
      newStyle: body.newStyle,
      newFormat: body.newFormat,
      audienceShift: body.audienceShift,
    });

    return res.status(200).json({
      ok: true,
      postId: result.postId,
      content: result.content,
      hashtags: result.hashtags,
      metadata: result.metadata,
      viralScore: result.viralScore,
      recommendations: result.recommendations,
    });
  } catch (error) {
    console.error("[api/post/repurpose] Error:", error);
    return res.status(500).json({ ok: false, error: (error as Error).message });
  }
}
