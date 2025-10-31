import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import { initPostHog, resetUser as resetPostHog, setAnalyticsOptInState } from "@/lib/posthog";

const STORAGE_KEY = "kolink-consent-v1";

type ConsentStatus = "unknown" | "accepted" | "rejected" | "custom";

export interface ConsentPreferences {
  analytics: boolean;
  essential: true;
}

interface StoredConsent {
  status: ConsentStatus;
  preferences: ConsentPreferences;
  updatedAt: string;
}

interface ConsentContextValue {
  status: ConsentStatus;
  preferences: ConsentPreferences;
  isLoading: boolean;
  acceptAll: () => Promise<void>;
  rejectAll: () => Promise<void>;
  updateAnalyticsConsent: (value: boolean) => Promise<void>;
}

const defaultPreferences: ConsentPreferences = {
  analytics: false,
  essential: true,
};

const ConsentContext = createContext<ConsentContextValue | undefined>(undefined);

async function fetchProfileFeatures(userId: string) {
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("features")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("[ConsentProvider] Failed to load profile features", error);
    return null;
  }

  return (data?.features as Record<string, unknown>) ?? null;
}

async function persistConsentToProfile(userId: string, consent: StoredConsent) {
  try {
    const features = (await fetchProfileFeatures(userId)) ?? {};
    const existingPrivacy =
      typeof features.privacy_preferences === "object" && features.privacy_preferences !== null
        ? (features.privacy_preferences as Record<string, unknown>)
        : {};

    const updatedFeatures = {
      ...features,
      privacy_preferences: {
        ...existingPrivacy,
        consent_status: consent.status,
        analytics: consent.preferences.analytics,
        last_updated_at: consent.updatedAt,
      },
    };

    const { error } = await supabaseClient
      .from("profiles")
      .update({ features: updatedFeatures })
      .eq("id", userId);

    if (error) {
      console.error("[ConsentProvider] Failed to persist consent to profile", error);
    }
  } catch (error) {
    console.error("[ConsentProvider] Unexpected error persisting consent", error);
  }
}

export function ConsentProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ConsentStatus>("unknown");
  const [preferences, setPreferences] = useState<ConsentPreferences>(defaultPreferences);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let restored: StoredConsent | null = null;
    try {
      const storedValue = localStorage.getItem(STORAGE_KEY);
      if (storedValue) {
        restored = JSON.parse(storedValue) as StoredConsent;
      }
    } catch (error) {
      console.error("[ConsentProvider] Failed to parse stored consent", error);
    }

    if (restored) {
      setStatus(restored.status);
      setPreferences(restored.preferences);
    } else {
      setStatus("unknown");
      setPreferences(defaultPreferences);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const resolveSession = async () => {
      const { data } = await supabaseClient.auth.getSession();
      if (cancelled) return;

      setUserId(data.session?.user?.id ?? null);
    };

    resolveSession();

    const { data: subscription } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      setUserId(session?.user?.id ?? null);
    });

    return () => {
      cancelled = true;
      subscription?.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (loading || status === "unknown") return;

    const stored: StoredConsent = {
      status,
      preferences,
      updatedAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    } catch (error) {
      console.error("[ConsentProvider] Failed to persist consent locally", error);
    }

    if (userId) {
      void persistConsentToProfile(userId, stored);
    }

    if (preferences.analytics) {
      initPostHog();
      setAnalyticsOptInState(true);
    } else {
      setAnalyticsOptInState(false);
      resetPostHog();
    }
  }, [status, preferences, userId, loading]);

  const saveConsent = useCallback(
    async (nextStatus: ConsentStatus, nextPreferences: ConsentPreferences) => {
      setStatus(nextStatus);
      setPreferences(nextPreferences);
    },
    []
  );

  const acceptAll = useCallback(async () => {
    await saveConsent("accepted", { analytics: true, essential: true });
  }, [saveConsent]);

  const rejectAll = useCallback(async () => {
    await saveConsent("rejected", { analytics: false, essential: true });
  }, [saveConsent]);

  const updateAnalyticsConsent = useCallback(
    async (value: boolean) => {
      const nextStatus = value ? "custom" : "rejected";
      await saveConsent(nextStatus, { analytics: value, essential: true });
    },
    [saveConsent]
  );

  const value = useMemo<ConsentContextValue>(
    () => ({
      status,
      preferences,
      isLoading: loading,
      acceptAll,
      rejectAll,
      updateAnalyticsConsent,
    }),
    [status, preferences, loading, acceptAll, rejectAll, updateAnalyticsConsent]
  );

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>;
}

export function useConsent() {
  const context = useContext(ConsentContext);
  if (!context) {
    throw new Error("useConsent must be used within a ConsentProvider");
  }
  return context;
}
