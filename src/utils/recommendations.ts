export type RecommendationPriority = "low" | "medium" | "high";

export type Recommendation = {
  action: string;
  description: string;
  priority: RecommendationPriority;
};

export type RecommendationContext = {
  score: number;
  hasCTA?: boolean;
  hasHook?: boolean;
  emojisUsed?: boolean;
  targetFormat?: string;
  scheduled?: boolean;
};

export function recommendNextActions(context: RecommendationContext): Recommendation[] {
  const { score } = context;
  const actions: Recommendation[] = [];

  if (score >= 85) {
    actions.push({
      action: "Publicar ahora",
      description: "Tu post está listo para maximizar engagement. Súbelo mientras la idea está fresca.",
      priority: "high",
    });
    if (!context.scheduled) {
      actions.push({
        action: "Agendar en Calendario IA",
        description: "Programa el post en el horario recomendado para garantizar el máximo alcance.",
        priority: "medium",
      });
    }
    return actions;
  }

  if (score >= 65) {
    if (!context.hasCTA) {
      actions.push({
        action: "Añadir CTA",
        description: "Incluye un llamado a la acción concreto para promover interacción o leads.",
        priority: "high",
      });
    }
    if (!context.emojisUsed) {
      actions.push({
        action: "Agregar un emoji clave",
        description: "Un emoji relevante puede mejorar el ritmo visual y reforzar el tono.",
        priority: "medium",
      });
    }
    actions.push({
      action: "Validar storytelling",
      description: "Haz una pasada final para asegurar que la narrativa tenga inicio, conflicto y resolución.",
      priority: "medium",
    });
    return actions;
  }

  actions.push({
    action: "Reescribir hook inicial",
    description: "Comienza con una frase impactante, pregunta aguda o dato contraintuitivo.",
    priority: "high",
  });
  actions.push({
    action: "Resalta un ejemplo real",
    description: "Usa una situación concreta para que la audiencia visualice el beneficio.",
    priority: "medium",
  });
  actions.push({
    action: "Define CTA final",
    description: "Guía a la audiencia con el siguiente paso (comentario, compartir, descarga).",
    priority: "medium",
  });

  if (context.targetFormat === "carrousel") {
    actions.push({
      action: "Convertir a carrusel",
      description: "Reestructura la información en 5-7 slides, con hook, insights y CTA final.",
      priority: "low",
    });
  }

  return actions;
}
