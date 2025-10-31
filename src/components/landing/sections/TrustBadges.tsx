"use client";

import { motion } from "framer-motion";
import { Users, FileText, TrendingUp, Award } from "lucide-react";

const STATS = [
  {
    icon: Users,
    value: "2,500+",
    label: "Usuarios activos",
    description: "Creadores confiando en Kolink",
  },
  {
    icon: FileText,
    value: "50,000+",
    label: "Posts generados",
    description: "Contenido creado con IA",
  },
  {
    icon: TrendingUp,
    value: "3.5x",
    label: "Mejora promedio",
    description: "En engagement de LinkedIn",
  },
  {
    icon: Award,
    value: "94%",
    label: "Satisfacción",
    description: "De nuestros usuarios",
  },
];

export function TrustBadges() {
  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-blue-600">Confianza respaldada por datos</p>
          <h2 className="mt-4 text-3xl font-bold text-slate-900 md:text-4xl">
            Miles de profesionales ya están creciendo con Kolink
          </h2>
        </motion.div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="group relative overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-white to-blue-50/30 p-6 text-center shadow-lg transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-2xl"
              >
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-600 transition group-hover:bg-blue-600 group-hover:text-white">
                  <Icon className="h-7 w-7" />
                </div>
                <p className="text-4xl font-bold text-slate-900">{stat.value}</p>
                <p className="mt-2 text-sm font-semibold text-slate-700">{stat.label}</p>
                <p className="mt-1 text-xs text-slate-500">{stat.description}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
