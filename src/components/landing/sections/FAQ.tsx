"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

const FAQ_ITEMS = [
  {
    question: "¿Cómo funciona la prueba gratuita?",
    answer: "Accedes a todas las funciones durante 7 días sin necesidad de tarjeta de crédito. Puedes explorar la plataforma completa, generar contenido con IA, y ver analytics. Si no te convence, simplemente no hagas nada y tu cuenta no será cobrada.",
  },
  {
    question: "¿Cómo se integra Kolink con LinkedIn?",
    answer: "Kolink genera y optimiza contenido que luego copias y publicas directamente en LinkedIn. No publicamos automáticamente en tu nombre para mantener tu autenticidad. Próximamente tendremos integración OAuth para facilitar aún más el proceso.",
  },
  {
    question: "¿Cómo funcionan los créditos?",
    answer: "Cada generación de contenido con IA consume 1 crédito. Los créditos se renuevan mensualmente según tu plan: Starter (10), Growth (30), Scale (90). Los créditos no utilizados no se acumulan al mes siguiente.",
  },
  {
    question: "¿Qué pasa con mis datos y privacidad?",
    answer: "Tus datos están protegidos con encriptación de nivel empresarial. Solo los usamos para mejorar tu experiencia. Nunca compartimos tu información con terceros. Cumplimos con GDPR y puedes exportar o eliminar tus datos en cualquier momento.",
  },
  {
    question: "¿Ofrecen reembolsos?",
    answer: "Sí, ofrecemos garantía de reembolso de 30 días sin preguntas. Si no estás satisfecho con Kolink en el primer mes, te devolvemos el 100% de tu dinero. Simplemente contáctanos a info@kolink.es.",
  },
  {
    question: "¿Qué soporte ofrecen?",
    answer: "Todos los planes incluyen soporte por email (respuesta en menos de 24h). Los planes Growth y Scale tienen soporte prioritario, onboarding guiado, sesiones grupales mensuales y acceso a nuestra comunidad privada de creadores.",
  },
  {
    question: "¿Puedo cambiar de plan?",
    answer: "Sí, puedes actualizar o degradar tu plan en cualquier momento. Si actualizas, se prorratea la diferencia. Si degradas, el cambio se aplica en tu siguiente ciclo de facturación.",
  },
  {
    question: "¿Puedo invitar a mi equipo?",
    answer: "Sí. En los planes Growth (hasta 3 usuarios) y Scale (hasta 10 usuarios) puedes añadir miembros de tu equipo, asignar permisos y compartir bibliotecas de contenido. Cada usuario tiene su propio dashboard y créditos.",
  },
  {
    question: "¿Se integra con mis herramientas?",
    answer: "Kolink se conecta con HubSpot, Notion y Slack para sincronizar contenido y recibir notificaciones. Próximamente: Salesforce, ClickUp, y Google Calendar. Si necesitas una integración específica, contáctanos.",
  },
  {
    question: "¿Puedo cancelar en cualquier momento?",
    answer: "Sí, puedes cancelar tu suscripción cuando quieras desde tu panel de control. Mantendrás acceso hasta el final de tu periodo de facturación actual. No hay contratos ni penalizaciones por cancelación.",
  },
  {
    question: "¿La IA comprende mi industria?",
    answer: "Sí, nuestra IA está entrenada en múltiples industrias (B2B SaaS, consultoría, marketing, fintech, HR, etc.). Cuanto más uses la plataforma, mejor aprenderá tu voz y estilo específico. También puedes crear plantillas personalizadas.",
  },
  {
    question: "¿Qué idiomas soporta Kolink?",
    answer: "Actualmente soportamos español e inglés completamente. La IA puede generar contenido en múltiples idiomas incluyendo portugués, francés, alemán e italiano. Contáctanos si necesitas soporte para otro idioma.",
  },
];

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="bg-white py-24">
      <div className="mx-auto max-w-4xl px-6">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-blue-600">FAQ</p>
        <h2 className="mt-4 text-3xl font-bold text-slate-900 md:text-4xl">Resolvemos lo que suele frenar a los creadores</h2>
        <div className="mt-10 space-y-4">
          {FAQ_ITEMS.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={item.question}
                className={`rounded-3xl border ${isOpen ? "border-blue-200 bg-blue-50/60" : "border-slate-200 bg-white"} p-6 shadow transition hover:border-blue-200`}
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="flex w-full items-center justify-between text-left"
                >
                  <span className="text-lg font-semibold text-slate-900">{item.question}</span>
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600 transition-transform ${
                      isOpen ? "rotate-45" : "rotate-0"
                    }`}
                  >
                    <Plus className="h-4 w-4" />
                  </span>
                </button>
                <div
                  className={`grid overflow-hidden text-sm text-slate-600 transition-all ${
                    isOpen ? "mt-4 grid-rows-[1fr]" : "grid-rows-[0fr]"
                  }`}
                >
                  <p className="min-h-0 leading-relaxed">{item.answer}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
