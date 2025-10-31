"use client";

import { useEffect, useMemo, useState } from "react";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";

const TESTIMONIALS = [
  {
    name: "Patricia Serrano",
    role: "CMO · SaaS B2B",
    quote: "Kolink nos dio un sistema. Pasamos de publicar una vez al mes a tener pipeline mensual y 3x en demos.",
    rating: 5,
  },
  {
    name: "Pablo Muñoz",
    role: "Founder · Studio Growth",
    quote: "El feedback semanal y la comunidad cambiaron nuestra narrativa. LinkedIn ahora es nuestro principal canal de leads.",
    rating: 5,
  },
  {
    name: "Isabella Ríos",
    role: "Consultora de marca personal",
    quote: "En 90 días, mis posts duplicaron el alcance y cada semana recibo solicitudes de sesiones 1:1.",
    rating: 5,
  },
  {
    name: "Carlos Mendoza",
    role: "Director Marketing · Tech Startup",
    quote: "La IA de Kolink entiende nuestra industria. Generamos contenido técnico de calidad manteniendo nuestra voz auténtica.",
    rating: 5,
  },
  {
    name: "Laura Fernández",
    role: "Consultora de Recursos Humanos",
    quote: "Antes me costaba horas escribir un post. Ahora con Kolink creo contenido de valor en minutos. Mi audiencia ha crecido un 200%.",
    rating: 5,
  },
  {
    name: "Miguel Ángel Torres",
    role: "CEO · Agencia Digital",
    quote: "Implementamos Kolink para todo el equipo. La consistencia en LinkedIn nos ha traído 12 clientes nuevos en 3 meses.",
    rating: 5,
  },
  {
    name: "Sofía Ramírez",
    role: "Coach Ejecutiva",
    quote: "Los analytics me ayudan a entender qué temas resuenan más con mi audiencia. Mis sesiones de coaching se llenan cada mes.",
    rating: 5,
  },
  {
    name: "Javier Ortiz",
    role: "Product Manager · Fintech",
    quote: "La integración con nuestras herramientas y el soporte del equipo han sido excepcionales. Kolink es parte esencial de nuestra estrategia.",
    rating: 5,
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

                  {/* Star rating */}
                  <div className="mt-4 flex gap-1">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>

                  <p className="mt-6 text-lg font-medium text-slate-800">&ldquo;{testimonial.quote}&rdquo;</p>
                </div>
              </article>
            ))}
          </div>

          {/* Navigation controls */}
          <div className="mt-8 flex items-center justify-center gap-8">
            <button
              type="button"
              onClick={() => setActive((prev) => (prev - 1 + total) % total)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-blue-200 bg-white text-blue-600 shadow transition hover:bg-blue-50 hover:border-blue-300"
              aria-label="Testimonio anterior"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2">
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

            <button
              type="button"
              onClick={() => setActive((prev) => (prev + 1) % total)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-blue-200 bg-white text-blue-600 shadow transition hover:bg-blue-50 hover:border-blue-300"
              aria-label="Siguiente testimonio"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
