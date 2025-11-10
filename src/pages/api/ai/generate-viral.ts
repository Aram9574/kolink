import { logger } from '@/lib/logger';
import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/lib/supabase";
import {
  generateViralContent,
  findViralInspiration,
  analyzeContent,
  improveContent,
  generateViralHook,
  type GenerationContext,
} from "@/lib/ai/linkedinContentStrategist";

/**
 * AI Generate Viral Content Endpoint
 * Sistema completo de generación de contenido viral para LinkedIn
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
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

    // 2. Extraer parámetros
    const {
      topic,
      tone,
      objective,
      target_length,
      include_cta,
      mode = 'generate', // 'generate' | 'improve' | 'analyze' | 'hooks'
      existing_content,
      feedback,
    } = req.body;

    if (!topic && !existing_content) {
      return res.status(400).json({
        error: "Se requiere 'topic' para generar o 'existing_content' para mejorar",
      });
    }

    // 3. Obtener perfil del usuario
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      logger.error("Profile error:", profileError);
      return res.status(404).json({
        error: "Profile not found",
        details: profileError?.message
      });
    }

    // 4. Verificar créditos
    if (profile.credits <= 0) {
      return res.status(403).json({
        error: "No tienes créditos suficientes",
        credits_remaining: 0,
      });
    }

    // 5. Obtener muestras de escritura del usuario
    const { data: writingSamples } = await supabase
      .from("writing_samples")
      .select("content")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    const userWritingSamples = writingSamples?.map(s => s.content) || [];

    // 6. Ejecutar según el modo solicitado
    let result: Record<string, unknown> = {};

    switch (mode) {
      case 'hooks':
        // Generar solo hooks virales
        const hooks = await generateViralHook(
          topic,
          objective || 'engagement',
          profile.writing_style_profile?.style_description
        );
        result = {
          mode: 'hooks',
          hooks,
          topic,
        };
        break;

      case 'analyze':
        // Analizar contenido existente
        if (!existing_content) {
          return res.status(400).json({
            error: "Se requiere 'existing_content' para análisis",
          });
        }
        const analysis = await analyzeContent(existing_content);
        result = {
          mode: 'analyze',
          analysis,
          original_content: existing_content,
        };
        break;

      case 'improve':
        // Mejorar contenido existente
        if (!existing_content) {
          return res.status(400).json({
            error: "Se requiere 'existing_content' para mejorar",
          });
        }
        const improved = await improveContent(
          existing_content,
          feedback,
          profile.writing_style_profile?.style_description
        );
        const improvementAnalysis = await analyzeContent(improved);
        result = {
          mode: 'improve',
          original_content: existing_content,
          improved_content: improved,
          analysis: improvementAnalysis,
        };
        break;

      case 'generate':
      default:
        // Generación completa con todo el sistema

        // 6.1 Buscar inspiración viral
        const viralInspiration = await findViralInspiration(topic, 3);

        // 6.2 Preparar contexto completo
        const context: GenerationContext = {
          user_id: user.id,
          topic,
          tone,
          objective,
          target_length,
          include_cta,
          user_writing_samples: userWritingSamples,
          viral_inspiration: viralInspiration,
        };

        // 6.3 Generar contenido viral
        const generatedContent = await generateViralContent(context);

        // 6.4 Analizar el contenido generado
        const contentAnalysis = await analyzeContent(generatedContent);

        result = {
          mode: 'generate',
          content: generatedContent,
          analysis: contentAnalysis,
          context: {
            topic,
            tone,
            objective,
            target_length,
            inspiration_patterns: viralInspiration.map(v => v.pattern_type),
          },
        };

        // 6.5 Guardar el post generado
        const { error: insertError } = await supabase.from("posts").insert({
          user_id: user.id,
          prompt: topic,
          generated_text: generatedContent,
          metadata: {
            tone,
            objective,
            target_length,
            analysis: contentAnalysis,
            viral_score: contentAnalysis.estimated_viral_score,
          },
        });

        if (insertError) {
          logger.error("Error saving generated post:", insertError);
        }

        // 6.6 Registrar comportamiento
        await supabase.from("user_behaviors").insert({
          user_id: user.id,
          behavior_type: "post_generated_viral",
          context: {
            topic,
            objective,
            viral_score: contentAnalysis.estimated_viral_score,
          },
          metadata: {
            mode: 'generate',
            had_writing_samples: userWritingSamples.length > 0,
          },
        });

        break;
    }

    // 7. Deducir crédito (solo para generate e improve)
    if (mode === 'generate' || mode === 'improve') {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ credits: profile.credits - 1 })
        .eq("id", user.id);

      if (updateError) {
        logger.error("Error updating credits:", updateError);
      }
    }

    // 8. Responder
    return res.status(200).json({
      success: true,
      ...result,
      credits_remaining: mode === 'generate' || mode === 'improve'
        ? profile.credits - 1
        : profile.credits,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Error in AI viral generation:", error);
    return res.status(500).json({
      error: "Error al generar contenido",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
