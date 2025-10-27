const DATA = [
  { label: "Mes 1", before: "1.2K impresiones", after: "8.5K impresiones" },
  { label: "Mes 3", before: "3 leads", after: "27 leads" },
  { label: "Mes 6", before: "Sin procesos", after: "Calendario con 4 semanas de buffer" },
];

export function GrowthComparison() {
  return (
    <section id="comparison" className="bg-white py-20">
      <div className="mx-auto max-w-5xl px-6">
        <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 p-[1px] shadow-2xl">
          <div className="rounded-[calc(1.5rem-2px)] bg-white px-8 py-10">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-600">Comparativa real</p>
            <h2 className="mt-4 text-3xl font-bold text-slate-900 md:text-4xl">
              Así evolucionan los creadores que implementan Kolink
            </h2>
            <div className="mt-8 grid gap-6 md:grid-cols-3">
              {DATA.map((item) => (
                <div key={item.label} className="rounded-2xl bg-blue-50/60 p-6 text-sm text-slate-700">
                  <p className="text-blue-600">{item.label}</p>
                  <p className="mt-4 text-xs uppercase text-slate-500">Antes</p>
                  <p className="text-base font-semibold text-slate-800">{item.before}</p>
                  <p className="mt-4 text-xs uppercase text-slate-500">Después con Kolink</p>
                  <p className="text-base font-semibold text-green-600">{item.after}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
