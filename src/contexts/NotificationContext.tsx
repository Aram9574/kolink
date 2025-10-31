import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import toast from "react-hot-toast";
import { supabaseClient } from "@/lib/supabaseClient";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

interface NotificationContextType {
  notifySuccess: (message: string) => void;
  notifyError: (message: string) => void;
  notifyInfo: (message: string) => void;
  notifyWarning: (message: string) => void;
  checkCreditReminder: (credits: number) => void;
  setupRealtimeNotifications: (userId: string) => void;
  cleanupRealtimeNotifications: () => void;
}

interface AdminNotification {
  id: string;
  user_id: string;
  message: string;
  type: "info" | "warning" | "success" | "error";
  read: boolean;
  created_at: string;
  expires_at: string;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const CREDIT_REMINDER_KEY = "kolink-credit-reminder";
const REMINDER_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const LOW_CREDIT_THRESHOLD = 10;

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [realtimeChannel, setRealtimeChannel] = useState<ReturnType<typeof supabaseClient.channel> | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const baseStyle = {
    borderRadius: "12px",
    background: "var(--background)",
    color: "var(--foreground)",
    border: "1px solid var(--border)",
    fontSize: "14px",
    padding: "12px 16px",
  } as const;

  const notifySuccess = (message: string) => {
    toast.success(message, {
      duration: 3200,
      icon: "✅",
      style: baseStyle,
    });
  };

  const notifyError = (message: string) => {
    toast.error(message, {
      duration: 3800,
      icon: "⛔",
      style: baseStyle,
    });
  };

  const notifyInfo = (message: string) => {
    toast(message, {
      duration: 3200,
      icon: "ℹ️",
      style: baseStyle,
    });
  };

  const notifyWarning = (message: string) => {
    toast(message, {
      duration: 3600,
      icon: "⚠️",
      style: { ...baseStyle, border: "1px solid #F9D65C" },
    });
  };

  const checkCreditReminder = (credits: number) => {
    if (!mounted || typeof window === "undefined") return;

    // Only show reminder if credits are low
    if (credits > LOW_CREDIT_THRESHOLD) return;

    try {
      const reminderData = localStorage.getItem(CREDIT_REMINDER_KEY);
      const now = Date.now();

      if (reminderData) {
        const { lastShown } = JSON.parse(reminderData);
        const timeSinceLastReminder = now - lastShown;

        // Only show if 24 hours have passed
        if (timeSinceLastReminder < REMINDER_INTERVAL) {
          return;
        }
      }

      // Show reminder
      notifyWarning(
        `⚡ Te quedan ${credits} crédito${credits !== 1 ? "s" : ""}. Mejora tu plan para seguir generando contenido.`
      );

      // Update last shown timestamp
      localStorage.setItem(
        CREDIT_REMINDER_KEY,
        JSON.stringify({ lastShown: now })
      );
    } catch (error) {
      console.error("Error checking credit reminder:", error);
    }
  };

  const setupRealtimeNotifications = (userId: string) => {
    if (!userId || realtimeChannel) return;

    try {
      const channel = supabaseClient
        .channel(`admin-notifications:${userId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "admin_notifications",
            filter: `user_id=eq.${userId}`,
          },
          (payload: RealtimePostgresChangesPayload<AdminNotification>) => {
            const notification = payload.new as AdminNotification;

            // Show notification based on type
            switch (notification.type) {
              case "success":
                notifySuccess(notification.message);
                break;
              case "error":
                notifyError(notification.message);
                break;
              case "warning":
                notifyWarning(notification.message);
                break;
              case "info":
              default:
                notifyInfo(notification.message);
                break;
            }

            // Mark as read after showing
            supabaseClient
              .from("admin_notifications")
              .update({ read: true })
              .eq("id", notification.id)
              .then(() => {
                console.log("Admin notification marked as read:", notification.id);
              });
          }
        )
        .subscribe();

      setRealtimeChannel(channel);
      console.log("Realtime notifications enabled for user:", userId);
    } catch (error) {
      console.error("Error setting up realtime notifications:", error);
    }
  };

  const cleanupRealtimeNotifications = () => {
    if (realtimeChannel) {
      supabaseClient.removeChannel(realtimeChannel);
      setRealtimeChannel(null);
      console.log("Realtime notifications disabled");
    }
  };

  const value: NotificationContextType = {
    notifySuccess,
    notifyError,
    notifyInfo,
    notifyWarning,
    checkCreditReminder,
    setupRealtimeNotifications,
    cleanupRealtimeNotifications,
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupRealtimeNotifications();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    // Return default no-op functions for SSR or when used outside provider
    return {
      notifySuccess: () => {},
      notifyError: () => {},
      notifyInfo: () => {},
      notifyWarning: () => {},
      checkCreditReminder: () => {},
      setupRealtimeNotifications: () => {},
      cleanupRealtimeNotifications: () => {},
    };
  }
  return context;
}
