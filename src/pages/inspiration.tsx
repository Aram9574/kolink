"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import type { Session } from "@supabase/supabase-js";
import Navbar from "@/components/Navbar";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Loader from "@/components/Loader";
import { supabase } from "@/lib/supabase";
import { Search, Bookmark, Filter, Save, Trash2, Play } from "lucide-react";
import toast from "react-hot-toast";

type InspirationPost = {
  id: string;
  platform: string;
  author: string;
  title?: string;
  content: string;
  summary?: string;
  tags: string[];
  metrics: {
    likes?: number;
    shares?: number;
    comments?: number;
  };
  capturedAt: string;
  similarity?: number;
};

type SavedSearch = {
  id: string;
  user_id: string;
  name: string;
  filters: {
    query?: string;
    platform?: string;
    tags?: string[];
  };
  created_at: string;
  updated_at: string;
};

export default function InspirationPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [platformFilter, setPlatformFilter] = useState<string>("");
  const [results, setResults] = useState<InspirationPost[]>([]);
  const [searching, setSearching] = useState(false);

  // Saved searches state
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newSearchName, setNewSearchName] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        router.push("/signin");
      } else {
        setLoading(false);
        performSearch(""); // Load initial results
        loadSavedSearches(session); // Load saved searches
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const performSearch = async (query: string) => {
    if (!session) return;

    setSearching(true);
    try {
      const token = session.access_token;
      const response = await fetch("/api/inspiration/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          query: query || undefined,
          filters: platformFilter ? { platform: platformFilter } : undefined,
          limit: 20,
        }),
      });

      const data = await response.json();

      if (data.ok) {
        setResults(data.results);
      } else {
        toast.error(data.error || "Error al buscar inspiración");
      }
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Error de conexión");
    } finally {
      setSearching(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(searchQuery);
  };

  const savePost = async (postId: string) => {
    if (!session) return;

    try {
      const token = session.access_token;
      const response = await fetch("/api/inspiration/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ inspirationPostId: postId }),
      });

      const data = await response.json();

      if (data.ok) {
        toast.success("Post guardado en favoritos");
      } else {
        toast.error(data.error || "Error al guardar");
      }
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Error al guardar");
    }
  };

  // Saved searches functions
  const loadSavedSearches = async (session: Session) => {
    try {
      const token = session.access_token;
      const response = await fetch("/api/inspiration/searches/list", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.ok) {
        setSavedSearches(data.searches);
      }
    } catch (error) {
      console.error("Load searches error:", error);
    }
  };

  const handleSaveCurrentSearch = async () => {
    if (!session || !newSearchName.trim()) {
      toast.error("Por favor ingresa un nombre para la búsqueda");
      return;
    }

    try {
      const token = session.access_token;
      const response = await fetch("/api/inspiration/searches/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newSearchName.trim(),
          filters: {
            query: searchQuery || undefined,
            platform: platformFilter || undefined,
          },
        }),
      });

      const data = await response.json();
      if (data.ok) {
        toast.success("Búsqueda guardada");
        setSavedSearches([data.search, ...savedSearches]);
        setShowSaveDialog(false);
        setNewSearchName("");
      } else {
        toast.error(data.error || "Error al guardar búsqueda");
      }
    } catch (error) {
      console.error("Save search error:", error);
      toast.error("Error al guardar búsqueda");
    }
  };

  const handleApplySavedSearch = (search: SavedSearch) => {
    setSearchQuery(search.filters.query || "");
    setPlatformFilter(search.filters.platform || "");
    performSearch(search.filters.query || "");
    toast.success(`Aplicando búsqueda: ${search.name}`);
  };

  const handleDeleteSavedSearch = async (searchId: string) => {
    if (!session) return;

    try {
      const token = session.access_token;
      const response = await fetch(`/api/inspiration/searches/delete?searchId=${searchId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.ok) {
        toast.success("Búsqueda eliminada");
        setSavedSearches(savedSearches.filter((s) => s.id !== searchId));
      } else {
        toast.error(data.error || "Error al eliminar");
      }
    } catch (error) {
      console.error("Delete search error:", error);
      toast.error("Error al eliminar");
    }
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
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Inspiration Hub
          </h1>
          <p className="text-base md:text-lg text-gray-600 dark:text-gray-300">
            Descubre contenido viral y encuentra inspiración para tus próximos posts
          </p>
        </div>

        {/* Search Bar */}
        <Card className="mb-8 p-5 md:p-6">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-6 h-6 md:w-5 md:h-5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por palabras clave, temas, autores..."
                  className="w-full pl-11 md:pl-10 pr-4 py-4 md:py-3 text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <Button type="submit" disabled={searching} className="min-h-[48px] w-full sm:w-auto">
                {searching ? "Buscando..." : "Buscar"}
              </Button>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 md:justify-between">
              <div className="flex items-center gap-3">
                <Filter className="w-6 h-6 md:w-5 md:h-5 text-gray-500 flex-shrink-0" />
                <select
                  value={platformFilter}
                  onChange={(e) => setPlatformFilter(e.target.value)}
                  className="flex-1 md:flex-initial px-4 py-4 md:py-3 text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">Todas las plataformas</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="twitter">Twitter</option>
                  <option value="instagram">Instagram</option>
                </select>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => setShowSaveDialog(true)}
                className="flex items-center justify-center gap-2 min-h-[48px] w-full md:w-auto"
              >
                <Save className="w-5 h-5 md:w-4 md:h-4" />
                Guardar búsqueda
              </Button>
            </div>
          </form>
        </Card>

        {/* Saved Searches */}
        {savedSearches.length > 0 && (
          <Card className="mb-8 p-5 md:p-6">
            <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Búsquedas Guardadas
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {savedSearches.map((search) => (
                <div
                  key={search.id}
                  className="flex items-center justify-between p-4 md:p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-primary dark:hover:border-primary transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-base md:text-sm font-medium text-gray-900 dark:text-white truncate">
                      {search.name}
                    </p>
                    <p className="text-sm md:text-xs text-gray-500 dark:text-gray-400 truncate">
                      {search.filters.query || "Sin query"}
                      {search.filters.platform && ` • ${search.filters.platform}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                    <button
                      onClick={() => handleApplySavedSearch(search)}
                      className="p-3 md:p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors min-h-[44px] md:min-h-0 flex items-center justify-center"
                      title="Aplicar búsqueda"
                    >
                      <Play className="w-5 h-5 md:w-4 md:h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteSavedSearch(search.id)}
                      className="p-3 md:p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors min-h-[44px] md:min-h-0 flex items-center justify-center"
                      title="Eliminar"
                    >
                      <Trash2 className="w-5 h-5 md:w-4 md:h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Save Search Dialog */}
        {showSaveDialog && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="max-w-md w-full p-6 md:p-8">
              <h3 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Guardar Búsqueda
              </h3>
              <p className="text-base md:text-sm text-gray-600 dark:text-gray-400 mb-6 md:mb-4">
                Guarda los filtros actuales para usarlos más tarde
              </p>
              <div className="space-y-6 md:space-y-4">
                <div>
                  <label className="block text-base md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nombre de la búsqueda
                  </label>
                  <input
                    type="text"
                    value={newSearchName}
                    onChange={(e) => setNewSearchName(e.target.value)}
                    placeholder="Ej: Posts de IA en LinkedIn"
                    className="w-full px-4 py-4 md:py-3 text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                    onKeyDown={(e) => e.key === "Enter" && handleSaveCurrentSearch()}
                  />
                </div>
                <div className="text-base md:text-sm text-gray-600 dark:text-gray-400">
                  <p><strong>Query:</strong> {searchQuery || "(vacío)"}</p>
                  <p><strong>Plataforma:</strong> {platformFilter || "Todas"}</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button onClick={handleSaveCurrentSearch} className="flex-1 min-h-[48px]">
                    Guardar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowSaveDialog(false);
                      setNewSearchName("");
                    }}
                    className="flex-1 min-h-[48px]"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Results */}
        {searching ? (
          <div className="flex justify-center py-12">
            <Loader />
          </div>
        ) : results.length === 0 ? (
          <Card className="text-center py-12 p-6">
            <p className="text-gray-500 dark:text-gray-400 text-base md:text-lg">
              No se encontraron resultados. Intenta con otros términos de búsqueda.
            </p>
          </Card>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((post) => (
              <Card key={post.id} className="flex flex-col h-full p-5 md:p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2 md:mb-1">
                      <span className="text-base md:text-sm font-medium text-primary uppercase">
                        {post.platform}
                      </span>
                      {post.similarity && post.similarity > 0 && (
                        <span className="text-sm md:text-xs text-gray-500 dark:text-gray-400">
                          {(post.similarity * 100).toFixed(0)}% relevante
                        </span>
                      )}
                    </div>
                    <p className="text-base md:text-sm text-gray-600 dark:text-gray-400">
                      por {post.author}
                    </p>
                  </div>
                  <button
                    onClick={() => savePost(post.id)}
                    className="text-gray-400 transition-colors hover:text-primary p-2 md:p-0 min-h-[44px] md:min-h-0 flex items-center justify-center flex-shrink-0"
                    title="Guardar en favoritos"
                  >
                    <Bookmark className="w-6 h-6 md:w-5 md:h-5" />
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 mb-4">
                  {post.title && (
                    <h3 className="text-base md:text-sm font-semibold text-gray-900 dark:text-white mb-2">
                      {post.title}
                    </h3>
                  )}
                  <p className="text-base md:text-sm text-gray-700 dark:text-gray-300 line-clamp-4">
                    {post.summary || post.content}
                  </p>
                </div>

                {/* Tags */}
                {post.tags && post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {post.tags.slice(0, 3).map((tag, idx) => (
                      <span
                        key={idx}
                        className="text-sm md:text-xs px-3 py-1.5 md:px-2 md:py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Metrics */}
                <div className="flex flex-wrap items-center gap-3 md:gap-4 text-base md:text-sm text-gray-500 dark:text-gray-400 pt-4 border-t border-gray-200 dark:border-gray-700">
                  {post.metrics.likes && (
                    <span>{post.metrics.likes.toLocaleString()} likes</span>
                  )}
                  {post.metrics.shares && (
                    <span>{post.metrics.shares.toLocaleString()} shares</span>
                  )}
                  {post.metrics.comments && (
                    <span>{post.metrics.comments.toLocaleString()} comentarios</span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
