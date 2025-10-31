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

const hasFilterValues = (filters?: z.infer<typeof baseFiltersSchema>) =>
  !!filters &&
  Object.values(filters).some((value) => {
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    return value !== undefined && value !== "" && value !== null;
  });

const updateSearchSchema = z
  .object({
    searchId: z.string().uuid(),
    name: z.string().trim().min(1).max(120).optional(),
    filters: baseFiltersSchema.optional(),
  })
  .refine((values) => {
    const hasName = Boolean(values.name);
    const hasFilters = hasFilterValues(values.filters);
    return hasName || hasFilters;
  }, {
    message: "Debes proporcionar al menos un campo para actualizar",
    path: ["name"],
  });

/**
 * PUT /api/inspiration/searches/update
 * Update an existing saved search
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PUT") {
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
    console.error("[api/inspiration/searches/update] Supabase initialization error:", error);
    return res.status(500).json({ error: "Configuración de Supabase inválida" });
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return res.status(401).json({ error: "Sesión inválida" });
  }

  const parseResult = updateSearchSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: "Datos inválidos",
      details: parseResult.error.flatten(),
    });
  }

  const body = parseResult.data;

  try {
    // Verify ownership before updating
    const { data: existingSearch, error: fetchError } = await supabase
      .from("saved_searches")
      .select("id")
      .eq("id", body.searchId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (!existingSearch) {
      return res.status(404).json({ error: "Búsqueda no encontrada" });
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.name) {
      updateData.name = body.name.trim();
    }

    if (body.filters && hasFilterValues(body.filters)) {
      updateData.filters = body.filters;
    }

    const { data, error: updateError } = await supabase
      .from("saved_searches")
      .update(updateData)
      .eq("id", body.searchId)
      .eq("user_id", user.id)
      .select()
      .single();

    if (updateError) throw updateError;

    return res.status(200).json({
      ok: true,
      search: data,
    });
  } catch (error) {
    console.error("[api/inspiration/searches/update] Error:", error);
    return res.status(500).json({ error: "Error al actualizar búsqueda" });
  }
}
