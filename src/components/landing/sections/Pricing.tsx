"use client";

import { useState } from "react";
import { CheckCircle2, Shield, Zap } from "lucide-react";
import Button from "@/components/Button";
import ScrollReveal from "@/components/ui/ScrollReveal";

const PLANS = [
  {
    name: "Starter",
    monthly: 49,
    annual: 39,
    description: "Ideal para profesionales o creadores que publican 1-2 veces por semana.",
    features: [
      "10 publicaciones IA con tu tono",
      "Briefs colaborativos y plantillas",
      "Panel de métricas esenciales",
      "Soporte asíncrono dentro de 24h",
    ],
    accent: "from-primary-400 to-primary-600",
    badge: "Individual",
  },
  {
    name: "Growth",
    monthly: 89,
    annual: 69,
    description: "El plan favorito de equipos B2B que quieren operar LinkedIn como canal core.",
    features: [
      "30 publicaciones IA + workflows",
      "Workspaces colaborativos",
      "Insights de tendencias y benchmarks",
      "Soporte prioritario + sesiones grupales",
    ],
    accent: "from-complementary-orange to-complementary-coral",
    badge: "Equipos",
    highlight: true,
  },
  {
    name: "Scale",
    monthly: 139,
    annual: 109,
    description: "Para organizaciones con múltiples portavoces, compliance y data avanzada.",
    features: [
      "90 publicaciones IA y prompts ilimitados",
      "Strategy sessions 1:1 mensuales",
      "Integraciones CRM / reporting avanzado",
      "Feedback experto semanal con SLAs",
    ],
    accent: "from-complementary-purple to-complementary-pink",
    badge: "Enterprise",
  },
];

const GUARANTEES = [
  {
    title: "Onboarding guiado",
    description: "En 7 días dejamos tu playbook, librerías y calendario listos para operar.",
    accent: "from-primary-400 to-primary-600",
    icon: CheckCircle2,
  },
  {
    title: "Garantía de impacto",
    description: "Si tras 30 días no ves +30% en alcance o leads, repetimos el sprint gratis.",
    accent: "from-action-success to-emerald-500",
    icon: Shield,
  },
  {
    title: "Cancelación flexible",
    description: "Sin contratos. Pausa o reactiva cuando quieras. Conservas tus datos y prompts.",
    accent: "from-complementary-purple to-complementary-pink",
    icon: Zap,
  },
];

export function Pricing() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");

  return (
    <section
      id="pricing"
      className="relative overflow-hidden bg-gradient-to-b from-slate-50 via-white to-white py-24"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(3,115,254,0.08),transparent_55%)]" />
      <div className="relative mx-auto max-w-6xl px-6">
        <ScrollReveal direction="up">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary">
              Pricing claro
            </p>
            <h2 className="mt-4 text-3xl font-semibold text-slate-900 md:text-4xl">
              Planes modernos con profundidad profesional
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Cambia de plan o cancela cuando quieras. Todos incluyen soporte humano y comunidad.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal direction="scale" delay={200}>
          <div className="mx-auto mt-10 flex max-w-md items-center justify-between rounded-2xl border border-white/80 bg-white/90 p-3 shadow-depth-lg backdrop-blur">
            {["monthly", "annual"].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setBillingCycle(type as "monthly" | "annual")}
                className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  billingCycle === type
                    ? "bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-depth-md"
                    : "text-slate-500"
                }`}
              >
                {type === "monthly" ? "Mensual" : "Anual -22%"}
              </button>
            ))}
          </div>
        </ScrollReveal>

        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {PLANS.map((plan, index) => {
            const price = billingCycle === "monthly" ? plan.monthly : plan.annual;
            const cadence = billingCycle === "monthly" ? "/mes" : "/mes (fact. anual)";

            return (
              <ScrollReveal
                key={plan.name}
                direction={index === 1 ? "scale" : index === 0 ? "left" : "right"}
                delay={index * 120 + 260}
              >
                <div
                  className={`relative h-full rounded-[32px] border border-white/70 bg-white/95 p-8 shadow-depth-2xl backdrop-blur transition hover:-translate-y-1.5 ${
                    plan.highlight ? "ring-4 ring-complementary-orange/10" : ""
                  }`}
                >
                  {plan.highlight && (
                    <div className="absolute -top-4 right-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-complementary-orange to-complementary-coral px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-white shadow-depth-lg">
                      Más elegido
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">
                      {plan.name}
                    </p>
                    <span className={`rounded-full bg-gradient-to-r ${plan.accent} px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-white`}>
                      {plan.badge}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-slate-600">{plan.description}</p>

                  <div className="mt-6 flex items-end gap-2">
                    <span className="text-4xl font-semibold text-slate-900">€{price}</span>
                    <span className="mb-1 text-xs uppercase text-slate-500">{cadence}</span>
                  </div>

                  {billingCycle === "annual" && (
                    <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-action-success/10 px-4 py-1.5 text-xs font-semibold text-action-success">
                      Ahorra 22%
                    </span>
                  )}

                  <ul className="mt-8 space-y-3 text-sm text-slate-600">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <span
                          className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br ${plan.accent} text-white`}
                        >
                          <CheckCircle2 className="h-3 w-3" />
                        </span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    variant={plan.highlight ? "action" : "primary"}
                    size="lg"
                    glow={!!plan.highlight}
                    className="mt-10 w-full"
                  >
                    Agendar demo
                  </Button>

                  <p className="mt-4 text-xs text-slate-400">
                    Incluye comunidad privada, biblioteca de prompts y seguimiento de account manager.
                  </p>
                </div>
              </ScrollReveal>
            );
          })}
        </div>

        <div className="mt-16 grid gap-6 lg:grid-cols-3">
          {GUARANTEES.map(({ title, description, accent, icon: Icon }, idx) => (
            <ScrollReveal
              key={title}
              direction={idx === 1 ? "scale" : idx === 0 ? "left" : "right"}
              delay={idx * 120 + 300}
            >
              <div className="flex h-full items-start gap-4 rounded-3xl border border-white/70 bg-white/90 p-6 shadow-depth-xl backdrop-blur">
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${accent} text-white shadow-depth-md`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-base font-semibold text-slate-900">{title}</p>
                  <p className="mt-2 text-sm text-slate-600">{description}</p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
