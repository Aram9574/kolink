"use client";

import { useState } from "react";
import { Lightbulb, Sparkles, TrendingUp, Target, BookOpen, Briefcase } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PromptSuggestionsProps {
  onSelect: (prompt: string) => void;
  language?: 'es-ES' | 'en-US' | 'pt-BR';
  className?: string;
}

const SUGGESTIONS = {
  'es-ES': [
    {
      category: "Insights",
      icon: Lightbulb,
      prompts: [
        "3 errores que cometí escalando mi SaaS de 0 a $50K MRR",
        "Por qué dejé de usar OKRs y empecé con [método alternativo]",
        "El framework exacto que usamos para contratar a nuestro equipo remoto",
        "Lecciones de 5 años liderando equipos distribuidos",
      ],
    },
    {
      category: "Tendencias",
      icon: TrendingUp,
      prompts: [
        "El cambio silencioso en [tu industria] que todos están ignorando",
        "Por qué [tecnología/metodología] va a cambiar [industria] en 2025",
        "3 señales que indican que [tendencia] llegó para quedarse",
        "Lo que nadie te dice sobre [tema trending actual]",
      ],
    },
    {
      category: "Storytelling",
      icon: BookOpen,
      prompts: [
        "El día que casi cerramos la empresa (y lo que nos salvó)",
        "Cómo una conversación de 15 minutos cambió nuestra estrategia completa",
        "El feedback brutal que necesitaba escuchar",
        "La decisión más difícil que tomé como líder",
      ],
    },
    {
      category: "Educación",
      icon: BookOpen,
      prompts: [
        "Guía paso a paso: Cómo implementar [proceso] en tu equipo",
        "5 recursos gratuitos que uso diariamente para [objetivo]",
        "El framework completo de [tema] que enseño a mi equipo",
        "Cómo dominar [habilidad] en 30 días (mi método probado)",
      ],
    },
    {
      category: "Opinión",
      icon: Target,
      prompts: [
        "Por qué creo que [opinión controversial pero fundamentada]",
        "Hot take: [industria/práctica común] está sobrevalorada",
        "Dejemos de romantizar [práctica común] y hablemos de realidades",
        "La verdad incómoda sobre [tema de tu industria]",
      ],
    },
    {
      category: "Casos de éxito",
      icon: Briefcase,
      prompts: [
        "Cómo [cliente/proyecto] logró [resultado impresionante] en [tiempo]",
        "Case study: De [situación inicial] a [resultado] usando [método]",
        "La estrategia exacta que usó [empresa/persona] para [logro]",
        "Breakdown completo: Cómo logramos [métrica] con [recurso limitado]",
      ],
    },
  ],
  'en-US': [
    {
      category: "Insights",
      icon: Lightbulb,
      prompts: [
        "3 mistakes I made scaling my SaaS from 0 to $50K MRR",
        "Why I stopped using OKRs and started with [alternative method]",
        "The exact framework we use to hire our remote team",
        "Lessons from 5 years leading distributed teams",
      ],
    },
    {
      category: "Trends",
      icon: TrendingUp,
      prompts: [
        "The silent change in [your industry] everyone is ignoring",
        "Why [technology/methodology] will change [industry] in 2025",
        "3 signs that [trend] is here to stay",
        "What nobody tells you about [current trending topic]",
      ],
    },
    {
      category: "Storytelling",
      icon: BookOpen,
      prompts: [
        "The day we almost shut down the company (and what saved us)",
        "How a 15-minute conversation changed our entire strategy",
        "The brutal feedback I needed to hear",
        "The hardest decision I made as a leader",
      ],
    },
  ],
  'pt-BR': [
    {
      category: "Insights",
      icon: Lightbulb,
      prompts: [
        "3 erros que cometi escalando meu SaaS de 0 a $50K MRR",
        "Por que parei de usar OKRs e comecei com [método alternativo]",
        "O framework exato que usamos para contratar nossa equipe remota",
        "Lições de 5 anos liderando equipes distribuídas",
      ],
    },
    {
      category: "Tendências",
      icon: TrendingUp,
      prompts: [
        "A mudança silenciosa em [sua indústria] que todos estão ignorando",
        "Por que [tecnologia/metodologia] vai mudar [indústria] em 2025",
        "3 sinais que indicam que [tendência] veio para ficar",
        "O que ninguém te conta sobre [tema em alta atual]",
      ],
    },
  ],
};

const LABELS = {
  'es-ES': {
    title: "Sugerencias de prompts",
    subtitle: "Inspírate con estos ejemplos probados",
    useThisPrompt: "Usar este prompt",
  },
  'en-US': {
    title: "Prompt suggestions",
    subtitle: "Get inspired by these proven examples",
    useThisPrompt: "Use this prompt",
  },
  'pt-BR': {
    title: "Sugestões de prompts",
    subtitle: "Inspire-se com estes exemplos comprovados",
    useThisPrompt: "Usar este prompt",
  },
};

export function PromptSuggestions({ onSelect, language = 'es-ES', className = "" }: PromptSuggestionsProps) {
  const [activeCategory, setActiveCategory] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  const suggestions = SUGGESTIONS[language];
  const labels = LABELS[language];
  const currentCategory = suggestions[activeCategory];

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-purple-50 p-4 transition hover:border-blue-200"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-slate-900">{labels.title}</h3>
            <p className="text-xs text-slate-600">{labels.subtitle}</p>
          </div>
        </div>
        <div className={`transform transition-transform ${isExpanded ? "rotate-180" : ""}`}>
          <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
              {/* Category tabs */}
              <div className="flex gap-2 overflow-x-auto pb-2">
                {suggestions.map((cat, index) => {
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.category}
                      onClick={() => setActiveCategory(index)}
                      className={`flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
                        activeCategory === index
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {cat.category}
                    </button>
                  );
                })}
              </div>

              {/* Prompts list */}
              <div className="space-y-2">
                {currentCategory.prompts.map((prompt, index) => (
                  <motion.button
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => {
                      onSelect(prompt);
                      setIsExpanded(false);
                    }}
                    className="group flex w-full items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-blue-200 hover:bg-blue-50"
                  >
                    <div className="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-600 group-hover:bg-blue-600 group-hover:text-white">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-slate-800 group-hover:text-blue-900">{prompt}</p>
                      <p className="mt-1 text-xs text-slate-500 group-hover:text-blue-600">
                        {labels.useThisPrompt} →
                      </p>
                    </div>
                  </motion.button>
                ))}
              </div>

              {/* Tip */}
              <div className="rounded-xl border border-yellow-100 bg-yellow-50 p-4">
                <div className="flex items-start gap-3">
                  <Lightbulb className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-600" />
                  <div>
                    <p className="text-sm font-semibold text-yellow-900">Consejo</p>
                    <p className="mt-1 text-xs text-yellow-800">
                      Personaliza estos prompts con tu experiencia y contexto específico para obtener mejores resultados.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
