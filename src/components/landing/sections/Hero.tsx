"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, PlayCircle, Sparkles } from "lucide-react";
import { useRouter } from "next/router";
import Button from "@/components/Button";

const STATS = [
  { value: "+212%", label: "Leads desde LinkedIn", detail: "en 4 semanas" },
  { value: "8h", label: "Tiempo ahorrado", detail: "por semana" },
  { value: "4.6x", label: "Engagement", detail: "vs promedio" },
];

const LIVE_METRICS = [
  { label: "Hook score", value: 92, trend: "+12%", color: "from-primary-400 to-primary-600" },
  { label: "Tono consistente", value: 88, trend: "+5%", color: "from-complementary-purple to-complementary-pink" },
  { label: "Agenda cubierta", value: 75, trend: "+18%", color: "from-action-success to-emerald-500" },
];

const TRUSTED = ["SaaS", "B2B", "Consultorías", "Founders"];

export function Hero() {
  const router = useRouter();

  const handleScrollToFeatures = () => {
    const element = document.getElementById("features");
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <header
      id="top"
      className="relative isolate overflow-hidden px-6 pb-24 pt-32"
    >
      <div className="absolute inset-0 neon-grid" aria-hidden="true">
        <div className="texture-noise" />
        <span className="glow-orb top-10 left-1/3 h-72 w-72 rounded-full bg-primary/40" />
        <span className="glow-orb floating-delay-2 bottom-0 right-10 h-80 w-80 rounded-full bg-complementary-coral/30" />
      </div>

      <div className="relative mx-auto grid w-full max-w-6xl gap-16 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="text-center lg:text-left">
          <motion.span
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-5 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-slate-600 shadow-depth-sm backdrop-blur"
          >
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            IA OPERATIVA
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="mt-8 text-balance text-4xl leading-[1.05] text-slate-900 md:text-6xl"
          >
            <span className="bg-gradient-to-br from-slate-900 via-primary-700 to-slate-900 bg-clip-text text-transparent">
              Convierte LinkedIn en tu canal de adquisición más rentable
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mt-6 text-lg text-slate-600 md:text-xl"
          >
            Kolink combina workflows de IA, analítica accionable y sesiones con expertos
            para que tu equipo publique con consistencia, mida impacto y optimice cada iteración.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="mt-10 flex flex-col items-center gap-4 sm:flex-row lg:items-start"
          >
            <Button size="lg" glow onClick={() => router.push("/signin")}>
              Empieza gratis
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full border-white/50 bg-white/70 text-slate-700 shadow-depth-sm backdrop-blur-sm transition hover:border-primary/60 hover:bg-white sm:w-auto"
              onClick={handleScrollToFeatures}
            >
              <PlayCircle className="mr-2 h-5 w-5 text-primary" />
              Ver demo guiada
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="mt-12 grid gap-4 sm:grid-cols-3"
          >
            {STATS.map((stat) => (
              <div
                key={stat.label}
                className="gradient-border rounded-2xl border border-white/70 bg-white/80 p-4 text-left shadow-depth-lg backdrop-blur"
              >
                <p className="text-3xl font-semibold text-slate-900">{stat.value}</p>
                <p className="mt-1 text-sm font-medium text-slate-500">{stat.label}</p>
                <p className="text-xs uppercase tracking-[0.25em] text-primary-500">
                  {stat.detail}
                </p>
              </div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-14 space-y-3 text-left"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">
              Equipos que confían en Kolink
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm font-semibold uppercase tracking-[0.25em] text-slate-400 lg:justify-start">
              {TRUSTED.map((label) => (
                <span key={label} className="text-slate-500">
                  {label}
                </span>
              ))}
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="glass-panel gradient-border relative overflow-hidden p-8 shadow-depth-2xl"
        >
          <span className="shine-line" aria-hidden="true" />
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">
            <span>Panel vivo</span>
            <span className="text-primary">+8 señales</span>
          </div>

          <div className="mt-8 space-y-5">
            {LIVE_METRICS.map((metric) => (
              <div
                key={metric.label}
                className="rounded-2xl border border-white/50 bg-white/70 p-4 shadow-depth-md dark:border-white/10 dark:bg-slate-900/60"
              >
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                      {metric.label}
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-slate-900">
                      {metric.value}
                    </p>
                  </div>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    {metric.trend}
                  </span>
                </div>
                <div className="mt-4 h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                  <span
                    className={`block h-full rounded-full bg-gradient-to-r ${metric.color}`}
                    style={{ width: `${metric.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-white/40 bg-white/70 p-4 shadow-depth-md dark:border-white/10 dark:bg-slate-900/60">
            <p className="text-sm font-semibold text-slate-800">
              Próximos posteos inteligentes
            </p>
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              {["Playbook para founders", "Case study con métricas", "Encuesta para abrir debate"].map(
                (item, idx) => (
                  <li
                    key={item}
                    className="flex items-center justify-between rounded-xl border border-white/60 bg-white/80 px-3 py-2 dark:border-white/10 dark:bg-slate-800/60"
                  >
                    <span>{item}</span>
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                      {idx === 0 ? "Hoy" : idx === 1 ? "48h" : "72h"}
                    </span>
                  </li>
                )
              )}
            </ul>
          </div>

          <div className="mt-6 flex items-center justify-between rounded-2xl border border-white/40 bg-gradient-to-r from-slate-50 to-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-depth-md dark:border-white/10 dark:bg-slate-900/80">
            <span>Insights accionables listos</span>
            <button
              type="button"
              className="inline-flex items-center gap-1 text-primary transition hover:gap-2"
              onClick={() => router.push("/dashboard")}
            >
              Abrir panel
              <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      </div>
    </header>
  );
}
