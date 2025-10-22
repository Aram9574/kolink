type ScoreBreakdown = {
  hook: number;
  storytelling: number;
  clarity: number;
  structure: number;
  cta: number;
  sentiment: number;
  length: number;
};

export type ViralScoreResult = {
  score: number;
  breakdown: ScoreBreakdown;
  insights: string[];
};

const MAX_SCORE = 100;

export function viralScore(content: string): ViralScoreResult {
  const breakdown: ScoreBreakdown = {
    hook: evaluateHook(content),
    storytelling: evaluateStory(content),
    clarity: evaluateClarity(content),
    structure: evaluateStructure(content),
    cta: evaluateCTA(content),
    sentiment: evaluateSentiment(content),
    length: evaluateLength(content),
  };

  const total =
    breakdown.hook +
    breakdown.storytelling +
    breakdown.clarity +
    breakdown.structure +
    breakdown.cta +
    breakdown.sentiment +
    breakdown.length;

  const normalized = Math.min(MAX_SCORE, Math.round(total));

  return {
    score: normalized,
    breakdown,
    insights: buildInsights(content, breakdown),
  };
}

function evaluateHook(content: string) {
  const firstLine = content.split("\n").map((line) => line.trim())[0] ?? "";
  if (firstLine.length === 0) return 5;

  let score = 10;
  if (firstLine.length > 120) score -= 3;
  if (!/[!?]/.test(firstLine)) score -= 2;
  if (!/[0-9]/.test(firstLine) && !/[A-Z]{2,}/.test(firstLine)) score -= 2;
  return clamp(score, 0, 15);
}

function evaluateStory(content: string) {
  const lower = content.toLowerCase();
  const narrativeSignals = ["aprendí", "cuando", "historia", "recuerdo", "experiencia", "logré"];
  const count = narrativeSignals.reduce((acc, signal) => (lower.includes(signal) ? acc + 1 : acc), 0);
  return clamp(10 + count * 3, 5, 15);
}

function evaluateClarity(content: string) {
  const sentences = content.split(".").filter((s) => s.trim().length > 0);
  const longSentences = sentences.filter((s) => s.length > 180).length;
  const ratio = sentences.length > 0 ? longSentences / sentences.length : 0;

  let score = 15;
  if (ratio > 0.4) score -= 5;
  if (ratio > 0.6) score -= 5;
  if (/(\b)palabras?\b/.test(content.toLowerCase())) score += 1; // indicates meta awareness
  return clamp(score, 5, 15);
}

function evaluateStructure(content: string) {
  const paragraphs = content.split(/\n{2,}/).length;
  const bulletPoints = (content.match(/^-|\*/gm) || []).length;

  let score = 14;
  if (paragraphs < 3) score -= 4;
  if (paragraphs > 6) score -= 2;
  if (bulletPoints > 0) score += 2;
  return clamp(score, 5, 15);
}

function evaluateCTA(content: string) {
  const lower = content.toLowerCase();
  const ctaSignals = ["comparte", "déjame saber", "escríbeme", "agenda", "descarga", "aplica", "sumate", "registrate", "cuéntame"];
  const hasCTA = ctaSignals.some((signal) => lower.includes(signal));
  return clamp(hasCTA ? 14 : 6, 4, 15);
}

function evaluateSentiment(content: string) {
  const positiveSignals = (content.match(/💡|🚀|✅|🙌|🔥/g) || []).length;
  const negativeSignals = (content.match(/😢|💔|⚠️|❗/g) || []).length;
  const base = 12 + positiveSignals * 1 - negativeSignals * 2;
  return clamp(base, 5, 15);
}

function evaluateLength(content: string) {
  const wordCount = content.split(/\s+/).filter(Boolean).length;
  if (wordCount < 120) return 6;
  if (wordCount > 320) return 6;
  return 12;
}

function buildInsights(content: string, breakdown: ScoreBreakdown) {
  const insights: string[] = [];
  if (breakdown.hook < 9) insights.push("Refuerza el hook inicial con una pregunta o dato contundente.");
  if (breakdown.cta < 10) insights.push("Añade un llamado a la acción claro para guiar a la audiencia.");
  if (breakdown.structure < 10) insights.push("Divide el contenido en párrafos más cortos o bullets para mejorar la lectura.");
  if (breakdown.storytelling < 10) insights.push("Integra un ejemplo personal o caso real para aumentar la conexión emocional.");
  if (!/[\u{1F600}-\u{1F64F}]/u.test(content)) insights.push("Considera usar un emoji relevante para resaltar el tono del mensaje.");
  return insights;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
