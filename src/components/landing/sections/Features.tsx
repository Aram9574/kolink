"use client";

import { Rocket, MessageSquare, BarChart3, Users, LineChart, MessageSquareText } from "lucide-react";
import ScrollReveal from "@/components/ui/ScrollReveal";

const FEATURES = [
  {
    icon: Rocket,
    title: "Collab AI",
    description: "Briefings inteligentes que generan variantes con tu tono de voz.",
    color: "from-primary-400 to-primary-600",
    pill: "Automations",
    metric: "+5 drafts listos / sesión",
  },
  {
    icon: BarChart3,
    title: "Analytics",
    description: "Paneles que te dicen qué replicar, cuándo publicar y en qué formato.",
    color: "from-complementary-teal to-action-info",
    pill: "Insights",
    metric: "Señales en tiempo real",
  },
  {
    icon: Users,
    title: "Community",
    description: "Masterminds mensuales con creadores que ya monetizan LinkedIn.",
    color: "from-complementary-purple to-complementary-pink",
    pill: "Mentoría",
    metric: "12 expertos en vivo",
  },
  {
    icon: LineChart,
    title: "Trends",
    description: "Curación diaria de hooks que están funcionando en tu industria.",
    color: "from-complementary-orange to-complementary-coral",
    pill: "Research",
    metric: "Alertas por industria",
  },
  {
    icon: MessageSquareText,
    title: "Strategy Sessions",
    description: "Sesiones 1:1 para revisar contenido, tono y objetivos de negocio.",
    color: "from-action-success to-emerald-500",
    pill: "Coaching",
    metric: "Playbooks accionables",
  },
  {
    icon: MessageSquare,
    title: "Feedback Loop",
    description: "Recibe comentarios accionables de coaches y de la comunidad.",
    color: "from-action-warning to-complementary-amber",
    pill: "QA Pro",
    metric: "Iteraciones en 24h",
  },
];

const STACK = [
  {
    title: "Brief colaborativo",
    detail: "Define objetivo, CTA y tono en segundos.",
  },
  {
    title: "Scorecard automático",
    detail: "Evalúa claridad, hook y autoridad.",
  },
  {
    title: "Distribución guiada",
    detail: "Calendario y recomendaciones de formato.",
  },
];

export function Features() {
  return (
    <section
      id="features"
      className="relative overflow-hidden bg-gradient-to-b from-white/90 to-slate-50/80 py-24"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(3,115,254,0.08),transparent_50%)]" />
      <div className="absolute inset-x-0 top-24 mx-auto h-64 w-[80%] rounded-[45px] bg-white/80 blur-3xl" />

      <div className="relative mx-auto max-w-6xl px-6">
        <ScrollReveal direction="up">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary">
              Solución integral
            </p>
            <h2 className="mt-4 text-3xl font-semibold text-slate-900 md:text-4xl">
              Todo lo que necesitas para ganar en LinkedIn con consistencia
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Combina IA, analítica, comunidad y expertos humanos dentro de una misma capa operativa.
            </p>
          </div>
        </ScrollReveal>

        <div className="mt-16 grid gap-6 md:grid-cols-2">
          {FEATURES.map(({ icon: Icon, title, description, color, pill, metric }, index) => (
            <ScrollReveal
              key={title}
              direction={index % 2 === 0 ? "left" : "right"}
              delay={index * 80}
            >
              <div className="group relative h-full overflow-hidden rounded-3xl border border-white/70 bg-white/90 p-8 shadow-depth-xl backdrop-blur">
                <div
                  className={`pointer-events-none absolute inset-0 opacity-0 transition duration-500 group-hover:opacity-100`}
                >
                  <div className={`h-full w-full bg-gradient-to-br ${color} opacity-10`} />
                </div>
                <div className="relative flex h-full flex-col gap-6">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full border border-slate-200/70 bg-white/70 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                      {pill}
                    </span>
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${color} text-white shadow-depth-md`}>
                      <Icon className="h-6 w-6" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-semibold text-slate-900">{title}</h3>
                    <p className="mt-3 text-base text-slate-600">{description}</p>
                  </div>
                  <div className="mt-auto space-y-3">
                    <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm font-semibold text-slate-600 shadow-depth-sm dark:border-white/10 dark:bg-slate-900/50">
                      {metric}
                    </div>
                    <div className="flex items-center justify-between text-xs uppercase tracking-[0.35em] text-slate-400">
                      <span>SLA 48H</span>
                      <span>Feedback experto</span>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <div className="mt-16 grid gap-6 rounded-3xl border border-white/80 bg-white/90 p-6 shadow-depth-2xl backdrop-blur lg:grid-cols-3">
          {STACK.map((item) => (
            <div key={item.title} className="flex flex-col gap-3 rounded-2xl border border-white/70 bg-white/80 p-5 shadow-depth-md">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
                {item.title}
              </p>
              <p className="text-base text-slate-700">{item.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
