import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

/**
 * DELETE /api/inspiration/searches/delete
 * Delete a saved search by ID
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "DELETE") {
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

  const { searchId } = req.query;

  if (!searchId || typeof searchId !== "string") {
    return res.status(400).json({ error: "searchId es requerido" });
  }

  try {
    // Verify ownership before deleting
    const { data: existingSearch, error: fetchError } = await supabase
      .from("saved_searches")
      .select("id")
      .eq("id", searchId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (!existingSearch) {
      return res.status(404).json({ error: "Búsqueda no encontrada" });
    }

    const { error: deleteError } = await supabase
      .from("saved_searches")
      .delete()
      .eq("id", searchId)
      .eq("user_id", user.id);

    if (deleteError) throw deleteError;

    return res.status(200).json({
      ok: true,
      message: "Búsqueda eliminada exitosamente",
    });
  } catch (error) {
    console.error("[api/inspiration/searches/delete] Error:", error);
    return res.status(500).json({ error: "Error al eliminar búsqueda" });
  }
}
