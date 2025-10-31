import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseServerClient } from "@/lib/supabaseServerClient";

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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseSaveRequest(body: unknown): SaveRequest {
  if (!isPlainObject(body) || typeof body.type !== "string") {
    throw new Error("Formato inválido en la petición.");
  }

  if (body.type === "post") {
    if (typeof body.inspirationPostId !== "string" || body.inspirationPostId.trim().length === 0) {
      throw new Error("inspirationPostId es requerido.");
    }

    const metadata = isPlainObject(body.metadata) ? body.metadata : undefined;

    return {
      type: "post",
      inspirationPostId: body.inspirationPostId,
      note: typeof body.note === "string" ? body.note : undefined,
      metadata,
    };
  }

  if (body.type === "search") {
    if (typeof body.name !== "string" || body.name.trim().length === 0) {
      throw new Error("El nombre de la búsqueda es requerido.");
    }

    if (!isPlainObject(body.filters)) {
      throw new Error("filters debe ser un objeto.");
    }

    return {
      type: "search",
      name: body.name,
      filters: body.filters,
    };
  }

  throw new Error("Tipo de guardado inválido.");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "No autorizado" });
  }

  const token = authHeader.replace("Bearer ", "");
  let supabase;

  try {
    supabase = getSupabaseServerClient(token);
  } catch (error) {
    console.error("[api/inspiration/save] Supabase initialization error:", error);
    return res.status(500).json({ error: "Configuración de Supabase inválida." });
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  if (userError) {
    console.error("[api/inspiration/save] Error obteniendo usuario:", userError);
    return res.status(401).json({ error: "Sesión inválida" });
  }

  if (!user) {
    return res.status(401).json({ error: "Sesión inválida" });
  }

  let body: SaveRequest;

  try {
    body = parseSaveRequest(req.body);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Datos inválidos";
    return res.status(400).json({ error: message });
  }

  try {
    // If type is post, save as post
    if (body.type === "post") {
      // Check if already saved
      const { data: existing } = await supabase
        .from("saved_posts")
        .select("id")
        .eq("user_id", user.id)
        .eq("inspiration_post_id", body.inspirationPostId)
        .maybeSingle();

      if (existing) {
        return res.status(200).json({ ok: true, type: "post", message: "Post ya estaba guardado" });
      }

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

    // Otherwise, save as search
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
