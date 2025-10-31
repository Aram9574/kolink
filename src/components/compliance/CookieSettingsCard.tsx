"use client";

import { useMemo } from "react";
import Button from "@/components/Button";
import { useConsent } from "@/contexts/ConsentContext";

export default function CookieSettingsCard() {
  const { status, preferences, acceptAll, rejectAll, updateAnalyticsConsent } = useConsent();

  const statusLabel = useMemo(() => {
    switch (status) {
      case "accepted":
        return "Consentimiento completo";
      case "rejected":
        return "Solo cookies esenciales";
      case "custom":
        return preferences.analytics ? "Analíticas activas" : "Solo esenciales";
      default:
        return "Pendiente de configuración";
    }
  }, [status, preferences.analytics]);

  return (
    <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <header>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Privacidad y consentimiento</h3>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Gestiona cómo Kolink utiliza tus datos. Puedes cambiar de opinión en cualquier momento.
        </p>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/40">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Estado actual</p>
        <p className="mt-2 text-sm font-medium text-slate-800 dark:text-slate-200">{statusLabel}</p>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white">Analíticas de producto</h4>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Nos ayudan a medir el uso de funcionalidades y priorizar mejoras. Nunca compartimos tus datos con
                terceros.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={preferences.analytics}
              onClick={() => updateAnalyticsConsent(!preferences.analytics)}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
                preferences.analytics ? "bg-blue-500" : "bg-slate-300 dark:bg-slate-700"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                  preferences.analytics ? "translate-x-6" : "translate-x-1"
                }`}
              />
              <span className="sr-only">
                {preferences.analytics ? "Desactivar analíticas" : "Activar analíticas"}
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" onClick={rejectAll}>
          Solo cookies esenciales
        </Button>
        <Button onClick={acceptAll}>Aceptar todo</Button>
      </div>
    </div>
  );
}
