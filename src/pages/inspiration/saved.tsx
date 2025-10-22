"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import type { Session } from "@supabase/supabase-js";
import Navbar from "@/components/Navbar";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Loader from "@/components/Loader";
import { supabase } from "@/lib/supabase";
import { Bookmark, BookmarkX, Sparkles, Trash2, Filter } from "lucide-react";
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

  const handleUseAsTemplate = (content: string) => {
    // Save content to localStorage and redirect to dashboard
    localStorage.setItem("kolink-draft", `Inspirado en: ${content.slice(0, 200)}...`);
    router.push("/dashboard");
    toast.success("Plantilla cargada en el dashboard");
  };

  const filteredPosts = savedPosts.filter((post) => {
    const matchesPlatform = !platformFilter || post.inspirationPost?.platform === platformFilter;
    const matchesSearch =
      !searchQuery ||
      post.inspirationPost?.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.inspirationPost?.author?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesPlatform && matchesSearch;
  });

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
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Tu colección de inspiración guardada ({filteredPosts.length} posts)
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-8">
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
          </div>
        </Card>

        {/* Saved Posts Grid */}
        {filteredPosts.length === 0 ? (
          <Card className="text-center py-12">
            <BookmarkX className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No hay posts guardados
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Empieza a guardar inspiración desde la página de Inspiración
            </p>
            <Button onClick={() => router.push("/inspiration")}>
              Explorar Inspiración
            </Button>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredPosts.map((savedPost) => {
              const post = savedPost.inspirationPost;
              if (!post) return null;

              return (
                <Card key={savedPost.id} className="flex flex-col h-full">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <span className="text-sm font-medium text-[#F9D65C] uppercase">
                        {post.platform}
                      </span>
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

                  {/* Actions */}
                  <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Button
                      onClick={() => handleUseAsTemplate(post.content)}
                      className="flex-1 px-4 py-2 text-xs"
                    >
                      <Sparkles className="w-4 h-4 mr-1" />
                      Usar como plantilla
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
      </main>
    </div>
  );
}
