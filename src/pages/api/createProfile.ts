import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { rateLimit, RATE_LIMIT_CONFIGS } from "@/lib/rateLimit";
import { z } from "zod";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  // Apply rate limiting (AUTH config: 5 requests per 5 minutes)
  const rateLimitResult = await rateLimit(req, res, RATE_LIMIT_CONFIGS.AUTH);
  if (!rateLimitResult.allowed) return;

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const bodySchema = z.object({
    user: z.object({
      id: z.string().uuid("ID de usuario inválido"),
      email: z.string().email().nullable().optional(),
    }),
  });

  const parseResult = bodySchema.safeParse(req.body);

  if (!parseResult.success) {
    return res.status(400).json({
      error: "Usuario no proporcionado o inválido",
      details: parseResult.error.flatten(),
    });
  }

  const { user } = parseResult.data;

  const { error } = await supabase.from("profiles").insert([
    {
      id: user.id,
      full_name: user.email ?? "",
      plan: "free",
      credits: 10,
    },
  ]);

  if (error) {
    console.error("Error al crear perfil:", error.message);
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ success: true });
}
