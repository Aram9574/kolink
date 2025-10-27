import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { limiter } from "@/lib/rateLimiter";

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

  // Rate limiting: 30 schedules cada 60 segundos por usuario
  try {
    const { success, reset } = await limiter.limit(`calendar_schedule_${user.id}`);

    if (!success) {
      res.setHeader("Retry-After", Math.ceil(reset / 1000));
      return res.status(429).json({
        error: "Demasiadas programaciones. Intenta de nuevo más tarde.",
        retryAfter: Math.ceil(reset / 1000),
      });
    }
  } catch (error) {
    console.error("❌ Error en rate limiter:", error);
    // Continuar sin rate limiting si hay error
  }

  const body = req.body as ScheduleRequest;
  if (!body.platforms || body.platforms.length === 0) {
    return res.status(400).json({ error: "Selecciona al menos una plataforma." });
  }

  // Get best time recommendation based on user's historical data
  const recommendation = await computeRecommendationWithAnalytics(
    user.id,
    body.datetime,
    body.timezone ?? "UTC",
    supabase
  );

  try {
    const { data, error } = await supabase
      .from("calendar_events")
      .insert({
        user_id: user.id,
        post_id: body.postId ?? null,
        scheduled_time: recommendation.scheduledAt.toISOString(),
        timezone: body.timezone ?? "UTC",
        content: "", // Will be filled later
        platform: body.platforms[0] || "linkedin",
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

async function computeRecommendationWithAnalytics(
  userId: string,
  preferredDate: string | undefined,
  timezone: string,
  supabase: ReturnType<typeof getSupabaseAdminClient>
) {
  try {
    // Get user's historical posts to analyze patterns
    const { data: posts } = await supabase
      .from("posts")
      .select("created_at, viral_score")
      .eq("user_id", userId)
      .not("viral_score", "is", null)
      .order("created_at", { ascending: false })
      .limit(50);

    // If user has historical data, analyze it
    if (posts && posts.length >= 3) {
      const bestSlot = analyzeBestTimeSlot(posts);
      const scheduledDate = preferredDate
        ? new Date(preferredDate)
        : getNextDateForSlot(bestSlot.hour, bestSlot.dayOfWeek);

      return {
        scheduledAt: scheduledDate,
        score: bestSlot.score,
        reason: {
          timezone,
          confidence: bestSlot.confidence,
          factors: [
            `Basado en ${posts.length} posts históricos`,
            `Mejor engagement ${getDayName(bestSlot.dayOfWeek)} a las ${bestSlot.hour}:00`,
            `Score promedio: ${bestSlot.score.toFixed(1)}`,
            bestSlot.confidence === "high"
              ? "Alta confianza (10+ posts en esta franja)"
              : "Confianza media (3-9 posts en esta franja)",
          ],
        },
      };
    }
  } catch (error) {
    console.error("Error analyzing historical data:", error);
  }

  // Fallback to default recommendation
  return computeDefaultRecommendation(preferredDate, timezone);
}

function analyzeBestTimeSlot(posts: Array<{ created_at: string; viral_score: number | null }>) {
  const patternMap = new Map<string, { totalScore: number; count: number }>();

  posts.forEach((post) => {
    if (!post.viral_score) return;

    const date = new Date(post.created_at);
    const hour = date.getHours();
    const dayOfWeek = date.getDay();
    const key = `${dayOfWeek}-${hour}`;

    const existing = patternMap.get(key) || { totalScore: 0, count: 0 };
    patternMap.set(key, {
      totalScore: existing.totalScore + post.viral_score,
      count: existing.count + 1,
    });
  });

  let bestSlot = { hour: 10, dayOfWeek: 2, score: 70, confidence: "low" as const };
  let maxAvgScore = 0;

  patternMap.forEach((value, key) => {
    const avgScore = value.totalScore / value.count;
    if (avgScore > maxAvgScore) {
      const [dayOfWeek, hour] = key.split("-").map(Number);
      maxAvgScore = avgScore;
      bestSlot = {
        hour,
        dayOfWeek,
        score: avgScore,
        confidence: value.count >= 10 ? "high" : value.count >= 5 ? "medium" : "low",
      };
    }
  });

  return bestSlot;
}

function getNextDateForSlot(hour: number, dayOfWeek: number): Date {
  const now = new Date();
  const result = new Date(now);

  // Set target time
  result.setHours(hour, 0, 0, 0);

  // Find next occurrence of target day
  const currentDay = result.getDay();
  const daysUntilTarget = (dayOfWeek - currentDay + 7) % 7;

  if (daysUntilTarget === 0 && now.getHours() >= hour) {
    // Target is today but time has passed, move to next week
    result.setDate(result.getDate() + 7);
  } else {
    result.setDate(result.getDate() + daysUntilTarget);
  }

  return result;
}

function getDayName(dayOfWeek: number): string {
  const days = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  return days[dayOfWeek];
}

function computeDefaultRecommendation(preferredDate: string | undefined, timezone: string) {
  const now = new Date();
  const baseDate = preferredDate ? new Date(preferredDate) : nextOptimalSlot(now);
  const reason = {
    timezone,
    confidence: "baseline" as const,
    factors: [
      "Estándares de la industria (LinkedIn research)",
      "Mayor interacción los martes y jueves 9-11 AM",
      "Competencia moderada en estas franjas",
      "Recomendación mejorada con más historial de posts",
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
