"use client";

import { motion } from "framer-motion";
import { Check, X } from "lucide-react";

const FEATURES = [
  {
    category: "Generación de contenido",
    items: [
      { name: "Publicaciones IA al mes", starter: "10", growth: "30", scale: "90" },
      { name: "Plantillas personalizadas", starter: true, growth: true, scale: true },
      { name: "Editor avanzado", starter: false, growth: true, scale: true },
      { name: "Repurposing de contenido", starter: false, growth: true, scale: true },
      { name: "Biblioteca de inspiración", starter: false, growth: true, scale: true },
    ],
  },
  {
    category: "Analytics e Insights",
    items: [
      { name: "Panel de métricas básicas", starter: true, growth: true, scale: true },
      { name: "Analytics avanzados", starter: false, growth: true, scale: true },
      { name: "Insights de tendencias", starter: false, growth: true, scale: true },
      { name: "Reportes personalizados", starter: false, growth: false, scale: true },
      { name: "Forecasting con IA", starter: false, growth: false, scale: true },
    ],
  },
  {
    category: "Colaboración",
    items: [
      { name: "Usuarios incluidos", starter: "1", growth: "3", scale: "10" },
      { name: "Workflows colaborativos", starter: false, growth: true, scale: true },
      { name: "Permisos y roles", starter: false, growth: true, scale: true },
      { name: "Calendario compartido", starter: false, growth: true, scale: true },
      { name: "Aprobaciones de equipo", starter: false, growth: false, scale: true },
    ],
  },
  {
    category: "Integraciones",
    items: [
      { name: "Exportación básica", starter: true, growth: true, scale: true },
      { name: "Slack / Notion", starter: false, growth: true, scale: true },
      { name: "HubSpot / Salesforce", starter: false, growth: false, scale: true },
      { name: "API personalizada", starter: false, growth: false, scale: true },
      { name: "Webhooks", starter: false, growth: false, scale: true },
    ],
  },
  {
    category: "Soporte",
    items: [
      { name: "Email support", starter: "24-48h", growth: "<24h", scale: "<12h" },
      { name: "Onboarding guiado", starter: false, growth: true, scale: true },
      { name: "Sesiones grupales", starter: false, growth: "Mensual", scale: "Semanal" },
      { name: "Strategy sessions 1:1", starter: false, growth: false, scale: true },
      { name: "Feedback experto", starter: false, growth: false, scale: "Semanal" },
    ],
  },
];

export function PlanComparison() {
  const renderCell = (value: string | boolean | undefined) => {
    if (typeof value === "boolean") {
      return value ? (
        <Check className="mx-auto h-5 w-5 text-green-500" />
      ) : (
        <X className="mx-auto h-5 w-5 text-slate-300" />
      );
    }
    return <span className="text-sm font-semibold text-slate-700">{value}</span>;
  };

  return (
    <section className="bg-white py-24">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-blue-600">Comparación detallada</p>
          <h2 className="mt-4 text-3xl font-bold text-slate-900 md:text-4xl">
            Encuentra el plan perfecto para ti
          </h2>
          <p className="mt-3 text-lg text-slate-600">
            Todas las funcionalidades comparadas lado a lado
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mt-12 overflow-x-auto"
        >
          <div className="inline-block min-w-full align-middle">
            <div className="overflow-hidden rounded-3xl border border-slate-200 shadow-xl">
              <table className="min-w-full divide-y divide-slate-200 bg-white">
                {/* Header */}
                <thead className="bg-gradient-to-r from-blue-50 to-slate-50">
                  <tr>
                    <th className="px-6 py-5 text-left text-sm font-semibold uppercase tracking-[0.2em] text-slate-600">
                      Funcionalidad
                    </th>
                    <th className="px-6 py-5 text-center">
                      <div className="text-lg font-bold text-slate-900">Starter</div>
                      <div className="mt-1 text-sm text-slate-500">€49/mes</div>
                    </th>
                    <th className="bg-blue-100 px-6 py-5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-lg font-bold text-slate-900">Growth</span>
                        <span className="rounded-full bg-green-500 px-2 py-0.5 text-xs font-semibold text-white">
                          Popular
                        </span>
                      </div>
                      <div className="mt-1 text-sm text-slate-600">€89/mes</div>
                    </th>
                    <th className="px-6 py-5 text-center">
                      <div className="text-lg font-bold text-slate-900">Scale</div>
                      <div className="mt-1 text-sm text-slate-500">€139/mes</div>
                    </th>
                  </tr>
                </thead>

                {/* Body */}
                <tbody className="divide-y divide-slate-100">
                  {FEATURES.flatMap((category, categoryIndex) => [
                    <motion.tr
                      key={`category-${category.category}`}
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: categoryIndex * 0.1 }}
                    >
                      <td colSpan={4} className="bg-slate-50 px-6 py-4">
                        <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-blue-600">
                          {category.category}
                        </h3>
                      </td>
                    </motion.tr>,
                    ...category.items.map((item) => (
                      <tr key={`${category.category}-${item.name}`} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4 text-sm text-slate-700">{item.name}</td>
                        <td className="px-6 py-4 text-center">{renderCell(item.starter)}</td>
                        <td className="bg-blue-50/30 px-6 py-4 text-center">{renderCell(item.growth)}</td>
                        <td className="px-6 py-4 text-center">{renderCell(item.scale)}</td>
                      </tr>
                    ))
                  ])}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-8 text-center"
        >
          <p className="text-sm text-slate-500">
            ¿Necesitas más de 10 usuarios o funcionalidades enterprise?{" "}
            <a href="#contact" className="font-semibold text-blue-600 hover:text-blue-700">
              Contáctanos para un plan personalizado
            </a>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
