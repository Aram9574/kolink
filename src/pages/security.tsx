import { useState } from "react";
import Head from "next/head";
import { Shield, Key, Monitor, AlertTriangle, Lock } from "lucide-react";
import { ActiveSessions } from "@/components/security/ActiveSessions";
import { TwoFactorSetup } from "@/components/security/TwoFactorSetup";

export default function SecurityPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "2fa" | "sessions">("overview");

  const tabs = [
    {
      id: "overview" as const,
      label: "Resumen",
      icon: Shield,
    },
    {
      id: "2fa" as const,
      label: "Autenticación 2FA",
      icon: Key,
    },
    {
      id: "sessions" as const,
      label: "Sesiones activas",
      icon: Monitor,
    },
  ];

  return (
    <>
      <Head>
        <title>Seguridad | KOLINK</title>
      </Head>
      <main className="min-h-screen bg-slate-50 px-4 py-8">
        <div className="mx-auto max-w-6xl space-y-8">
          {/* Header */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <Shield className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Seguridad</h1>
                <p className="text-sm text-slate-600">
                  Protege tu cuenta con medidas de seguridad avanzadas
                </p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-slate-200 overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition ${
                      activeTab === tab.id
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* Security score */}
                <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-slate-50 p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-900">
                        Nivel de seguridad de tu cuenta
                      </h3>
                      <p className="mt-1 text-sm text-slate-600">
                        Mejora la seguridad de tu cuenta activando todas las funciones disponibles
                      </p>

                      <div className="mt-6 space-y-3">
                        {/* Security score bar */}
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                              <div className="h-full w-3/5 bg-gradient-to-r from-orange-500 to-yellow-500" />
                            </div>
                          </div>
                          <span className="text-lg font-bold text-slate-900">60%</span>
                        </div>
                        <p className="text-sm text-slate-600">
                          Seguridad <strong className="text-orange-600">Media</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-yellow-500 text-3xl font-bold text-white shadow-lg">
                      60
                    </div>
                  </div>
                </div>

                {/* Security features */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-slate-900">Características de seguridad</h3>

                  {/* 2FA */}
                  <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-6 transition hover:border-slate-300">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                        <Key className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900">
                          Autenticación de dos factores
                        </h4>
                        <p className="mt-1 text-sm text-slate-600">
                          Agrega una capa extra de seguridad con códigos temporales
                        </p>
                        <span className="mt-2 inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                          No activado
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveTab("2fa")}
                      className="rounded-full bg-blue-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                    >
                      Activar
                    </button>
                  </div>

                  {/* Strong password */}
                  <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                        <Lock className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900">
                          Contraseña fuerte
                        </h4>
                        <p className="mt-1 text-sm text-slate-600">
                          Tu contraseña cumple con todos los requisitos de seguridad
                        </p>
                        <span className="mt-2 inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                          Activado
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Active sessions */}
                  <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-6 transition hover:border-slate-300">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                        <Monitor className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900">
                          Administrar sesiones
                        </h4>
                        <p className="mt-1 text-sm text-slate-600">
                          Revisa y cierra sesiones activas en otros dispositivos
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveTab("sessions")}
                      className="rounded-full border border-slate-300 px-6 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Ver sesiones
                    </button>
                  </div>
                </div>

                {/* Security tips */}
                <div className="rounded-2xl border border-orange-200 bg-orange-50 p-6">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 flex-shrink-0 text-orange-600" />
                    <div className="space-y-2">
                      <h4 className="font-semibold text-orange-900">
                        Recomendaciones de seguridad
                      </h4>
                      <ul className="space-y-2 text-sm text-orange-800">
                        <li className="flex items-start gap-2">
                          <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-600" />
                          Activa la autenticación de dos factores para mayor protección
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-600" />
                          Revisa regularmente las sesiones activas en tu cuenta
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-600" />
                          Nunca compartas tu contraseña o códigos 2FA con nadie
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-600" />
                          Cambia tu contraseña cada 3-6 meses
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "2fa" && (
              <TwoFactorSetup onComplete={() => setActiveTab("overview")} />
            )}

            {activeTab === "sessions" && <ActiveSessions />}
          </div>
        </div>
      </main>
    </>
  );
}
