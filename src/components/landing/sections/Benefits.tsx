import { Brain, BarChart3, Sparkles } from "lucide-react";

const BENEFITS = [
  {
    icon: Sparkles,
    title: "Propuesta clara en minutos",
    description: "Briefings guiados que transforman tus ideas en publicaciones con CTA listos para publicar.",
  },
  {
    icon: Brain,
    title: "Insights accionables",
    description: "Detecta el mejor horario, tono y formato con dashboards que muestran qué funciona.",
  },
  {
    icon: BarChart3,
    title: "Seguimiento continuo",
    description: "Recibe alertas cuando un post despega y replica la fórmula antes de que pase la ola.",
  },
];

export function BenefitsSection() {
  return (
    <section id="benefits" className="bg-slate-50 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-blue-600">Beneficios clave</p>
        <h2 className="mt-4 text-3xl font-bold text-slate-900 md:text-4xl">
          Todo lo que necesitas para ganar en LinkedIn sin perder el foco en tu negocio
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {BENEFITS.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-md transition hover:-translate-y-1 hover:border-blue-100 hover:shadow-xl"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-xl font-semibold text-slate-900">{title}</h3>
              <p className="mt-3 text-sm text-slate-600">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
