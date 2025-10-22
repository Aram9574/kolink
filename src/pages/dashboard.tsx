import { useCallback, useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import { Session } from "@supabase/supabase-js";
import { supabaseClient } from "@/lib/supabaseClient";
import { motion } from "framer-motion";
import { Sparkles, Copy, Check, Plus, Trash2, CreditCard, Share2 } from "lucide-react";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Loader from "@/components/Loader";
import EditorAI from "@/components/EditorAI";
import PlansModal from "@/components/PlansModal";
import ThankYouModal from "@/components/ThankYouModal";
import ExportModal from "@/components/export/ExportModal";
import { useNotifications } from "@/contexts/NotificationContext";

type Post = {
  id: string;
  prompt: string;
  generated_text: string;
  created_at: string;
  user_id: string | null;
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
  const [viralScore, setViralScore] = useState<number | undefined>();
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const { isReady, query} = router;
  const { notifySuccess, notifyError, notifyInfo, checkCreditReminder, setupRealtimeNotifications, cleanupRealtimeNotifications } = useNotifications();
  const autosaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (session === undefined) return;
    if (!session) {
      router.replace("/signin");
    }
  }, [router, session]);

  // Load credits and plan
  const loadCredits = useCallback(async () => {
    if (!userId) {
      setCredits(null);
      setPlan(null);
      return;
    }

    const { data, error } = await supabaseClient
      .from("profiles")
      .select("credits, plan")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error loading credits:", error);
      return;
    }

    const creditsValue = data?.credits ?? 0;
    setCredits(creditsValue);
    setPlan(data?.plan ?? "free");

    // Check if we should show credit reminder
    checkCreditReminder(creditsValue);
  }, [userId, checkCreditReminder]);

  useEffect(() => {
    loadCredits();
  }, [loadCredits]);

  // Setup realtime notifications when user is authenticated
  useEffect(() => {
    if (userId) {
      setupRealtimeNotifications(userId);
    }

    return () => {
      cleanupRealtimeNotifications();
    };
  }, [userId, setupRealtimeNotifications, cleanupRealtimeNotifications]);

  // Handle post-payment success
  useEffect(() => {
    if (!isReady) return;

    const statusParam = query.status;

    const isSuccess = Array.isArray(statusParam)
      ? statusParam.includes("success")
      : statusParam === "success";

    if (isSuccess) {
      setShowThankYouModal(true);
      loadCredits();
      // Clean URL
      router.replace("/dashboard", undefined, { shallow: true });
    }
  }, [isReady, query, router, loadCredits]);

  // Load posts
  useEffect(() => {
    if (!userId) {
      setPosts([]);
      return;
    }

    async function fetchPosts() {
      const { data, error } = await supabaseClient
        .from("posts")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        console.error("Error loading posts:", error);
        return;
      }

      if (data) {
        setPosts(data as Post[]);
      }
    }

    fetchPosts();
  }, [userId]);

  // Autosave prompt to localStorage with debounce and notification
  useEffect(() => {
    // Clear existing timeout
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }

    if (prompt) {
      // Debounce autosave (wait 1 second after user stops typing)
      autosaveTimeoutRef.current = setTimeout(() => {
        localStorage.setItem("kolink-draft", prompt);
        // Silent autosave - no notification needed as we show "Guardado automáticamente" in UI
      }, 1000);
    } else {
      localStorage.removeItem("kolink-draft");
    }

    // Cleanup timeout on unmount
    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, [prompt]);

  // Load draft from localStorage on mount
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

      const res = await fetch("/api/post/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 402) {
          notifyError("Sin créditos disponibles. Mejora tu plan para continuar");
          setShowPlansModal(true);
        } else {
          notifyError(data?.error ?? "Error al generar contenido");
        }
        await loadCredits();
        return;
      }

      // Update viral score and recommendations
      if (data.viralScore) {
        setViralScore(data.viralScore.score);
      }
      if (data.recommendations && Array.isArray(data.recommendations)) {
        setRecommendations(data.recommendations.map((r: { action?: string } | string) =>
          typeof r === 'string' ? r : (r.action || '')
        ));
      }

      setPosts((current) => [
        {
          id: data.postId || Date.now().toString(),
          prompt,
          generated_text: data.content || data.output,
          created_at: new Date().toISOString(),
          user_id: session.user.id,
        },
        ...current,
      ]);

      setPrompt("");
      localStorage.removeItem("kolink-draft");

      if (typeof data.remainingCredits === "number") {
        setCredits(data.remainingCredits);
      } else {
        await loadCredits();
      }

      if (typeof data.plan === "string") {
        setPlan(data.plan);
      }

      notifySuccess("Contenido generado con éxito");
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

  // [Phase 5] Handle export
  const handleExport = (content: string, title: string) => {
    setExportContent({ content, title });
    setShowExportModal(true);
  };

  if (session === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12">
      <div className="mx-auto max-w-6xl px-4 pt-8">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent-muted dark:bg-surface-dark border border-primary/20 mb-4">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">KOLINK v0.4 – Editor IA</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">
            Genera contenido optimizado con IA
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Guarda tus ideas y planifica tu estrategia de contenido en un solo lugar
          </p>
        </motion.header>

        {/* Credits Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-lg font-semibold mb-1">
                {credits === null ? (
                  <span className="flex items-center gap-2">
                    <Loader size={16} />
                    Cargando créditos...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    {credits} créditos disponibles
                  </span>
                )}
              </p>
              <p className="text-sm text-muted-foreground">
                Plan actual: <span className="font-medium capitalize">{plan || "free"}</span>
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowPlansModal(true)}
              className="flex items-center gap-2"
            >
              <CreditCard className="h-4 w-4" />
              Mejora tu plan
            </Button>
          </Card>
        </motion.div>

        {/* Generator Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="mb-8">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <label htmlFor="prompt" className="text-sm font-semibold flex items-center gap-2">
                  <Plus className="h-4 w-4 text-primary" />
                  Nueva idea o tema
                </label>
                {prompt && (
                  <span className="text-xs text-muted-foreground">
                    Guardado automáticamente
                  </span>
                )}
              </div>

              <EditorAI
                value={prompt}
                onChange={setPrompt}
                onGenerate={handleGenerate}
                loading={loading}
                viralScore={viralScore}
                recommendations={recommendations}
                placeholder="Escribe aquí tu idea, tema o descripción para generar contenido con IA..."
              />

              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="flex gap-3 w-full sm:w-auto">
                  {prompt && (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setPrompt("");
                        setViralScore(undefined);
                        setRecommendations([]);
                        localStorage.removeItem("kolink-draft");
                      }}
                      className="flex items-center gap-2"
                    >
                      Limpiar
                    </Button>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  ⌘ + Enter para generar rápido
                </span>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Posts List */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Historial de Ideas</h2>
            <span className="text-sm text-muted-foreground">
              {posts.length} {posts.length === 1 ? "idea" : "ideas"}
            </span>
          </div>

          {posts.length === 0 ? (
            <Card className="text-center py-12">
              <Sparkles className="h-12 w-12 text-primary mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground mb-2">
                Aún no has generado ninguna idea
              </p>
              <p className="text-sm text-muted-foreground">
                Escribe tu primera idea arriba y genera contenido con IA
              </p>
            </Card>
          ) : (
            <div className="grid gap-4">
              {posts.map((post, index) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <p className="text-xs text-muted-foreground">
                        {new Date(post.created_at).toLocaleString("es-ES", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleExport(post.generated_text, post.prompt)}
                          className="p-2 rounded-lg hover:bg-surface-light dark:hover:bg-surface-dark transition-colors"
                          aria-label="Exportar"
                          title="Exportar contenido"
                        >
                          <Share2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleCopy(post.generated_text, post.id)}
                          className="p-2 rounded-lg hover:bg-surface-light dark:hover:bg-surface-dark transition-colors"
                          aria-label="Copiar"
                        >
                          {copiedId === post.id ? (
                            <Check className="h-4 w-4 text-primary" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(post.id)}
                          className="p-2 rounded-lg hover:bg-surface-light dark:hover:bg-surface-dark transition-colors text-red-500"
                          aria-label="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                          Prompt
                        </p>
                        <p className="text-sm text-text-light dark:text-text-dark">
                          {post.prompt}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                          Contenido Generado
                        </p>
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <p className="whitespace-pre-line text-sm leading-relaxed">
                            {post.generated_text}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Modals */}
      <PlansModal
        open={showPlansModal}
        onOpenChange={setShowPlansModal}
        userId={userId || undefined}
      />

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
  );
}
