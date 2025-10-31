"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/router";
import Button from "@/components/Button";

export function Hero() {
  const router = useRouter();

  const handleScrollToFeatures = () => {
    const element = document.getElementById("features");
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <header id="top" className="bg-gradient-to-b from-white via-blue-50 to-white px-6 py-28">
      <div className="mx-auto flex max-w-6xl flex-col items-center text-center">
        <motion.span
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="inline-flex items-center rounded-full bg-blue-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-blue-600"
        >
          Crece con IA + estrategia
        </motion.span>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mt-6 max-w-4xl text-4xl font-bold text-slate-900 md:text-6xl"
        >
          Convierte LinkedIn en tu canal principal de crecimiento
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mt-4 max-w-2xl text-xl font-semibold text-blue-600"
        >
          Genera y analiza contenido para LinkedIn con IA personalizada
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-4 max-w-2xl text-lg text-slate-600"
        >
          Crea contenido consistente, analiza resultados en tiempo real y recibe feedback profesional sin salir de Kolink.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-10 flex flex-col gap-4 sm:flex-row"
        >
          <Button className="px-8 py-3 text-base" onClick={() => router.push("/signin")}>
            Empieza gratis
          </Button>
          <Button variant="outline" className="px-8 py-3 text-base" onClick={handleScrollToFeatures}>
            Ver cómo funciona
          </Button>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12 grid w-full gap-4 rounded-3xl border border-blue-100 bg-white/80 p-6 shadow-xl sm:grid-cols-3"
        >
          {[
            {
              quote: "Publicamos 5 veces por semana y los leads se triplicaron",
              name: "Marta · Head of Growth",
            },
            {
              quote: "13 000 impresiones en 48h replicando insights de Kolink",
              name: "Iker · Consultant",
            },
            {
              quote: "La comunidad nos ayuda a iterar nuestra voz y mensaje",
              name: "Paula · Founder",
            },
          ].map((item) => (
            <div key={item.name} className="rounded-2xl bg-blue-50/50 p-5 text-left text-sm text-slate-600">
              <p className="font-medium text-slate-800">“{item.quote}”</p>
              <p className="mt-3 text-xs uppercase tracking-[0.2em] text-blue-500">{item.name}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </header>
  );
}
