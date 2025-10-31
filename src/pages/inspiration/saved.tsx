"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import type { Session } from "@supabase/supabase-js";
import Navbar from "@/components/Navbar";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Loader from "@/components/Loader";
import { supabase } from "@/lib/supabase";
import { Bookmark, BookmarkX, Sparkles, Trash2, Filter, TrendingUp, Eye, CheckSquare, Square, ArrowUpDown } from "lucide-react";
import toast from "react-hot-toast";

type SavedPost = {
  id: string;
  userId: string;
  inspirationPostId: string;
  note?: string;
  createdAt: string;
  inspirationPost?: {
    id: string;
    platform: string;
    author: string;
    title?: string;
    content: string;
    summary?: string;
    tags: string[];
    viralScore?: number;
    metrics: {
      likes?: number;
      shares?: number;
      comments?: number;
    };
    capturedAt: string;
  };
};

export default function SavedPostsPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [savedPosts, setSavedPosts] = useState<SavedPost[]>([]);
  const [platformFilter, setPlatformFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "viral">("date");
  const [selectedPosts, setSelectedPosts] = useState<Set<string>>(new Set());
  const [viewingPost, setViewingPost] = useState<SavedPost | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        router.push("/signin");
      } else {
        loadSavedPosts(session.user.id);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const loadSavedPosts = async (userId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("saved_posts")
        .select(`
          id,
          user_id,
          inspiration_post_id,
          note,
          created_at,
          inspiration_posts (
            id,
            platform,
            author,
            title,
            content,
            summary,
            tags,
            viral_score,
            metrics,
            captured_at
          )
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      type SavedPostRecord = {
        id: string;
        user_id: string;
        inspiration_post_id: string;
        note?: string;
        created_at: string;
        inspiration_posts?: {
          id: string;
          platform: string;
          author: string;
          title?: string;
          content: string;
          summary?: string;
          tags: string[];
          viral_score?: number;
          metrics: { likes?: number; shares?: number; comments?: number };
          captured_at: string;
        };
      };

      const formatted = ((data as unknown as SavedPostRecord[]) || []).map((item) => ({
        id: item.id,
        userId: item.user_id,
        inspirationPostId: item.inspiration_post_id,
        note: item.note,
        createdAt: item.created_at,
        inspirationPost: item.inspiration_posts ? {
          id: item.inspiration_posts.id,
          platform: item.inspiration_posts.platform,
          author: item.inspiration_posts.author,
          title: item.inspiration_posts.title,
          content: item.inspiration_posts.content,
          summary: item.inspiration_posts.summary,
          tags: item.inspiration_posts.tags || [],
          viralScore: item.inspiration_posts.viral_score,
          metrics: item.inspiration_posts.metrics || {},
          capturedAt: item.inspiration_posts.captured_at,
        } : undefined,
      }));

      setSavedPosts(formatted);
    } catch (error) {
      console.error("Error loading saved posts:", error);
      toast.error("Error al cargar posts guardados");
    } finally {
      setLoading(false);
    }
  };

  const handleUnsave = async (savedPostId: string) => {
    try {
      const { error } = await supabase
        .from("saved_posts")
        .delete()
        .eq("id", savedPostId);

      if (error) throw error;

      setSavedPosts((prev) => prev.filter((p) => p.id !== savedPostId));
      toast.success("Post eliminado de favoritos");
    } catch (error) {
      console.error("Error unsaving post:", error);
      toast.error("Error al eliminar");
    }
  };

  const handleUseAsTemplate = (post: SavedPost["inspirationPost"]) => {
    if (!post) return;

    // Create a more sophisticated template prompt
    const templatePrompt = `Crear un post similar a este de ${post.platform}:

Autor original: ${post.author}
${post.title ? `Título: ${post.title}\n` : ''}
Contenido de referencia: ${post.content.slice(0, 300)}...

Por favor, genera contenido inspirado en este estilo y tema.`;

    localStorage.setItem("kolink-draft", templatePrompt);
    router.push("/dashboard");
    toast.success("Plantilla cargada en el dashboard");
  };

  const toggleSelectPost = (postId: string) => {
    setSelectedPosts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    // Calculate filtered posts to get the correct IDs
    const filteredPosts = savedPosts.filter((post) => {
      const matchesPlatform = !platformFilter || post.inspirationPost?.platform === platformFilter;
      const matchesSearch =
        !searchQuery ||
        post.inspirationPost?.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.inspirationPost?.author?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesPlatform && matchesSearch;
    });

    if (selectedPosts.size === filteredPosts.length) {
      setSelectedPosts(new Set());
    } else {
      setSelectedPosts(new Set(filteredPosts.map((p) => p.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedPosts.size === 0) return;

    const confirmDelete = window.confirm(
      `¿Eliminar ${selectedPosts.size} post${selectedPosts.size > 1 ? "s" : ""} guardado${selectedPosts.size > 1 ? "s" : ""}?`
    );

    if (!confirmDelete) return;

    try {
      const deletePromises = Array.from(selectedPosts).map((postId) =>
        supabase.from("saved_posts").delete().eq("id", postId)
      );

      await Promise.all(deletePromises);

      setSavedPosts((prev) => prev.filter((p) => !selectedPosts.has(p.id)));
      setSelectedPosts(new Set());
      toast.success(`${selectedPosts.size} posts eliminados`);
    } catch (error) {
      console.error("Error bulk deleting:", error);
      toast.error("Error al eliminar posts");
    }
  };

  const filteredAndSortedPosts = savedPosts
    .filter((post) => {
      const matchesPlatform = !platformFilter || post.inspirationPost?.platform === platformFilter;
      const matchesSearch =
        !searchQuery ||
        post.inspirationPost?.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.inspirationPost?.author?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesPlatform && matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === "date") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else {
        // Sort by viral score
        const scoreA = a.inspirationPost?.viralScore || 0;
        const scoreB = b.inspirationPost?.viralScore || 0;
        return scoreB - scoreA;
      }
    });

  // Calculate stats
  const stats = {
    total: savedPosts.length,
    platforms: savedPosts.reduce((acc, post) => {
      const platform = post.inspirationPost?.platform || "unknown";
      acc[platform] = (acc[platform] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
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
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
            <Bookmark className="w-10 h-10 text-[#F9D65C]" />
            Posts Guardados
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-4">
            Tu colección de inspiración guardada
          </p>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <Card className="p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </Card>
            {Object.entries(stats.platforms).map(([platform, count]) => (
              <Card key={platform} className="p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">{platform}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{count}</p>
              </Card>
            ))}
          </div>
        </div>

        {/* Filters and Controls */}
        <Card className="mb-8">
          <div className="space-y-4">
            {/* Search and Filters Row */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar en guardados..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#F9D65C] focus:border-transparent"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-gray-500" />
                <select
                  value={platformFilter}
                  onChange={(e) => setPlatformFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#F9D65C] focus:border-transparent"
                >
                  <option value="">Todas las plataformas</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="twitter">Twitter</option>
                  <option value="instagram">Instagram</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-5 h-5 text-gray-500" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as "date" | "viral")}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#F9D65C] focus:border-transparent"
                >
                  <option value="date">Más recientes</option>
                  <option value="viral">Mayor viral score</option>
                </select>
              </div>
            </div>

            {/* Bulk Actions Row */}
            {filteredAndSortedPosts.length > 0 && (
              <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <button
                    onClick={toggleSelectAll}
                    className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 hover:text-[#F9D65C]"
                  >
                    {selectedPosts.size === filteredAndSortedPosts.length ? (
                      <CheckSquare className="w-5 h-5" />
                    ) : (
                      <Square className="w-5 h-5" />
                    )}
                    Seleccionar todo
                  </button>
                  {selectedPosts.size > 0 && (
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedPosts.size} seleccionado{selectedPosts.size > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                {selectedPosts.size > 0 && (
                  <Button
                    onClick={handleBulkDelete}
                    variant="ghost"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Eliminar seleccionados
                  </Button>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Saved Posts Grid */}
        {filteredAndSortedPosts.length === 0 ? (
          <Card className="text-center py-12">
            <BookmarkX className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {searchQuery || platformFilter ? "No se encontraron posts" : "No hay posts guardados"}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {searchQuery || platformFilter
                ? "Intenta con otros filtros de búsqueda"
                : "Empieza a guardar ideas desde Inspiration Hub"}
            </p>
            <Button onClick={() => router.push("/inspiration")}>
              Explorar Inspiration Hub
            </Button>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredAndSortedPosts.map((savedPost: SavedPost) => {
              const post = savedPost.inspirationPost;
              if (!post) return null;

              return (
                <Card key={savedPost.id} className="flex flex-col h-full relative">
                  {/* Selection Checkbox */}
                  <div className="absolute top-3 left-3 z-10">
                    <button
                      onClick={() => toggleSelectPost(savedPost.id)}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                    >
                      {selectedPosts.has(savedPost.id) ? (
                        <CheckSquare className="w-5 h-5 text-[#F9D65C]" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                  </div>

                  {/* Header */}
                  <div className="flex items-start justify-between mb-4 pl-8">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-[#F9D65C] uppercase">
                          {post.platform}
                        </span>
                        {post.viralScore && (
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                              post.viralScore >= 75
                                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                                : post.viralScore >= 50
                                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                                : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                            }`}
                          >
                            <TrendingUp className="w-3 h-3 inline mr-1" />
                            {post.viralScore}/100
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        por {post.author}
                      </p>
                    </div>
                    <button
                      onClick={() => handleUnsave(savedPost.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                      title="Eliminar de favoritos"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="flex-1 mb-4">
                    {post.title && (
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                        {post.title}
                      </h3>
                    )}
                    <p className="text-gray-700 dark:text-gray-300 line-clamp-4">
                      {post.summary || post.content}
                    </p>
                  </div>

                  {/* Note */}
                  {savedPost.note && (
                    <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <p className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-1">
                        Tu nota:
                      </p>
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        {savedPost.note}
                      </p>
                    </div>
                  )}

                  {/* Tags */}
                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {post.tags.slice(0, 3).map((tag: string, idx: number) => (
                        <span
                          key={idx}
                          className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Button
                      onClick={() => setViewingPost(savedPost)}
                      variant="ghost"
                      className="flex-1 px-4 py-2 text-xs"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Ver completo
                    </Button>
                    <Button
                      onClick={() => handleUseAsTemplate(post)}
                      className="flex-1 px-4 py-2 text-xs"
                    >
                      <Sparkles className="w-4 h-4 mr-1" />
                      Usar plantilla
                    </Button>
                  </div>

                  {/* Saved date */}
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                    Guardado el {new Date(savedPost.createdAt).toLocaleDateString("es-ES")}
                  </p>
                </Card>
              );
            })}
          </div>
        )}

        {/* View Full Content Modal */}
        {viewingPost && viewingPost.inspirationPost && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setViewingPost(null)}
          >
            <Card
              className="max-w-3xl w-full max-h-[80vh] overflow-y-auto"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-[#F9D65C] uppercase">
                      {viewingPost.inspirationPost.platform}
                    </span>
                    {viewingPost.inspirationPost.viralScore && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                          viewingPost.inspirationPost.viralScore >= 75
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                            : viewingPost.inspirationPost.viralScore >= 50
                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                            : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                        }`}
                      >
                        <TrendingUp className="w-3 h-3 inline mr-1" />
                        {viewingPost.inspirationPost.viralScore}/100
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    por {viewingPost.inspirationPost.author}
                  </p>
                  {viewingPost.inspirationPost.title && (
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                      {viewingPost.inspirationPost.title}
                    </h2>
                  )}
                </div>
                <button
                  onClick={() => setViewingPost(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Full Content */}
              <div className="prose dark:prose-invert max-w-none mb-6">
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {viewingPost.inspirationPost.content}
                </p>
              </div>

              {/* Note */}
              {viewingPost.note && (
                <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-2">
                    Tu nota:
                  </p>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    {viewingPost.note}
                  </p>
                </div>
              )}

              {/* Tags */}
              {viewingPost.inspirationPost.tags && viewingPost.inspirationPost.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {viewingPost.inspirationPost.tags.map((tag: string, idx: number) => (
                    <span
                      key={idx}
                      className="text-xs px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Metrics */}
              {viewingPost.inspirationPost.metrics && (
                <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400 pb-6 border-b border-gray-200 dark:border-gray-700">
                  {viewingPost.inspirationPost.metrics.likes && (
                    <span>{viewingPost.inspirationPost.metrics.likes.toLocaleString()} likes</span>
                  )}
                  {viewingPost.inspirationPost.metrics.shares && (
                    <span>{viewingPost.inspirationPost.metrics.shares.toLocaleString()} shares</span>
                  )}
                  {viewingPost.inspirationPost.metrics.comments && (
                    <span>{viewingPost.inspirationPost.metrics.comments.toLocaleString()} comentarios</span>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 mt-6">
                <Button
                  onClick={() => {
                    handleUseAsTemplate(viewingPost.inspirationPost);
                    setViewingPost(null);
                  }}
                  className="flex-1"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Usar como plantilla
                </Button>
                <Button
                  onClick={() => setViewingPost(null)}
                  variant="ghost"
                >
                  Cerrar
                </Button>
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
