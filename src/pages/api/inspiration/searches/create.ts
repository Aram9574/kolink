import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseServerClient } from "@/lib/supabaseServerClient";
import { z } from "zod";

const baseFiltersSchema = z
  .object({
    query: z.string().trim().min(1).optional(),
    platform: z.string().trim().min(1).optional(),
    tags: z.array(z.string().trim().min(1)).max(20).optional(),
    contentTypes: z.array(z.string().trim().min(1)).max(10).optional(),
    format: z.string().trim().min(1).optional(),
    minLikes: z.number().int().min(0).max(1_000_000).optional(),
    period: z.string().trim().min(1).optional(),
    hashtags: z.array(z.string().trim().min(1)).max(20).optional(),
  })
  .partial();

const createSearchSchema = z.object({
  name: z.string().trim().min(1, "El nombre de la búsqueda es requerido").max(120),
  filters: baseFiltersSchema.refine(
    (filters) =>
      Object.values(filters).some((value) => {
        if (Array.isArray(value)) {
          return value.length > 0;
        }
        return value !== undefined && value !== "" && value !== null;
      }),
    {
      message: "Debes proporcionar al menos un filtro",
    }
  ),
});

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
  let supabase;
  try {
    supabase = getSupabaseServerClient(token);
  } catch (error) {
    console.error("[api/inspiration/searches/create] Supabase initialization error:", error);
    return res.status(500).json({ error: "Configuración de Supabase inválida" });
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return res.status(401).json({ error: "Sesión inválida" });
  }

  const parseResult = createSearchSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: "Datos inválidos",
      details: parseResult.error.flatten(),
    });
  }

  const body = parseResult.data;

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
