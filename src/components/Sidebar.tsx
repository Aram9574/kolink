"use client";

import Link from "next/link";
import { useRouter } from "next/router";
import { Session } from "@supabase/supabase-js";
import {
  LayoutDashboard,
  Settings,
  BarChart3,
  Pencil,
  Sparkles,
  Calendar,
  Lightbulb,
  Menu,
  X,
  FilePenLine,
  LifeBuoy,
  Brain,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import toast from "react-hot-toast";
import WritePostModal, { type WriteOptionId } from "@/components/WritePostModal";

type SidebarProps = {
  session: Session | null | undefined;
};

export default function Sidebar({ session }: SidebarProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [showWriteModal, setShowWriteModal] = useState(false);

  if (!session) {
    return null;
  }

  const isActive = (path: string) => router.pathname === path;

  const navigationItems = [
    {
      name: "Panel",
      icon: LayoutDashboard,
      href: "/dashboard",
    },
    {
      name: "Ajustes",
      icon: Settings,
      href: "/profile",
    },
    {
      name: "Estadísticas",
      icon: BarChart3,
      href: "/stats",
    },
    {
      name: "Centro de ayuda",
      icon: LifeBuoy,
      href: "/support",
    },
  ];

  const contentCreation = [
    {
      name: "Generador de Posts",
      icon: Sparkles,
      href: "/write",
    },
  ];

  const draftsScheduling = [
    {
      name: "Mis posts",
      icon: FilePenLine,
      href: "/my-posts",
    },
    {
      name: "Calendario",
      icon: Calendar,
      href: "/calendar",
    },
  ];

  const contentInspiration = [
    {
      name: "Inspiration Hub",
      icon: Lightbulb,
      href: "/inspiration",
    },
  ];

  const personalizationItems = [
    {
      name: "Generador Personalizado",
      icon: Brain,
      href: "/personalized",
    },
    {
      name: "Analytics Personalización",
      icon: TrendingUp,
      href: "/personalized-analytics",
    },
  ];

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-[60] p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-screen w-64 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 overflow-y-auto transition-transform duration-300",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full p-4">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-6 px-2 pt-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold tracking-tight">
              KOLINK
            </span>
          </div>

          {/* Write Post Button */}
          <button
            type="button"
            onClick={() => {
              setShowWriteModal(true);
              setIsOpen(false);
            }}
            className="flex items-center justify-center gap-2 px-6 py-3 mb-6 rounded-full bg-blue-500 hover:bg-blue-600 text-white font-medium transition-colors"
          >
            <Pencil className="h-5 w-5" />
            Escribir Post
          </button>

          {/* Navigation */}
          <nav className="flex-1 space-y-6">
            {/* Main Navigation */}
            <div className="space-y-1">
              {navigationItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive(item.href)
                      ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              ))}
            </div>

            {/* Content Creation */}
            <div>
              <h3 className="px-4 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Creación de Contenido
              </h3>
              <div className="space-y-1">
                {contentCreation.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
                      isActive(item.href)
                        ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>

            {/* Drafts & Scheduling */}
            <div>
              <h3 className="px-4 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Borradores y Programación
              </h3>
              <div className="space-y-1">
                {draftsScheduling.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
                      isActive(item.href)
                        ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>

            {/* Content Inspiration */}
            <div>
              <h3 className="px-4 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Inspiration Hub
              </h3>
              <div className="space-y-1">
                {contentInspiration.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
                      isActive(item.href)
                        ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>

            {/* Personalization */}
            <div>
              <h3 className="px-4 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Personalización con IA
              </h3>
              <div className="space-y-1">
                {personalizationItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
                      isActive(item.href)
                        ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>
          </nav>

          {/* Version */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <p className="text-xs text-slate-400 text-center">v1.0</p>
          </div>
        </div>
      </aside>

      <WritePostModal
        open={showWriteModal}
        onOpenChange={setShowWriteModal}
        onSelect={(option: WriteOptionId) => {
          setShowWriteModal(false);

          if (option === "ai") {
            router.push("/dashboard");
            return;
          }

          if (option === "manual") {
            router.push("/write");
            return;
          }

          if (option === "repurpose") {
            router.push({
              pathname: "/dashboard",
              query: { preset: "repurpose" },
            });
            return;
          }

          toast("Estamos trabajando en esta experiencia. ¡Muy pronto disponible!");
        }}
      />
    </>
  );
}
