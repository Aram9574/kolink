"use client";

import { useState } from "react";
import Button from "@/components/Button";

const PLANS = [
  {
    name: "Starter",
    monthly: 49,
    annual: 39,
    description: "Para creadores que arrancan su presencia semanal",
    features: ["10 publicaciones IA al mes", "Plantillas personalizadas", "Panel de métricas esenciales"],
  },
  {
    name: "Growth",
    monthly: 89,
    annual: 69,
    description: "El plan favorito de equipos de marketing B2B",
    features: ["30 publicaciones IA", "Workflows colaborativos", "Insights de tendencias", "Support prioritario"],
    highlighted: true,
  },
  {
    name: "Scale",
    monthly: 139,
    annual: 109,
    description: "Para organizaciones que requieren coordinación avanzada",
    features: ["90 publicaciones IA", "Strategy sessions 1:1", "Integraciones CRM", "Feedback experto semanal"],
  },
];

export function Pricing() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");

  return (
    <section id="pricing" className="bg-slate-50 py-24">
      <div className="mx-auto max-w-6xl px-6 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-blue-600">Pricing</p>
        <h2 className="mt-4 text-3xl font-bold text-slate-900 md:text-4xl">Planes que escalan contigo</h2>
        <p className="mt-3 text-sm text-slate-500">Facturación mensual o anual con dos meses gratis. Cancela cuando quieras.</p>

        <div className="mt-8 flex items-center justify-center gap-3">
          <span className={`text-sm ${billingCycle === "monthly" ? "text-slate-900" : "text-slate-400"}`}>Monthly</span>
          <button
            type="button"
            className="flex w-16 items-center rounded-full bg-blue-600/10 p-1"
            onClick={() => setBillingCycle((prev) => (prev === "monthly" ? "annual" : "monthly"))}
          >
            <span
              className={`h-6 w-6 rounded-full bg-blue-600 transition-transform ${billingCycle === "annual" ? "translate-x-8" : "translate-x-0"}`}
            />
          </button>
          <span className={`text-sm ${billingCycle === "annual" ? "text-slate-900" : "text-slate-400"}`}>Annual</span>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {PLANS.map((plan) => {
            const price = billingCycle === "monthly" ? plan.monthly : plan.annual;
            const tag = billingCycle === "monthly" ? "/mes" : "/mes pagado anual";

            return (
              <div
                key={plan.name}
                className={`relative rounded-3xl border border-slate-200 bg-white p-8 text-left shadow-md transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-2xl ${
                  plan.highlighted ? "ring-2 ring-blue-500" : ""
                }`}
              >
                {plan.highlighted && (
                  <span className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-green-500 px-4 py-1 text-xs font-semibold text-white shadow-lg">
                    Most popular
                  </span>
                )}
                <h3 className="text-xl font-semibold text-slate-900">{plan.name}</h3>
                <p className="mt-2 text-sm text-slate-500">{plan.description}</p>
                <div className="mt-6 flex items-end gap-2">
                  <span className="text-4xl font-bold text-slate-900">€{price}</span>
                  <span className="text-xs uppercase text-slate-400">{tag}</span>
                </div>
                {billingCycle === "annual" && plan.highlighted && (
                  <p className="mt-2 inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-600">
                    Ahorra 22%
                  </p>
                )}
                <ul className="mt-6 space-y-3 text-sm text-slate-600">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <span className="mt-1 h-2 w-2 rounded-full bg-green-500" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button className="mt-8 w-full rounded-full py-3">Empieza prueba gratis</Button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
