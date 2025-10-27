"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { Session } from "@supabase/supabase-js";
import { supabaseClient } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";
import Card from "@/components/Card";
import Button from "@/components/Button";
import Loader from "@/components/Loader";
import { motion } from "framer-motion";
import { Pencil, Search, Calendar } from "lucide-react";

const TABS = [
  { id: "all", label: "Todos" },
  { id: "draft", label: "Borradores" },
  { id: "approved", label: "Aprobados" },
  { id: "scheduled", label: "Programados" },
  { id: "archived", label: "Archivados" },
] as const;

type PostRecord = {
  id: string;
  title?: string | null;
  prompt: string;
  generated_text: string;
  created_at: string;
  status?: string | null;
};

type WritePageProps = {
  session?: Session | null;
};

export default function WritePage({ session }: WritePageProps) {
  const router = useRouter();
  const [authSession, setAuthSession] = useState<Session | null | undefined>(session);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<PostRecord[]>([]);
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]["id"]>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const resolve = async () => {
      if (authSession === undefined) {
        const { data } = await supabaseClient.auth.getSession();
        setAuthSession(data.session ?? null);
        return;
      }
      if (!authSession) {
        router.replace("/signin");
        return;
      }
      await loadPosts(authSession.user.id);
      setLoading(false);
    };
    resolve();
  }, [authSession, router]);

  const loadPosts = async (userId: string) => {
    const bufferKey = "kolink-write-buffer";
    let bufferEntries: Array<PostRecord> = [];

    try {
      const stored = localStorage.getItem(bufferKey);
      if (stored) {
        const parsed = JSON.parse(stored) as Array<Partial<PostRecord>>;
        if (Array.isArray(parsed)) {
          bufferEntries = parsed
            .filter((item): item is PostRecord => Boolean(item?.id))
            .map((item) => ({
              id: item.id!,
              prompt: item.prompt ?? "",
              generated_text: item.generated_text ?? "",
              created_at: item.created_at ?? new Date().toISOString(),
              status: item.status ?? "draft",
              title: item.title ?? item.prompt ?? "Nuevo borrador",
            }));
        }
      }
    } catch (error) {
      console.warn("[write] No se pudo leer el buffer local", error);
    }

    const { data, error } = await supabaseClient
      .from("posts")
      .select("id, prompt, generated_text, created_at, status, title")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    const supabasePosts = !error && data ? (data as PostRecord[]) : [];

    const combinedMap = new Map<string, PostRecord>();
    [...bufferEntries, ...supabasePosts].forEach((post) => {
      const status = post.status ?? "draft";
      combinedMap.set(post.id, {
        ...post,
        status,
        title: post.title ?? post.prompt ?? "Nuevo borrador",
      });
    });

    setPosts(Array.from(combinedMap.values()));

    try {
      localStorage.removeItem(bufferKey);
    } catch {
      // ignore
    }
  };

  const filteredPosts = useMemo(() => {
    const normalizedSearch = search.toLowerCase();
    return posts.filter((post) => {
      const status = (post.status || "draft").toLowerCase();
      const text = `${post.title ?? ""} ${post.generated_text}`.toLowerCase();
      if (!text.includes(normalizedSearch)) {
        return false;
      }

      if (activeTab === "all") {
        return true;
      }

      if (activeTab === "draft") {
        return ["draft", "borrador", "pending", "pendiente", "sin publicar"].includes(status);
      }

      if (activeTab === "approved") {
        return ["approved", "aprobado", "published", "publicado", "done", "completado"].includes(status);
      }

      if (activeTab === "scheduled") {
        return ["scheduled", "programado"].includes(status);
      }

      return ["archived", "archivado"].includes(status);
    });
  }, [posts, activeTab, search]);

  if (authSession === undefined || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader size={40} />
      </div>
    );
  }

  return (
    <>
      <Navbar session={authSession} />
      <main className="min-h-screen bg-slate-50 pb-20 pt-20 lg:pl-64 dark:bg-slate-950">
        <div className="mx-auto max-w-6xl space-y-8 px-4 sm:px-6 lg:px-8">
          <motion.header
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between"
          >
            <div>
              <h1 className="text-3xl font-semibold text-slate-900 dark:text-white md:text-4xl">
                Escribe
              </h1>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
                Gestiona tus borradores y conviértelos en publicaciones listas para brillar.
              </p>
            </div>
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={() => router.push("/dashboard")}
            >
              <Pencil className="h-4 w-4" /> Nuevo borrador
            </Button>
          </motion.header>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-md dark:border-slate-700 dark:bg-slate-900">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-800">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                      activeTab === tab.id
                        ? "bg-primary text-white shadow"
                        : "text-slate-500 hover:text-primary"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="flex w-full items-center gap-2 md:w-auto">
                <div className="relative w-full md:w-72">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Buscar borradores por título o contenido"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-9 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div className="mt-8 space-y-4">
              {filteredPosts.length === 0 ? (
                <Card className="border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900">
                  No hay publicaciones en esta categoría todavía.
                </Card>
              ) : (
                filteredPosts.map((post) => (
                  <article
                    key={post.id}
                    className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-primary/40 hover:shadow-lg dark:border-slate-700 dark:bg-slate-900"
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">📝</span>
                        <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                          {post.title || post.prompt.slice(0, 60) || "Borrador de publicación"}
                        </h2>
                        <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-500">
                          {activeTab === "draft" ? "Borrador" : activeTab === "approved" ? "Aprobado" : activeTab === "scheduled" ? "Programado" : "Archivado"}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-300 line-clamp-2">
                        {post.generated_text || "Sin contenido generado todavía"}
                      </p>
                      <p className="text-xs text-slate-400">
                        Última edición: {new Date(post.created_at).toLocaleString("es-ES", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                    </div>
                    <div className="hidden flex-col items-end gap-3 text-xs text-slate-400 sm:flex">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(post.created_at).toLocaleDateString("es-ES")}
                      </span>
                      <Button
                        variant="outline"
                        className="text-xs"
                        onClick={() => router.push(`/dashboard?post=${post.id}`)}
                      >
                        Editar
                      </Button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
