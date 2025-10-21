import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/lib/supabase";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { data, error } = await supabase.from("posts").select("*").limit(1);
  if (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
  res.status(200).json({ ok: true, data });
}

