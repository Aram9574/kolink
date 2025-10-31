import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseServerClient } from "@/lib/supabaseServerClient";

/**
 * GET /api/inspiration/searches/list
 * List all saved searches for the authenticated user
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
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
    console.error("[api/inspiration/searches/list] Supabase initialization error:", error);
    return res.status(500).json({ error: "Configuración de Supabase inválida" });
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return res.status(401).json({ error: "Sesión inválida" });
  }

  try {
    const { data, error } = await supabase
      .from("saved_searches")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) throw error;

    return res.status(200).json({
      ok: true,
      searches: data || [],
    });
  } catch (error) {
    console.error("[api/inspiration/searches/list] Error:", error);
    return res.status(500).json({ error: "Error al cargar búsquedas guardadas" });
  }
}
