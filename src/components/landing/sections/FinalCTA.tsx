import Button from "@/components/Button";
import Link from "next/link";

export function FinalCTA() {
  return (
    <section className="bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 py-20">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 px-6 text-center text-white">
        <h2 className="text-3xl font-semibold md:text-4xl">¿Listo para tu próxima publicación viral?</h2>
        <p className="max-w-2xl text-sm text-blue-50/80">
          Únete a creadores y equipos que ya transforman LinkedIn en su principal canal de adquisición. Empieza gratis hoy y recibe feedback experto en la primera semana.
        </p>
        <div className="flex flex-col gap-4 sm:flex-row">
          <Link href="/signin" className="inline-flex">
            <Button className="px-8 py-3 text-base">Empieza gratis</Button>
          </Link>
          <Link href="mailto:info@kolink.es" className="inline-flex">
            <Button variant="outline" className="border-white px-8 py-3 text-base text-white hover:bg-white/10">
              Agenda una demo
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
