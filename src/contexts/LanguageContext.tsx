import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabaseClient } from "@/lib/supabaseClient";

export type SupportedLanguage =
  | "es-ES"
  | "en-US"
  | "pt-BR"
  | "fr-FR"
  | "de-DE"
  | "it-IT";

const LANGUAGE_STORAGE_KEY = "kolink-ui-language";

interface LanguageContextValue {
  language: SupportedLanguage;
  setLanguage: (language: SupportedLanguage) => Promise<void>;
  availableLanguages: { code: SupportedLanguage; label: string }[];
  loading: boolean;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
  userId?: string | null;
}

const DEFAULT_LANGUAGE: SupportedLanguage = "es-ES";

const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  "es-ES": "Español",
  "en-US": "English",
  "pt-BR": "Português",
  "fr-FR": "Français",
  "de-DE": "Deutsch",
  "it-IT": "Italiano",
};

const AVAILABLE_LANGUAGES: { code: SupportedLanguage; label: string }[] = (
  Object.entries(LANGUAGE_LABELS) as [SupportedLanguage, string][]
).map(
  ([code, label]) => ({ code, label })
);

export function LanguageProvider({ children, userId }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<SupportedLanguage>(DEFAULT_LANGUAGE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const resolveInitialLanguage = async () => {
      try {
        const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY) as SupportedLanguage | null;
        if (stored) {
          setLanguageState(stored);
          document.documentElement.setAttribute("lang", stored);
        }

        if (!userId) {
          setLoading(false);
          return;
        }

        const { data, error } = await supabaseClient
          .from("profiles")
          .select("preferred_language")
          .eq("id", userId)
          .maybeSingle();

        if (!isMounted) return;

        if (error) {
          console.error("[LanguageProvider] Failed to load preferred language", error);
          setLoading(false);
          return;
        }

        const preferred = (data?.preferred_language as SupportedLanguage | null) ?? stored ?? DEFAULT_LANGUAGE;
        setLanguageState(preferred);
        document.documentElement.setAttribute("lang", preferred);
        localStorage.setItem(LANGUAGE_STORAGE_KEY, preferred);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    resolveInitialLanguage();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  const handleSetLanguage = useCallback(
    async (newLanguage: SupportedLanguage) => {
      if (language === newLanguage) return;

      setLanguageState(newLanguage);
      document.documentElement.setAttribute("lang", newLanguage);
      localStorage.setItem(LANGUAGE_STORAGE_KEY, newLanguage);

      if (userId) {
        const { error } = await supabaseClient
          .from("profiles")
          .update({ preferred_language: newLanguage })
          .eq("id", userId);

        if (error) {
          console.error("[LanguageProvider] Failed to persist language", error);
        }
      }
    },
    [language, userId]
  );

  const contextValue = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage: handleSetLanguage,
      availableLanguages: AVAILABLE_LANGUAGES,
      loading,
    }),
    [language, loading, handleSetLanguage]
  );

  return <LanguageContext.Provider value={contextValue}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
