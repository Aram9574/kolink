import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/lib/supabase";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Smart AI Generation
 * Generates content using learned user preferences and writing style
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const startTime = Date.now();

  try {
    const { prompt, tone, formality, length_target } = req.body;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    // Get user from auth header
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

    // Get user profile with preferences
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select(
        "credits, plan, preferred_language, writing_style_profile, linkedin_profile_data"
      )
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    if (profile.credits <= 0) {
      return res.status(402).json({
        error: "No credits remaining. Please upgrade your plan.",
      });
    }

    // Get user's writing samples
    const { data: writingSamples } = await supabase
      .from("writing_samples")
      .select("content, tone, detected_style")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    // Get user preferences
    const { data: preferences } = await supabase
      .from("user_preferences")
      .select("preference_type, preference_value, confidence_score")
      .eq("user_id", user.id)
      .gte("confidence_score", 0.3)
      .order("confidence_score", { ascending: false })
      .limit(20);

    // Get top viral content from library for inspiration
    const { data: viralContent } = await supabase
      .from("viral_content_library")
      .select("content, detected_patterns, viral_score")
      .eq("language", profile.preferred_language?.split("-")[0] || "es")
      .order("viral_score", { ascending: false })
      .limit(5);

    // Build context-aware system prompt
    let systemPrompt = `Eres un experto en crear contenido viral para LinkedIn. Tu objetivo es generar posts que maximicen el engagement.

CARACTERÍSTICAS DEL POST:
- Idioma: ${profile.preferred_language || "Español"}
- Tono: ${tone || "profesional"}
- Nivel de formalidad: ${formality || 50}/100
- Longitud objetivo: ${length_target || 200} palabras`;

    // Add user's LinkedIn profile context
    if (profile.linkedin_profile_data && profile.linkedin_profile_data.headline) {
      systemPrompt += `\n\nPERFIL DEL USUARIO:
- Título: ${profile.linkedin_profile_data.headline}`;
      if (profile.linkedin_profile_data.description) {
        systemPrompt += `\n- Bio: ${profile.linkedin_profile_data.description.substring(0, 200)}`;
      }
    }

    // Add writing style analysis
    if (writingSamples && writingSamples.length > 0) {
      systemPrompt += `\n\nESTILO DE ESCRITURA DEL USUARIO:
Analiza estos ejemplos previos del usuario y replica su estilo personal:

`;
      writingSamples.slice(0, 3).forEach((sample, i) => {
        systemPrompt += `\nEjemplo ${i + 1}:\n${sample.content.substring(0, 300)}...\n`;
      });

      systemPrompt += `\nCaracterísticas del estilo:
- Mantén la voz y personalidad única del usuario
- Usa vocabulario y expresiones similares
- Respeta la estructura de párrafos preferida`;
    }

    // Add learned preferences
    if (preferences && preferences.length > 0) {
      const topicPreferences = preferences.filter(
        (p) => p.preference_type === "content_topic"
      );
      const hashtagPreferences = preferences.filter(
        (p) => p.preference_type === "hashtag_preference"
      );

      if (topicPreferences.length > 0) {
        systemPrompt += `\n\nTEMAS DE INTERÉS DEL USUARIO: ${topicPreferences
          .map((p) => p.preference_value)
          .join(", ")}`;
      }

      if (hashtagPreferences.length > 0) {
        systemPrompt += `\n\nHASHTAGS PREFERIDOS: ${hashtagPreferences
          .slice(0, 5)
          .map((p) => p.preference_value)
          .join(", ")}`;
      }
    }

    // Add viral patterns
    if (viralContent && viralContent.length > 0) {
      systemPrompt += `\n\nPATRONES VIRALES A APLICAR:`;

      const patterns = new Set<string>();
      viralContent.forEach((content) => {
        if (content.detected_patterns) {
          Object.keys(content.detected_patterns).forEach((pattern) => {
            patterns.add(pattern);
          });
        }
      });

      if (patterns.has("hook_pattern")) {
        systemPrompt += `\n- Usa un hook inicial impactante (pregunta, estadística, afirmación controversial)`;
      }
      if (patterns.has("numbered_list")) {
        systemPrompt += `\n- Considera usar listas numeradas para claridad`;
      }
      if (patterns.has("personal_story")) {
        systemPrompt += `\n- Incluye elementos de storytelling personal cuando sea relevante`;
      }
      if (patterns.has("specific_numbers")) {
        systemPrompt += `\n- Usa datos y números específicos para credibilidad`;
      }

      systemPrompt += `\n\nEjemplos de contenido viral:\n`;
      viralContent.slice(0, 2).forEach((content, i) => {
        systemPrompt += `\nEjemplo ${i + 1} (Score: ${content.viral_score}):\n${content.content.substring(0, 250)}...\n`;
      });
    }

    systemPrompt += `\n\nINSTRUCCIONES FINALES:
1. Genera contenido original basado en el prompt del usuario
2. Aplica el estilo de escritura aprendido del usuario
3. Incorpora patrones virales probados
4. Mantén autenticidad y coherencia con el perfil del usuario
5. Optimiza para máximo engagement en LinkedIn
6. Incluye emojis estratégicamente (no más de 3-4)
7. Termina con una pregunta o CTA para fomentar interacción

NO copies literalmente los ejemplos. Úsalos como guía de estilo y estructura.`;

    // Generate content with OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Genera un post sobre: ${prompt}`,
        },
      ],
      temperature: 0.8,
      max_tokens: Math.min((length_target || 200) * 5, 2000),
    });

    const generatedText = completion.choices[0]?.message?.content;

    if (!generatedText) {
      return res.status(500).json({ error: "Failed to generate content" });
    }

    const generationTime = Date.now() - startTime;

    // Calculate viral score prediction
    const viralScore = Math.floor(Math.random() * 100) + 50; // Placeholder - will be replaced with actual prediction model

    // Save post to database
    const { data: post, error: postError } = await supabase
      .from("posts")
      .insert({
        user_id: user.id,
        prompt: prompt.trim(),
        generated_text: generatedText,
        viral_score: viralScore,
        status: "draft",
        tone: tone || "professional",
        formality: formality || 50,
        length_target: length_target || 200,
        metadata: {
          used_writing_samples: writingSamples?.length || 0,
          used_preferences: preferences?.length || 0,
          used_viral_patterns: viralContent?.length || 0,
          generation_time_ms: generationTime,
        },
      })
      .select()
      .single();

    if (postError || !post) {
      console.error("Error saving post:", postError);
      return res.status(500).json({ error: "Failed to save post" });
    }

    // Deduct credit
    const { error: creditError } = await supabase
      .from("profiles")
      .update({ credits: profile.credits - 1 })
      .eq("id", user.id);

    if (creditError) {
      console.error("Error deducting credits:", creditError);
    }

    // Save generation history
    await supabase.from("generation_history").insert({
      user_id: user.id,
      post_id: post.id,
      prompt: prompt.trim(),
      system_prompt: systemPrompt,
      model_used: "gpt-4o-mini",
      temperature: 0.8,
      max_tokens: Math.min((length_target || 200) * 5, 2000),
      context_used: {
        writing_samples: writingSamples?.length || 0,
        preferences: preferences?.length || 0,
        viral_content: viralContent?.length || 0,
      },
      generated_text: generatedText,
      tokens_used: completion.usage?.total_tokens || 0,
      generation_time_ms: generationTime,
    });

    // Track behavior
    await supabase.from("user_behaviors").insert({
      user_id: user.id,
      behavior_type: "post_created",
      context: {
        post_id: post.id,
        prompt_length: prompt.length,
        used_personalization: true,
        tone,
        formality,
      },
    });

    return res.status(200).json({
      success: true,
      post: {
        id: post.id,
        generated_text: generatedText,
        viral_score: viralScore,
        created_at: post.created_at,
      },
      credits_remaining: profile.credits - 1,
      personalization: {
        used_writing_samples: writingSamples?.length || 0,
        used_preferences: preferences?.length || 0,
        used_viral_patterns: viralContent?.length || 0,
      },
    });
  } catch (error) {
    console.error("Error in smart generation:", error);

    if (error instanceof Error && error.message.includes("API key")) {
      return res.status(500).json({
        error: "OpenAI API configuration error. Please contact support.",
      });
    }

    return res.status(500).json({ error: "An unexpected error occurred" });
  }
}
