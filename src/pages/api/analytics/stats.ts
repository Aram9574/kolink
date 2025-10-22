import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

type AnalyticsResponse = {
  totals: {
    totalPosts: number;
    creditsUsed: number;
    currentCredits: number;
    plan: string | null;
    daysActive: number;
    lastActivity: string | null;
  };
  performance: {
    postsThisWeek: number;
    postsThisMonth: number;
    avgViralScore: number | null;
    topHashtags: string[];
    bestPost?: {
      id: string;
      content: string;
      viralScore: number | null;
      createdAt: string;
    };
  };
  forecast: {
    nextBestSlot: string;
    predictedEngagementLift: number;
  };
  alerts: string[];
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
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
    error: userError,
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return res.status(401).json({ error: "Sesión inválida" });
  }

  try {
    const [profileResult, postAggregate, weekCount, monthCount, lastPostResult, topPostResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("plan, credits, created_at")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("posts")
        .select("viral_score", { count: "exact", head: true })
        .eq("user_id", user.id),
      countPostsSince(supabase, user.id, 7),
      countPostsSince(supabase, user.id, 30),
      supabase
        .from("posts")
        .select("created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("posts")
        .select("id, content, viral_score, created_at")
        .eq("user_id", user.id)
        .order("viral_score", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const totalPosts = postAggregate.count ?? 0;
    const avgViralScore = await computeAverageViralScore(supabase, user.id);
    const topHashtags = await fetchTopHashtags(supabase, user.id);

    const profile = profileResult.data;
    const initialCredits = determineInitialCredits(profile?.plan ?? "free");
    const creditsUsed = Math.max(0, initialCredits - (profile?.credits ?? 0));
    const createdAt = profile?.created_at ? new Date(profile.created_at) : null;
    const daysActive = createdAt ? Math.max(1, Math.ceil((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24))) : 0;

    const nextSlot = new Date();
    nextSlot.setDate(nextSlot.getDate() + 1);
    nextSlot.setHours(10, 0, 0, 0);

    const response: AnalyticsResponse = {
      totals: {
        totalPosts,
        creditsUsed,
        currentCredits: profile?.credits ?? 0,
        plan: profile?.plan ?? "free",
        daysActive,
        lastActivity: lastPostResult.data?.created_at ?? null,
      },
      performance: {
        postsThisWeek: weekCount,
        postsThisMonth: monthCount,
        avgViralScore,
        topHashtags,
        bestPost: topPostResult.data
          ? {
              id: topPostResult.data.id,
              content: topPostResult.data.content,
              viralScore: topPostResult.data.viral_score,
              createdAt: topPostResult.data.created_at,
            }
          : undefined,
      },
      forecast: {
        nextBestSlot: nextSlot.toISOString(),
        predictedEngagementLift: Math.max(5, Math.round((avgViralScore ?? 60) * 0.15)),
      },
      alerts: buildAlerts(creditsUsed, profile?.credits ?? 0, avgViralScore),
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error("[api/analytics/stats] Error:", error);
    return res.status(500).json({ error: "No se pudieron obtener las estadísticas" });
  }
}

async function countPostsSince(supabase: ReturnType<typeof getSupabaseAdminClient>, userId: string, days: number) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { count } = await supabase
    .from("posts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since.toISOString());

  return count ?? 0;
}

async function computeAverageViralScore(supabase: ReturnType<typeof getSupabaseAdminClient>, userId: string) {
  const { data, error } = await supabase.rpc("avg_viral_score_for_user", { p_user_id: userId });

  if (error) {
    // Fallback if RPC not yet created
    const { data: posts } = await supabase.from("posts").select("viral_score").eq("user_id", userId);
    if (!posts || posts.length === 0) return null;
    const sum = posts.reduce((acc, post) => acc + (Number(post.viral_score) || 0), 0);
    return Math.round((sum / posts.length) * 100) / 100;
  }

  return data;
}

async function fetchTopHashtags(supabase: ReturnType<typeof getSupabaseAdminClient>, userId: string) {
  const { data } = await supabase
    .from("posts")
    .select("hashtags")
    .eq("user_id", userId)
    .not("hashtags", "is", null)
    .limit(100);

  if (!data) return [];
  const frequency = new Map<string, number>();

  data.forEach((row) => {
    (row.hashtags ?? []).forEach((tag: string) => {
      const count = frequency.get(tag) ?? 0;
      frequency.set(tag, count + 1);
    });
  });

  return Array.from(frequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag]) => tag);
}

function determineInitialCredits(plan: string) {
  const map: Record<string, number> = {
    free: 10,
    basic: 50,
    standard: 200,
    premium: 500,
  };
  return map[plan.toLowerCase()] ?? 10;
}

function buildAlerts(creditsUsed: number, creditsRemaining: number, avgScore: number | null) {
  const alerts: string[] = [];
  if (creditsRemaining < 10) {
    alerts.push("Tus créditos están por agotarse. Considera actualizar tu plan.");
  }
  if (avgScore !== null && avgScore < 55) {
    alerts.push("El puntaje viral promedio bajó esta semana. Revisa el módulo de inspiración para nuevas ideas.");
  }
  if (creditsUsed > 0 && creditsRemaining / (creditsRemaining + creditsUsed) < 0.25) {
    alerts.push("Has utilizado más del 75% de tus créditos del mes.");
  }
  return alerts;
}
