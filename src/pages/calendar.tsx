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

type Post = {
  id: string;
  generated_text: string;
  created_at: string;
  viral_score?: number;
};

type BestTimeSlot = {
  hour: number;
  dayOfWeek: number;
  score: number;
  confidence: "high" | "medium" | "low";
  sampleSize: number;
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
  const [bestTimes, setBestTimes] = useState<BestTimeSlot[]>([]);
  const [patternLoading, setPatternLoading] = useState(true);
  const [patternMessage, setPatternMessage] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedPost, setSelectedPost] = useState<string | null>(null);
  const [loadingPosts, setLoadingPosts] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        router.push("/signin");
      } else {
        setLoading(false);
        loadEvents();
        fetchBestTimes(session.access_token);
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
        .order("scheduled_time", { ascending: true })
        .gte("scheduled_time", new Date().toISOString());

      if (error) throw error;

      setEvents(
        data.map((event: {
          id: string;
          post_id?: string;
          scheduled_time: string;
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
          scheduledAt: event.scheduled_time,
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

  const fetchBestTimes = async (token: string) => {
    try {
      setPatternLoading(true);
      const response = await fetch("/api/analytics/engagement-pattern", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Engagement pattern request failed");
      }

      const data = await response.json();
      if (data.hasData && Array.isArray(data.bestTimes)) {
        setBestTimes(data.bestTimes);
        setPatternMessage(null);
      } else {
        setBestTimes([]);
        setPatternMessage(data.message ?? "Comparte más contenido para recibir recomendaciones personalizadas.");
      }
    } catch (error) {
      console.error("Engagement pattern error:", error);
      setBestTimes([]);
      setPatternMessage("No pudimos calcular el mejor horario ahora mismo.");
    } finally {
      setPatternLoading(false);
    }
  };

  const loadPosts = async () => {
    if (!session?.user) return;

    setLoadingPosts(true);
    try {
      const { data, error } = await supabase
        .from("posts")
        .select("id, generated_text, created_at, viral_score")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error("Error loading posts:", error);
      toast.error("Error al cargar posts");
    } finally {
      setLoadingPosts(false);
    }
  };

  const handleSchedule = async () => {
    if (!session || selectedPlatforms.length === 0) {
      toast.error("Selecciona al menos una plataforma");
      return;
    }

    if (!selectedPost) {
      toast.error("Selecciona un post para programar");
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
          postId: selectedPost,
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
        setSelectedPost(null);
        setSelectedPlatforms(["linkedin"]);
        loadEvents();
        fetchBestTimes(token);
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

  const handleOpenScheduleModal = () => {
    setShowScheduleModal(true);
    loadPosts();
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

  const formatBestSlot = (slot: BestTimeSlot) => {
    const dayNames = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
    const hourLabel = `${slot.hour.toString().padStart(2, "0")}:00`;
    const confidenceCopy = slot.confidence === "high" ? "(alta confianza)" : slot.confidence === "medium" ? "(confianza media)" : "(datos limitados)";
    return `${dayNames[slot.dayOfWeek]} a las ${hourLabel} ${confidenceCopy}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navbar session={session} />

      <main className="mx-auto max-w-7xl px-4 py-20 lg:pl-64 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-0 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
              Calendario de Publicaciones
            </h1>
            <p className="text-base md:text-lg text-gray-600 dark:text-gray-300">
              Programa tus posts en los mejores momentos con IA
            </p>
          </div>
          <Button onClick={handleOpenScheduleModal} className="min-h-[48px] w-full md:w-auto">
            <CalendarIcon className="w-5 h-5 md:w-4 md:h-4 mr-2" />
            Programar Post
          </Button>
        </div>

        {/* AI Recommendation Banner */}
        <Card className="mb-8 bg-gradient-to-r from-primary/10 to-transparent border-l-4 border-primary p-5 md:p-6">
          <div className="flex items-start gap-4">
            <Sparkles className="w-8 h-8 md:w-6 md:h-6 text-primary mt-1 flex-shrink-0" />
            <div>
              <h3 className="text-base md:text-sm font-semibold text-gray-900 dark:text-white mb-2 md:mb-1">
                Recomendación de IA
              </h3>
              {patternLoading ? (
                <p className="text-gray-600 dark:text-gray-300 text-base md:text-sm">Calculando tus mejores horarios...</p>
              ) : bestTimes.length > 0 ? (
                <p className="text-gray-600 dark:text-gray-300 text-base md:text-sm">
                  Mejores slots detectados: <strong>{formatBestSlot(bestTimes[0])}</strong>
                  {bestTimes[1] ? ` · ${formatBestSlot(bestTimes[1])}` : ""}
                </p>
              ) : (
                <p className="text-gray-600 dark:text-gray-300 text-base md:text-sm">{patternMessage}</p>
              )}
            </div>
          </div>
        </Card>

        {/* Upcoming Events */}
        <div className="mb-8">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Próximas Publicaciones
          </h2>

          {events.length === 0 ? (
            <Card className="text-center py-12 p-6">
              <div className="max-w-md mx-auto">
                <CalendarIcon className="w-16 h-16 md:w-12 md:h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400 text-base md:text-lg mb-2 font-semibold">
                  No hay publicaciones programadas
                </p>
                <p className="text-gray-400 dark:text-gray-500 text-base md:text-sm mb-6">
                  Crea contenido primero o programa publicaciones existentes
                </p>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    onClick={() => router.push("/dashboard")}
                    className="min-h-[48px] flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-5 h-5" />
                    Generar Post con IA
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={handleOpenScheduleModal}
                    className="min-h-[48px] flex items-center justify-center gap-2"
                  >
                    <CalendarIcon className="w-5 h-5" />
                    Ver Mis Posts
                  </Button>
                </div>

                {/* Helpful Tips */}
                <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 text-left">
                  <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    💡 ¿Cómo empezar?
                  </h4>
                  <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                    <li>1. Genera contenido en el Dashboard</li>
                    <li>2. Guarda los posts que más te gusten</li>
                    <li>3. Vuelve aquí para programarlos</li>
                    <li>4. La IA te sugerirá los mejores horarios</li>
                  </ul>
                </div>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {events.map((event) => (
                <Card key={event.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-5 md:p-6">
                  <div className="flex items-start gap-4 flex-1">
                    <Clock className="w-6 h-6 md:w-5 md:h-5 text-primary mt-1 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        <span className="font-semibold text-gray-900 dark:text-white text-base md:text-sm">
                          {formatDate(event.scheduledAt)}
                        </span>
                        <span
                          className={`text-sm md:text-xs px-3 py-1.5 md:px-2 md:py-1 rounded ${
                            event.status === "scheduled"
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                              : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                          }`}
                        >
                          {event.status}
                        </span>
                      </div>

                      {/* Platforms */}
                      <div className="flex items-center flex-wrap gap-2 mb-3 md:mb-2">
                        {event.platforms.map((platform) => (
                          <span
                            key={platform}
                            className="text-sm md:text-xs flex items-center gap-1.5 md:gap-1 px-3 py-1.5 md:px-2 md:py-1 bg-gray-100 dark:bg-gray-700 rounded"
                          >
                            {platform === "linkedin" && <Linkedin className="w-4 h-4 md:w-3 md:h-3" />}
                            {platform === "twitter" && <Twitter className="w-4 h-4 md:w-3 md:h-3" />}
                            {platform}
                          </span>
                        ))}
                      </div>

                      {/* AI Score */}
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-5 h-5 md:w-4 md:h-4 text-primary" />
                        <span className="text-base md:text-sm text-gray-600 dark:text-gray-400">
                          AI Score: <strong>{event.aiScore.toFixed(1)}</strong>/100
                        </span>
                      </div>

                      {/* Recommendation Factors */}
                      {event.recommendationReason?.factors && (
                        <div className="mt-2 text-sm md:text-xs text-gray-500 dark:text-gray-400">
                          {event.recommendationReason.factors[0]}
                        </div>
                      )}
                    </div>
                  </div>

                  <Button variant="secondary" className="min-h-[48px] md:min-h-0 w-full md:w-auto px-4 py-2 text-base md:text-xs">
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
            <Card className="max-w-2xl w-full p-6 md:p-8 max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-6 md:mb-4">
                Programar Publicación
              </h2>

              <div className="space-y-6 md:space-y-4">
                {/* Post Selection */}
                <div>
                  <label className="block text-base md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Selecciona un Post
                  </label>
                  {loadingPosts ? (
                    <div className="text-center py-4">
                      <Loader size={24} />
                      <p className="text-sm text-gray-500 mt-2">Cargando posts...</p>
                    </div>
                  ) : posts.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                      <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-500 dark:text-gray-400 mb-2">No tienes posts guardados</p>
                      <Button
                        variant="secondary"
                        onClick={() => router.push("/dashboard")}
                        className="mt-2"
                      >
                        Crear Post Ahora
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {posts.map((post) => (
                        <button
                          key={post.id}
                          onClick={() => setSelectedPost(post.id)}
                          className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                            selectedPost === post.id
                              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                              : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                          }`}
                        >
                          <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2 mb-2">
                            {post.generated_text}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                            <span>{new Date(post.created_at).toLocaleDateString('es-ES')}</span>
                            {post.viral_score && (
                              <span className="flex items-center gap-1">
                                <Sparkles className="w-3 h-3" />
                                {post.viral_score.toFixed(0)}
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Date/Time */}
                <div>
                  <label className="block text-base md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Fecha y Hora (opcional)
                  </label>
                  <input
                    type="datetime-local"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-4 py-4 md:py-3 text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <p className="text-base md:text-xs text-gray-500 dark:text-gray-400 mt-2 md:mt-1">
                    Deja en blanco para usar la recomendación de IA
                  </p>
                </div>

                {/* Platforms */}
                <div>
                  <label className="block text-base md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 md:mb-2">
                    Plataformas
                  </label>
                  <div className="space-y-4 md:space-y-2">
                    <label className="flex items-center gap-3 md:gap-2 cursor-pointer min-h-[44px] md:min-h-0">
                      <input
                        type="checkbox"
                        checked={selectedPlatforms.includes("linkedin")}
                        onChange={() => togglePlatform("linkedin")}
                        className="rounded w-5 h-5 md:w-4 md:h-4"
                      />
                      <Linkedin className="w-5 h-5 md:w-4 md:h-4" />
                      <span className="text-base md:text-sm text-gray-700 dark:text-gray-300">LinkedIn</span>
                    </label>
                    <label className="flex items-center gap-3 md:gap-2 cursor-pointer min-h-[44px] md:min-h-0">
                      <input
                        type="checkbox"
                        checked={selectedPlatforms.includes("twitter")}
                        onChange={() => togglePlatform("twitter")}
                        className="rounded w-5 h-5 md:w-4 md:h-4"
                      />
                      <Twitter className="w-5 h-5 md:w-4 md:h-4" />
                      <span className="text-base md:text-sm text-gray-700 dark:text-gray-300">Twitter</span>
                    </label>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button
                    onClick={handleSchedule}
                    disabled={scheduling}
                    className="flex-1 min-h-[48px]"
                  >
                    {scheduling ? "Programando..." : "Programar"}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setShowScheduleModal(false)}
                    className="flex-1 min-h-[48px]"
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
