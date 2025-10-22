import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

type ScheduleRequest = {
  postId?: string;
  datetime?: string;
  platforms: string[];
  timezone?: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "No autorizado" });
  }

  const token = authHeader.replace("Bearer ", "");
  const supabase = getSupabaseAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser(token);

  if (!user) {
    return res.status(401).json({ error: "Sesión inválida" });
  }

  const body = req.body as ScheduleRequest;
  if (!body.platforms || body.platforms.length === 0) {
    return res.status(400).json({ error: "Selecciona al menos una plataforma." });
  }

  const recommendation = computeRecommendation(body.datetime, body.timezone ?? "UTC");

  try {
    const { data, error } = await supabase
      .from("calendar_events")
      .insert({
        user_id: user.id,
        post_id: body.postId ?? null,
        scheduled_at: recommendation.scheduledAt.toISOString(),
        platforms: body.platforms,
        ai_score: recommendation.score,
        recommendation_reason: recommendation.reason,
        status: "scheduled",
      })
      .select("*")
      .single();

    if (error) throw error;

    return res.status(200).json({
      ok: true,
      event: data,
      recommendation: {
        scheduledAt: recommendation.scheduledAt.toISOString(),
        score: recommendation.score,
        reason: recommendation.reason,
      },
    });
  } catch (error) {
    console.error("[api/calendar/schedule] Error:", error);
    return res.status(500).json({ ok: false, error: (error as Error).message });
  }
}

function computeRecommendation(preferredDate: string | undefined, timezone: string) {
  const now = new Date();
  const baseDate = preferredDate ? new Date(preferredDate) : nextOptimalSlot(now);
  const reason = {
    timezone,
    confidence: "baseline",
    factors: [
      "Historial general de engagement en la mañana",
      "Mayor interacción los martes y jueves",
      "Competencia moderada en la franja 09:00 - 11:00",
    ],
  };

  return {
    scheduledAt: baseDate,
    score: 72.5,
    reason,
  };
}

function nextOptimalSlot(reference: Date) {
  const result = new Date(reference);
  result.setSeconds(0, 0);

  // Move to next weekday morning slot at 10:00
  result.setHours(10, 0, 0, 0);
  if (reference.getHours() >= 10) {
    result.setDate(result.getDate() + 1);
  }

  // Skip weekends
  while (result.getDay() === 0 || result.getDay() === 6) {
    result.setDate(result.getDate() + 1);
  }

  return result;
}
