"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

const FAQ_ITEMS = [
  {
    question: "¿Cómo funciona la prueba gratuita?",
    answer: "Accedes a todas las funciones durante 7 días. No pedimos tarjeta y puedes cancelar cuando quieras.",
  },
  { question: "¿Qué soporte ofrecen?", answer: "Incluimos onboarding guiado, sesiones grupales y canal de soporte prioritario." },
  {
    question: "¿Puedo invitar a mi equipo?",
    answer: "Sí. En los planes Growth y Scale puedes añadir miembros, asignar permisos y compartir bibliotecas de contenido.",
  },
  {
    question: "¿Se integra con mis herramientas?",
    answer: "Kolink se conecta con HubSpot, Notion y Slack. Próximamente: Salesforce y ClickUp.",
  },
];

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="bg-white py-24">
      <div className="mx-auto max-w-4xl px-6">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-blue-600">FAQ</p>
        <h2 className="mt-4 text-3xl font-bold text-slate-900 md:text-4xl">Resolvemos lo que suele frenar a los creadores</h2>
        <div className="mt-10 space-y-4">
          {FAQ_ITEMS.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={item.question}
                className={`rounded-3xl border ${isOpen ? "border-blue-200 bg-blue-50/60" : "border-slate-200 bg-white"} p-6 shadow transition hover:border-blue-200`}
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="flex w-full items-center justify-between text-left"
                >
                  <span className="text-lg font-semibold text-slate-900">{item.question}</span>
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600 transition-transform ${
                      isOpen ? "rotate-45" : "rotate-0"
                    }`}
                  >
                    <Plus className="h-4 w-4" />
                  </span>
                </button>
                <div
                  className={`grid overflow-hidden text-sm text-slate-600 transition-all ${
                    isOpen ? "mt-4 grid-rows-[1fr]" : "grid-rows-[0fr]"
                  }`}
                >
                  <p className="min-h-0 leading-relaxed">{item.answer}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
