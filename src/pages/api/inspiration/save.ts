import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

type SaveRequest =
  | {
      type: "post";
      inspirationPostId: string;
      note?: string;
      metadata?: Record<string, unknown>;
    }
  | {
      type: "search";
      name: string;
      filters: Record<string, unknown>;
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
  } = await supabase.auth.getUser(token);

  if (!user) {
    return res.status(401).json({ error: "Sesión inválida" });
  }

  const body = req.body as SaveRequest;

  try {
    if (body.type === "post") {
      const { error } = await supabase.from("saved_posts").insert({
        user_id: user.id,
        inspiration_post_id: body.inspirationPostId,
        note: body.note ?? null,
        metadata: body.metadata ?? {},
      });

      if (error) {
        throw error;
      }

      return res.status(200).json({ ok: true, type: "post" });
    }

    const { error } = await supabase.from("saved_searches").insert({
      user_id: user.id,
      name: body.name,
      filters: body.filters ?? {},
    });

    if (error) {
      throw error;
    }

    return res.status(200).json({ ok: true, type: "search" });
  } catch (error) {
    console.error("[api/inspiration/save] Error:", error);
    return res.status(500).json({ ok: false, error: (error as Error).message });
  }
}
