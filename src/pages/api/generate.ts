import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { openai } from "@/lib/openai";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: "Prompt requerido" });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: req.headers.authorization || "",
      },
    },
  });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return res.status(401).json({ error: "Usuario no autenticado" });
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select("credits, plan")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return res.status(400).json({ error: "Perfil no encontrado" });
  }

  if (profile.credits <= 0) {
    return res.status(402).json({
      error: "Sin créditos disponibles. Actualiza tu plan para continuar.",
      plan: profile.plan,
    });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });

    const output = completion.choices[0].message.content;

    const remainingCredits = profile.credits - 1;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ credits: remainingCredits })
      .eq("id", user.id);

    if (updateError) {
      console.error("Credit update error:", updateError);
      return res.status(500).json({ error: updateError.message });
    }

    const { error: insertError } = await supabase.from("posts").insert({
      prompt,
      generated_text: output,
      user_id: user.id,
    });

    if (insertError) {
      console.error("Insert error:", insertError);
      return res.status(500).json({ error: insertError.message });
    }

    return res.status(200).json({ ok: true, output, remainingCredits, plan: profile.plan });
  } catch (error) {
    const err = error as Error;
    return res.status(500).json({ ok: false, error: err.message });
  }
}
