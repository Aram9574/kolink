import { logger } from '@/lib/logger';
import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/lib/supabase";
import { openai } from "@/lib/openai";

/**
 * Analyze Audience Endpoint
 * Analiza la audiencia del usuario basándose en sus posts y engagement
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // 1. Autenticación
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // 2. Obtener posts del usuario con métricas
    const { data: posts, error: postsError } = await supabase
      .from("posts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (postsError) {
      logger.error("Error fetching posts:", postsError);
      return res.status(500).json({ error: "Error al obtener posts" });
    }

    if (!posts || posts.length === 0) {
      return res.status(200).json({
        success: true,
        insights: {
          message: "Aún no tienes suficientes datos para análisis de audiencia",
          suggestion: "Genera y publica más contenido para obtener insights",
        },
      });
    }

    // 3. Obtener comportamientos del usuario
    const { data: behaviors } = await supabase
      .from("user_behaviors")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    // 4. Obtener feedback de contenido si existe
    const { data: feedback } = await supabase
      .from("content_feedback")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    // 5. Preparar datos para análisis con IA
    const postsWithEngagement = posts
      .filter(p => p.metadata?.engagement)
      .map(p => ({
        content: p.generated_text?.substring(0, 200) + "...",
        likes: p.metadata?.engagement?.likes || 0,
        comments: p.metadata?.engagement?.comments || 0,
        shares: p.metadata?.engagement?.shares || 0,
        impressions: p.metadata?.engagement?.impressions || 0,
        topic: p.prompt,
      }));

    const engagementPatterns = behaviors
      ?.filter(b => b.behavior_type.includes('post_'))
      .reduce((acc: { hours?: Record<number, number>; days?: Record<number, number> }, b) => {
        const hour = new Date(b.created_at).getHours();
        const dayOfWeek = new Date(b.created_at).getDay();
        acc.hours = acc.hours || {};
        acc.days = acc.days || {};
        acc.hours[hour] = (acc.hours[hour] || 0) + 1;
        acc.days[dayOfWeek] = (acc.days[dayOfWeek] || 0) + 1;
        return acc;
      }, {});

    // 6. Usar IA para análisis profundo
    const analysisPrompt = `Analiza estos datos de engagement de posts en LinkedIn y proporciona insights accionables:

POSTS CON ENGAGEMENT:
${postsWithEngagement.slice(0, 10).map((p, i) =>
  `${i + 1}. Tema: ${p.topic}
   Likes: ${p.likes}, Comentarios: ${p.comments}, Compartidos: ${p.shares}
   Impresiones: ${p.impressions}`
).join('\n\n')}

PATRONES DE ACTIVIDAD:
${JSON.stringify(engagementPatterns, null, 2)}

FEEDBACK DE AUDIENCIA:
${feedback?.slice(0, 5).map(f => `- ${f.feedback_type}: ${f.content}`).join('\n') || 'No hay feedback aún'}

Proporciona un análisis en formato JSON con esta estructura:
{
  "engagement_patterns": {
    "best_posting_times": ["hora1", "hora2"],
    "preferred_content_types": ["tipo1", "tipo2"],
    "avg_engagement_rate": <número>,
    "insights": ["insight1", "insight2", "insight3"]
  },
  "audience_demographics": {
    "likely_industries": ["industria1", "industria2"],
    "seniority_levels": ["nivel1", "nivel2"],
    "common_interests": ["interés1", "interés2"],
    "insights": ["insight1", "insight2"]
  },
  "content_recommendations": {
    "topics_to_explore": ["tema1", "tema2", "tema3"],
    "formats_to_try": ["formato1", "formato2"],
    "tone_suggestions": "descripción del tono recomendado",
    "cta_strategies": ["estrategia1", "estrategia2"]
  },
  "growth_opportunities": [
    "oportunidad1",
    "oportunidad2",
    "oportunidad3"
  ]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Eres un analista experto de audiencias en LinkedIn. Proporcionas insights específicos y accionables basados en datos reales de engagement.",
        },
        { role: "user", content: analysisPrompt },
      ],
      temperature: 0.3,
      max_tokens: 1500,
      response_format: { type: "json_object" },
    });

    const insights = JSON.parse(response.choices[0].message.content || "{}");

    // 7. Guardar análisis en el perfil
    await supabase
      .from("profiles")
      .update({
        writing_style_profile: {
          ...{ audience_insights: insights },
          last_analysis: new Date().toISOString(),
        },
      })
      .eq("id", user.id);

    // 8. Registrar comportamiento
    await supabase.from("user_behaviors").insert({
      user_id: user.id,
      behavior_type: "audience_analyzed",
      context: {
        posts_analyzed: posts.length,
        engagement_data_points: postsWithEngagement.length,
      },
    });

    // 9. Responder
    return res.status(200).json({
      success: true,
      insights,
      data_summary: {
        total_posts: posts.length,
        posts_with_engagement: postsWithEngagement.length,
        behaviors_analyzed: behaviors?.length || 0,
        feedback_count: feedback?.length || 0,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Error analyzing audience:", error);
    return res.status(500).json({
      error: "Error al analizar audiencia",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
