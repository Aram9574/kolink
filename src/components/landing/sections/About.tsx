export function AboutSection() {
  return (
    <section id="about" className="bg-white py-24">
      <div className="mx-auto flex max-w-5xl flex-col gap-10 px-6 md:flex-row md:items-center">
        <div className="md:w-1/2">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-blue-600">Nuestra historia</p>
          <h2 className="mt-4 text-3xl font-bold text-slate-900 md:text-4xl">
            Diseñado por creadores que crecieron su audiencia en LinkedIn desde cero
          </h2>
        </div>
        <div className="md:w-1/2 space-y-5 text-base text-slate-600">
          <p>
            Kolink nació al acompañar a consultores y founders que publicaban a diario sin ver resultados. Desde ese
            reto construimos un sistema que combina inteligencia artificial con procesos reales de marketing.
          </p>
          <p className="italic text-slate-500">
            “Si una herramienta no te enseña qué mejorar, solo estás publicando a ciegas”. Por eso nuestro enfoque es
            estratégico: datos accionables, feedback experto y comunidad.
          </p>
          <p>
            Hoy más de 200 equipos utilizan Kolink para convertir LinkedIn en un motor de leads. Estamos obsesionados
            con ayudarte a comunicar mejor y crecer más rápido.
          </p>
        </div>
      </div>
    </section>
  );
}

