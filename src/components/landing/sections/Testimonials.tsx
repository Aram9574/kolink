"use client";

import { useEffect, useMemo, useState } from "react";

const TESTIMONIALS = [
  {
    name: "Patricia Serrano",
    role: "CMO · SaaS B2B",
    quote: "Kolink nos dio un sistema. Pasamos de publicar una vez al mes a tener pipeline mensual y 3x en demos.",
  },
  {
    name: "Pablo Muñoz",
    role: "Founder · Studio Growth",
    quote: "El feedback semanal y la comunidad cambiaron nuestra narrativa. LinkedIn ahora es nuestro principal canal de leads.",
  },
  {
    name: "Isabella Ríos",
    role: "Consultora de marca personal",
    quote: "En 90 días, mis posts duplicaron el alcance y cada semana recibo solicitudes de sesiones 1:1.",
  },
];

export function TestimonialsCarousel() {
  const [active, setActive] = useState(0);
  const total = TESTIMONIALS.length;

  const slides = useMemo(() => TESTIMONIALS, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setActive((prev) => (prev + 1) % total);
    }, 6000);
    return () => clearInterval(timer);
  }, [total]);

  return (
    <section id="reviews" className="bg-white py-24">
      <div className="mx-auto max-w-5xl px-6 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-blue-600">Reviews</p>
        <h2 className="mt-4 text-3xl font-bold text-slate-900 md:text-4xl">Historias reales de creadores Kolink</h2>
        <p className="mt-3 text-sm text-slate-500">Pruebas sociales que avalan nuestra metodología y acompañamiento.</p>

        <div className="relative mt-12 overflow-hidden">
          <div
            className="flex transition-transform duration-500 ease-in-out"
            style={{ transform: `translateX(-${active * 100}%)` }}
          >
            {slides.map((testimonial) => (
              <article
                key={testimonial.name}
                className="w-full flex-shrink-0 px-2 md:px-6"
              >
                <div className="rounded-3xl border border-blue-100 bg-white p-10 text-left shadow-xl">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-base font-semibold text-blue-600">
                      {testimonial.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">{testimonial.name}</h3>
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{testimonial.role}</p>
                    </div>
                  </div>
                  <p className="mt-6 text-lg font-medium text-slate-800">“{testimonial.quote}”</p>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-8 flex items-center justify-center gap-2">
            {slides.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setActive(index)}
                className={`h-3 w-3 rounded-full transition-all ${
                  active === index ? "bg-blue-600 scale-110" : "bg-blue-200 opacity-70"
                }`}
                aria-label={`Ver testimonio ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
