import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { repurposePost } from "@/server/services/writerService";

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
