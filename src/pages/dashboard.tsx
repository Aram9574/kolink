import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Session } from "@supabase/supabase-js";
import { supabaseClient } from "@/lib/supabaseClient";
import toast from "react-hot-toast";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Loader from "@/components/Loader";

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

type PlanTier = "basic" | "standard" | "premium";

const PLAN_LABELS: Record<PlanTier, string> = {
  basic: "Basic",
  standard: "Standard",
  premium: "Premium",
};

const PLAN_OPTIONS: Array<{
  id: PlanTier;
  name: string;
  price: string;
  description: string;
  highlight?: boolean;
}> = [
  {
    id: "basic",
    name: "Basic",
    price: "$9 USD / mes",
    description: "Empieza a crear con las funciones esenciales y créditos limitados.",
  },
  {
    id: "standard",
    name: "Standard",
    price: "$19 USD / mes",
    description: "Equilibrio perfecto entre volumen y herramientas avanzadas para crecer.",
    highlight: true,
  },
  {
    id: "premium",
    name: "Premium",
    price: "$39 USD / mes",
    description: "Máximo rendimiento con prioridad en soporte y recursos ilimitados.",
  },
];

export default function Dashboard({ session }: DashboardProps) {
  const router = useRouter();
  const userId = session?.user?.id ?? null;
  const [posts, setPosts] = useState<Post[]>([]);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);
  const [plan, setPlan] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [checkoutLoadingPlan, setCheckoutLoadingPlan] = useState<PlanTier | null>(null);
  const [successPlan, setSuccessPlan] = useState<PlanTier | null>(null);
  const { isReady, query } = router;
  const statusParam = query.status;
  const planParam = query.plan;

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
      .select("credits, plan")
      .eq("id", userId)
      .single();

    if (error) {
      toast.error("No se pudieron cargar tus créditos.");
      return;
    }

    setCredits(data?.credits ?? 0);
    setPlan(data?.plan ?? "free");
  }, [userId]);

  useEffect(() => {
    loadCredits();
  }, [loadCredits]);

  useEffect(() => {
    if (!isReady) return;
    const isSuccess = Array.isArray(statusParam)
      ? statusParam.includes("success")
      : statusParam === "success";
    const planValue = Array.isArray(planParam) ? planParam[0] : planParam;
    const normalizedPlan = typeof planValue === "string" ? planValue.toLowerCase() : undefined;
    const isValidPlan =
      normalizedPlan && (["basic", "standard", "premium"] as const).includes(normalizedPlan as PlanTier);
    if (isSuccess) {
      setSuccessPlan(isValidPlan ? (normalizedPlan as PlanTier) : null);
      setShowSuccessModal(true);
    }
  }, [isReady, planParam, statusParam]);

  // Cargar posts desde Supabase para el usuario autenticado
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
        .order("created_at", { ascending: false });
      if (error) {
        toast.error("No se pudo cargar tus publicaciones.");
        return;
      }
      if (data) {
        setPosts(data as Post[]);
      }
    }

    fetchPosts();
  }, [userId]);

  if (session === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-lightBg dark:bg-darkBg">
        <Loader />
      </div>
    );
  }

  // Enviar prompt al backend
  const handleGenerate = async () => {
    if (!session?.user) {
      toast.error("Inicia sesión para generar contenido.");
      return;
    }

    if (!prompt.trim()) return toast.error("Escribe una idea primero ✍️");
    setLoading(true);

    try {
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        toast.error("Sesión inválida. Vuelve a iniciar sesión.");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data?.error ?? "Error al generar el post 😢");
        if (res.status === 401) {
          router.replace("/signin");
        }
        if (res.status === 402) {
          setPrompt("");
        }
        await loadCredits();
        return;
      }

      setPosts((current) => [
        {
          id: Date.now().toString(),
          prompt,
          generated_text: data.output,
          created_at: new Date().toISOString(),
          user_id: session.user.id,
        },
        ...current,
      ]);
      setPrompt("");
      if (typeof data.remainingCredits === "number") {
        setCredits(data.remainingCredits);
      } else {
        await loadCredits();
      }
      if (typeof data.plan === "string") {
        setPlan(data.plan);
      }
      toast.success("✨ Post generado con éxito");
    } catch {
      toast.error("Error al conectar con el servidor");
    } finally {
      setLoading(false);
    }
  };

  // Copiar al portapapeles
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("📋 Copiado al portapapeles");
  };

  const handleCheckout = async (selectedPlan: PlanTier) => {
    if (!session?.user) {
      toast.error("Inicia sesión para actualizar tu plan.");
      return;
    }

    setCheckoutLoadingPlan(selectedPlan);

    try {
      const { data } = await supabaseClient.auth.getSession();
      const userIdFromSession = data.session?.user.id;

      if (!userIdFromSession) {
        toast.error("Sesión inválida. Vuelve a iniciar sesión.");
        setCheckoutLoadingPlan(null);
        return;
      }

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: userIdFromSession, plan: selectedPlan }),
      });

      const payload = (await response.json().catch(() => ({}))) as { url?: string; error?: string };

      if (!response.ok) {
        toast.error(payload.error ?? "No se pudo iniciar el checkout.");
        return;
      }

      if (!payload.url) {
        toast.error("No se recibió una URL de Stripe.");
        return;
      }

      setShowPlanModal(false);
      window.location.href = payload.url;
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("No se pudo iniciar el checkout.");
    } finally {
      setCheckoutLoadingPlan(null);
    }
  };

  const openPlanModal = () => {
    if (!session?.user) {
      toast.error("Inicia sesión para actualizar tu plan.");
      return;
    }
    setShowPlanModal(true);
  };

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    setSuccessPlan(null);
    void router.replace("/dashboard", undefined, { shallow: true });
  };

  const getPlanDisplayName = (value: string | null | undefined) => {
    const normalized = value?.toLowerCase();
    if (normalized && PLAN_LABELS[normalized as PlanTier]) {
      return PLAN_LABELS[normalized as PlanTier];
    }
    if (!value) {
      return "Free";
    }
    return value.toUpperCase();
  };

  return (
    <div className="min-h-screen bg-lightBg transition-colors duration-300 dark:bg-darkBg">
      <div className="mx-auto max-w-5xl px-4 pt-24 pb-12">
        <header className="mb-10 text-center">
          <span className="text-sm font-semibold uppercase tracking-widest text-secondary/80 dark:text-accent/80">
            Dashboard
          </span>
          <h1 className="mt-2 text-3xl font-bold text-textMain dark:text-gray-100 sm:text-4xl">
            KOLINK v0.3 – Editor IA
          </h1>
          <p className="mt-3 text-base text-textMain/80 dark:text-gray-400">
            Genera contenido optimizado con IA, guarda tus ideas y trabaja tu estrategia en un solo lugar.
          </p>
        </header>

        <Card className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-secondary dark:text-accent">
              {credits === null
                ? "Cargando créditos..."
                : `Créditos disponibles: ${credits}`}
            </p>
            <p className="text-xs text-textMain/70 dark:text-gray-400">
              Plan actual: {getPlanDisplayName(plan)}
            </p>
          </div>
          <button
            type="button"
            onClick={openPlanModal}
            className="rounded-lg bg-gradient-to-r from-primary to-secondary px-4 py-2 text-sm font-semibold text-white transition hover:from-primary/90 hover:to-secondary/90"
          >
            💎 Mejora tu plan
          </button>
        </Card>

        {/* Formulario */}
        <Card className="mb-10">
          <div className="flex flex-col gap-4">
            <label htmlFor="prompt" className="text-sm font-semibold text-secondary dark:text-gray-200">
              Idea o tema para generar
            </label>
            <textarea
              id="prompt"
              className="min-h-[120px] w-full rounded-xl border border-secondary/20 bg-white/80 p-4 text-base text-textMain shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-gray-700 dark:bg-darkBg/90 dark:text-gray-100 dark:focus:ring-accent/30"
              placeholder="Escribe aquí tu idea o tema..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full sm:w-auto"
              >
                {loading ? "🤖 Generando post..." : "✨ Generar Post"}
              </Button>
              {loading && (
                <div className="flex items-center justify-center sm:justify-start">
                  <Loader />
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Lista de posts */}
        {posts.length === 0 ? (
          <Card className="text-center text-textMain/70 dark:text-gray-400">
            Aún no hay publicaciones generadas. ¡Empieza con tu primera idea!
          </Card>
        ) : (
          <div className="grid gap-6">
            {posts.map((post) => (
              <Card key={post.id} className="space-y-4">
                <p className="text-sm font-medium text-secondary/70 dark:text-accent/70">
                  {new Date(post.created_at).toLocaleString()}
                </p>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-secondary dark:text-gray-200">
                    Prompt
                  </p>
                  <p className="mt-1 text-base text-textMain dark:text-gray-200">{post.prompt}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-secondary dark:text-gray-200">
                    Post generado
                  </p>
                  <p className="mt-1 whitespace-pre-line text-base leading-relaxed text-textMain dark:text-gray-100">
                    {post.generated_text}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-textMain/60 dark:text-gray-400">
                    Ajusta y personaliza antes de publicar ✨
                  </p>
                  <Button
                    variant="ghost"
                    onClick={() => handleCopy(post.generated_text)}
                    className="flex items-center gap-2 text-sm"
                  >
                    📋 Copiar
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
      {showPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-4xl rounded-3xl bg-white p-10 shadow-2xl ring-1 ring-secondary/20 dark:bg-darkBg dark:text-gray-100">
            <div className="flex flex-col items-center text-center">
              <h2 className="text-3xl font-bold text-primary dark:text-accent">Elige tu plan ideal</h2>
              <p className="mt-3 text-sm text-textMain/80 dark:text-gray-300">
                Selecciona la membresía que mejor se ajuste a tus objetivos y continúa con Stripe Checkout.
              </p>
            </div>
            <div className="mt-8 grid gap-6 md:grid-cols-3">
              {PLAN_OPTIONS.map((option) => {
                const isCurrentPlan = plan?.toLowerCase() === option.id;
                const isLoading = checkoutLoadingPlan === option.id;
                return (
                  <div
                    key={option.id}
                    className={`relative flex h-full flex-col rounded-2xl border border-secondary/20 bg-white/90 p-6 text-left shadow-lg transition hover:-translate-y-1 hover:shadow-xl dark:border-gray-700 dark:bg-darkBg/90 ${
                      option.highlight ? "ring-2 ring-secondary/40 dark:ring-accent/50" : ""
                    }`}
                  >
                    {option.highlight && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-white shadow-md dark:bg-accent">
                        Más popular
                      </span>
                    )}
                    <h3 className="text-xl font-semibold text-primary dark:text-accent">{option.name}</h3>
                    <p className="mt-2 text-lg font-bold text-textMain dark:text-gray-100">{option.price}</p>
                    <p className="mt-3 flex-1 text-sm text-textMain/70 dark:text-gray-400">{option.description}</p>
                    <button
                      type="button"
                      onClick={() => handleCheckout(option.id)}
                      disabled={isLoading || isCurrentPlan}
                      className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:text-gray-200 dark:bg-accent dark:hover:bg-accent/90"
                    >
                      {isCurrentPlan ? "Plan actual" : isLoading ? "Redirigiendo..." : "Seleccionar"}
                    </button>
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setShowPlanModal(false)}
              className="mt-8 inline-flex w-full items-center justify-center rounded-full border border-secondary/40 px-4 py-2 text-sm font-semibold text-secondary transition hover:bg-secondary/10 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700/40"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-2xl ring-1 ring-secondary/20 dark:bg-darkBg dark:text-gray-100">
            <h2 className="text-2xl font-bold text-primary dark:text-accent">
              ¡Gracias por tu apoyo!
            </h2>
            <p className="mt-4 text-base text-textMain/80 dark:text-gray-300">
              {`Tu plan ha sido actualizado a ${
                successPlan ? PLAN_LABELS[successPlan].toUpperCase() : "TU PLAN"
              } 🎉`}
            </p>
            <button
              type="button"
              onClick={handleCloseSuccessModal}
              className="mt-8 inline-flex w-full items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 dark:bg-accent dark:hover:bg-accent/90"
            >
              Aceptar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
