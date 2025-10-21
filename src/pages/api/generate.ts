import type { NextApiRequest, NextApiResponse } from "next";
import { openai } from "@/lib/openai";
import { supabase } from "@/lib/supabase";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "Falta el prompt" });
  }

  try {
    // Generar el texto con OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });

    const output = completion.choices[0].message.content;

    // 👇 Guardar el resultado en Supabase
    const { error } = await supabase.from("posts").insert({
      prompt,
      generated_text: output,
    });

    if (error) throw error;

    // Responder al cliente
    return res.status(200).json({ ok: true, output });
  } catch (error: any) {
    return res.status(500).json({ ok: false, error: error.message });
  }
}
