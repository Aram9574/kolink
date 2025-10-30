"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Session } from "@supabase/supabase-js";
import { supabaseClient } from "@/lib/supabaseClient";
import { motion } from "framer-motion";
import { Bell, Check, Info, AlertTriangle, CheckCircle2, XCircle, Inbox as InboxIcon, Trash2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Loader from "@/components/Loader";
import toast from "react-hot-toast";

type InboxProps = {
  session: Session | null | undefined;
};

type Notification = {
  id: string;
  user_id: string;
  message: string;
  type: "info" | "warning" | "success" | "error";
  read: boolean;
  created_at: string;
  expires_at: string;
};

export default function Inbox({ session }: InboxProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  useEffect(() => {
    if (session === undefined) return;
    if (!session) {
      router.replace("/signin");
      return;
    }

    loadNotifications();
    subscribeToNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, router]);

  const loadNotifications = async () => {
    if (!session?.user) return;

    try {
      const { data, error } = await supabaseClient
        .from("admin_notifications")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading notifications:", error);
        toast.error("Error al cargar notificaciones");
        return;
      }

      // Filter out expired notifications
      const now = new Date();
      const activeNotifications = (data || []).filter(
        (n) => !n.expires_at || new Date(n.expires_at) > now
      );

      setNotifications(activeNotifications);
    } catch (err) {
      console.error("Error:", err);
      toast.error("Error al cargar notificaciones");
    } finally {
      setLoading(false);
    }
  };

  const subscribeToNotifications = () => {
    if (!session?.user) return;

    const channel = supabaseClient
      .channel("admin_notifications")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "admin_notifications",
          filter: `user_id=eq.${session.user.id}`,
        },
        (payload) => {
          console.log("Notification update:", payload);
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  };

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabaseClient
        .from("admin_notifications")
        .update({ read: true })
        .eq("id", id);

      if (error) {
        console.error("Error marking as read:", error);
        toast.error("Error al marcar como leída");
        return;
      }

      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      toast.success("Marcada como leída");
    } catch (err) {
      console.error("Error:", err);
      toast.error("Error al actualizar");
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const { error } = await supabaseClient
        .from("admin_notifications")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Error deleting notification:", error);
        toast.error("Error al eliminar");
        return;
      }

      setNotifications((prev) => prev.filter((n) => n.id !== id));
      toast.success("Notificación eliminada");
    } catch (err) {
      console.error("Error:", err);
      toast.error("Error al eliminar");
    }
  };

  const markAllAsRead = async () => {
    if (!session?.user) return;

    try {
      const { error } = await supabaseClient
        .from("admin_notifications")
        .update({ read: true })
        .eq("user_id", session.user.id)
        .eq("read", false);

      if (error) {
        console.error("Error marking all as read:", error);
        toast.error("Error al marcar todas como leídas");
        return;
      }

      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      toast.success("Todas marcadas como leídas");
    } catch (err) {
      console.error("Error:", err);
      toast.error("Error al actualizar");
    }
  };

  const getTypeIcon = (type: Notification["type"]) => {
    switch (type) {
      case "info":
        return <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />;
      case "success":
        return <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />;
      case "error":
        return <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />;
    }
  };

  const getTypeColor = (type: Notification["type"]) => {
    switch (type) {
      case "info":
        return "from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800";
      case "warning":
        return "from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border-yellow-200 dark:border-yellow-800";
      case "success":
        return "from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800";
      case "error":
        return "from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-800";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `Hace ${diffMins} minuto${diffMins !== 1 ? "s" : ""}`;
    if (diffHours < 24) return `Hace ${diffHours} hora${diffHours !== 1 ? "s" : ""}`;
    if (diffDays < 7) return `Hace ${diffDays} día${diffDays !== 1 ? "s" : ""}`;

    return date.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  if (session === undefined || loading) {
    return (
      <>
        <Navbar session={session} />
        <div className="flex min-h-screen items-center justify-center">
          <Loader />
        </div>
      </>
    );
  }

  const filteredNotifications =
    filter === "unread"
      ? notifications.filter((n) => !n.read)
      : notifications;

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <>
      <Navbar session={session} />
      <div className="min-h-screen bg-background-light dark:bg-background-dark pt-20 lg:pl-64">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Bell className="w-8 h-8 text-primary" />
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                Notificaciones
              </h1>
              {unreadCount > 0 && (
                <span className="px-3 py-1 bg-primary text-secondary dark:text-background-dark rounded-full text-sm font-bold">
                  {unreadCount}
                </span>
              )}
            </div>
            <p className="text-slate-600 dark:text-slate-400">
              Mensajes y actualizaciones del equipo de Kolink
            </p>
          </div>

          {/* Filters and Actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="flex gap-2">
              <button
                onClick={() => setFilter("all")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === "all"
                    ? "bg-primary text-secondary dark:text-background-dark"
                    : "bg-surface-light dark:bg-surface-dark text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                Todas ({notifications.length})
              </button>
              <button
                onClick={() => setFilter("unread")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === "unread"
                    ? "bg-primary text-secondary dark:text-background-dark"
                    : "bg-surface-light dark:bg-surface-dark text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                No leídas ({unreadCount})
              </button>
            </div>

            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-2 px-4 py-2 bg-surface-light dark:bg-surface-dark text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <Check className="w-4 h-4" />
                Marcar todas como leídas
              </button>
            )}
          </div>

          {/* Notifications List */}
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
              <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
                <InboxIcon className="w-12 h-12 text-slate-400 dark:text-slate-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                {filter === "unread" ? "Todo al día" : "No hay notificaciones"}
              </h3>
              <p className="text-slate-500 dark:text-slate-400">
                {filter === "unread"
                  ? "No tienes notificaciones sin leer"
                  : "Aún no has recibido ninguna notificación"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredNotifications.map((notification, idx) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`relative bg-gradient-to-br ${getTypeColor(
                    notification.type
                  )} border-2 rounded-xl p-6 ${
                    !notification.read
                      ? "shadow-lg"
                      : "opacity-75 hover:opacity-100"
                  } transition-all`}
                >
                  {/* Unread Indicator */}
                  {!notification.read && (
                    <div className="absolute top-4 right-4 w-3 h-3 bg-primary rounded-full animate-pulse" />
                  )}

                  <div className="flex gap-4">
                    {/* Icon */}
                    <div className="flex-shrink-0 mt-1">
                      {getTypeIcon(notification.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-900 dark:text-white leading-relaxed whitespace-pre-wrap">
                        {notification.message}
                      </p>

                      <div className="flex items-center gap-4 mt-4 text-sm text-slate-600 dark:text-slate-400">
                        <span>{formatDate(notification.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                    {!notification.read && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      >
                        <Check className="w-4 h-4" />
                        Marcar como leída
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(notification.id)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Eliminar
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export async function getServerSideProps(context: { req: { headers: { cookie: string } } }) {
  const { createServerClient } = await import("@supabase/ssr");

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          const cookies = context.req.headers.cookie
            ?.split("; ")
            .reduce((acc, cookie) => {
              const [key, value] = cookie.split("=");
              if (key && value) acc[key] = value;
              return acc;
            }, {} as Record<string, string>);
          return cookies?.[name];
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  return {
    props: {
      session,
    },
  };
}
