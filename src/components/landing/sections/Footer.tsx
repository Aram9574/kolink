export function Footer() {
  return (
    <footer className="bg-slate-100 py-12 text-sm text-slate-500">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 md:flex-row md:justify-between">
        <div>
          <p className="text-lg font-semibold text-slate-900">Kolink</p>
          <p className="mt-2 max-w-sm text-sm">
            La plataforma que combina IA y estrategia para que tu voz destaque en LinkedIn.
          </p>
        </div>
        <div className="flex flex-wrap gap-8 text-xs font-medium uppercase tracking-[0.25em]">
          <a href="#reviews" className="transition hover:text-blue-600">
            Reviews
          </a>
          <a href="#pricing" className="transition hover:text-blue-600">
            Pricing
          </a>
          <a href="#about" className="transition hover:text-blue-600">
            About
          </a>
          <a href="mailto:info@kolink.es" className="transition hover:text-blue-600">
            Contacto
          </a>
        </div>
      </div>
      <div className="mt-8 border-t border-slate-200" />
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 pt-6 text-xs text-slate-400 md:flex-row">
        <p>© {new Date().getFullYear()} Kolink. Todos los derechos reservados.</p>
        <div className="flex gap-4">
          <a href="/legal/privacy" className="hover:text-blue-600">
            Privacy Policy
          </a>
          <a href="/legal/terms" className="hover:text-blue-600">
            Terms of Service
          </a>
        </div>
      </div>
    </footer>
  );
}
