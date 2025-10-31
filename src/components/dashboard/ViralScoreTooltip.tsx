"use client";

import { HelpCircle, TrendingUp, Users, Heart, MessageCircle, Share2 } from "lucide-react";
import { useState } from "react";

interface ViralScoreTooltipProps {
  score?: number;
  className?: string;
}

export function ViralScoreTooltip({ score, className = "" }: ViralScoreTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-50 border-green-200";
    if (score >= 60) return "text-blue-600 bg-blue-50 border-blue-200";
    if (score >= 40) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-orange-600 bg-orange-50 border-orange-200";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Excelente";
    if (score >= 60) return "Bueno";
    if (score >= 40) return "Promedio";
    return "Mejorable";
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 transition"
      >
        <HelpCircle className="h-4 w-4" />
        <span className="text-xs font-medium">¿Qué es el Viral Score?</span>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-80 z-50 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Viral Score</h3>
              <p className="text-xs text-slate-500">Predicción de engagement</p>
            </div>
          </div>

          {/* Current Score */}
          {score !== undefined && (
            <div className={`mt-4 rounded-xl border p-4 ${getScoreColor(score)}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium opacity-75">Tu puntuación</p>
                  <p className="mt-1 text-2xl font-bold">{score}/100</p>
                </div>
                <div className={`rounded-full px-3 py-1 text-xs font-semibold ${getScoreColor(score)}`}>
                  {getScoreLabel(score)}
                </div>
              </div>
            </div>
          )}

          {/* How it's calculated */}
          <div className="mt-4 space-y-3">
            <h4 className="text-sm font-semibold text-slate-900">¿Cómo se calcula?</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              El Viral Score analiza múltiples factores de tu contenido para predecir su potencial de engagement en LinkedIn:
            </p>

            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <Users className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500" />
                <div>
                  <p className="text-xs font-medium text-slate-700">Relevancia de audiencia</p>
                  <p className="text-xs text-slate-500">Qué tan bien habla tu contenido a tu público objetivo</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <MessageCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-purple-500" />
                <div>
                  <p className="text-xs font-medium text-slate-700">Engagement potencial</p>
                  <p className="text-xs text-slate-500">Probabilidad de generar comentarios y conversaciones</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Heart className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
                <div>
                  <p className="text-xs font-medium text-slate-700">Impacto emocional</p>
                  <p className="text-xs text-slate-500">Resonancia emocional y storytelling</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Share2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
                <div>
                  <p className="text-xs font-medium text-slate-700">Shareability</p>
                  <p className="text-xs text-slate-500">Qué tan probable es que se comparta</p>
                </div>
              </div>
            </div>
          </div>

          {/* Score ranges */}
          <div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-3">
            <p className="text-xs font-semibold text-slate-700">Rangos de puntuación:</p>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">80-100</span>
                <span className="rounded-full bg-green-100 px-2 py-0.5 font-medium text-green-700">Viral</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">60-79</span>
                <span className="rounded-full bg-blue-100 px-2 py-0.5 font-medium text-blue-700">Alto</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">40-59</span>
                <span className="rounded-full bg-yellow-100 px-2 py-0.5 font-medium text-yellow-700">Medio</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">0-39</span>
                <span className="rounded-full bg-orange-100 px-2 py-0.5 font-medium text-orange-700">Bajo</span>
              </div>
            </div>
          </div>

          {/* Tip */}
          <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-3">
            <p className="text-xs text-blue-800">
              <strong>💡 Consejo:</strong> Los posts con score +70 suelen obtener 3x más engagement. Usa las recomendaciones para mejorar tu contenido.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
