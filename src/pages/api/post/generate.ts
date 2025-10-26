import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { generatePostWithContext } from "@/server/services/writerService";
import { logGeneration, logError } from "@/lib/logger";
import { limiter } from "@/lib/rateLimiter"; // 🚦 Rate limiter agregado

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
  // 1️⃣ Validar método
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  // 2️⃣ Validar autenticación
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

  // 3️⃣ Aplicar rate limiter antes de generar contenido
  try {
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
    const { success, reset } = await limiter.limit(ip.toString());

    if (!success) {
      res.setHeader("Retry-After", Math.ceil(reset / 1000));
      return res.status(429).json({
        ok: false,
        error: "Has alcanzado el límite de generación. Intenta de nuevo en un minuto.",
      });
    }
  } catch (err) {
    console.error("[RateLimiter] Error:", err);
    // En caso de fallo del limitador, no bloquea al usuario
  }

  // 4️⃣ Validar el prompt
  const body = req.body as GenerateRequestBody;
  if (!body.prompt || body.prompt.trim().length < 10) {
    return res.status(400).json({ error: "Prompt inválido. Proporciona más contexto." });
  }

  // 5️⃣ Generar el contenido con IA
  try {
    const result = await generatePostWithContext({
      userId: user.id,
      prompt: body.prompt,
      style: body.style,
      metadata: body.metadata,
    });

    // Registrar la generación exitosa
    await logGeneration(user.id, result.postId, 1);

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
      await logError(user.id, "Content generation failed: No credits remaining", {
        error_code: err.code,
        plan: err.plan,
      });

      return res.status(402).json({
        ok: false,
        error: err.message,
        plan: err.plan,
      });
    }

    // Log de errores generales
    console.error("[api/post/generate] Error:", err);
    await logError(user.id, "Content generation failed", {
      error: err.message,
      prompt_length: body.prompt?.length || 0,
    });

    return res.status(500).json({ ok: false, error: err.message });
  }
}
