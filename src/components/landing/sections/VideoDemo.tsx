"use client";

import { motion } from "framer-motion";
import { Play, Sparkles, BarChart3, Zap } from "lucide-react";
import { useState } from "react";

const WORKFLOW_STEPS = [
  {
    icon: Sparkles,
    title: "Genera contenido con IA",
    description: "Describe tu idea y deja que nuestra IA cree posts profesionales adaptados a tu voz",
  },
  {
    icon: BarChart3,
    title: "Analiza el rendimiento",
    description: "Obtén insights en tiempo real sobre qué contenido funciona mejor con tu audiencia",
  },
  {
    icon: Zap,
    title: "Escala tu presencia",
    description: "Programa publicaciones, colabora con tu equipo y optimiza tu estrategia",
  },
];

export function VideoDemo() {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <section className="bg-gradient-to-b from-white via-slate-50 to-white py-24">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-blue-600">Cómo funciona</p>
          <h2 className="mt-4 text-3xl font-bold text-slate-900 md:text-4xl">
            De idea a publicación en minutos
          </h2>
          <p className="mt-3 text-lg text-slate-600">
            Descubre cómo Kolink simplifica tu flujo de trabajo en LinkedIn
          </p>
        </motion.div>

        {/* Video Player Placeholder */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="group relative mx-auto mt-12 overflow-hidden rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-50 to-slate-100 shadow-2xl"
        >
          <div className="aspect-video w-full">
            {!isPlaying ? (
              <button
                onClick={() => setIsPlaying(true)}
                className="flex h-full w-full items-center justify-center transition hover:bg-blue-100/50"
              >
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-600 shadow-xl transition group-hover:scale-110 group-hover:bg-blue-700">
                  <Play className="ml-1 h-10 w-10 text-white" fill="white" />
                </div>
              </button>
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-slate-900 text-white">
                <div className="text-center">
                  <p className="text-xl font-semibold">Video demo próximamente</p>
                  <p className="mt-2 text-sm text-slate-400">
                    Mientras tanto, explora las funcionalidades a continuación
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Animated gradient border effect */}
          <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 opacity-20 blur-xl transition group-hover:opacity-30" />
        </motion.div>

        {/* Workflow Steps */}
        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {WORKFLOW_STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                className="relative text-center"
              >
                {/* Step number */}
                <div className="absolute -top-4 left-1/2 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white shadow-lg">
                  {index + 1}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 pt-8 shadow-md transition hover:border-blue-200 hover:shadow-xl">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                    <Icon className="h-7 w-7" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">{step.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{step.description}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
