import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

type UpdateSearchRequest = {
  searchId: string;
  name?: string;
  filters?: {
    query?: string;
    platform?: string;
    tags?: string[];
  };
};

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
  const supabase = getSupabaseAdminClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return res.status(401).json({ error: "Sesión inválida" });
  }

  const body = req.body as UpdateSearchRequest;

  if (!body.searchId) {
    return res.status(400).json({ error: "searchId es requerido" });
  }

  if (!body.name && !body.filters) {
    return res.status(400).json({ error: "Debes proporcionar al menos un campo para actualizar" });
  }

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

    if (body.filters) {
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
