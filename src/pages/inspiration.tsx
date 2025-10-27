"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import type { Session } from "@supabase/supabase-js";
import Navbar from "@/components/Navbar";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Loader from "@/components/Loader";
import { supabase } from "@/lib/supabase";
import { Search, Bookmark, Filter } from "lucide-react";
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

export default function InspirationPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [platformFilter, setPlatformFilter] = useState<string>("");
  const [results, setResults] = useState<InspirationPost[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        router.push("/signin");
      } else {
        setLoading(false);
        performSearch(""); // Load initial results
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
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Inspiration Hub
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Descubre contenido viral y encuentra inspiración para tus próximos posts
          </p>
        </div>

        {/* Search Bar */}
        <Card className="mb-8">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por palabras clave, temas, autores..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <Button type="submit" disabled={searching}>
                {searching ? "Buscando..." : "Buscar"}
              </Button>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4">
              <Filter className="w-5 h-5 text-gray-500" />
              <select
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">Todas las plataformas</option>
                <option value="linkedin">LinkedIn</option>
                <option value="twitter">Twitter</option>
                <option value="instagram">Instagram</option>
              </select>
            </div>
          </form>
        </Card>

        {/* Results */}
        {searching ? (
          <div className="flex justify-center py-12">
            <Loader />
          </div>
        ) : results.length === 0 ? (
          <Card className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400 text-lg">
              No se encontraron resultados. Intenta con otros términos de búsqueda.
            </p>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {results.map((post) => (
              <Card key={post.id} className="flex flex-col h-full">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-primary uppercase">
                        {post.platform}
                      </span>
                      {post.similarity && post.similarity > 0 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {(post.similarity * 100).toFixed(0)}% relevante
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      por {post.author}
                    </p>
                  </div>
                  <button
                    onClick={() => savePost(post.id)}
                    className="text-gray-400 transition-colors hover:text-primary"
                    title="Guardar en favoritos"
                  >
                    <Bookmark className="w-5 h-5" />
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

                {/* Tags */}
                {post.tags && post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {post.tags.slice(0, 3).map((tag, idx) => (
                      <span
                        key={idx}
                        className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Metrics */}
                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 pt-4 border-t border-gray-200 dark:border-gray-700">
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
