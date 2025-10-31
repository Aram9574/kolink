import Head from "next/head";
import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <>
      <Head>
        <title>Política de Privacidad | Kolink</title>
      </Head>
      <main className="min-h-screen bg-slate-50 px-4 py-16 dark:bg-slate-950">
        <article className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-10 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <header className="mb-8 space-y-2">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Política de Privacidad</h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Última actualización: {new Date().toLocaleDateString("es-ES")}
            </p>
          </header>

          <section className="space-y-6 text-slate-700 dark:text-slate-300">
            <p>
              En Kolink nos tomamos muy en serio la privacidad de tus datos. Esta política describe qué información
              recopilamos, cómo la usamos y qué opciones tienes para gestionarla. Aplicamos la normativa europea de
              protección de datos (RGPD) y contamos con medidas técnicas y organizativas para proteger tu información.
            </p>

            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">1. Responsable del tratamiento</h2>
            <p>
              Kolink es operado por Kolink Labs S.L. Puedes contactar con nosotros en{" "}
              <a href="mailto:legal@kolink.es" className="text-blue-600 hover:underline">
                legal@kolink.es
              </a>{" "}
              para cualquier cuestión relacionada con la protección de datos.
            </p>

            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">2. Datos que recopilamos</h2>
            <ul className="list-disc space-y-2 pl-6">
              <li>Datos de cuenta: nombre, email, empresa y preferencias del workspace.</li>
              <li>Datos de uso: actividad en la plataforma, funcionalidades utilizadas y rendimiento de publicaciones.</li>
              <li>Integraciones: tokens de acceso y metadatos necesarios para conectar servicios como LinkedIn.</li>
              <li>Soporte: mensajes enviados mediante formularios de ayuda o feedback.</li>
            </ul>

            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">3. Finalidad y legitimación</h2>
            <p>Tratamos tus datos para:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Prestar el servicio contratado y mantener tu cuenta (base legal: ejecución de contrato).</li>
              <li>Mejorar el producto mediante analíticas agregadas (base legal: consentimiento explícito).</li>
              <li>Enviar comunicaciones relevantes sobre el servicio (base legal: interés legítimo).</li>
              <li>Cumplir obligaciones legales y prevenir fraude (base legal: obligación legal).</li>
            </ul>

            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">4. Conservación</h2>
            <p>
              Conservamos los datos mientras tengas una cuenta activa. Si la cierras, mantendremos información mínima
              durante 12 meses para atender obligaciones legales o disputas.
            </p>

            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">5. Destinatarios</h2>
            <p>
              Trabajamos con proveedores de infraestructura y analítica (como Supabase, Stripe, Resend y PostHog). Todos
              ellos cumplen RGPD y firmamos acuerdos de tratamiento. No vendemos tus datos.
            </p>

            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">6. Derechos</h2>
            <p>
              Puedes solicitar acceso, rectificación, supresión, portabilidad, oposición o limitación del tratamiento.
              Escríbenos a{" "}
              <a href="mailto:legal@kolink.es" className="text-blue-600 hover:underline">
                legal@kolink.es
              </a>{" "}
              indicando tu petición y responderemos en un máximo de 30 días.
            </p>

            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">7. Transferencias internacionales</h2>
            <p>
              Algunos proveedores pueden tratar datos fuera del EEE (por ejemplo, en EE.UU.). Garantizamos cláusulas
              contractuales tipo y medidas adicionales para proteger la información.
            </p>

            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">8. Seguridad</h2>
            <p>
              Aplicamos cifrado en tránsito y en reposo, autenticación multifactor opcional, auditorías internas y
              registros de actividad administrativa. Si detectamos una brecha de seguridad, te informaremos siguiendo la
              normativa vigente.
            </p>

            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              9. Cambios en esta política
            </h2>
            <p>
              Podemos actualizar esta política para reflejar cambios legales o funcionales. Notificaremos en Kolink y
              por correo (si aplica) con antelación razonable.
            </p>

            <p className="mt-8 text-sm text-slate-600 dark:text-slate-400">
              ¿Más dudas? Visita la{" "}
              <Link href="/legal/cookies" className="text-blue-600 hover:underline">
                política de cookies
              </Link>{" "}
              o contacta con nuestro DPO en{" "}
              <a href="mailto:dpo@kolink.es" className="text-blue-600 hover:underline">
                dpo@kolink.es
              </a>
              .
            </p>
          </section>
        </article>
      </main>
    </>
  );
}
