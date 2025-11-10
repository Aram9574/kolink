import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { logger } from '@/lib/logger';

import { supabaseClient } from "@/lib/supabaseClient";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const featuresRef = useRef<Record<string, unknown> | null>(null);
  const themeRef = useRef<Theme>("light");

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("kolink-theme") as Theme | null;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

    const initialTheme = savedTheme || (prefersDark ? "dark" : "light");
    setThemeState(initialTheme);
    themeRef.current = initialTheme;

    if (initialTheme === "dark") {
      document.documentElement.classList.add("dark");
    }
  }, []);

  const applyTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    themeRef.current = newTheme;
    localStorage.setItem("kolink-theme", newTheme);

    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const setTheme = (newTheme: Theme) => {
    if (themeRef.current === newTheme) {
      return;
    }

    applyTheme(newTheme);

    if (userId) {
      const existingFeatures = featuresRef.current ?? {};
      const appPreferences = {
        ...(typeof existingFeatures.app_preferences === "object" && existingFeatures.app_preferences !== null
          ? (existingFeatures.app_preferences as Record<string, unknown>)
          : {}),
        theme: newTheme,
      };

      const updatedFeatures = {
        ...existingFeatures,
        app_preferences: appPreferences,
      };

      featuresRef.current = updatedFeatures;

      supabaseClient
        .from("profiles")
        .update({ features: updatedFeatures })
        .eq("id", userId)
        .then(({ error }) => {
          if (error) {
            logger.error("[ThemeProvider] Failed to persist theme preference", error);
          }
        });
    }
  };

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  useEffect(() => {
    let cancelled = false;

    const resolveUserPreferences = async () => {
      const { data } = await supabaseClient.auth.getSession();
      if (cancelled) return;

      const currentUserId = data.session?.user?.id ?? null;
      setUserId(currentUserId);

      if (!currentUserId) {
        return;
      }

      const { data: profile, error } = await supabaseClient
        .from("profiles")
        .select("features")
        .eq("id", currentUserId)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        logger.error("[ThemeProvider] Failed to load user theme preference", error);
        return;
      }

      const existingFeatures = (profile?.features as Record<string, unknown>) ?? null;
      featuresRef.current = existingFeatures;

      const appPreferences =
        (existingFeatures?.app_preferences as Record<string, unknown>) ??
        (existingFeatures ?? {});
      const storedTheme = appPreferences?.theme;

      if (storedTheme === "dark" || storedTheme === "light") {
        applyTheme(storedTheme);
      }
    };

    resolveUserPreferences();

    const { data: subscription } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
      if (!session?.user?.id) {
        featuresRef.current = null;
      }
    });

    return () => {
      cancelled = true;
      subscription?.subscription.unsubscribe();
    };
  }, []);

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    // Return default values for SSR or when used outside provider
    return {
      theme: "light" as const,
      toggleTheme: () => {},
      setTheme: () => {},
    };
  }
  return context;
}
