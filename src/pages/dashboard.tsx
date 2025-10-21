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

export default function Dashboard({ session }: DashboardProps) {
  const router = useRouter();
  const userId = session?.user?.id ?? null;
  const [posts, setPosts] = useState<Post[]>([]);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);
  const [plan, setPlan] = useState<string | null>(null);
  const [upgradeLoading, setUpgradeLoading] = useState(false);

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

  const handleUpgrade = async () => {
    if (!session?.user) return;
    if (plan === "pro") {
      toast.success("Ya estás en el plan PRO 🚀");
      return;
    }

    setUpgradeLoading(true);
    const { error } = await supabaseClient
      .from("profiles")
      .update({ plan: "pro", credits: 100 })
      .eq("id", session.user.id);

    if (error) {
      toast.error("No se pudo actualizar tu plan.");
      setUpgradeLoading(false);
      return;
    }

    toast.success("Cuenta actualizada a PRO con 100 créditos 🚀");
    await loadCredits();
    setUpgradeLoading(false);
  };

  // Copiar al portapapeles
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("📋 Copiado al portapapeles");
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
              Plan actual: {plan ? plan.toUpperCase() : "—"}
            </p>
          </div>
          <button
            type="button"
            onClick={handleUpgrade}
            disabled={plan === "pro" || upgradeLoading}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {plan === "pro" ? "Plan PRO activo" : "🚀 Upgrade to PRO"}
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
    </div>
  );
}
