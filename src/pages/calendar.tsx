"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import type { Session } from "@supabase/supabase-js";
import Navbar from "@/components/Navbar";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Loader from "@/components/Loader";
import { supabase } from "@/lib/supabase";
import { Calendar as CalendarIcon, Clock, Sparkles, Linkedin, Twitter } from "lucide-react";
import toast from "react-hot-toast";

type CalendarEvent = {
  id: string;
  postId?: string;
  scheduledAt: string;
  platforms: string[];
  aiScore: number;
  recommendationReason: {
    timezone: string;
    confidence: string;
    factors: string[];
  };
  status: string;
};

export default function CalendarPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["linkedin"]);
  const [scheduling, setScheduling] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        router.push("/signin");
      } else {
        setLoading(false);
        loadEvents();
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const loadEvents = async () => {
    try {
      const { data, error } = await supabase
        .from("calendar_events")
        .select("*")
        .order("scheduled_at", { ascending: true })
        .gte("scheduled_at", new Date().toISOString());

      if (error) throw error;

      setEvents(
        data.map((event: {
          id: string;
          post_id?: string;
          scheduled_at: string;
          platforms: string[];
          ai_score: number;
          recommendation_reason: {
            timezone: string;
            confidence: string;
            factors: string[];
          };
          status: string;
        }) => ({
          id: event.id,
          postId: event.post_id,
          scheduledAt: event.scheduled_at,
          platforms: event.platforms || [],
          aiScore: event.ai_score || 0,
          recommendationReason: event.recommendation_reason || {},
          status: event.status,
        }))
      );
    } catch (error) {
      console.error("Error loading events:", error);
      toast.error("Error al cargar eventos");
    }
  };

  const handleSchedule = async () => {
    if (!session || selectedPlatforms.length === 0) {
      toast.error("Selecciona al menos una plataforma");
      return;
    }

    setScheduling(true);
    try {
      const token = session.access_token;
      const response = await fetch("/api/calendar/schedule", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          datetime: selectedDate || undefined,
          platforms: selectedPlatforms,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });

      const data = await response.json();

      if (data.ok) {
        toast.success("Evento programado exitosamente");
        setShowScheduleModal(false);
        setSelectedDate("");
        setSelectedPlatforms(["linkedin"]);
        loadEvents();
      } else {
        toast.error(data.error || "Error al programar");
      }
    } catch (error) {
      console.error("Schedule error:", error);
      toast.error("Error de conexión");
    } finally {
      setScheduling(false);
    }
  };

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <Navbar session={session} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              Calendario de Publicaciones
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Programa tus posts en los mejores momentos con IA
            </p>
          </div>
          <Button onClick={() => setShowScheduleModal(true)}>
            <CalendarIcon className="w-5 h-5 mr-2" />
            Programar Post
          </Button>
        </div>

        {/* AI Recommendation Banner */}
        <Card className="mb-8 bg-gradient-to-r from-[#F9D65C]/10 to-transparent border-l-4 border-[#F9D65C]">
          <div className="flex items-start gap-4">
            <Sparkles className="w-6 h-6 text-[#F9D65C] mt-1 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                Recomendación de IA
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                El mejor momento para publicar es los <strong>martes y jueves entre las 9:00 y 11:00 AM</strong>.
                Tu audiencia está más activa durante estas franjas horarias.
              </p>
            </div>
          </div>
        </Card>

        {/* Upcoming Events */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Próximas Publicaciones
          </h2>

          {events.length === 0 ? (
            <Card className="text-center py-12">
              <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">
                No hay publicaciones programadas
              </p>
              <p className="text-gray-400 dark:text-gray-500 text-sm">
                Programa tu primer post para comenzar
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {events.map((event) => (
                <Card key={event.id} className="flex items-center justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <Clock className="w-5 h-5 text-[#F9D65C] mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {formatDate(event.scheduledAt)}
                        </span>
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            event.status === "scheduled"
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                              : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                          }`}
                        >
                          {event.status}
                        </span>
                      </div>

                      {/* Platforms */}
                      <div className="flex items-center gap-2 mb-2">
                        {event.platforms.map((platform) => (
                          <span
                            key={platform}
                            className="text-xs flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded"
                          >
                            {platform === "linkedin" && <Linkedin className="w-3 h-3" />}
                            {platform === "twitter" && <Twitter className="w-3 h-3" />}
                            {platform}
                          </span>
                        ))}
                      </div>

                      {/* AI Score */}
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-[#F9D65C]" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          AI Score: <strong>{event.aiScore.toFixed(1)}</strong>/100
                        </span>
                      </div>

                      {/* Recommendation Factors */}
                      {event.recommendationReason?.factors && (
                        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                          {event.recommendationReason.factors[0]}
                        </div>
                      )}
                    </div>
                  </div>

                  <Button variant="secondary" className="px-4 py-2 text-xs">
                    Editar
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Schedule Modal */}
        {showScheduleModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-md w-full">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Programar Publicación
              </h2>

              <div className="space-y-4">
                {/* Date/Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Fecha y Hora (opcional)
                  </label>
                  <input
                    type="datetime-local"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Deja en blanco para usar la recomendación de IA
                  </p>
                </div>

                {/* Platforms */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Plataformas
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedPlatforms.includes("linkedin")}
                        onChange={() => togglePlatform("linkedin")}
                        className="rounded"
                      />
                      <Linkedin className="w-4 h-4" />
                      <span className="text-gray-700 dark:text-gray-300">LinkedIn</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedPlatforms.includes("twitter")}
                        onChange={() => togglePlatform("twitter")}
                        className="rounded"
                      />
                      <Twitter className="w-4 h-4" />
                      <span className="text-gray-700 dark:text-gray-300">Twitter</span>
                    </label>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={handleSchedule}
                    disabled={scheduling}
                    className="flex-1"
                  >
                    {scheduling ? "Programando..." : "Programar"}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setShowScheduleModal(false)}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
