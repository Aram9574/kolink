import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

type CreateSearchRequest = {
  name: string;
  filters: {
    query?: string;
    platform?: string;
    tags?: string[];
  };
};

/**
 * POST /api/inspiration/searches/create
 * Save a new search query with filters
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
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

  const body = req.body as CreateSearchRequest;

  if (!body.name || body.name.trim().length === 0) {
    return res.status(400).json({ error: "El nombre de la búsqueda es requerido" });
  }

  if (!body.filters || Object.keys(body.filters).length === 0) {
    return res.status(400).json({ error: "Debes proporcionar al menos un filtro" });
  }

  try {
    const { data, error } = await supabase
      .from("saved_searches")
      .insert({
        user_id: user.id,
        name: body.name.trim(),
        filters: body.filters,
      })
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({
      ok: true,
      search: data,
    });
  } catch (error) {
    console.error("[api/inspiration/searches/create] Error:", error);
    return res.status(500).json({ error: "Error al guardar búsqueda" });
  }
}
