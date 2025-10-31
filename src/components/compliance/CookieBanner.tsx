"use client";

import { useState } from "react";
import Link from "next/link";
import { Settings2 } from "lucide-react";
import { useConsent } from "@/contexts/ConsentContext";
import Button from "@/components/Button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function CookieBanner() {
  const { status, isLoading, acceptAll, rejectAll, preferences, updateAnalyticsConsent } = useConsent();
  const [showSettings, setShowSettings] = useState(false);

  if (isLoading || status !== "unknown") {
    return null;
  }

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-[80] flex justify-center px-4 pb-6">
        <div className="max-w-4xl rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-2xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Tu privacidad en Kolink</h2>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Usamos cookies esenciales para que la plataforma funcione. Activa opcionalmente analíticas para
                ayudarnos a mejorar tu experiencia. Lee nuestra{" "}
                <Link href="/legal/cookies" className="font-semibold text-blue-600 hover:underline">
                  política de cookies
                </Link>{" "}
                y{" "}
                <Link href="/legal/privacidad" className="font-semibold text-blue-600 hover:underline">
                  política de privacidad
                </Link>
                .
              </p>
            </div>
            <div className="flex flex-col gap-2 md:flex-row">
              <Button variant="ghost" onClick={rejectAll} className="w-full md:w-auto">
                Solo esenciales
              </Button>
              <Button variant="outline" onClick={() => setShowSettings(true)} className="w-full md:w-auto">
                <Settings2 className="mr-2 h-4 w-4" />
                Personalizar
              </Button>
              <Button onClick={acceptAll} className="w-full md:w-auto">
                Aceptar todo
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Preferencias de cookies</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Elige cómo quieres que Kolink utilice tus datos. Puedes modificar esta configuración en cualquier momento
              desde tu perfil.
            </p>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/40">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">Cookies esenciales</h3>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    Necesarias para que Kolink funcione (inicio de sesión, seguridad, preferencias básicas).
                  </p>
                </div>
                <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                  Siempre activas
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">Analíticas de producto</h3>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    Nos permiten entender el uso de Kolink y mejorar funcionalidades. No compartimos estos datos con
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

          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowSettings(false)}>
              Cerrar
            </Button>
            <Button onClick={() => setShowSettings(false)}>Guardar preferencias</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
