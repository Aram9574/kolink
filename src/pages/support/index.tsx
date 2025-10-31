import { useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { BookOpen, LifeBuoy, ListChecks, Sparkles, Youtube, FileText, MessageCircle } from "lucide-react";
import Button from "@/components/Button";
import { cn } from "@/lib/utils";

type TabId = "faq" | "tutorials" | "changelog";

const faqItems = [
  {
    question: "¿Cómo conecto mi cuenta de LinkedIn a Kolink?",
    answer:
      "Ve a Ajustes → Integraciones y sigue el asistente. Asegúrate de autorizar los permisos solicitados y refresca la página si no ves la conexión activa.",
  },
  {
    question: "¿Qué hago si mis posts programados no se publican?",
    answer:
      "Verifica que tengas créditos disponibles y que la conexión con LinkedIn esté activa. También revisa el huso horario configurado en Ajustes → Preferencias.",
  },
  {
    question: "¿Puedo entrenar la IA con ejemplos propios?",
    answer:
      "Sí. En Ajustes → Estilo de contenido puedes subir ejemplos y ajustar tono, longitud y formalidad para personalizar las sugerencias.",
  },
  {
    question: "¿Cómo invito a mi equipo?",
    answer:
      "Desde Ajustes → Equipo puedes enviar invitaciones y asignar roles (Editor, Revisor o Viewer). Se solicitará confirmación antes de enviarlas.",
  },
];

const tutorialSections = [
  {
    title: "Primeros pasos",
    description: "Configura tu perfil, integra LinkedIn y personaliza la IA en menos de 10 minutos.",
    icon: Sparkles,
    links: [
      { label: "Guía de onboarding", href: "/docs/onboarding" },
      { label: "Checklist de conexión LinkedIn", href: "/docs/linkedin" },
    ],
  },
  {
    title: "Contenido y programación",
    description: "Aprende a crear posts con Auto-Pilot, ajustar el estilo y programarlos por huso horario.",
    icon: BookOpen,
    links: [
      { label: "Auto-Pilot y frecuencia personalizada", href: "/docs/auto-pilot" },
      { label: "Editor visual de estilo", href: "/docs/style-editor" },
      { label: "Gestión de calendario", href: "/docs/calendar" },
    ],
  },
  {
    title: "Analítica y equipo",
    description: "Mide resultados, gestiona accesos y sigue el progreso de tu equipo.",
    icon: ListChecks,
    links: [
      { label: "Panel de estadísticas", href: "/docs/analytics" },
      { label: "Roles personalizados y auditoría", href: "/docs/roles" },
    ],
  },
];

const changeLog = [
  {
    version: "v0.4",
    date: "Octubre 2025",
    highlights: [
      "Nuevo módulo de emails transaccionales con Resend",
      "Auto-Pilot con frecuencia personalizada",
      "Centro de ayuda unificado",
    ],
  },
  {
    version: "v0.3",
    date: "Septiembre 2025",
    highlights: [
      "Gamificación con badges y ranking",
      "Modo oscuro y configuraciones de estilo guardadas",
      "Integración mejorada con LinkedIn",
    ],
  },
  {
    version: "v0.2",
    date: "Agosto 2025",
    highlights: [
      "Inspiration Hub con filtros avanzados",
      "Exportación de datos en JSON y CSV",
      "Mejoras de seguridad (2FA, alertas, auditoría)",
    ],
  },
];

export default function SupportCenterPage() {
  const [activeTab, setActiveTab] = useState<TabId>("faq");

  const tabConfig = useMemo(
    () => [
      { id: "faq" as TabId, label: "FAQ", icon: LifeBuoy },
      { id: "tutorials" as TabId, label: "Tutoriales", icon: Youtube },
      { id: "changelog" as TabId, label: "Changelog", icon: FileText },
    ],
    []
  );

  return (
    <>
      <Head>
        <title>Centro de ayuda | Kolink</title>
      </Head>

      <main className="min-h-screen bg-slate-50 px-6 py-16 dark:bg-slate-950">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[2fr_1fr]">
          <section className="space-y-8">
            <header className="space-y-3">
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Centro de ayuda Kolink</h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Encuentra guías rápidas, tutoriales y el histórico de actualizaciones. Todo lo que necesitas para aprovechar Kolink al máximo en un solo lugar.
              </p>
            </header>

            <div className="flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900">
              {tabConfig.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition",
                      activeTab === tab.id
                        ? "bg-blue-600 text-white shadow-lg"
                        : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {activeTab === "faq" && (
              <div className="space-y-4">
                {faqItems.map((item) => (
                  <article
                    key={item.question}
                    className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                  >
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white">{item.question}</h3>
                    <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{item.answer}</p>
                  </article>
                ))}
              </div>
            )}

            {activeTab === "tutorials" && (
              <div className="space-y-6">
                {tutorialSections.map((section) => {
                  const Icon = section.icon;
                  return (
                    <article
                      key={section.title}
                      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-base font-semibold text-slate-900 dark:text-white">{section.title}</h3>
                          <p className="text-sm text-slate-600 dark:text-slate-300">{section.description}</p>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-3">
                        {section.links.map((link) => (
                          <Link
                            key={link.href}
                            href={link.href}
                            className="inline-flex items-center gap-2 rounded-full border border-blue-100 px-4 py-2 text-sm font-medium text-blue-600 transition hover:bg-blue-50 dark:border-blue-900 dark:text-blue-400 dark:hover:bg-blue-900/30"
                          >
                            <BookOpen className="h-4 w-4" />
                            {link.label}
                          </Link>
                        ))}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {activeTab === "changelog" && (
              <div className="space-y-6">
                {changeLog.map((entry) => (
                  <article
                    key={entry.version}
                    className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h3 className="text-base font-semibold text-slate-900 dark:text-white">{entry.version}</h3>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                          {entry.date}
                        </p>
                      </div>
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
                        {entry.highlights.length} novedades
                      </span>
                    </div>
                    <ul className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                      {entry.highlights.map((highlight) => (
                        <li key={highlight} className="flex items-start gap-2">
                          <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-500" />
                          {highlight}
                        </li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            )}
          </section>

          <aside className="flex flex-col gap-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">¿Necesitas ayuda directa?</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Nuestro equipo responde en menos de 24 horas. Adjunta capturas o ejemplos para acelerar la respuesta.
              </p>
              <Button asChild className="mt-4 w-full justify-center">
                <Link href="mailto:soporte@kolink.es?subject=Ayuda%20Kolink">Contactar soporte</Link>
              </Button>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-blue-50 p-6 text-slate-800 shadow-sm dark:border-blue-900 dark:bg-blue-900/30 dark:text-blue-100">
              <h3 className="text-lg font-semibold">Únete a la comunidad</h3>
              <p className="mt-2 text-sm">
                Comparte ideas, obtén feedback y accede a sesiones exclusivas con el equipo de producto.
              </p>
              <Button asChild variant="outline" className="mt-4 w-full justify-center border-white text-slate-800 dark:border-blue-400 dark:text-blue-100">
                <Link href="https://community.kolink.es" target="_blank" rel="noopener noreferrer">
                  Abrir comunidad
                </Link>
              </Button>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">¿Viste algo raro?</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Usa el botón flotante “Reportar bug / sugerencia” en cualquier pantalla o escríbenos directamente a producto.
              </p>
              <div className="mt-4 flex items-center gap-3 rounded-xl bg-slate-100 p-3 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                <MessageCircle className="h-4 w-4" />
                <span>Nos ayudas a priorizar el roadmap para todo el equipo Kolink.</span>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </>
  );
}
