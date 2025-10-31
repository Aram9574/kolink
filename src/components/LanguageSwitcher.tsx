"use client";

import { useEffect, useRef, useState } from "react";
import { Globe } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

export default function LanguageSwitcher() {
  const { language, setLanguage, availableLanguages, loading } = useLanguage();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const handleClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const currentLanguage = availableLanguages.find((option) => option.code === language);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        disabled={loading}
        className={cn(
          "flex items-center gap-2 rounded-lg bg-surface-light px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-200 dark:bg-surface-dark dark:text-slate-300 dark:hover:bg-slate-700",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        )}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Globe className="h-4 w-4" />
        <span>{currentLanguage?.label ?? "Idioma"}</span>
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-48 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          <ul className="space-y-1 text-sm">
            {availableLanguages.map((option) => (
              <li key={option.code}>
                <button
                  type="button"
                  onClick={async () => {
                    await setLanguage(option.code);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-3 py-2 transition",
                    option.code === language
                      ? "bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-200"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  )}
                >
                  <span>{option.label}</span>
                  {option.code === language && <span className="text-xs font-semibold uppercase">Activo</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
