"use client";

import Link from "next/link";
import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabaseClient } from "@/lib/supabaseClient";
import { Coins, Sparkles, LogOut } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import { cn } from "@/lib/utils";

type NavbarProps = {
  session: Session | null | undefined;
};

export default function Navbar({ session }: NavbarProps) {
  const router = useRouter();
  const [credits, setCredits] = useState<number | null>(null);
  const [plan, setPlan] = useState<string>("free");

  useEffect(() => {
    if (session?.user) {
      const fetchProfile = async () => {
        const { data, error } = await supabaseClient
          .from("profiles")
          .select("credits, plan")
          .eq("id", session.user.id)
          .single();

        if (data && !error) {
          setCredits(data.credits || 0);
          setPlan(data.plan || "free");
        }
      };

      fetchProfile();
    }
  }, [session]);

  const handleSignOut = async () => {
    await supabaseClient.auth.signOut();
    router.push("/signin");
  };

  const isActive = (path: string) => router.pathname === path;

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
    <nav className="fixed top-0 left-0 z-50 w-full border-b border-border-light dark:border-border-dark bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-lg">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold tracking-tight">
            KOLINK <span className="text-xs text-muted-foreground">v0.4</span>
          </span>
        </Link>

        {/* Navigation Links */}
        <div className="hidden md:flex items-center gap-6">
          <Link
            href="/dashboard"
            className={cn(
              "text-sm font-medium transition-colors",
              isActive("/dashboard")
                ? "text-primary border-b-2 border-primary pb-1"
                : "text-text-light dark:text-text-dark hover:text-primary"
            )}
          >
            Dashboard
          </Link>
          <Link
            href="/inspiration"
            className={cn(
              "text-sm font-medium transition-colors",
              isActive("/inspiration")
                ? "text-primary border-b-2 border-primary pb-1"
                : "text-text-light dark:text-text-dark hover:text-primary"
            )}
          >
            Inspiración
          </Link>
          <Link
            href="/calendar"
            className={cn(
              "text-sm font-medium transition-colors",
              isActive("/calendar")
                ? "text-primary border-b-2 border-primary pb-1"
                : "text-text-light dark:text-text-dark hover:text-primary"
            )}
          >
            Calendario
          </Link>
          <Link
            href="/stats"
            className={cn(
              "text-sm font-medium transition-colors",
              isActive("/stats")
                ? "text-primary border-b-2 border-primary pb-1"
                : "text-text-light dark:text-text-dark hover:text-primary"
            )}
          >
            Estadísticas
          </Link>
          <Link
            href="/profile"
            className={cn(
              "text-sm font-medium transition-colors",
              isActive("/profile")
                ? "text-primary border-b-2 border-primary pb-1"
                : "text-text-light dark:text-text-dark hover:text-primary"
            )}
          >
            Perfil
          </Link>
        </div>

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

          {/* Plan Badge */}
          <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-surface-light dark:bg-surface-dark">
            <span className="uppercase">{plan}</span>
          </div>

          <ThemeToggle />

          {/* User Menu */}
          <button
            onClick={handleSignOut}
            className="p-2 rounded-lg hover:bg-surface-light dark:hover:bg-surface-dark transition-colors"
            aria-label="Cerrar sesión"
          >
            <LogOut className="h-5 w-5 text-text-light dark:text-text-dark" />
          </button>
        </div>
      </div>
    </nav>
  );
}
