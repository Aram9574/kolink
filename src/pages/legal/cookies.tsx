import Head from "next/head";
import Link from "next/link";

export default function CookiePolicyPage() {
  return (
    <>
      <Head>
        <title>Política de Cookies | Kolink</title>
      </Head>
      <main className="min-h-screen bg-slate-50 px-4 py-16 dark:bg-slate-950">
        <article className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-10 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <header className="mb-8 space-y-2">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Política de Cookies</h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Última actualización: {new Date().toLocaleDateString("es-ES")}
            </p>
          </header>

          <section className="space-y-6 text-slate-700 dark:text-slate-300">
            <p>
              En Kolink utilizamos cookies y tecnologías similares para garantizar el funcionamiento del servicio, medir
              su rendimiento y mejorar la experiencia de uso. Puedes aceptar todas las cookies, rechazarlas o
              personalizar tus preferencias desde el banner o tu perfil.
            </p>

            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">1. ¿Qué son las cookies?</h2>
            <p>
              Son pequeños archivos que se almacenan en tu navegador cuando visitas un sitio web. Permiten recordar tus
              preferencias, mantener la sesión y recopilar métricas agregadas.
            </p>

            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">2. Cookies que utilizamos</h2>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                <strong>Esenciales (obligatorias):</strong> Mantienen tu sesión, protegen contra fraudes y guardan tus
                preferencias de seguridad.
              </li>
              <li>
                <strong>Analíticas (opcionales):</strong> Con tu consentimiento, usamos PostHog para entender qué
                funcionalidades se utilizan y cómo mejorar Kolink.
              </li>
            </ul>

            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">3. Gestión del consentimiento</h2>
            <p>
              En tu primer acceso mostramos un banner para que elijas tus preferencias. Puedes modificarlas en cualquier
              momento desde <Link href="/profile?section=analytics" className="text-blue-600 hover:underline">
                Configuración &gt; Analytics
              </Link>.
            </p>

            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">4. Cookies de terceros</h2>
            <p>
              Utilizamos proveedores de confianza que actúan como encargados del tratamiento y cumplen RGPD. Actualmente
              trabajamos con PostHog (analítica de producto) y Stripe (pagos). Consulta sus políticas para más
              información.
            </p>

            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">5. Desactivación</h2>
            <p>
              Puedes ajustar la configuración desde tu navegador o el banner de cookies. Ten en cuenta que bloquear las
              cookies esenciales puede impedir el uso del servicio.
            </p>

            <p className="mt-8 text-sm text-slate-600 dark:text-slate-400">
              Si tienes dudas, contacta con nuestro equipo en{" "}
              <a href="mailto:legal@kolink.es" className="text-blue-600 hover:underline">
                legal@kolink.es
              </a>{" "}
              o revisa la{" "}
              <Link href="/legal/privacidad" className="text-blue-600 hover:underline">
                política de privacidad
              </Link>
              .
            </p>
          </section>
        </article>
      </main>
    </>
  );
}
