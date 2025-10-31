"use client";

import { useState, useEffect } from "react";
import { Monitor, Smartphone, Tablet, MapPin, Calendar, AlertTriangle, X } from "lucide-react";
import Button from "@/components/Button";
import { supabaseClient } from "@/lib/supabaseClient";
import toast from "react-hot-toast";

interface Session {
  session_id: string;
  device_info: {
    device_type?: string;
    os?: string;
    browser?: string;
  };
  ip_address: string;
  location: {
    country?: string;
    city?: string;
  };
  last_activity: string;
  created_at: string;
  is_current: boolean;
}

export function ActiveSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabaseClient.auth.getSession();

      if (!session) {
        toast.error("No estás autenticado");
        return;
      }

      const response = await fetch("/api/security/sessions/list", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();

      if (result.success) {
        setSessions(result.sessions || []);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Failed to fetch sessions:", error);
      toast.error("Error al cargar las sesiones activas");
    } finally {
      setLoading(false);
    }
  };

  const revokeSession = async (sessionId: string) => {
    try {
      setRevoking(sessionId);
      const { data: { session } } = await supabaseClient.auth.getSession();

      if (!session) {
        toast.error("No estás autenticado");
        return;
      }

      const response = await fetch("/api/security/sessions/revoke", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ sessionId }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Sesión cerrada exitosamente");
        fetchSessions();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Failed to revoke session:", error);
      toast.error("Error al cerrar la sesión");
    } finally {
      setRevoking(null);
    }
  };

  const revokeAllSessions = async () => {
    if (!confirm("¿Estás seguro de que quieres cerrar todas las sesiones activas en otros dispositivos?")) {
      return;
    }

    try {
      setRevoking("all");
      const { data: { session } } = await supabaseClient.auth.getSession();

      if (!session) {
        toast.error("No estás autenticado");
        return;
      }

      const response = await fetch("/api/security/sessions/revoke", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ revokeAll: true }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Todas las sesiones han sido cerradas");
        fetchSessions();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Failed to revoke all sessions:", error);
      toast.error("Error al cerrar las sesiones");
    } finally {
      setRevoking(null);
    }
  };

  const getDeviceIcon = (deviceType?: string) => {
    if (!deviceType) return <Monitor className="h-5 w-5" />;

    switch (deviceType.toLowerCase()) {
      case "mobile":
        return <Smartphone className="h-5 w-5" />;
      case "tablet":
        return <Tablet className="h-5 w-5" />;
      default:
        return <Monitor className="h-5 w-5" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Sesiones activas</h3>
          <p className="mt-1 text-sm text-slate-600">
            Administra los dispositivos donde tu cuenta está activa
          </p>
        </div>

        {sessions.length > 1 && (
          <Button
            variant="outline"
            onClick={revokeAllSessions}
            disabled={revoking === "all"}
            className="text-red-600 hover:bg-red-50 hover:border-red-200"
          >
            {revoking === "all" ? "Cerrando..." : "Cerrar todas"}
          </Button>
        )}
      </div>

      {/* Sessions list */}
      <div className="space-y-4">
        {sessions.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-slate-400" />
            <p className="mt-4 text-sm font-medium text-slate-600">
              No hay sesiones activas
            </p>
          </div>
        ) : (
          sessions.map((session) => (
            <div
              key={session.session_id}
              className={`rounded-2xl border p-6 transition ${
                session.is_current
                  ? "border-blue-200 bg-blue-50"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  {/* Device icon */}
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-full ${
                      session.is_current
                        ? "bg-blue-100 text-blue-600"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {getDeviceIcon(session.device_info?.device_type)}
                  </div>

                  {/* Session info */}
                  <div className="flex-1 space-y-2">
                    <div>
                      <h4 className="font-semibold text-slate-900">
                        {session.device_info?.browser || "Navegador desconocido"} en{" "}
                        {session.device_info?.os || "Sistema desconocido"}
                      </h4>
                      {session.is_current && (
                        <span className="mt-1 inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                          Sesión actual
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 text-sm text-slate-600">
                      {/* Location */}
                      {session.location && (session.location.city || session.location.country) && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span>
                            {session.location.city && session.location.country
                              ? `${session.location.city}, ${session.location.country}`
                              : session.location.city || session.location.country}
                          </span>
                        </div>
                      )}

                      {/* IP Address */}
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs">{session.ip_address}</span>
                      </div>

                      {/* Last activity */}
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>Última actividad: {formatDate(session.last_activity)}</span>
                      </div>

                      {/* Created at */}
                      <div className="text-xs text-slate-500">
                        Iniciada: {formatDate(session.created_at)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Revoke button */}
                {!session.is_current && (
                  <button
                    onClick={() => revokeSession(session.session_id)}
                    disabled={revoking === session.session_id}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    title="Cerrar sesión"
                  >
                    {revoking === session.session_id ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Security tip */}
      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-blue-600" />
          <div className="text-sm text-blue-900">
            <p className="font-semibold">Consejo de seguridad</p>
            <p className="mt-1 text-blue-700">
              Si ves actividad sospechosa o sesiones que no reconoces, ciérralas inmediatamente y cambia tu contraseña.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
