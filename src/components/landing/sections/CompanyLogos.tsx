"use client";

import { motion } from "framer-motion";

const COMPANIES = [
  { name: "TechCorp", industry: "SaaS B2B" },
  { name: "Growth Studio", industry: "Marketing Agency" },
  { name: "InnovateHub", industry: "Startup Accelerator" },
  { name: "Digital Minds", industry: "Consulting" },
  { name: "BrandBoost", industry: "Brand Strategy" },
  { name: "FutureScale", industry: "Tech Consulting" },
];

export function CompanyLogos() {
  return (
    <section className="bg-slate-50 py-16">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-blue-600">Marcas que confían en nosotros</p>
          <h2 className="mt-4 text-2xl font-bold text-slate-900 md:text-3xl">
            Empresas y profesionales que ya crecen con Kolink
          </h2>
        </motion.div>

        <div className="mt-12 grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-6">
          {COMPANIES.map((company, index) => (
            <motion.div
              key={company.name}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="group flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-blue-200 hover:shadow-md"
            >
              {/* Logo placeholder - in production, replace with actual logos */}
              <div className="flex h-12 w-full items-center justify-center rounded-lg bg-gradient-to-br from-blue-50 to-slate-50 text-sm font-bold text-blue-600 transition group-hover:from-blue-100 group-hover:to-slate-100">
                {company.name.substring(0, 2).toUpperCase()}
              </div>
              <p className="mt-3 text-center text-xs font-semibold text-slate-900">{company.name}</p>
              <p className="mt-1 text-center text-xs text-slate-400">{company.industry}</p>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-8 text-center text-sm text-slate-500"
        >
          Únete a más de 2,500+ profesionales que transforman su presencia en LinkedIn
        </motion.p>
      </div>
    </section>
  );
}
