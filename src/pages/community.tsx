"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import type { Session } from "@supabase/supabase-js";
import Navbar from "@/components/Navbar";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Loader from "@/components/Loader";
import { supabase } from "@/lib/supabase";
import {
  MessageCircle,
  ThumbsUp,
  Share2,
  Send,
  Bookmark,
  Flag,
  TrendingUp,
  Users,
  Video,
  Star,
  Play,
  Filter,
  Plus,
} from "lucide-react";
import toast from "react-hot-toast";
import { motion } from "framer-motion";

type CommunityPost = {
  id: string;
  user_id: string;
  content: string;
  post_type: string;
  created_at: string;
  author?: {
    full_name: string;
    email: string;
  };
  stats?: {
    reactions_count: number;
    comments_count: number;
    upvotes_count: number;
    user_has_upvoted: boolean;
  };
};

type ForumThread = {
  id: string;
  category_id: string;
  user_id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  view_count: number;
  created_at: string;
  category?: {
    name: string;
    color: string;
  };
  author?: {
    full_name: string;
  };
  reply_count?: number;
};

type MentorshipSession = {
  id: string;
  title: string;
  description: string;
  mentor_name: string;
  mentor_title: string;
  duration_minutes: number;
  category: string;
  tags: string[];
  view_count: number;
  rating_avg: number;
  rating_count: number;
  thumbnail_url?: string;
  session_type: string;
};

type TabType = "feed" | "forum" | "mentorship";

export default function CommunityPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("feed");

  // Feed state
  const [feedPosts, setFeedPosts] = useState<CommunityPost[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(false);
  const [newPostContent, setNewPostContent] = useState("");
  const [postingContent, setPostingContent] = useState(false);

  // Forum state
  const [forumThreads, setForumThreads] = useState<ForumThread[]>([]);
  const [loadingForum, setLoadingForum] = useState(false);

  // Mentorship state
  const [mentorshipSessions, setMentorshipSessions] = useState<MentorshipSession[]>([]);
  const [loadingMentorship, setLoadingMentorship] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      if (!currentSession) {
        router.push("/signin");
        return;
      }
      setLoading(false);
      loadFeed();
      loadForumThreads();
      loadMentorshipSessions();
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, updatedSession) => {
      setSession(updatedSession);
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadFeed = async () => {
    setLoadingFeed(true);
    try {
      const { data: posts, error } = await supabase
        .from("community_posts")
        .select(`
          *,
          author:profiles!user_id(full_name, email)
        `)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      // Load stats for each post
      const postsWithStats = await Promise.all(
        (posts || []).map(async (post) => {
          const { data: stats } = await supabase.rpc("get_community_post_stats", {
            post_uuid: post.id,
          });
          return {
            ...post,
            stats: stats?.[0] || {
              reactions_count: 0,
              comments_count: 0,
              upvotes_count: 0,
              user_has_upvoted: false,
            },
          };
        })
      );

      setFeedPosts(postsWithStats as CommunityPost[]);
    } catch (error) {
      console.error("Error loading feed:", error);
      toast.error("Error al cargar el feed");
    } finally {
      setLoadingFeed(false);
    }
  };

  const loadForumThreads = async () => {
    setLoadingForum(true);
    try {
      const { data: threads, error } = await supabase
        .from("forum_threads")
        .select(`
          *,
          category:forum_categories!category_id(name, color),
          author:profiles!user_id(full_name)
        `)
        .eq("status", "active")
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      // Get reply counts
      const threadsWithCounts = await Promise.all(
        (threads || []).map(async (thread) => {
          const { count } = await supabase
            .from("forum_replies")
            .select("*", { count: "exact", head: true })
            .eq("thread_id", thread.id)
            .eq("status", "active");

          return {
            ...thread,
            reply_count: count || 0,
          };
        })
      );

      setForumThreads(threadsWithCounts as ForumThread[]);
    } catch (error) {
      console.error("Error loading forum:", error);
      toast.error("Error al cargar el foro");
    } finally {
      setLoadingForum(false);
    }
  };

  const loadMentorshipSessions = async () => {
    setLoadingMentorship(true);
    try {
      const { data: sessions, error } = await supabase
        .from("mentorship_sessions")
        .select("*")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(12);

      if (error) throw error;
      setMentorshipSessions((sessions as MentorshipSession[]) || []);
    } catch (error) {
      console.error("Error loading mentorship:", error);
      toast.error("Error al cargar sesiones");
    } finally {
      setLoadingMentorship(false);
    }
  };

  const handleCreatePost = async () => {
    if (!session || !newPostContent.trim()) {
      toast.error("Escribe algo para compartir");
      return;
    }

    setPostingContent(true);
    try {
      const { error } = await supabase.from("community_posts").insert({
        user_id: session.user.id,
        content: newPostContent.trim(),
        post_type: "share",
        status: "active",
      });

      if (error) throw error;

      toast.success("Post compartido con la comunidad");
      setNewPostContent("");
      loadFeed();
    } catch (error) {
      console.error("Error creating post:", error);
      toast.error("Error al publicar");
    } finally {
      setPostingContent(false);
    }
  };

  const handleUpvote = async (postId: string) => {
    if (!session) return;

    try {
      const post = feedPosts.find((p) => p.id === postId);
      if (!post?.stats) return;

      if (post.stats.user_has_upvoted) {
        // Remove upvote
        await supabase
          .from("community_reactions")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", session.user.id)
          .eq("reaction_type", "upvote");
      } else {
        // Add upvote
        await supabase.from("community_reactions").insert({
          post_id: postId,
          user_id: session.user.id,
          reaction_type: "upvote",
        });
      }

      // Reload feed to update counts
      loadFeed();
    } catch (error) {
      console.error("Error toggling upvote:", error);
      toast.error("Error al votar");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Ahora";
    if (diffMins < 60) return `Hace ${diffMins}m`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;
    return date.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <Loader size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navbar session={session} />

      <main className="mx-auto max-w-7xl px-4 py-20 lg:pl-64 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-8 h-8 text-primary" />
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
              Comunidad KOLINK
            </h1>
          </div>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Comparte ideas, aprende de otros y crece juntos
          </p>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto">
          <Button
            variant={activeTab === "feed" ? "primary" : "secondary"}
            onClick={() => setActiveTab("feed")}
            className="flex items-center gap-2 whitespace-nowrap"
          >
            <TrendingUp className="w-4 h-4" />
            Feed
          </Button>
          <Button
            variant={activeTab === "forum" ? "primary" : "secondary"}
            onClick={() => setActiveTab("forum")}
            className="flex items-center gap-2 whitespace-nowrap"
          >
            <MessageCircle className="w-4 h-4" />
            Foro
          </Button>
          <Button
            variant={activeTab === "mentorship" ? "primary" : "secondary"}
            onClick={() => setActiveTab("mentorship")}
            className="flex items-center gap-2 whitespace-nowrap"
          >
            <Video className="w-4 h-4" />
            Mentorías
          </Button>
        </div>

        {/* Feed Tab */}
        {activeTab === "feed" && (
          <div className="space-y-6">
            {/* Create Post */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Comparte con la comunidad
              </h3>
              <textarea
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder="¿Qué quieres compartir? Pide feedback, comparte un logro, haz una pregunta..."
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-primary focus:border-transparent"
                rows={4}
              />
              <div className="flex justify-end mt-4">
                <Button
                  onClick={handleCreatePost}
                  disabled={postingContent || !newPostContent.trim()}
                  className="flex items-center gap-2"
                >
                  {postingContent ? (
                    <>
                      <Loader size={16} />
                      Publicando...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Publicar
                    </>
                  )}
                </Button>
              </div>
            </Card>

            {/* Feed Posts */}
            {loadingFeed ? (
              <div className="flex justify-center py-12">
                <Loader size={32} />
              </div>
            ) : feedPosts.length === 0 ? (
              <Card className="p-12 text-center">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400 mb-2">
                  No hay posts todavía
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  Sé el primero en compartir algo con la comunidad
                </p>
              </Card>
            ) : (
              <div className="space-y-4">
                {feedPosts.map((post) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card className="p-6">
                      {/* Author */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                            <Users className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {post.author?.full_name || "Usuario"}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {formatDate(post.created_at)}
                            </p>
                          </div>
                        </div>
                        <Button variant="secondary" className="p-2">
                          <Flag className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Content */}
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap mb-4">
                        {post.content}
                      </p>

                      {/* Actions */}
                      <div className="flex items-center gap-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button
                          onClick={() => handleUpvote(post.id)}
                          className={`flex items-center gap-2 transition-colors ${
                            post.stats?.user_has_upvoted
                              ? "text-primary"
                              : "text-gray-500 dark:text-gray-400 hover:text-primary"
                          }`}
                        >
                          <ThumbsUp
                            className={`w-5 h-5 ${
                              post.stats?.user_has_upvoted ? "fill-current" : ""
                            }`}
                          />
                          <span className="text-sm font-medium">
                            {post.stats?.upvotes_count || 0}
                          </span>
                        </button>
                        <button className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-primary transition-colors">
                          <MessageCircle className="w-5 h-5" />
                          <span className="text-sm font-medium">
                            {post.stats?.comments_count || 0}
                          </span>
                        </button>
                        <button className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-primary transition-colors">
                          <Share2 className="w-5 h-5" />
                        </button>
                        <button className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-primary transition-colors ml-auto">
                          <Bookmark className="w-5 h-5" />
                        </button>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Forum Tab */}
        {activeTab === "forum" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Discusiones recientes
              </h3>
              <Button className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Nuevo tema
              </Button>
            </div>

            {loadingForum ? (
              <div className="flex justify-center py-12">
                <Loader size={32} />
              </div>
            ) : (
              <div className="space-y-4">
                {forumThreads.map((thread) => (
                  <Card key={thread.id} className="p-6 hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {thread.is_pinned && (
                            <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">
                              Fijado
                            </span>
                          )}
                          <span
                            className="text-xs px-2 py-1 rounded"
                            style={{
                              backgroundColor: `${thread.category?.color}20`,
                              color: thread.category?.color,
                            }}
                          >
                            {thread.category?.name}
                          </span>
                        </div>
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                          {thread.title}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                          {thread.content}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {thread.author?.full_name || "Anónimo"}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageCircle className="w-4 h-4" />
                            {thread.reply_count} respuestas
                          </span>
                          <span>{formatDate(thread.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Mentorship Tab */}
        {activeTab === "mentorship" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Sesiones de Mentoría
              </h3>
              <Button variant="secondary" className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Filtrar
              </Button>
            </div>

            {loadingMentorship ? (
              <div className="flex justify-center py-12">
                <Loader size={32} />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {mentorshipSessions.map((session) => (
                  <Card key={session.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                    <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center relative">
                      <Play className="w-12 h-12 text-primary" />
                      <span className="absolute bottom-2 right-2 bg-black/75 text-white text-xs px-2 py-1 rounded">
                        {session.duration_minutes} min
                      </span>
                    </div>
                    <div className="p-4">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
                        {session.title}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        {session.mentor_name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mb-3">
                        {session.mentor_title}
                      </p>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-1 text-yellow-500">
                          <Star className="w-4 h-4 fill-current" />
                          <span>{session.rating_avg.toFixed(1)}</span>
                          <span className="text-gray-400">({session.rating_count})</span>
                        </div>
                        <span className="text-gray-500 dark:text-gray-400">
                          {session.view_count} vistas
                        </span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
