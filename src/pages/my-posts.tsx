"use client";

import { logger } from '@/lib/logger';
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import type { Session } from "@supabase/supabase-js";
import {
  CalendarClock,
  CheckSquare,
  Edit3,
  Heart,
  HeartOff,
  Loader2,
  MoreHorizontal,
  Search,
  Share2,
  Sparkles,
  Square,
  Trash2,
  UploadCloud,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Card from "@/components/Card";
import Button from "@/components/Button";
import Loader from "@/components/Loader";
import { supabaseClient } from "@/lib/supabaseClient";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

const STATUS_TABS = [
  { id: "all", label: "Todos" },
  { id: "draft", label: "Borradores" },
  { id: "scheduled", label: "Programados" },
  { id: "published", label: "Publicados" },
  { id: "favorite", label: "Favoritos" },
] as const;

type StatusTabId = (typeof STATUS_TABS)[number]["id"];

type RawPost = {
  id: string;
  prompt: string;
  generated_text?: string | null;
  content?: string | null;
  title?: string | null;
  status?: string | null;
  style?: string | null;
  hashtags?: string[] | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  updated_at?: string | null;
};

type ManagedPost = {
  id: string;
  title: string;
  prompt: string;
  body: string;
  createdAt: string;
  updatedAt?: string | null;
  status: string;
  type: string;
  hashtags: string[];
  isFavorite: boolean;
  scheduledFor?: string | null;
  mediaCount: number;
  metadata: Record<string, unknown>;
};

const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50] as const;

function normalizePost(raw: RawPost): ManagedPost {
  const metadata = (raw.metadata as Record<string, unknown> | null) ?? {};
  const statusMeta = typeof metadata.status === "string" ? metadata.status : undefined;
  const favoriteMeta =
    typeof metadata.is_favorite === "boolean"
      ? metadata.is_favorite
      : metadata.favorite === true;
  const scheduled =
    typeof metadata.scheduled_for === "string"
      ? metadata.scheduled_for
      : metadata.scheduledFor === null || metadata.scheduledFor === undefined
        ? null
        : (metadata.scheduledFor as string);
  const mediaAssets = Array.isArray(metadata.media_assets) ? metadata.media_assets : [];

  const fallbackTitle = raw.title ?? raw.prompt ?? "Nuevo post generado";
  const body = raw.content ?? raw.generated_text ?? "";

  return {
    id: raw.id,
    prompt: raw.prompt,
    body,
    title: fallbackTitle.trim() ? fallbackTitle : raw.prompt.slice(0, 80),
    createdAt: raw.created_at,
    updatedAt: raw.updated_at ?? null,
    status: (raw.status ?? statusMeta ?? "draft").toLowerCase(),
    type: (raw.style ?? (metadata.post_type as string) ?? "Estándar").toString(),
    hashtags: Array.isArray(raw.hashtags) ? raw.hashtags : [],
    isFavorite: Boolean(favoriteMeta),
    scheduledFor: scheduled ?? null,
    mediaCount: mediaAssets.length,
    metadata,
  };
}

function formatDate(value?: string | null) {
  if (!value) return "Sin fecha";
  return new Date(value).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getStatusBadge(status: string) {
  const normalized = status.toLowerCase();
  if (["published", "publicado", "published_live"].includes(normalized)) {
    return {
      label: "Publicado",
      className: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    };
  }
  if (["scheduled", "programado"].includes(normalized)) {
    return {
      label: "Programado",
      className: "bg-indigo-50 text-indigo-700 border border-indigo-200",
    };
  }
  if (["favorite", "destacado"].includes(normalized)) {
    return {
      label: "Destacado",
      className: "bg-amber-50 text-amber-700 border border-amber-200",
    };
  }
  return {
    label: "Borrador",
    className: "bg-slate-100 text-slate-600 border border-slate-200",
  };
}

export default function MyPostsPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<ManagedPost[]>([]);
  const [activeTab, setActiveTab] = useState<StatusTabId>("all");
  const [search, setSearch] = useState("");
  const [itemsPerPage, setItemsPerPage] =
    useState<(typeof ITEMS_PER_PAGE_OPTIONS)[number]>(ITEMS_PER_PAGE_OPTIONS[0]);
  const [currentPage, setCurrentPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [processingIds, setProcessingIds] = useState<string[]>([]);

  useEffect(() => {
    const fetchSession = async () => {
      const { data } = await supabaseClient.auth.getSession();
      setSession(data.session ?? null);
    };
    fetchSession();
  }, []);

  useEffect(() => {
    if (session === undefined) return;
    if (session === null) {
      router.replace("/signin");
      return;
    }

    const load = async () => {
      setLoading(true);
      const { data, error } = await supabaseClient
        .from("posts")
        .select(
          "id, prompt, generated_text, content, title, status, style, hashtags, metadata, created_at, updated_at"
        )
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (error) {
        logger.error("[my-posts] Error cargando posts:", error);
        toast.error("No se pudieron cargar tus publicaciones");
        setPosts([]);
      } else {
        const normalized = Array.isArray(data)
          ? (data as RawPost[]).map(normalizePost)
          : [];
        setPosts(normalized);
      }
      setLoading(false);
    };

    load();
  }, [session, router]);

  const filteredPosts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return posts.filter((post) => {
      const matchesSearch =
        !normalizedSearch ||
        [post.title, post.prompt, post.body, post.type]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch) ||
        post.hashtags.some((tag) => tag.toLowerCase().includes(normalizedSearch));

      if (!matchesSearch) {
        return false;
      }

      if (activeTab === "all") return true;
      if (activeTab === "favorite") return post.isFavorite;
      if (activeTab === "published") {
        return ["published", "publicado"].includes(post.status);
      }
      if (activeTab === "scheduled") {
        return ["scheduled", "programado"].includes(post.status);
      }
      return ["draft", "borrador", "pending"].includes(post.status);
    });
  }, [posts, search, activeTab]);

  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / itemsPerPage));
  const clampedPage = Math.min(currentPage, totalPages);

  useEffect(() => {
    if (currentPage !== clampedPage) {
      setCurrentPage(clampedPage);
    }
  }, [clampedPage, currentPage]);

  const paginatedPosts = useMemo(() => {
    const start = (clampedPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredPosts.slice(start, end);
  }, [filteredPosts, clampedPage, itemsPerPage]);

  const toggleSelect = (postId: string) => {
    setSelected((prev) =>
      prev.includes(postId) ? prev.filter((id) => id !== postId) : [...prev, postId]
    );
  };

  const toggleSelectAll = () => {
    if (paginatedPosts.every((post) => selected.includes(post.id))) {
      setSelected((prev) => prev.filter((id) => !paginatedPosts.some((p) => p.id === id)));
      return;
    }
    const idsToAdd = paginatedPosts
      .map((post) => post.id)
      .filter((id) => !selected.includes(id));
    setSelected((prev) => [...prev, ...idsToAdd]);
  };

  const refreshPosts = async () => {
    if (!session) return;
    const { data, error } = await supabaseClient
      .from("posts")
      .select(
        "id, prompt, generated_text, content, title, status, style, hashtags, metadata, created_at, updated_at"
      )
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      logger.error("[my-posts] Error recargando posts:", error);
      return;
    }
    const normalized = Array.isArray(data) ? (data as RawPost[]).map(normalizePost) : [];
    setPosts(normalized);
  };

  const updatePostMetadata = async (
    post: ManagedPost,
    patch: Partial<ManagedPost>,
    metadataPatch: Record<string, unknown>
  ) => {
    const nextMetadata = {
      ...post.metadata,
      ...metadataPatch,
    };

    setPosts((prev) =>
      prev.map((item) =>
        item.id === post.id ? { ...item, ...patch, metadata: nextMetadata } : item
      )
    );

    const { error } = await supabaseClient
      .from("posts")
      .update({
        metadata: nextMetadata,
        ...(patch.status ? { status: patch.status } : {}),
      })
      .eq("id", post.id);

    if (error) {
      logger.error("[my-posts] Error actualizando metadata:", error);
      toast.error("No se pudo actualizar la publicación");
      await refreshPosts();
    }
  };

  const handleFavoriteToggle = async (post: ManagedPost) => {
    await updatePostMetadata(
      post,
      { isFavorite: !post.isFavorite },
      { is_favorite: !post.isFavorite }
    );
    toast.success(!post.isFavorite ? "Añadido a favoritos" : "Eliminado de favoritos");
  };

  const handleStatusChange = async (post: ManagedPost, status: string) => {
    await updatePostMetadata(post, { status }, { status });
    toast.success(`Estado actualizado a ${status}`);
  };

  const handleSchedule = async (post: ManagedPost) => {
    try {
      localStorage.setItem(
        "kolink-schedule-draft",
        JSON.stringify({
          id: post.id,
          title: post.title,
          body: post.body,
        })
      );
    } catch (error) {
      logger.warn("[my-posts] No se pudo guardar el borrador para calendario:", error);
    }
    router.push(`/calendar?postId=${post.id}`);
  };

  const handleEdit = (post: ManagedPost) => {
    try {
      const bufferKey = "kolink-write-buffer";
      const payload = [
        {
          id: post.id,
          prompt: post.prompt,
          generated_text: post.body,
          created_at: post.createdAt,
          status: post.status,
          title: post.title,
        },
      ];
      localStorage.setItem(bufferKey, JSON.stringify(payload));
      localStorage.setItem("kolink-write-selected", post.id);
    } catch (error) {
      logger.warn("[my-posts] No se pudo preparar el post para el editor", error);
    }
    router.push("/write");
  };

  const handleShare = async (post: ManagedPost) => {
    try {
      await navigator.clipboard.writeText(post.body);
      toast.success("Contenido copiado al portapapeles");
    } catch {
      toast.error("No se pudo copiar el contenido");
    }
  };

  const handleMedia = (post: ManagedPost) => {
    toast(`Muy pronto podrás adjuntar recursos a "${post.title}".`, {
      icon: "🎬",
    });
  };

  const handleDelete = async (postId: string) => {
    setProcessingIds((prev) => [...prev, postId]);
    const { error } = await supabaseClient.from("posts").delete().eq("id", postId);
    if (error) {
      logger.error("[my-posts] Error al eliminar:", error);
      toast.error("No se pudo eliminar la publicación");
    } else {
      setPosts((prev) => prev.filter((post) => post.id !== postId));
      setSelected((prev) => prev.filter((id) => id !== postId));
      toast.success("Publicación eliminada");
    }
    setProcessingIds((prev) => prev.filter((id) => id !== postId));
  };

  const handleBulkDelete = async () => {
    if (selected.length === 0) return;
    const confirmation = window.confirm(
      `¿Eliminar ${selected.length} publicación(es)? Esta acción no se puede deshacer.`
    );
    if (!confirmation) return;
    const { error } = await supabaseClient.from("posts").delete().in("id", selected);
    if (error) {
      logger.error("[my-posts] Error eliminando selección:", error);
      toast.error("No se pudieron eliminar las publicaciones seleccionadas");
      return;
    }
    setPosts((prev) => prev.filter((post) => !selected.includes(post.id)));
    setSelected([]);
    toast.success("Publicaciones eliminadas");
  };

  const selectedCount = selected.length;

  if (session === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader size={40} />
      </div>
    );
  }

  return (
    <>
      <Navbar session={session} />
      <main className="min-h-screen bg-slate-50 pb-20 pt-20 lg:pl-64 dark:bg-slate-950">
        <div className="mx-auto max-w-7xl space-y-8 px-4 sm:px-6 lg:px-8">
          <header className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
                <Sparkles className="h-4 w-4" />
                Mis posts con IA
              </div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white md:text-4xl">
                Mis publicaciones
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-300">
                Prepara, organiza y programa tu contenido generado con Kolink AI en un solo lugar.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                variant="outline"
                className="min-h-[48px]"
                onClick={() => router.push("/write")}
              >
                Revisar borradores
              </Button>
              <Button
                className="min-h-[48px]"
                onClick={() => router.push("/dashboard")}
              >
                + Crear publicación
              </Button>
            </div>
          </header>

          <Card className="space-y-6 p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-2 rounded-full border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-800">
                {STATUS_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab.id);
                      setCurrentPage(1);
                    }}
                    className={cn(
                      "rounded-full px-4 py-2 text-xs font-semibold transition",
                      activeTab === tab.id
                        ? "bg-primary text-white shadow-sm"
                        : "text-slate-600 hover:text-primary dark:text-slate-300"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Buscar una publicación..."
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>
            </div>

            {selectedCount > 0 && (
              <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-primary">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-4 w-4" />
                  <span>
                    {selectedCount} publicación{selectedCount > 1 ? "es" : ""} seleccionada
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" onClick={handleBulkDelete} className="text-red-500">
                    <Trash2 className="mr-1 h-4 w-4" />
                    Eliminar seleccionadas
                  </Button>
                  <Button variant="ghost" onClick={() => setSelected([])}>
                    Limpiar selección
                  </Button>
                </div>
              </div>
            )}

            <div className="overflow-hidden rounded-3xl border border-slate-200 shadow-sm dark:border-slate-800">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                <thead className="bg-slate-50 dark:bg-slate-900/40">
                  <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th className="px-4 py-3">
                      <button
                        type="button"
                        onClick={toggleSelectAll}
                        className="flex items-center gap-2"
                      >
                        {paginatedPosts.length > 0 &&
                        paginatedPosts.every((post) => selected.includes(post.id)) ? (
                          <CheckSquare className="h-4 w-4 text-primary" />
                        ) : (
                          <Square className="h-4 w-4 text-slate-300" />
                        )}
                        <span className="hidden sm:inline">Selección</span>
                      </button>
                    </th>
                    <th className="px-4 py-3">Publicación</th>
                    <th className="px-4 py-3">Estatus</th>
                    <th className="px-4 py-3">Publicación</th>
                    <th className="px-4 py-3">Media</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white text-sm dark:divide-slate-800 dark:bg-slate-900/60">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center">
                        <Loader />
                      </td>
                    </tr>
                  ) : paginatedPosts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        No se encontraron publicaciones para este filtro.
                      </td>
                    </tr>
                  ) : (
                    paginatedPosts.map((post) => {
                      const statusBadge = getStatusBadge(post.status);
                      const isSelected = selected.includes(post.id);
                      const isProcessing = processingIds.includes(post.id);

                      return (
                        <tr key={post.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40">
                          <td className="whitespace-nowrap px-4 py-4">
                            <button
                              type="button"
                              onClick={() => toggleSelect(post.id)}
                              className="text-slate-400 transition hover:text-primary"
                              title={isSelected ? "Quitar de la selección" : "Seleccionar post"}
                            >
                              {isSelected ? (
                                <CheckSquare className="h-5 w-5 text-primary" />
                              ) : (
                                <Square className="h-5 w-5" />
                              )}
                            </button>
                          </td>
                          <td className="max-w-sm px-4 py-4">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-800 dark:text-slate-100">
                                  {post.title}
                                </span>
                                {post.isFavorite && (
                                  <Heart className="h-4 w-4 text-amber-500" />
                                )}
                              </div>
                              <p className="text-xs text-slate-400">
                                {formatDate(post.createdAt)} · {post.hashtags.length} hashtags
                              </p>
                              <p className="line-clamp-2 text-xs text-slate-500 dark:text-slate-300">
                                {post.body || "Sin contenido generado todavía"}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "rounded-full px-3 py-1 text-xs font-semibold",
                                  statusBadge.className
                                )}
                              >
                                {statusBadge.label}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-col gap-2">
                              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                                {post.scheduledFor
                                  ? `Planificado para ${formatDate(post.scheduledFor)}`
                                  : "Sin programación"}
                              </span>
                              <Button
                                variant="outline"
                                onClick={() => handleSchedule(post)}
                                className="flex items-center gap-2 text-xs"
                              >
                                <CalendarClock className="h-4 w-4" />
                                Planificar
                              </Button>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <Button
                              variant="ghost"
                              onClick={() => handleMedia(post)}
                              className="flex items-center gap-2 text-xs text-slate-600 hover:text-primary dark:text-slate-300"
                            >
                              <UploadCloud className="h-4 w-4" />
                              {post.mediaCount > 0 ? `${post.mediaCount} adjuntos` : "+ Agregar"}
                            </Button>
                          </td>
                          <td className="px-4 py-4">
                            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                              {post.type}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                className="text-xs text-slate-500 hover:text-primary"
                                onClick={() => handleEdit(post)}
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                className="text-xs text-slate-500 hover:text-primary"
                                onClick={() => handleShare(post)}
                              >
                                <Share2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                className={cn(
                                  "text-xs",
                                  post.isFavorite
                                    ? "text-amber-500 hover:text-amber-600"
                                    : "text-slate-400 hover:text-primary"
                                )}
                                onClick={() => handleFavoriteToggle(post)}
                              >
                                {post.isFavorite ? (
                                  <Heart className="h-4 w-4" />
                                ) : (
                                  <HeartOff className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                className="text-xs text-red-500 hover:text-red-600"
                                onClick={() => handleDelete(post.id)}
                                disabled={isProcessing}
                              >
                                {isProcessing ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                className="text-xs text-slate-400 hover:text-primary"
                                onClick={() =>
                                  handleStatusChange(
                                    post,
                                    post.status === "published" ? "draft" : "published"
                                  )
                                }
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col items-center justify-between gap-4 text-xs text-slate-500 sm:flex-row">
              <div className="flex items-center gap-2">
                <span>Mostrar</span>
                <select
                  value={itemsPerPage}
                  onChange={(event) => {
                    setItemsPerPage(Number(event.target.value) as (typeof ITEMS_PER_PAGE_OPTIONS)[number]);
                    setCurrentPage(1);
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option} publicaciones
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  className="text-xs"
                  disabled={clampedPage === 1}
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                >
                  Anterior
                </Button>
                <span>
                  Página {clampedPage} de {totalPages}
                </span>
                <Button
                  variant="ghost"
                  className="text-xs"
                  disabled={clampedPage === totalPages}
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </>
  );
}
