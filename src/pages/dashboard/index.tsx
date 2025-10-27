"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import { Session } from "@supabase/supabase-js";
import { supabaseClient } from "@/lib/supabaseClient";
import { motion } from "framer-motion";
import {
  Sparkles,
  Copy,
  Check,
  Trash2,
  Share2,
  BarChart3,
  Activity,
  TrendingUp,
} from "lucide-react";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Loader from "@/components/Loader";
import PlansModal from "@/components/PlansModal";
import ThankYouModal from "@/components/ThankYouModal";
import ExportModal from "@/components/export/ExportModal";
import EditorAI from "@/components/EditorAI";
import { useNotifications } from "@/contexts/NotificationContext";
import Navbar from "@/components/Navbar";

const TOPIC_OPTIONS = [
  "Inteligencia artificial en salud",
  "Crecimiento de SaaS B2B",
  "Storytelling para founders",
  "Productividad con IA",
  "Transformación digital",
  "Estrategia de contenidos",
  "Marketing de comunidad",
];

const PRESET_OPTIONS = [
  {
    id: "insight",
    label: "Escribe un post de insights del sector",
    description: "Comparte aprendizajes accionables del mercado",
  },
  {
    id: "pas",
    label: "Crea un post PAS",
    description: "Estructura Problema-Agitación-Solución",
  },
  {
    id: "repurpose",
    label: "Reformula mi último post viral",
    description: "Genera una versión con nuevo ángulo",
  },
] as const;

type Post = {
  id: string;
  prompt: string;
  generated_text: string;
  created_at: string;
  user_id: string | null;
  viral_score?: number | null;
};

type DashboardProps = {
  session: Session | null | undefined;
};

export default function Dashboard({ session }: DashboardProps) {
  const router = useRouter();
  const userId = session?.user?.id ?? null;
  const [posts, setPosts] = useState<Post[]>([]);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);
  const [plan, setPlan] = useState<string | null>(null);
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [showThankYouModal, setShowThankYouModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportContent, setExportContent] = useState({ content: "", title: "" });
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [fullName, setFullName] = useState<string>("");
  const [redirecting, setRedirecting] = useState(false);
  const [selectedTopics, setSelectedTopics] = useState<string[]>(TOPIC_OPTIONS.slice(0, 3));
  const [activePreset, setActivePreset] = useState<(typeof PRESET_OPTIONS)[number]["id"]>("insight");
  const [viralScore, setViralScore] = useState<number | undefined>(undefined);
  const [toneProfile, setToneProfile] = useState<string>("");
  const { isReady, query } = router;
  const { notifySuccess, notifyError, notifyInfo, checkCreditReminder, setupRealtimeNotifications, cleanupRealtimeNotifications } = useNotifications();
  const autosaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (session === undefined) return;
    if (!session) {
      router.replace("/signin");
    }
  }, [router, session]);

  const loadCredits = useCallback(async () => {
    if (!userId) {
      setCredits(null);
      setPlan(null);
      return;
    }

    const { data, error } = await supabaseClient
      .from("profiles")
      .select("credits, plan, features, full_name, tone_profile")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error loading credits:", error);
      return;
    }

    const creditsValue = data?.credits ?? 0;
    setCredits(creditsValue);
    setPlan(data?.plan ?? "free");
    if (typeof data?.full_name === "string") {
      setFullName(data.full_name);
    }
    if (typeof data?.tone_profile === "string") {
      setToneProfile(data.tone_profile);
    }

    const features = (data?.features as Record<string, unknown>) ?? {};
    const onboardingCompleted = Boolean((features as { onboarding_completed?: boolean }).onboarding_completed);
    const hasName = Boolean(data?.full_name && data.full_name.trim().length > 0);

    if (!onboardingCompleted || !hasName) {
      setRedirecting(true);
      router.replace("/account-setup");
      return;
    }

    checkCreditReminder(creditsValue);
  }, [userId, checkCreditReminder, router]);

  useEffect(() => {
    loadCredits();
  }, [loadCredits]);

  useEffect(() => {
    if (userId) {
      setupRealtimeNotifications(userId);
    }

    return () => {
      cleanupRealtimeNotifications();
    };
  }, [userId, setupRealtimeNotifications, cleanupRealtimeNotifications]);

  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isReady) return;

    const statusParam = query.status;

    const isSuccess = Array.isArray(statusParam)
      ? statusParam.includes("success")
      : statusParam === "success";

    if (isSuccess) {
      setShowThankYouModal(true);
      loadCredits();
      router.replace("/dashboard", undefined, { shallow: true });
    }
  }, [isReady, query, router, loadCredits]);

  useEffect(() => {
    if (!isReady) return;

    const presetParam = query.preset;
    const requestedPreset = Array.isArray(presetParam) ? presetParam[0] : presetParam;

    if (
      requestedPreset &&
      PRESET_OPTIONS.some((preset) => preset.id === requestedPreset) &&
      requestedPreset !== activePreset
    ) {
      setActivePreset(requestedPreset as (typeof PRESET_OPTIONS)[number]["id"]);
    }
  }, [isReady, query, activePreset]);

  useEffect(() => {
    if (!userId || redirecting) {
      setPosts([]);
      return;
    }

    async function fetchPosts() {
      const { data, error } = await supabaseClient
        .from("posts")
        .select("id, prompt, generated_text, created_at, user_id, viral_score")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Error loading posts:", error);
        return;
      }

      if (data) {
        setPosts(data as Post[]);
      }
    }

    fetchPosts();
  }, [userId, redirecting]);

  useEffect(() => {
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }

    if (prompt) {
      autosaveTimeoutRef.current = setTimeout(() => {
        localStorage.setItem("kolink-draft", prompt);
      }, 800);
    } else {
      localStorage.removeItem("kolink-draft");
    }

    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, [prompt]);

  useEffect(() => {
    const draft = localStorage.getItem("kolink-draft");
    if (draft) {
      setPrompt(draft);
      notifyInfo("📝 Borrador recuperado automáticamente");
    }
  }, [notifyInfo]);

  const handleGenerate = async () => {
    if (!session?.user) {
      notifyError("Inicia sesión para generar contenido");
      return;
    }

    if (!prompt.trim()) {
      notifyError("Escribe una idea primero");
      return;
    }

    setLoading(true);

    try {
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        notifyError("Sesión inválida. Vuelve a iniciar sesión");
        setLoading(false);
        return;
      }

      const response = await fetch("/api/post/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          prompt,
          preset: activePreset,
          toneProfile: toneProfile || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 402) {
          notifyError("Sin créditos disponibles. Mejora tu plan para continuar");
          setShowPlansModal(true);
        } else {
          notifyError(data?.error ?? "Error al generar contenido");
        }
        await loadCredits();
        return;
      }

      // Set viral score from API response
      if (data.viralScore?.score !== undefined) {
        setViralScore(data.viralScore.score);
      }

      if (data.recommendations && Array.isArray(data.recommendations)) {
        setRecommendations(
          data.recommendations.map((item: { action?: string } | string) =>
            typeof item === "string" ? item : item.action ?? ""
          )
        );
      }

      const newPost = {
        id: data.postId || Date.now().toString(),
        prompt,
        generated_text: data.content || data.output,
        created_at: new Date().toISOString(),
        user_id: session.user.id,
        viral_score: data.viralScore?.score ?? null,
      };

      setPosts((current) => [newPost, ...current]);

      try {
        const bufferKey = "kolink-write-buffer";
        const existing = localStorage.getItem(bufferKey);
        const parsed: Array<{ id: string; prompt: string; generated_text: string; created_at: string; status: string; title: string }> = existing ? JSON.parse(existing) : [];
        parsed.unshift({
          id: newPost.id,
          prompt: newPost.prompt,
          generated_text: newPost.generated_text,
          created_at: newPost.created_at,
          status: "draft",
          title: newPost.prompt.slice(0, 80),
        });
        localStorage.setItem(bufferKey, JSON.stringify(parsed.slice(0, 20)));
      } catch (error) {
        console.warn("[dashboard] No se pudo almacenar el post generado", error);
      }

      setPrompt("");
      localStorage.removeItem("kolink-draft");

      if (typeof data.remainingCredits === "number") {
        setCredits(data.remainingCredits);
      } else {
        await loadCredits();
      }

      notifySuccess("Contenido generado con éxito");
      redirectTimeoutRef.current = setTimeout(() => {
        router.push("/write");
      }, 3000);
    } catch (error) {
      console.error("Generate error:", error);
      notifyError("Error al conectar con el servidor");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, postId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(postId);
    notifySuccess("Copiado al portapapeles");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (postId: string) => {
    const { error } = await supabaseClient
      .from("posts")
      .delete()
      .eq("id", postId);

    if (error) {
      notifyError("Error al eliminar la publicación");
      return;
    }

    setPosts((current) => current.filter((p) => p.id !== postId));
    notifySuccess("Publicación eliminada");
  };

  const handleExport = (content: string, title: string) => {
    setExportContent({ content, title });
    setShowExportModal(true);
  };

  const toggleTopic = (topic: string) => {
    setSelectedTopics((prev) =>
      prev.includes(topic) ? prev.filter((item) => item !== topic) : [...prev, topic]
    );
  };

  const firstName = useMemo(() => {
    if (fullName.trim()) {
      return fullName.split(" ")[0];
    }
    return session?.user?.email?.split("@")[0] ?? "creador";
  }, [fullName, session?.user?.email]);

  const latestPost = posts[0] ?? null;

  const postsThisWeek = useMemo(() => {
    const threshold = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return posts.filter((post) => new Date(post.created_at).getTime() >= threshold).length;
  }, [posts]);

  const postsThisMonth = useMemo(() => {
    const threshold = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return posts.filter((post) => new Date(post.created_at).getTime() >= threshold).length;
  }, [posts]);

  const averageViralScore = useMemo(() => {
    if (posts.length === 0) return 0;
    const valid = posts.map((post) => Number(post.viral_score) || 0);
    const sum = valid.reduce((acc, val) => acc + val, 0);
    return Math.round((sum / valid.length) * 10) / 10;
  }, [posts]);

  if (session === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader size={40} />
      </div>
    );
  }

  if (redirecting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader size={40} />
      </div>
    );
  }

  return (
    <>
      <Navbar session={session} />
      <div className="min-h-screen bg-slate-50 pb-20 pt-20 lg:pl-64 dark:bg-slate-950">
        <div className="mx-auto max-w-6xl space-y-10 px-4 sm:px-6 lg:px-8">
          <header className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-slate-900 dark:text-white md:text-4xl">
                Hey {firstName} 👋
              </h1>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
                ¿Listo para crear contenido que se haga viral?
              </p>
            </div>
            <Card className="w-full max-w-xs border-blue-100 bg-white p-5 shadow-md dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-blue-50 p-3 text-blue-600">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Plan actual</p>
                  <p className="text-lg font-semibold text-slate-900 capitalize dark:text-white">
                    {plan || "Free"}
                  </p>
                </div>
              </div>
              <div className="mt-4 rounded-2xl bg-blue-50/60 px-4 py-3 text-sm font-semibold text-blue-700">
                Créditos disponibles: {credits ?? "—"}
              </div>
              <Button variant="outline" className="mt-4 w-full" onClick={() => setShowPlansModal(true)}>
                Ver planes
              </Button>
            </Card>
          </header>

          <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Card className="grid gap-6 border-blue-100 bg-white p-8 shadow-xl dark:border-slate-700 dark:bg-slate-900">
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-300">Cuéntale a Kolink AI</p>
                <p className="text-xs text-slate-400">
                  {toneProfile
                    ? `Generaremos contenido con tu tono: ${toneProfile}`
                    : "Describe la idea, objetivo o formato que necesitas..."}
                </p>
              </div>

              <EditorAI
                value={prompt}
                onChange={setPrompt}
                onGenerate={handleGenerate}
                loading={loading}
                viralScore={viralScore}
                recommendations={recommendations}
                placeholder="Describe la idea, objetivo o formato que necesitas... También puedes usar el micrófono 🎤"
              />

              <div className="flex flex-wrap gap-3">
                {PRESET_OPTIONS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setActivePreset(preset.id)}
                    className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                      activePreset === preset.id
                        ? "border-primary bg-primary text-white shadow-md"
                        : "border-slate-200 text-slate-500 hover:border-primary hover:text-primary dark:border-slate-600 dark:text-slate-300"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-slate-400">
                  {activePreset === "repurpose"
                    ? "Usaremos tu último post con mejor desempeño"
                    : "Consejo: sé específico con tu audiencia y CTA"}
                </div>
                <div className="flex gap-3">
                  <Button variant="ghost" onClick={() => { setPrompt(""); setViralScore(undefined); setRecommendations([]); }}>
                    Limpiar
                  </Button>
                </div>
              </div>
            </Card>
          </motion.section>

          <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="border-blue-100 bg-white p-8 shadow-lg dark:border-slate-700 dark:bg-slate-900">
              <div className="flex flex-col gap-2">
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-300">Temas frescos</p>
                <p className="text-xs text-slate-400">Selecciona los temas sobre los que quieres escribir esta semana</p>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                {TOPIC_OPTIONS.map((topic) => {
                  const active = selectedTopics.includes(topic);
                  return (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => toggleTopic(topic)}
                      className={`rounded-full border px-4 py-2 text-sm transition ${
                        active
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-slate-200 text-slate-500 hover:border-primary hover:text-primary"
                      }`}
                    >
                      {topic}
                    </button>
                  );
                })}
              </div>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-400">{selectedTopics.length} temas seleccionados</p>
                <Button variant="outline" className="px-6">Confirmar temas</Button>
              </div>
            </Card>
          </motion.section>

          <section className="grid gap-6 md:grid-cols-[2fr_1fr]">
            <Card className="border-blue-100 bg-white p-6 shadow-md dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Tu último post</h2>
                {latestPost && (
                  <Button variant="ghost" className="text-xs" onClick={() => handleCopy(latestPost.generated_text, latestPost.id)}>
                    {copiedId === latestPost.id ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />} Copiar
                  </Button>
                )}
              </div>
              {latestPost ? (
                <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-200">
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                      {new Date(latestPost.created_at).toLocaleString("es-ES", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                    {latestPost.viral_score && (
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-700">
                        <TrendingUp className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                          {latestPost.viral_score.toFixed(0)}/100
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="whitespace-pre-line leading-relaxed line-clamp-6">{latestPost.generated_text}</p>
                  {recommendations.length > 0 && (
                    <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 text-xs text-slate-600 dark:border-blue-700 dark:bg-blue-900/20 dark:text-slate-300">
                      <p className="mb-2 font-semibold text-slate-800 dark:text-slate-200">Sugerencias</p>
                      <ul className="list-disc space-y-1 pl-5">
                        {recommendations.map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">Aún no has generado publicaciones. Empieza con alguna idea en la parte superior.</p>
              )}
            </Card>

            <Card className="border-blue-100 bg-white p-6 shadow-md dark:border-slate-700 dark:bg-slate-900">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Comparte Kolink</h2>
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-300">
                Da acceso a un colega y consigue 15% de comisión de por vida.
              </p>
              <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-xs font-semibold text-green-600">
                $30 de crédito para ellos · 15% para ti
              </div>
              <Button variant="outline" className="mt-6 w-full" onClick={() => router.push("/profile")}>Compartir Kolink</Button>
            </Card>
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            <Card className="flex items-center justify-between border-blue-100 bg-white p-6 shadow-md dark:border-slate-700 dark:bg-slate-900">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Esta semana</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{postsThisWeek}</p>
              </div>
              <Activity className="h-8 w-8 text-blue-500" />
            </Card>
            <Card className="flex items-center justify-between border-blue-100 bg-white p-6 shadow-md dark:border-slate-700 dark:bg-slate-900">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Este mes</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{postsThisMonth}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </Card>
            <Card className="flex items-center justify-between border-blue-100 bg-white p-6 shadow-md dark:border-slate-700 dark:bg-slate-900">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Score promedio</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{averageViralScore}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-500" />
            </Card>
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Historial</h2>
              <span className="text-xs text-slate-400">{posts.length} posts generados</span>
            </div>
            {posts.length === 0 ? (
              <Card className="border-slate-200 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900">
                No hay publicaciones aún. Genera tu primer post para poblar este espacio.
              </Card>
            ) : (
              <div className="space-y-3">
                {posts.map((post) => (
                  <Card key={post.id} className="border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                            {new Date(post.created_at).toLocaleString("es-ES", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </p>
                          {post.viral_score && (
                            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-700">
                              <TrendingUp className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                                {post.viral_score.toFixed(0)}
                              </span>
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-200 line-clamp-3 whitespace-pre-line">
                          {post.generated_text}
                        </p>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-2">
                        <button
                          onClick={() => handleExport(post.generated_text, post.prompt)}
                          className="rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-500 transition hover:border-primary hover:text-primary dark:border-slate-700 dark:text-slate-300"
                        >
                          <Share2 className="mr-1 h-3.5 w-3.5" /> Exportar
                        </button>
                        <button
                          onClick={() => handleCopy(post.generated_text, post.id)}
                          className="rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-500 transition hover:border-primary hover:text-primary dark:border-slate-700 dark:text-slate-300"
                        >
                          {copiedId === post.id ? <Check className="mr-1 h-3.5 w-3.5 text-primary" /> : <Copy className="mr-1 h-3.5 w-3.5" />} Copiar
                        </button>
                        <button
                          onClick={() => handleDelete(post.id)}
                          className="rounded-xl border border-red-200 px-3 py-2 text-xs text-red-500 transition hover:bg-red-50 dark:border-red-600/50 dark:hover:bg-red-950"
                        >
                          <Trash2 className="mr-1 h-3.5 w-3.5" /> Eliminar
                        </button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </div>

        <PlansModal open={showPlansModal} onOpenChange={setShowPlansModal} userId={userId || undefined} />
        <ThankYouModal
          open={showThankYouModal}
          onOpenChange={setShowThankYouModal}
          plan={plan || "PRO"}
          credits={credits || 0}
        />
        <ExportModal
          open={showExportModal}
          onOpenChange={setShowExportModal}
          content={exportContent.content}
          title={exportContent.title}
        />
      </div>
    </>
  );
}
