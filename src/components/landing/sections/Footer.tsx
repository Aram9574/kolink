import { Mail, Linkedin, Twitter } from "lucide-react";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-slate-900 py-16 text-sm text-slate-400">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-12 md:grid-cols-4">
          {/* Brand */}
          <div>
            <p className="text-xl font-bold text-white">Kolink</p>
            <p className="mt-4 max-w-sm text-sm leading-relaxed">
              La plataforma que combina IA y estrategia para que tu voz destaque en LinkedIn.
            </p>
            <div className="mt-6 flex gap-4">
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-slate-400 transition hover:bg-blue-600 hover:text-white"
                aria-label="LinkedIn"
              >
                <Linkedin className="h-5 w-5" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-slate-400 transition hover:bg-blue-400 hover:text-white"
                aria-label="Twitter"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a
                href="mailto:info@kolink.es"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-slate-400 transition hover:bg-green-600 hover:text-white"
                aria-label="Email"
              >
                <Mail className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Product */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-white">Producto</h3>
            <ul className="space-y-3">
              <li>
                <a href="#features" className="transition hover:text-blue-400">
                  Funcionalidades
                </a>
              </li>
              <li>
                <a href="#pricing" className="transition hover:text-blue-400">
                  Precios
                </a>
              </li>
              <li>
                <a href="#reviews" className="transition hover:text-blue-400">
                  Testimonios
                </a>
              </li>
              <li>
                <Link href="/signin" className="transition hover:text-blue-400">
                  Iniciar sesión
                </Link>
              </li>
              <li>
                <Link href="/signup" className="transition hover:text-blue-400">
                  Crear cuenta
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-white">Recursos</h3>
            <ul className="space-y-3">
              <li>
                <a href="#faq" className="transition hover:text-blue-400">
                  FAQ
                </a>
              </li>
              <li>
                <a href="#about" className="transition hover:text-blue-400">
                  Sobre nosotros
                </a>
              </li>
              <li>
                <a href="#contact" className="transition hover:text-blue-400">
                  Contacto
                </a>
              </li>
              <li>
                <a href="/blog" className="transition hover:text-blue-400">
                  Blog
                </a>
              </li>
              <li>
                <a href="/docs" className="transition hover:text-blue-400">
                  Documentación
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-white">Legal</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/legal/privacidad" className="transition hover:text-blue-400">
                  Política de Privacidad
                </Link>
              </li>
              <li>
                <Link href="/legal/terms" className="transition hover:text-blue-400">
                  Términos de Servicio
                </Link>
              </li>
              <li>
                <Link href="/legal/cookies" className="transition hover:text-blue-400">
                  Política de Cookies
                </Link>
              </li>
              <li>
                <Link href="/legal/refund" className="transition hover:text-blue-400">
                  Política de Reembolso
                </Link>
              </li>
              <li>
                <Link href="/legal/gdpr" className="transition hover:text-blue-400">
                  GDPR
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 border-t border-slate-800 pt-8">
          <div className="flex flex-col items-center justify-between gap-4 text-xs md:flex-row">
            <p>© {new Date().getFullYear()} Kolink. Todos los derechos reservados.</p>
            <div className="flex items-center gap-6">
              <span>Hecho con ❤️ en España</span>
              <span>•</span>
              <a href="mailto:info@kolink.es" className="hover:text-blue-400">
                info@kolink.es
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
