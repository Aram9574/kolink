"use client";

import Link from "next/link";
import { useRouter } from "next/router";
import { useState, useEffect, useMemo } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabaseClient } from "@/lib/supabaseClient";
import { Coins, Sparkles, LogOut, Cog, LifeBuoy, Users, Trophy, Bell } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import LanguageSwitcher from "./LanguageSwitcher";

type NavbarProps = {
  session: Session | null | undefined;
};

export default function Navbar({ session }: NavbarProps) {
  const router = useRouter();
  const [credits, setCredits] = useState<number | null>(null);
  const [plan, setPlan] = useState<string>("free");
  const [level, setLevel] = useState<number>(1);
  const [fullName, setFullName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    if (session?.user) {
      const fetchProfile = async () => {
        const { data, error } = await supabaseClient
          .from("profiles")
          .select("credits, plan, level, full_name")
          .eq("id", session.user.id)
          .single();

        if (data && !error) {
          setCredits(data.credits || 0);
          setPlan(data.plan || "free");
          setLevel(data.level || 1);
          setFullName(data.full_name || "");
        }
        setEmail(session.user.email || "");
      };

      const fetchUnreadCount = async () => {
        const { count, error } = await supabaseClient
          .from("admin_notifications")
          .select("*", { count: "exact", head: true })
          .eq("user_id", session.user.id)
          .eq("read", false);

        if (!error && count !== null) {
          setUnreadCount(count);
        }
      };

      fetchProfile();
      fetchUnreadCount();

      // Subscribe to notification changes for real-time updates
      const channel = supabaseClient
        .channel("navbar_notifications")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "admin_notifications",
            filter: `user_id=eq.${session.user.id}`,
          },
          () => {
            fetchUnreadCount();
          }
        )
        .subscribe();

      return () => {
        supabaseClient.removeChannel(channel);
      };
    }
  }, [session]);

  const initials = useMemo(() => {
    const source = fullName.trim() || email;
    if (!source) return "U";
    const parts = source.split(" ").filter(Boolean);
    if (parts.length === 0) return source.charAt(0).toUpperCase();
    return parts
      .map((part) => part.charAt(0).toUpperCase())
      .join("")
      .slice(0, 2);
  }, [fullName, email]);

  const handleSignOut = async () => {
    await supabaseClient.auth.signOut();
    router.push("/signin");
  };

  const handleSupport = () => {
    router.push("/support");
  };

  const handleCommunity = () => {
    window.open("https://community.kolink.es", "_blank", "noopener,noreferrer");
  };

  if (!session) {
    return (
      <nav className="fixed top-0 left-0 z-50 w-full border-b border-border-light dark:border-border-dark bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold tracking-tight">
              KOLINK <span className="text-xs text-muted-foreground">v0.4</span>
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            <LanguageSwitcher />
            <Link
              href="/signin"
              className="text-sm font-medium text-text-light dark:text-text-dark hover:text-primary transition-colors"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/signup"
              className="text-sm font-medium bg-primary text-secondary hover:bg-primary-dark px-4 py-2 rounded-lg transition-all"
            >
              Comienza Gratis
            </Link>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="fixed top-0 left-0 lg:left-64 z-50 w-full lg:w-[calc(100%-16rem)] border-b border-border-light dark:border-border-dark bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-lg">
      <div className="flex items-center justify-between px-4 py-3 sm:px-6">
        {/* Logo - Solo visible en móvil */}
        <Link href="/dashboard" className="flex lg:hidden items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold tracking-tight">
            KOLINK
          </span>
        </Link>

        {/* Spacer para centrar en desktop */}
        <div className="hidden lg:block flex-1" />

        {/* Right Section */}
        <div className="flex items-center gap-3">
          {/* Credits Display */}
          {credits !== null && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent-muted dark:bg-surface-dark border border-primary/20">
              <Coins className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-secondary dark:text-primary">
                {credits}
              </span>
            </div>
          )}

          {/* Level Badge */}
          <Link
            href="/profile?section=gamification"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border border-yellow-200 dark:border-yellow-800 hover:scale-105 transition-transform cursor-pointer group"
            title="Ver mi progreso"
          >
            <Trophy className="h-4 w-4 text-yellow-600 dark:text-yellow-400 group-hover:rotate-12 transition-transform" />
            <span className="text-sm font-bold text-yellow-700 dark:text-yellow-300">
              Lv {level}
            </span>
          </Link>

          {/* Notifications Bell */}
          <Link
            href="/inbox"
            className="relative flex items-center justify-center w-10 h-10 rounded-lg bg-surface-light dark:bg-surface-dark hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            title="Notificaciones"
          >
            <Bell className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-xs font-bold rounded-full">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>

          {/* Plan Badge */}
          <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-surface-light dark:bg-surface-dark">
            <span className="uppercase">{plan}</span>
          </div>

          <ThemeToggle />
          <LanguageSwitcher />

          {/* Profile Avatar Menu */}
          <div className="group relative">
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-blue-100 dark:border-blue-900 bg-white dark:bg-slate-800 text-sm font-semibold text-blue-600 dark:text-blue-400 shadow-md transition group-hover:scale-105"
            >
              {initials}
            </button>
            <div className="invisible absolute right-0 top-12 w-56 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 text-left opacity-0 shadow-2xl transition-all group-hover:visible group-hover:translate-y-2 group-hover:opacity-100">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Cuenta</p>
              <ul className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-200">
                <li>
                  <button
                    type="button"
                    onClick={() => router.push("/profile")}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2 transition hover:bg-blue-50 dark:hover:bg-slate-800 hover:text-blue-600"
                  >
                    <Cog className="h-4 w-4" /> Ajustes
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={handleSupport}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2 transition hover:bg-blue-50 dark:hover:bg-slate-800 hover:text-blue-600"
                  >
                    <LifeBuoy className="h-4 w-4" /> Soporte
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={handleCommunity}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2 transition hover:bg-blue-50 dark:hover:bg-slate-800 hover:text-blue-600"
                  >
                    <Users className="h-4 w-4" /> Comunidad
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-red-500 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                  >
                    <LogOut className="h-4 w-4" /> Cerrar sesión
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
