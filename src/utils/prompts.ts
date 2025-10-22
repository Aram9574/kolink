export type ToneProfile = {
  voice?: string;
  persona?: string;
  values?: string[];
  cadence?: string;
  hooks?: string[];
  callsToAction?: string[];
  writingStyle?: string;
  [key: string]: unknown | string | string[] | undefined;
};

export type ProfileContext = {
  fullName?: string;
  headline?: string | null;
  bio?: string | null;
  expertise?: string[];
  toneProfile?: ToneProfile | null;
  recentWins?: string[];
};

export type PromptMetadata = {
  objective: string;
  audience?: string;
  callToAction?: string;
  format?: string;
  extraInstructions?: string[];
};

const DEFAULT_OBJECTIVE = "Generar un post altamente atractivo para LinkedIn optimizado para engagement, claridad y storytelling.";

export function buildGenerationPrompt(
  userPrompt: string,
  style: string | null,
  profile: ProfileContext,
  metadata: PromptMetadata = { objective: DEFAULT_OBJECTIVE }
) {
  const buffer: string[] = [];

  buffer.push("Eres un ghostwriter senior para LinkedIn especializado en crear contenido con alto potencial viral.");
  buffer.push("Tu objetivo es generar un post original, auténtico, accionable y alineado con la voz del autor.");
  buffer.push("");

  buffer.push("### Contexto del autor");
  if (profile.fullName) buffer.push(`- Nombre: ${profile.fullName}`);
  if (profile.headline) buffer.push(`- Headline: ${profile.headline}`);
  if (profile.bio) buffer.push(`- Bio: ${profile.bio}`);
  if (profile.expertise && profile.expertise.length > 0) buffer.push(`- Expertise: ${profile.expertise.join(", ")}`);
  if (profile.toneProfile) {
    buffer.push(`- Tono: ${formatTone(profile.toneProfile)}`);
  }
  if (profile.recentWins && profile.recentWins.length > 0) {
    buffer.push(`- Logros recientes: ${profile.recentWins.join(" | ")}`);
  }

  buffer.push("");
  buffer.push("### Objetivo del contenido");
  buffer.push(`- Objetivo principal: ${metadata.objective || DEFAULT_OBJECTIVE}`);
  if (metadata.audience) buffer.push(`- Audiencia objetivo: ${metadata.audience}`);
  if (metadata.callToAction) buffer.push(`- Llamado a la acción deseado: ${metadata.callToAction}`);
  if (metadata.format) buffer.push(`- Formato preferido: ${metadata.format}`);
  if (metadata.extraInstructions && metadata.extraInstructions.length > 0) {
    buffer.push(`- Instrucciones adicionales: ${metadata.extraInstructions.join(" | ")}`);
  }

  buffer.push("");
  buffer.push("### Pedido del usuario");
  buffer.push(userPrompt);

  buffer.push("");
  buffer.push("### Requisitos de salida");
  buffer.push("- Escribe en español neutro (puede adaptar a la voz del autor).");
  buffer.push("- Usa un hook poderoso en la primera línea.");
  buffer.push("- Incluye storytelling personal, datos o aprendizajes accionables.");
  buffer.push("- Añade un llamado a la acción claro y auténtico.");
  buffer.push("- Mantén longitud entre 180 y 260 palabras.");
  buffer.push("- Evita frases cliché, mantén originalidad.");
  if (style) {
    buffer.push(`- Aplica el estilo solicitado: ${style}.`);
  }

  buffer.push("");
  buffer.push("Devuelve la respuesta en JSON con el siguiente formato:");
  buffer.push(
    JSON.stringify(
      {
        content: "<texto del post>",
        hashtags: ["#tag1", "#tag2"],
        tone: "<tono dominante>",
        cta: "<llamado a la acción>",
        metadata: {
          structure: ["Hook", "Story", "Insight", "CTA"],
          estimatedReadTime: "45s",
        },
      },
      null,
      2
    )
  );

  return buffer.join("\n");
}

export function buildRepurposePrompt(options: {
  originalContent: string;
  newStyle?: string | null;
  newFormat?: string | null;
  audienceShift?: string | null;
  toneProfile?: ToneProfile | null;
}) {
  const { originalContent, newStyle, newFormat, audienceShift, toneProfile } = options;
  const buffer: string[] = [];

  buffer.push("Actúa como estratega senior de contenido para LinkedIn y transforma el post dado manteniendo su esencia.");
  buffer.push("");
  buffer.push("### Post original");
  buffer.push(originalContent);

  buffer.push("");
  buffer.push("### Requerimientos de reformulación");
  if (newStyle) buffer.push(`- Nuevo estilo: ${newStyle}`);
  if (newFormat) buffer.push(`- Formato deseado: ${newFormat}`);
  if (audienceShift) buffer.push(`- Nueva audiencia principal: ${audienceShift}`);
  if (toneProfile) buffer.push(`- Mantener consistencia con la voz: ${formatTone(toneProfile)}`);
  buffer.push("- Conserva la intención y mensaje central.");
  buffer.push("- Optimiza para claridad, valor accionable y conexión emocional.");

  buffer.push("");
  buffer.push("Devuelve JSON con el formato:");
  buffer.push(
    JSON.stringify(
      {
        content: "<nuevo post>",
        summary: "<resumen breve>",
        tone: "<tono>",
        hooks: ["<hook 1>", "<hook 2>"],
        cta: "<llamado a la acción>",
        metadata: {
          keyChanges: ["<cambio 1>", "<cambio 2>"],
        },
      },
      null,
      2
    )
  );

  return buffer.join("\n");
}

function formatTone(toneProfile: ToneProfile) {
  const entries: string[] = [];

  if (toneProfile.voice) entries.push(`Voz: ${toneProfile.voice}`);
  if (toneProfile.persona) entries.push(`Persona: ${toneProfile.persona}`);
  if (toneProfile.cadence) entries.push(`Cadencia: ${toneProfile.cadence}`);
  if (toneProfile.values?.length) entries.push(`Valores: ${toneProfile.values.join(", ")}`);
  if (toneProfile.writingStyle) entries.push(`Estilo: ${toneProfile.writingStyle}`);

  return entries.join(" | ");
}
