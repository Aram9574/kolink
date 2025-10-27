import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

/**
 * Engagement Pattern Analysis API
 *
 * Analyzes historical post data to identify optimal posting times
 * Returns engagement patterns by hour and day of week
 */

type EngagementPattern = {
  hourOfDay: number;
  dayOfWeek: number;
  avgViralScore: number;
  postCount: number;
};

type BestTimeSlot = {
  hour: number;
  dayOfWeek: number;
  score: number;
  confidence: "high" | "medium" | "low";
  sampleSize: number;
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
  } = await supabase.auth.getUser(token);

  if (!user) {
    return res.status(401).json({ error: "Sesión inválida" });
  }

  try {
    // Get user's historical posts with viral scores
    const { data: posts, error } = await supabase
      .from("posts")
      .select("created_at, viral_score")
      .eq("user_id", user.id)
      .not("viral_score", "is", null)
      .order("created_at", { ascending: false })
      .limit(100); // Analyze last 100 posts

    if (error) throw error;

    // If not enough data, return industry defaults
    if (!posts || posts.length < 5) {
      return res.status(200).json({
        hasData: false,
        bestTimes: getIndustryDefaults(),
        message: "Necesitas al menos 5 posts con viral score para análisis personalizado",
      });
    }

    // Analyze patterns by hour and day
    const patterns = analyzeEngagementPatterns(posts);

    // Find top 3 best time slots
    const bestTimes = patterns
      .sort((a, b) => b.avgViralScore - a.avgViralScore)
      .slice(0, 3)
      .map((pattern) => ({
        hour: pattern.hourOfDay,
        dayOfWeek: pattern.dayOfWeek,
        score: pattern.avgViralScore,
        confidence: getConfidenceLevel(pattern.postCount),
        sampleSize: pattern.postCount,
      }));

    return res.status(200).json({
      hasData: true,
      bestTimes,
      totalPostsAnalyzed: posts.length,
      patterns: patterns.slice(0, 10), // Top 10 patterns
    });
  } catch (error) {
    console.error("[api/analytics/engagement-pattern] Error:", error);
    return res.status(500).json({ error: "Error analyzing engagement patterns" });
  }
}

function analyzeEngagementPatterns(
  posts: Array<{ created_at: string; viral_score: number | null }>
): EngagementPattern[] {
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

  return Array.from(patternMap.entries()).map(([key, value]) => {
    const [dayOfWeek, hourOfDay] = key.split("-").map(Number);
    return {
      hourOfDay,
      dayOfWeek,
      avgViralScore: value.totalScore / value.count,
      postCount: value.count,
    };
  });
}

function getConfidenceLevel(sampleSize: number): "high" | "medium" | "low" {
  if (sampleSize >= 10) return "high";
  if (sampleSize >= 5) return "medium";
  return "low";
}

function getIndustryDefaults(): BestTimeSlot[] {
  // Based on LinkedIn engagement research
  return [
    {
      hour: 10,
      dayOfWeek: 2, // Tuesday
      score: 75,
      confidence: "medium",
      sampleSize: 0,
    },
    {
      hour: 9,
      dayOfWeek: 4, // Thursday
      score: 73,
      confidence: "medium",
      sampleSize: 0,
    },
    {
      hour: 14,
      dayOfWeek: 3, // Wednesday
      score: 70,
      confidence: "medium",
      sampleSize: 0,
    },
  ];
}
