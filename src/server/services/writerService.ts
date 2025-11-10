import { openai } from "@/lib/openai";
import { logger } from '@/lib/logger';

import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { buildGenerationPrompt, buildRepurposePrompt, type PromptMetadata } from "@/utils/prompts";
import { viralScore, type ViralScoreResult } from "@/utils/scoring";
import { recommendNextActions, type Recommendation } from "@/utils/recommendations";
import { getUserProfile, mapProfileToContext } from "./profileService";

type GenerateInput = {
  userId: string;
  prompt: string;
  style?: string;
  language?: 'es-ES' | 'en-US' | 'pt-BR';
  toneProfile?: string;
  preset?: string;
  metadata?: {
    objective?: string;
    audience?: string;
    callToAction?: string;
    format?: string;
    extraInstructions?: string[];
  };
};

type GenerationResult = {
  postId: string;
  content: string;
  hashtags: string[];
  metadata: Record<string, unknown>;
  viralScore: ViralScoreResult;
  recommendations: Recommendation[];
  remainingCredits: number;
};

export async function generatePostWithContext(input: GenerateInput): Promise<GenerationResult> {
  const payload = validateGenerateInput(input);
  const supabase = getSupabaseAdminClient();

  const profile = await getUserProfile(payload.userId);
  if (!profile) {
    throw new Error("Perfil no encontrado.");
  }

  const credits = profile.credits ?? 0;
  if (credits <= 0) {
    const plan = profile.plan ?? "free";
    const error = new Error("Sin créditos disponibles.");
    (error as Error & { code?: string; plan?: string }).code = "NO_CREDITS";
    (error as Error & { code?: string; plan?: string }).plan = plan;
    throw error;
  }

  const profileContext = mapProfileToContext(profile);
  const promptMetadata: PromptMetadata = {
    objective: payload.metadata?.objective ?? "Generar un post que conecte con la audiencia de LinkedIn.",
    audience: payload.metadata?.audience,
    callToAction: payload.metadata?.callToAction,
    format: payload.metadata?.format,
    extraInstructions: payload.metadata?.extraInstructions,
  };

  // Language mapping para el system prompt
  const languageMap: Record<string, string> = {
    'es-ES': 'español',
    'en-US': 'English',
    'pt-BR': 'português'
  };
  const targetLanguage = languageMap[payload.language || 'es-ES'] || 'español';

  // System prompt con idioma especificado
  const systemContent = `Eres Kolink AI Writer, especializado en contenido para LinkedIn y growth para creadores.
IMPORTANTE: Debes generar TODO el contenido en ${targetLanguage}. Respeta completamente el idioma ${targetLanguage} en tu respuesta.
${payload.toneProfile ? `\nTono del usuario: ${payload.toneProfile}` : ''}`;

  const systemPrompt = buildGenerationPrompt(payload.prompt, payload.style ?? null, profileContext, promptMetadata);
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: systemContent,
      },
      { role: "user", content: systemPrompt },
    ],
    temperature: 0.7,
    max_tokens: 700,
  });

  const llmRaw = completion.choices[0]?.message?.content?.trim();
  if (!llmRaw) {
    throw new Error("La IA no generó contenido.");
  }

  const llmPayload = parseLLMJson(llmRaw);
  const generatedContent = llmPayload.content ?? llmRaw;
  const hashtags = dedupeHashtags(llmPayload.hashtags ?? []);
  const cta = llmPayload.cta ?? null;

  const embedding = await createEmbedding(generatedContent);
  const score = viralScore(generatedContent);
  const recommendations = recommendNextActions({
    score: score.score,
    hasCTA: Boolean(cta),
    hasHook: generatedContent.trim().length > 0,
    emojisUsed: EMOJI_REGEX.test(generatedContent),
  });

  const metadata = {
    ...llmPayload.metadata,
    tone: llmPayload.tone ?? null,
    cta,
    promptMetadata,
    scoring: score.breakdown,
    insights: score.insights,
  };

  const { data: insertedPost, error: insertError } = await supabase
    .from("posts")
    .insert({
      prompt: payload.prompt,
      style: payload.style ?? null,
      content: generatedContent,
      generated_text: generatedContent,
      hashtags,
      metadata,
      embedding,
      viral_score: score.score,
      cta_suggestions: cta ? [cta] : [],
      user_id: payload.userId,
    })
    .select("id")
    .single();

  if (insertError) {
    logger.error("[writerService] Error al guardar post:", insertError);
    throw insertError;
  }

  const remainingCredits = Math.max(0, credits - 1);
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ credits: remainingCredits })
    .eq("id", payload.userId);

  if (updateError) {
    logger.error("[writerService] Error al actualizar créditos:", updateError);
    throw updateError;
  }

  await supabase.from("analytics_events").insert({
    user_id: payload.userId,
    event_type: "post.generated",
    payload: {
      post_id: insertedPost.id,
      score: score.score,
      hashtags,
      plan: profile.plan,
    },
  });

  return {
    postId: insertedPost.id,
    content: generatedContent,
    hashtags,
    metadata,
    viralScore: score,
    recommendations,
    remainingCredits,
  };
}

type RepurposeInput = {
  userId: string;
  postId: string;
  newStyle?: string;
  newFormat?: string;
  audienceShift?: string;
};

export async function repurposePost(input: RepurposeInput): Promise<GenerationResult> {
  const payload = validateRepurposeInput(input);
  const supabase = getSupabaseAdminClient();

  const profile = await getUserProfile(payload.userId);
  if (!profile) {
    throw new Error("Perfil no encontrado.");
  }

  const { data: originalPost, error: postError } = await supabase
    .from("posts")
    .select("id, content, metadata")
    .eq("id", payload.postId)
    .eq("user_id", payload.userId)
    .maybeSingle();

  if (postError) {
    logger.error("[writerService] Error fetching original post:", postError);
    throw postError;
  }

  if (!originalPost || !originalPost.content) {
    throw new Error("No se encontró el contenido original para reformular.");
  }

  const profileContext = mapProfileToContext(profile);
  const systemPrompt = buildRepurposePrompt({
    originalContent: originalPost.content,
    newStyle: payload.newStyle ?? null,
    newFormat: payload.newFormat ?? null,
    audienceShift: payload.audienceShift ?? null,
    toneProfile: profileContext.toneProfile ?? null,
  });

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "Eres Kolink AI Writer, especializado en reformular contenido manteniendo coherencia y fuerza narrativa.",
      },
      { role: "user", content: systemPrompt },
    ],
    temperature: 0.7,
    max_tokens: 700,
  });

  const llmRaw = completion.choices[0]?.message?.content?.trim();
  if (!llmRaw) {
    throw new Error("La IA no generó contenido.");
  }

  const llmPayload = parseLLMJson(llmRaw);
  const generatedContent = llmPayload.content ?? llmRaw;
  const hashtags = dedupeHashtags(llmPayload.hashtags ?? []);
  const cta = llmPayload.cta ?? null;

  const embedding = await createEmbedding(generatedContent);
  const score = viralScore(generatedContent);
  const recommendations = recommendNextActions({
    score: score.score,
    hasCTA: Boolean(cta),
    hasHook: generatedContent.trim().length > 0,
    emojisUsed: EMOJI_REGEX.test(generatedContent),
  });

  const metadata = {
    ...llmPayload.metadata,
    summary: llmPayload.summary ?? null,
    hooks: llmPayload.hooks ?? [],
    tone: llmPayload.tone ?? null,
    keyChanges: llmPayload.metadata?.keyChanges ?? [],
    source_post_id: payload.postId,
  };

  const { data: insertedPost, error: insertError } = await supabase
    .from("posts")
    .insert({
      prompt: `repurpose:${payload.postId}`,
      style: payload.newStyle ?? null,
      content: generatedContent,
      generated_text: generatedContent,
      hashtags,
      metadata,
      embedding,
      viral_score: score.score,
      cta_suggestions: cta ? [cta] : [],
      source_post_id: payload.postId,
      user_id: payload.userId,
    })
    .select("id")
    .single();

  if (insertError) {
    logger.error("[writerService] Error al guardar post reformulado:", insertError);
    throw insertError;
  }

  await supabase.from("analytics_events").insert({
    user_id: payload.userId,
    event_type: "post.repurpose",
    payload: {
      original_post_id: payload.postId,
      new_post_id: insertedPost.id,
      score: score.score,
    },
  });

  return {
    postId: insertedPost.id,
    content: generatedContent,
    hashtags,
    metadata,
    viralScore: score,
    recommendations,
    remainingCredits: profile.credits ?? 0,
  };
}

type LLMGeneration = {
  content?: string;
  hashtags?: string[];
  tone?: string;
  cta?: string;
  metadata?: Record<string, unknown>;
  summary?: string;
  hooks?: string[];
};

function parseLLMJson(raw: string): LLMGeneration {
  try {
    const sanitized = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(sanitized);
    if (typeof parsed !== "object" || parsed === null) {
      return {};
    }
    return parsed as LLMGeneration;
  } catch (error) {
    console.warn("[writerService] No se pudo parsear JSON del modelo. Se usará texto bruto.", error);
    return {};
  }
}

async function createEmbedding(text: string) {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });
    return response.data[0]?.embedding ?? null;
  } catch (error) {
    logger.error("[writerService] Error al generar embedding:", error);
    return null;
  }
}

function dedupeHashtags(hashtags: string[]) {
  const unique = new Set<string>();
  hashtags.forEach((tag) => {
    if (!tag) return;
    const normalized = tag.startsWith("#") ? tag : `#${tag.trim()}`;
    unique.add(normalized);
  });
  return Array.from(unique).slice(0, 6);
}

const EMOJI_REGEX = /[\u{1F300}-\u{1FAFF}]/u;

function validateGenerateInput(input: GenerateInput): GenerateInput {
  if (!input || typeof input !== "object") {
    throw new Error("Entrada inválida para generación.");
  }

  if (!input.userId) {
    throw new Error("userId es requerido.");
  }

  if (!input.prompt || input.prompt.trim().length < 10) {
    throw new Error("El prompt es demasiado corto.");
  }

  if (input.metadata && input.metadata.extraInstructions && !Array.isArray(input.metadata.extraInstructions)) {
    throw new Error("extraInstructions debe ser un arreglo de strings.");
  }

  return input;
}

function validateRepurposeInput(input: RepurposeInput): RepurposeInput {
  if (!input || typeof input !== "object") {
    throw new Error("Entrada inválida para reformulación.");
  }

  if (!input.userId) {
    throw new Error("userId es requerido.");
  }

  if (!input.postId) {
    throw new Error("postId es requerido.");
  }

  return input;
}
