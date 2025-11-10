"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type SVGProps, type ComponentType } from "react";
import { useRouter } from "next/router";
import { Session } from "@supabase/supabase-js";
import { supabaseClient } from "@/lib/supabaseClient";
import { motion } from "framer-motion";
import {
  Sparkles,
  Copy,
  Check,
  Trash2,
  Share2,
  BarChart3,
  Activity,
  TrendingUp,
  CalendarClock,
  Lightbulb,
  Globe,
  NotebookPen,
} from "lucide-react";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Loader from "@/components/Loader";
import PlansModal from "@/components/PlansModal";
import ThankYouModal from "@/components/ThankYouModal";
import ExportModal from "@/components/export/ExportModal";
import EditorAI from "@/components/EditorAI";
import { useNotifications } from "@/contexts/NotificationContext";
import Navbar from "@/components/Navbar";
import { analytics } from "@/lib/posthog";
import { ViralScoreTooltip } from "@/components/dashboard/ViralScoreTooltip";
import { PostPreviewModal } from "@/components/dashboard/PostPreviewModal";
import { PromptSuggestions } from "@/components/dashboard/PromptSuggestions";
import { ContentControls } from "@/components/dashboard/ContentControls";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { Tooltip } from "@/components/ui/tooltip-legacy";
import { useLanguage } from "@/contexts/LanguageContext";

const TOPIC_OPTIONS = [
  "Inteligencia artificial en salud",
  "Crecimiento de SaaS B2B",
  "Storytelling para founders",
  "Productividad con IA",
  "Transformación digital",
  "Estrategia de contenidos",
  "Marketing de comunidad",
];

const AUTOPILOT_FREQUENCY_LABELS: Record<
  "daily" | "weekly" | "biweekly" | "monthly",
  string
> = {
  daily: "diaria",
  weekly: "semanal",
  biweekly: "quincenal",
  monthly: "mensual",
};

const PRESET_OPTIONS = [
  {
    id: "insight",
    label: "Escribe un post de insights del sector",
    description: "Comparte aprendizajes accionables del mercado",
  },
  {
    id: "pas",
    label: "Crea un post PAS",
    description: "Estructura Problema-Agitación-Solución",
  },
  {
    id: "repurpose",
    label: "Reformula mi último post viral",
    description: "Genera una versión con nuevo ángulo",
  },
] as const;

type Post = {
  id: string;
  prompt: string;
  generated_text: string;
  created_at: string;
  user_id: string | null;
  viral_score?: number | null;
};

type DashboardProps = {
  session: Session | null | undefined;
};

type ProfileFeatures = {
  autopilot_enabled?: boolean;
  autopilot_frequency?: "daily" | "weekly" | "biweekly" | "monthly";
  linkedin_connected?: boolean;
  tone_trained?: boolean;
  onboarding_completed?: boolean;
  topic_preferences?: {
    selected_topics?: string[];
    updated_at?: string;
  };
  autopilot_next_post?: Record<string, unknown>;
  next_autopilot_post?: Record<string, unknown>;
  autopilot_next_post_at?: string;
  autopilot_next_post_title?: string;
  autopilot_next_post_topic?: string;
  [key: string]: unknown;
};

type QuickAction = {
  id: string;
  title: string;
  description: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  action: () => void;
  highlight?: boolean;
};

export default function Dashboard({ session }: DashboardProps) {
  const router = useRouter();
  const userId = session?.user?.id ?? null;
  const [posts, setPosts] = useState<Post[]>([]);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);
  const [plan, setPlan] = useState<string | null>(null);
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [showThankYouModal, setShowThankYouModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewContent, setPreviewContent] = useState("");
  const [exportContent, setExportContent] = useState({ content: "", title: "" });
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [generationProgress, setGenerationProgress] = useState<string>("");
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [fullName, setFullName] = useState<string>("");
  const [redirecting, setRedirecting] = useState(false);
  const [selectedTopics, setSelectedTopics] = useState<string[]>(TOPIC_OPTIONS.slice(0, 3));
  const [activePreset, setActivePreset] = useState<(typeof PRESET_OPTIONS)[number]["id"]>("insight");
  const [viralScore, setViralScore] = useState<number | undefined>(undefined);
  const [toneProfile, setToneProfile] = useState<string>("professional");
  const [preferredLanguage, setPreferredLanguage] = useState<'es-ES' | 'en-US' | 'pt-BR'>('es-ES');
  const [formality, setFormality] = useState<number>(50);
  const [length, setLength] = useState<number>(200);
  const [profileFeatures, setProfileFeatures] = useState<ProfileFeatures>({});
  const [showClearPromptModal, setShowClearPromptModal] = useState(false);
  const [savingTopics, setSavingTopics] = useState(false);
  const [autopilotUpdating, setAutopilotUpdating] = useState(false);
  const { isReady, query } = router;
  const { language: uiLanguage, loading: languageLoading } = useLanguage();
  const { notifySuccess, notifyError, notifyInfo, checkCreditReminder, setupRealtimeNotifications, cleanupRealtimeNotifications } = useNotifications();
  const autosaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (session === undefined) return;
    if (!session) {
      router.replace("/signin");
    }
  }, [router, session]);

  const loadCredits = useCallback(async () => {
    if (!userId) {
      setCredits(null);
      setPlan(null);
      setProfileFeatures({});
      return;
    }

    const { data, error } = await supabaseClient
      .from("profiles")
      .select("credits, plan, features, full_name, tone_profile, preferred_language")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error loading credits:", error);
      return;
    }

    const creditsValue = data?.credits ?? 0;
    setCredits(creditsValue);
    setPlan(data?.plan ?? "free");
    if (typeof data?.full_name === "string") {
      setFullName(data.full_name);
    }
    if (typeof data?.tone_profile === "string") {
      setToneProfile(data.tone_profile);
    }
    if (typeof data?.preferred_language === "string") {
      setPreferredLanguage(data.preferred_language as 'es-ES' | 'en-US' | 'pt-BR');
    }

    const features = (data?.features as ProfileFeatures) ?? {};
    setProfileFeatures(features);

    let storedTopics: string[] = [];
    if (Array.isArray(features.topic_preferences?.selected_topics)) {
      storedTopics = features.topic_preferences.selected_topics.filter(
        (topic): topic is string => typeof topic === "string"
      );
    } else {
      const rawTopics = (features as Record<string, unknown>).autopilot_topics;
      if (Array.isArray(rawTopics)) {
        storedTopics = (rawTopics as unknown[]).filter((topic): topic is string => typeof topic === "string");
      }
    }
    if (storedTopics.length > 0) {
      setSelectedTopics(storedTopics);
    }
    const onboardingCompleted = Boolean(features.onboarding_completed);
    const hasName = Boolean(data?.full_name && data.full_name.trim().length > 0);

    if (!onboardingCompleted || !hasName) {
      setRedirecting(true);
      router.replace("/account-setup");
      return;
    }

    checkCreditReminder(creditsValue);
  }, [userId, checkCreditReminder, router]);

  useEffect(() => {
    loadCredits();
  }, [loadCredits]);

  useEffect(() => {
    if (!languageLoading && uiLanguage && uiLanguage !== preferredLanguage) {
      setPreferredLanguage(uiLanguage as 'es-ES' | 'en-US' | 'pt-BR');
    }
  }, [uiLanguage, languageLoading, preferredLanguage]);

  useEffect(() => {
    if (userId) {
      setupRealtimeNotifications(userId);
    }

    return () => {
      cleanupRealtimeNotifications();
    };
  }, [userId, setupRealtimeNotifications, cleanupRealtimeNotifications]);

  useEffect(() => {
    const timeoutId = redirectTimeoutRef.current;
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  useEffect(() => {
    if (!isReady) return;

    const statusParam = query.status;

    const isSuccess = Array.isArray(statusParam)
      ? statusParam.includes("success")
      : statusParam === "success";

    if (isSuccess) {
      setShowThankYouModal(true);
      loadCredits();
      router.replace("/dashboard", undefined, { shallow: true });
    }
  }, [isReady, query, router, loadCredits]);

  useEffect(() => {
    if (!isReady) return;

    const presetParam = query.preset;
    const requestedPreset = Array.isArray(presetParam) ? presetParam[0] : presetParam;

    if (
      requestedPreset &&
      PRESET_OPTIONS.some((preset) => preset.id === requestedPreset) &&
      requestedPreset !== activePreset
    ) {
      setActivePreset(requestedPreset as (typeof PRESET_OPTIONS)[number]["id"]);
    }
  }, [isReady, query, activePreset]);

  useEffect(() => {
    if (!userId || redirecting) {
      setPosts([]);
      return;
    }

    async function fetchPosts() {
      const { data, error } = await supabaseClient
        .from("posts")
        .select("id, prompt, generated_text, created_at, user_id, viral_score")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Error loading posts:", error);
        return;
      }

      if (data) {
        setPosts(data as Post[]);
      }
    }

    fetchPosts();
  }, [userId, redirecting]);

  useEffect(() => {
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }

    if (prompt) {
      autosaveTimeoutRef.current = setTimeout(() => {
        localStorage.setItem("kolink-draft", prompt);
      }, 800);
    } else {
      localStorage.removeItem("kolink-draft");
    }

    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, [prompt]);

  useEffect(() => {
    const draft = localStorage.getItem("kolink-draft");
    if (draft) {
      setPrompt(draft);
      notifyInfo("📝 Borrador recuperado automáticamente");
    }
  }, [notifyInfo]);

  const handleGenerate = async () => {
    if (!session?.user) {
      notifyError("Inicia sesión para generar contenido");
      return;
    }

    if (!prompt.trim()) {
      notifyError("Escribe una idea primero");
      return;
    }

    setLoading(true);
    setGenerationProgress("Preparando tu contenido...");

    // Create timeout to prevent infinite loading (60 seconds)
    const timeoutId = setTimeout(() => {
      if (loading) {
        setLoading(false);
        setGenerationProgress("");
        notifyError("Tiempo de espera agotado. Por favor, intenta de nuevo.");
      }
    }, 60000);

    try {
      setGenerationProgress("Verificando sesión...");
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        clearTimeout(timeoutId);
        notifyError("Sesión inválida. Vuelve a iniciar sesión");
        setLoading(false);
        setGenerationProgress("");
        return;
      }

      setGenerationProgress("Generando contenido con IA...");

      const controller = new AbortController();
      const fetchTimeout = setTimeout(() => controller.abort(), 55000);

      // Usar el nuevo sistema de IA viral
      const response = await fetch("/api/ai/generate-viral", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          topic: prompt,
          tone: toneProfile || "profesional",
          objective: "engagement",
          target_length: length === 100 ? "short" : length === 200 ? "medium" : "long",
          include_cta: true,
          mode: "generate",
        }),
        signal: controller.signal,
      });

      clearTimeout(fetchTimeout);
      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 402) {
          notifyError("Sin créditos disponibles. Mejora tu plan para continuar");
          setShowPlansModal(true);
        } else if (response.status === 429) {
          notifyError("Demasiadas solicitudes. Espera un momento e intenta nuevamente.");
        } else {
          notifyError(data?.error ?? "Error al generar contenido");
        }
        await loadCredits();
        return;
      }

      setGenerationProgress("Procesando resultados...");

      // Set viral score from AI analysis
      if (data.analysis?.estimated_viral_score !== undefined) {
        setViralScore(data.analysis.estimated_viral_score);
      }

      // Set recommendations from analysis suggestions
      if (data.analysis?.suggestions && Array.isArray(data.analysis.suggestions)) {
        setRecommendations(data.analysis.suggestions);
      }

      const newPost = {
        id: Date.now().toString(),
        prompt,
        generated_text: data.content,
        created_at: new Date().toISOString(),
        user_id: session.user.id,
        viral_score: data.analysis?.estimated_viral_score ?? null,
      };

      // Track post generation
      analytics.postGenerated(
        prompt,
        newPost.viral_score ?? undefined,
        data.credits_remaining
      );

      setPosts((current) => [newPost, ...current]);

      try {
        const bufferKey = "kolink-write-buffer";
        const existing = localStorage.getItem(bufferKey);
        const parsed: Array<{ id: string; prompt: string; generated_text: string; created_at: string; status: string; title: string }> = existing ? JSON.parse(existing) : [];
        parsed.unshift({
          id: newPost.id,
          prompt: newPost.prompt,
          generated_text: newPost.generated_text,
          created_at: newPost.created_at,
          status: "draft",
          title: newPost.prompt.slice(0, 80),
        });
        localStorage.setItem(bufferKey, JSON.stringify(parsed.slice(0, 20)));
      } catch (error) {
        console.warn("[dashboard] No se pudo almacenar el post generado", error);
      }

      setPrompt("");
      localStorage.removeItem("kolink-draft");

      if (typeof data.credits_remaining === "number") {
        setCredits(data.credits_remaining);
      } else {
        await loadCredits();
      }

      // Show preview modal instead of redirecting immediately
      setPreviewContent(newPost.generated_text);
      setShowPreviewModal(true);
      notifySuccess("Contenido generado con éxito");
    } catch (error) {
      clearTimeout(timeoutId);
      console.error("Generate error:", error);

      if ((error as Error).name === 'AbortError') {
        notifyError("La solicitud tardó demasiado. Por favor, intenta de nuevo.");
      } else if ((error as Error).message?.includes('NetworkError') || (error as Error).message?.includes('Failed to fetch')) {
        notifyError("Error de conexión. Verifica tu internet e intenta nuevamente.");
      } else {
        notifyError("Error al conectar con el servidor");
      }
    } finally {
      setLoading(false);
      setGenerationProgress("");
    }
  };

  const handleCopy = (text: string, postId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(postId);
    notifySuccess("Copiado al portapapeles");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handlePreviewSave = async (editedContent: string) => {
    setPreviewContent(editedContent);
    // Update the latest post with edited content
    if (posts.length > 0) {
      const updatedPosts = [...posts];
      updatedPosts[0] = { ...updatedPosts[0], generated_text: editedContent };
      setPosts(updatedPosts);

      // Update in database
      const { error } = await supabaseClient
        .from("posts")
        .update({ generated_text: editedContent })
        .eq("id", updatedPosts[0].id);

      if (error) {
        notifyError("Error al guardar cambios");
      } else {
        notifySuccess("Cambios guardados correctamente");
      }
    }
  };

  const handlePreviewCopy = () => {
    // This is called from the modal's copy button
    // The modal handles the actual copying
  };

  const handleSuggestionSelect = (suggestion: string) => {
    setPrompt(suggestion);
    notifyInfo("Sugerencia aplicada. Personalízala antes de generar");
  };

  const handleDelete = async (postId: string) => {
    const { error } = await supabaseClient
      .from("posts")
      .delete()
      .eq("id", postId);

    if (error) {
      notifyError("Error al eliminar la publicación");
      return;
    }

    setPosts((current) => current.filter((p) => p.id !== postId));
    notifySuccess("Publicación eliminada");
  };

  const handleExport = (content: string, title: string) => {
    setExportContent({ content, title });
    setShowExportModal(true);
  };

  const toggleTopic = (topic: string) => {
    setSelectedTopics((prev) =>
      prev.includes(topic) ? prev.filter((item) => item !== topic) : [...prev, topic]
    );
  };

  const firstName = useMemo(() => {
    const profileName = fullName.trim() || String(session?.user?.user_metadata?.full_name ?? "").trim();
    if (profileName) {
      const first = profileName.split(" ")[0];
      return first.charAt(0).toUpperCase() + first.slice(1);
    }
    const emailPrefix = session?.user?.email?.split("@")[0] ?? "";
    if (!emailPrefix) {
      return "Creador";
    }
    const sanitized = emailPrefix.replace(/[\W_]+/g, " ").trim();
    if (!sanitized) {
      return "Creador";
    }
    const firstSanitized = sanitized.split(" ")[0];
    return firstSanitized.charAt(0).toUpperCase() + firstSanitized.slice(1);
  }, [fullName, session?.user?.email, session?.user?.user_metadata?.full_name]);

  const latestPost = posts[0] ?? null;

  const postsThisWeek = useMemo(() => {
    const threshold = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return posts.filter((post) => new Date(post.created_at).getTime() >= threshold).length;
  }, [posts]);

  const postsThisMonth = useMemo(() => {
    const threshold = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return posts.filter((post) => new Date(post.created_at).getTime() >= threshold).length;
  }, [posts]);

  const averageViralScore = useMemo(() => {
    if (posts.length === 0) return 0;
    const valid = posts.map((post) => Number(post.viral_score) || 0);
    const sum = valid.reduce((acc, val) => acc + val, 0);
    return Math.round((sum / valid.length) * 10) / 10;
  }, [posts]);

  const autopilotEnabled = Boolean(profileFeatures.autopilot_enabled);
  const autopilotFrequency = typeof profileFeatures.autopilot_frequency === "string"
    ? (profileFeatures.autopilot_frequency as keyof typeof AUTOPILOT_FREQUENCY_LABELS)
    : null;
  const autopilotFrequencyLabel = autopilotFrequency
    ? AUTOPILOT_FREQUENCY_LABELS[autopilotFrequency] ?? "personalizada"
    : null;
  const linkedinConnected = Boolean(profileFeatures.linkedin_connected);
  const toneTrainingActive =
    Boolean(profileFeatures.tone_trained) || (typeof toneProfile === "string" && toneProfile !== "professional");
  const autopilotNextPost = useMemo(() => {
    const extractDetails = (source: Record<string, unknown> | undefined | null) => {
      if (!source) return null;
      const scheduledAt =
        typeof source.scheduled_at === "string"
          ? source.scheduled_at
          : typeof source.schedule_at === "string"
            ? source.schedule_at
            : typeof source.date === "string"
              ? source.date
              : undefined;
      const title =
        typeof source.title === "string"
          ? source.title
          : typeof source.name === "string"
            ? source.name
            : undefined;
      const topic =
        typeof source.topic === "string"
          ? source.topic
          : typeof source.category === "string"
            ? source.category
            : undefined;
      if (!scheduledAt && !title && !topic) {
        return null;
      }
      return { scheduledAt, title, topic };
    };

    const candidate =
      extractDetails(profileFeatures.autopilot_next_post as Record<string, unknown> | undefined) ??
      extractDetails(profileFeatures.next_autopilot_post as Record<string, unknown> | undefined);

    if (candidate) {
      return candidate;
    }

    const scheduleFromStrings =
      typeof profileFeatures.autopilot_next_post_at === "string"
        ? profileFeatures.autopilot_next_post_at
        : undefined;

    if (!scheduleFromStrings) {
      return null;
    }

    return {
      scheduledAt: scheduleFromStrings,
      title:
        typeof profileFeatures.autopilot_next_post_title === "string"
          ? profileFeatures.autopilot_next_post_title
          : undefined,
      topic:
        typeof profileFeatures.autopilot_next_post_topic === "string"
          ? profileFeatures.autopilot_next_post_topic
          : undefined,
    };
  }, [profileFeatures]);

  const formattedNextAutopilot = useMemo(() => {
    if (!autopilotNextPost?.scheduledAt) return null;
    try {
      const locale = preferredLanguage === "pt-BR" ? "pt-BR" : preferredLanguage === "en-US" ? "en-US" : "es-ES";
      return new Date(autopilotNextPost.scheduledAt).toLocaleString(locale, {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch (error) {
      console.warn("[dashboard] No se pudo formatear la fecha del próximo post de Auto-Pilot", error);
      return autopilotNextPost.scheduledAt;
    }
  }, [autopilotNextPost, preferredLanguage]);

  const heroMetrics = useMemo(
    () => [
      {
        label: "Créditos disponibles",
        value: typeof credits === "number" ? credits : "—",
        sublabel: `Plan ${plan ?? "Free"}`,
      },
      {
        label: "Actividad semanal",
        value: postsThisWeek,
        sublabel: `${postsThisMonth} este mes`,
      },
      {
        label: "Auto-Pilot",
        value: autopilotEnabled ? "Activo" : "Pausado",
        sublabel: autopilotEnabled
          ? `Frecuencia ${autopilotFrequencyLabel ?? "personalizada"}`
          : "Configura tu cadencia ideal",
      },
      {
        label: "Viral score",
        value: posts.length > 0 ? `${averageViralScore}` : "—",
        sublabel: "Promedio últimos 50 posts",
      },
    ],
    [credits, plan, postsThisWeek, postsThisMonth, autopilotEnabled, autopilotFrequencyLabel, posts.length, averageViralScore]
  );

  const triggerQuickIdea = useCallback(
    (idea: string, preset?: (typeof PRESET_OPTIONS)[number]["id"]) => {
      setPrompt(idea);
      if (preset) {
        setActivePreset(preset);
      }
      notifyInfo("Plantilla aplicada. Ajusta detalles antes de generar ✨");
    },
    [notifyInfo]
  );

  const quickActions = useMemo<QuickAction[]>(
    () => [
      {
        id: "ai-post",
        title: "Generar post con IA",
        description: "Activa una plantilla curada y ajusta el mensaje antes de publicar.",
        icon: Sparkles,
        action: () => router.push("/write"),
        highlight: false,
      },
      {
        id: "autopilot",
        title: autopilotEnabled ? "Gestionar Auto-Pilot" : "Activa Auto-Pilot",
        description: autopilotEnabled
          ? `Frecuencia ${autopilotFrequencyLabel ?? "personalizada"}. Ajusta tu calendario.`
          : linkedinConnected
            ? "Programa publicaciones automáticas para mantener tu presencia."
            : "Conecta tu LinkedIn para activar Auto-Pilot sin fricciones.",
        icon: CalendarClock,
        action: () => router.push("/calendar"),
        highlight: !autopilotEnabled || !linkedinConnected,
      },
      {
        id: "inspiration",
        title: "Explorar inspiración",
        description: "Descubre ejemplos de alto rendimiento y captura ideas.",
        icon: Lightbulb,
        action: () => router.push("/inspiration"),
        highlight: false,
      },
    ],
    [autopilotEnabled, autopilotFrequencyLabel, router, linkedinConnected]
  );

  const handleToggleAutopilot = async () => {
    if (!userId) {
      notifyError("Inicia sesión para gestionar Auto-Pilot");
      return;
    }

    const nextState = !autopilotEnabled;
    setAutopilotUpdating(true);

    const updatedFeatures: ProfileFeatures = {
      ...profileFeatures,
      autopilot_enabled: nextState,
    };

    const { error } = await supabaseClient
      .from("profiles")
      .update({ features: updatedFeatures })
      .eq("id", userId);

    if (error) {
      console.error("Error updating Auto-Pilot:", error);
      notifyError("No pudimos actualizar Auto-Pilot. Inténtalo nuevamente.");
      setAutopilotUpdating(false);
      return;
    }

    setProfileFeatures(updatedFeatures);
    notifySuccess(nextState ? "Auto-Pilot activado. Programaremos tus próximos posts automáticos." : "Auto-Pilot pausado.");
    setAutopilotUpdating(false);
  };

  const handleSaveTopics = async () => {
    if (!userId) {
      notifyError("Inicia sesión para guardar tus temas");
      return;
    }

    setSavingTopics(true);
    const existingPreferences =
      (profileFeatures.topic_preferences && typeof profileFeatures.topic_preferences === "object"
        ? profileFeatures.topic_preferences
        : {}) || {};

    const updatedFeatures: ProfileFeatures = {
      ...profileFeatures,
      topic_preferences: {
        ...(existingPreferences as Record<string, unknown>),
        selected_topics: selectedTopics,
        updated_at: new Date().toISOString(),
      },
    };

    const { error } = await supabaseClient
      .from("profiles")
      .update({ features: updatedFeatures })
      .eq("id", userId);

    if (error) {
      console.error("Error saving topics:", error);
      notifyError("No pudimos guardar los temas. Intenta nuevamente.");
      setSavingTopics(false);
      return;
    }

    setProfileFeatures(updatedFeatures);
    notifySuccess("Temas guardados. La IA priorizará estas ideas en tus sugerencias y Auto-Pilot.");
    setSavingTopics(false);
  };

  const handleConfirmClearPrompt = () => {
    setPrompt("");
    setViralScore(undefined);
    setRecommendations([]);
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("kolink-draft");
      } catch (error) {
        console.warn("[dashboard] No se pudo limpiar el borrador local", error);
      }
    }
    notifyInfo("Borrador limpiado. Usa Ctrl+Z para revertir si lo necesitas.");
  };

  const scrollToHistory = () => {
    if (typeof document !== "undefined") {
      document.getElementById("history-section")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  if (session === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader size={40} />
      </div>
    );
  }

  if (redirecting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader size={40} />
      </div>
    );
  }

  return (
    <>
      <Navbar session={session} />
      <div className="min-h-screen bg-slate-50 pb-20 pt-20 lg:pl-64 dark:bg-slate-950">
        <div className="mx-auto max-w-7xl space-y-10 px-4 sm:px-6 lg:px-8">
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 shadow-xl"
          >
            <div className="absolute -right-12 top-6 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
            <div className="relative z-10 flex flex-col gap-8 p-8 text-white md:p-10 lg:p-12">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-2xl space-y-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/70">Panel principal</p>
                  <h1 className="text-3xl font-semibold md:text-4xl">
                    Hola {firstName}, hoy es un buen día para publicar algo memorable ✨
                  </h1>
                  <p className="text-white/80 md:text-base">
                    Resume tus aprendizajes, activa Auto-Pilot o revisa el rendimiento reciente. Kolink te acompaña con insights accionables.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      className="min-h-[46px] rounded-full px-6"
                      onClick={() =>
                        triggerQuickIdea(
                          "Comparte lo que tu audiencia debería evitar esta semana y ofrece un consejo accionable.",
                          "insight"
                        )
                      }
                    >
                      Crear insight rápido
                    </Button>
                    <Button
                      variant="outline"
                      className="min-h-[46px] rounded-full border-white/60 px-6 text-white hover:border-white hover:bg-white/10"
                      onClick={() => setShowPlansModal(true)}
                    >
                      Gestionar créditos
                    </Button>
                    <Button
                      variant="ghost"
                      className="min-h-[46px] rounded-full px-6 text-white/80 hover:text-white"
                      onClick={scrollToHistory}
                    >
                      Ver historial
                    </Button>
                  </div>
                </div>
                <div className="grid w-full max-w-xl gap-4 sm:grid-cols-2">
                  {heroMetrics.map((metric) => (
                    <div
                      key={metric.label}
                      className="rounded-2xl border border-white/15 bg-white/10 p-6 backdrop-blur"
                    >
                      <p className="text-xs uppercase tracking-[0.3em] text-white/70">{metric.label}</p>
                      <p className="mt-3 text-3xl font-semibold">{metric.value}</p>
                      <p className="mt-1 text-xs text-white/70">{metric.sublabel}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.3em] text-white/70">Objetivo sugerido</p>
                <p className="mt-3 text-sm text-white/90">
                  Genera al menos <strong>3 publicaciones</strong> esta semana para mantener tu ritmo. Ya llevas{" "}
                  <strong>{postsThisWeek}</strong>. ¿Necesitas inspiración rápida? Revisa las acciones destacadas debajo.
                </p>
              </div>
            </div>
          </motion.section>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {quickActions.map((action) => (
              <Card
                key={action.id}
                className={`border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-slate-700 dark:bg-slate-900 ${
                  action.highlight ? "border-primary/40 shadow-primary/10" : ""
                }`}
              >
                <div className="flex flex-col gap-4">
                  <span
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${
                      action.highlight
                        ? "bg-primary/20 text-primary"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    <action.icon className="h-5 w-5" />
                  </span>
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{action.title}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{action.description}</p>
                  </div>
                  <Button
                    variant={action.highlight ? "primary" : "ghost"}
                    className="mt-2 justify-center"
                    onClick={action.action}
                  >
                    Abrir
                  </Button>
                </div>
              </Card>
            ))}
          </section>

          <div className="grid gap-6 xl:grid-cols-[2.2fr_1.1fr]">
            <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-blue-100 bg-white p-8 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Estudio creativo</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Define tu objetivo, ajusta tono y deja que la IA proponga el mejor borrador.
                    </p>
                  </div>
                  <ViralScoreTooltip score={viralScore} />
                </div>

                <div className="mt-6">
                  <PromptSuggestions onSelect={handleSuggestionSelect} language={preferredLanguage} />
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  {PRESET_OPTIONS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setActivePreset(preset.id)}
                      className={`rounded-full border px-5 py-3 text-sm font-semibold transition md:px-4 md:py-2 ${
                        activePreset === preset.id
                          ? "border-primary bg-primary text-white shadow-md"
                          : "border-slate-200 text-slate-500 hover:border-primary hover:text-primary dark:border-slate-600 dark:text-slate-300"
                      }`}
                    >
                      <div className="flex flex-col text-left">
                        <span>{preset.label}</span>
                        <span className="text-xs font-normal text-slate-400">{preset.description}</span>
                      </div>
                    </button>
                  ))}
                </div>

                {loading && generationProgress && (
                  <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/80 p-4 dark:border-blue-900/50 dark:bg-blue-900/20">
                    <div className="flex items-center gap-3">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-200">{generationProgress}</p>
                    </div>
                  </div>
                )}

                <div className="mt-6 space-y-6">
                  <ContentControls
                    tone={toneProfile}
                    onToneChange={setToneProfile}
                    formality={formality}
                    onFormalityChange={setFormality}
                    length={length}
                    onLengthChange={setLength}
                  />
                  <EditorAI
                    value={prompt}
                    onChange={setPrompt}
                    onGenerate={handleGenerate}
                    loading={loading}
                    viralScore={viralScore}
                    recommendations={recommendations}
                    language={preferredLanguage}
                  />
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-slate-400">
                    {activePreset === "repurpose"
                      ? "Usaremos tu post con mejor rendimiento como base."
                      : "Consejo rápido: concreta tu audiencia, CTA y propósito."}
                  </p>
                  <Button
                    variant="ghost"
                    className="min-h-[44px]"
                    onClick={() => setShowClearPromptModal(true)}
                  >
                    Limpiar
                  </Button>
                </div>
              </Card>
            </motion.section>

            <motion.aside initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <Card className="border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Auto-Pilot</h3>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          autopilotEnabled
                            ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-200"
                            : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        {autopilotEnabled ? "Activo" : "Pausado"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {autopilotEnabled
                        ? "Tus posts automáticos están listos. Ajusta la cadencia cuando lo necesites."
                        : "Activa Auto-Pilot para mantener tu calendario lleno y sin fricciones."}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={autopilotEnabled}
                      aria-label={autopilotEnabled ? "Pausar Auto-Pilot" : "Activar Auto-Pilot"}
                      onClick={handleToggleAutopilot}
                      disabled={autopilotUpdating}
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
                        autopilotEnabled ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
                      } ${autopilotUpdating ? "cursor-wait opacity-70" : "cursor-pointer"}`}
                    >
                      <span className="sr-only">
                        {autopilotEnabled ? "Pausar Auto-Pilot" : "Activar Auto-Pilot"}
                      </span>
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                          autopilotEnabled ? "translate-x-5" : "translate-x-1"
                        }`}
                      />
                    </button>
                    {autopilotUpdating && <Loader size={16} className="border-t-emerald-200" />}
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <CalendarClock className="h-4 w-4 text-blue-500 dark:text-blue-300" />
                    Frecuencia {autopilotFrequencyLabel ?? "personalizable"}
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                    {autopilotEnabled ? (
                      formattedNextAutopilot ? (
                        <span>
                          Próximo post programado: <strong>{formattedNextAutopilot}</strong>
                          {autopilotNextPost?.topic ? ` · Tema: ${autopilotNextPost.topic}` : ""}
                          {autopilotNextPost?.title ? ` · "${autopilotNextPost.title}"` : ""}
                        </span>
                      ) : (
                        "Auto-Pilot está activo. Aún no hay publicaciones programadas."
                      )
                    ) : (
                      "Activa Auto-Pilot para programar publicaciones automáticas alineadas con tus temas."
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedTopics.slice(0, 4).map((topic) => (
                      <span
                        key={topic}
                        className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                      >
                        {topic}
                      </span>
                    ))}
                    {selectedTopics.length > 4 && (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        +{selectedTopics.length - 4}
                      </span>
                    )}
                    {selectedTopics.length === 0 && (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        Añade tus temas clave
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <Tooltip
                      content="Auto-Pilot y el generador priorizan estos temas para tus próximas ideas y agenda semanal."
                      position="right"
                    />
                    <span>Los temas seleccionados orientan las sugerencias automáticas de la IA.</span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="mt-5 w-full justify-center"
                  onClick={() => router.push("/calendar")}
                >
                  Ajustar calendario
                </Button>
              </Card>

              <Card className="border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    <NotebookPen className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Tono y estilo</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Ajusta el tono, la formalidad y la longitud objetivo de tus publicaciones.
                    </p>
                  </div>
                </div>
                <div className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                  <p>
                    <span className="font-semibold">Tono actual:</span> {toneProfile || "Profesional"}
                  </p>
                  <p>
                    <span className="font-semibold">Formalidad:</span> {formality}/100 ·{" "}
                    <span className="font-semibold">Longitud:</span> {length} palabras aprox.
                  </p>
                  <p>
                    <span className="font-semibold">Entrenamiento personalizado:</span>{" "}
                    {toneTrainingActive ? "Activado" : "Pendiente"}
                  </p>
                  <p className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-blue-500 dark:text-blue-300" />
                    <span>
                      {preferredLanguage === "es-ES" ? "Español" : preferredLanguage === "en-US" ? "Inglés" : "Portugués"} como idioma preferido
                    </span>
                  </p>
                </div>
                <Button
                  variant="ghost"
                  className="mt-4 w-full justify-center"
                  onClick={() => router.push("/profile")}
                >
                  Editar preferencias
                </Button>
              </Card>

              <Card className="border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    <BarChart3 className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Insights rápidos</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Visualiza la actividad reciente y accede a reportes detallados.
                    </p>
                  </div>
                </div>
                <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-emerald-500" />
                      Posts esta semana
                    </span>
                    <span className="font-semibold">{postsThisWeek}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-blue-500" />
                      Viral score medio
                    </span>
                    <span className="font-semibold">{posts.length > 0 ? averageViralScore : "—"}</span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="mt-5 w-full justify-center"
                  onClick={() => router.push("/stats")}
                >
                  Ver reportes
                </Button>
              </Card>
            </motion.aside>
          </div>

          <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-blue-100 bg-white p-6 shadow-md dark:border-slate-700 dark:bg-slate-900">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Tu último post</h2>
                  {latestPost && (
                    <Button
                      variant="ghost"
                      className="text-xs"
                      onClick={() => handleCopy(latestPost.generated_text, latestPost.id)}
                    >
                      {copiedId === latestPost.id ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                      <span className="ml-1 hidden sm:inline">Copiar</span>
                    </Button>
                  )}
                </div>
                {latestPost ? (
                  <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-200">
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-[0.3em] text-slate-400">
                      <span>
                        {new Date(latestPost.created_at).toLocaleString("es-ES", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                      {latestPost.viral_score && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50/70 px-3 py-1 font-semibold text-blue-600 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                          <TrendingUp className="h-3.5 w-3.5" />
                          {latestPost.viral_score.toFixed(0)}/100
                        </span>
                      )}
                    </div>
                    <p className="whitespace-pre-line leading-relaxed">{latestPost.generated_text}</p>
                    {recommendations.length > 0 && (
                      <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 text-xs text-slate-600 dark:border-blue-700 dark:bg-blue-900/20 dark:text-slate-300">
                        <p className="mb-2 font-semibold text-slate-800 dark:text-slate-200">Sugerencias de mejora</p>
                        <ul className="list-disc space-y-1 pl-5">
                          {recommendations.map((item, index) => (
                            <li key={index}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" className="justify-center" onClick={() => setShowPreviewModal(true)}>
                        Editar en modal
                      </Button>
                      <Button
                        variant="ghost"
                        className="justify-center"
                        onClick={() => handleExport(latestPost.generated_text, latestPost.prompt)}
                      >
                        Exportar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
                    Aún no has generado publicaciones. Escribe una idea arriba y obtén tu primer borrador en segundos.
                  </p>
                )}
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-blue-100 bg-white p-6 shadow-md dark:border-slate-700 dark:bg-slate-900">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Comparte Kolink</h2>
                <p className="mt-3 text-sm text-slate-500 dark:text-slate-300">
                  Invita a un colega y consigue 15% de comisión de por vida. Ellos reciben USD 30 en crédito inicial.
                </p>
                <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-xs font-semibold text-green-600 dark:border-green-900/50 dark:bg-green-900/10 dark:text-green-200">
                  Recompensa disponible · Código personal en tu perfil
                </div>
                <Button
                  variant="outline"
                  className="mt-6 w-full justify-center"
                  onClick={() => router.push("/profile")}
                >
                  Compartir Kolink
                </Button>
              </Card>
            </motion.div>
          </section>

          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-blue-100 bg-white p-8 shadow-lg dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Planificador de temas</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Selecciona los focos clave de esta semana. La IA los sincroniza con Auto-Pilot y las sugerencias del generador.
                </p>
              </div>
              <Button
                variant="outline"
                className="mt-3 sm:mt-0"
                onClick={() => setSelectedTopics(TOPIC_OPTIONS.slice(0, 3))}
              >
                Resetear selección
              </Button>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              {TOPIC_OPTIONS.map((topic) => {
                const active = selectedTopics.includes(topic);
                return (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => toggleTopic(topic)}
                    className={`rounded-full border px-5 py-3 text-sm transition md:px-4 md:py-2 ${
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-slate-200 text-slate-500 hover:border-primary hover:text-primary"
                    }`}
                  >
                    {topic}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Tooltip
                content="Tus plantillas y Auto-Pilot priorizarán estos temas cuando propongan ideas o programen publicaciones."
                position="right"
              />
              <span>Confirma los temas para que la IA adapte las ideas automáticas de esta semana.</span>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-400">{selectedTopics.length} temas seleccionados</p>
              <Button
                className="sm:w-auto"
                onClick={handleSaveTopics}
                disabled={savingTopics}
              >
                {savingTopics ? (
                  <>
                    <Loader size={18} className="mr-2 border-t-white" />
                    Guardando temas...
                  </>
                ) : (
                  "Confirmar temas"
                )}
              </Button>
            </div>
          </motion.section>


          <section id="history-section" className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Historial de publicaciones</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">{posts.length} posts generados</p>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500">Ordenado por más recientes</p>
            </div>
            {posts.length === 0 ? (
              <Card className="border-slate-200 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900">
                No hay publicaciones aún. Genera tu primer post para poblar este espacio.
              </Card>
            ) : (
              <div className="space-y-3">
                {posts.map((post) => (
                  <Card
                    key={post.id}
                    className="border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-[1px] hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs uppercase tracking-[0.3em] text-slate-400">
                          <span>
                            {new Date(post.created_at).toLocaleString("es-ES", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </span>
                          {post.viral_score && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50/70 px-2 py-0.5 font-semibold text-blue-600 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                              <TrendingUp className="h-3 w-3" />
                              {post.viral_score.toFixed(0)}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-200 line-clamp-3 whitespace-pre-line">
                          {post.generated_text}
                        </p>
                      </div>
                      <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
                        <button
                          onClick={() => handleExport(post.generated_text, post.prompt)}
                          className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-500 transition hover:border-primary hover:text-primary dark:border-slate-700 dark:text-slate-300"
                        >
                          <div className="flex items-center gap-1.5">
                            <Share2 className="h-4 w-4" />
                            <span>Exportar</span>
                          </div>
                        </button>
                        <button
                          onClick={() => handleCopy(post.generated_text, post.id)}
                          className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-500 transition hover:border-primary hover:text-primary dark:border-slate-700 dark:text-slate-300"
                        >
                          <div className="flex items-center gap-1.5">
                            {copiedId === post.id ? (
                              <Check className="h-4 w-4 text-primary" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                            <span>Copiar</span>
                          </div>
                        </button>
                        <button
                          onClick={() => handleDelete(post.id)}
                          className="rounded-xl border border-red-200 px-4 py-2 text-sm text-red-500 transition hover:bg-red-50 dark:border-red-600/50 dark:hover:bg-red-950"
                        >
                          <div className="flex items-center gap-1.5">
                            <Trash2 className="h-4 w-4" />
                            <span>Eliminar</span>
                          </div>
                        </button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </div>

        <ConfirmationModal
          open={showClearPromptModal}
          onOpenChange={setShowClearPromptModal}
          title="¿Limpiar el borrador?"
          description="Perderás el contenido escrito hasta ahora. Puedes usar Ctrl+Z justo después para recuperarlo si cambias de opinión."
          confirmText="Limpiar"
          cancelText="Cancelar"
          onConfirm={handleConfirmClearPrompt}
          variant="warning"
        />
        <PlansModal open={showPlansModal} onOpenChange={setShowPlansModal} userId={userId || undefined} />
        <ThankYouModal
          open={showThankYouModal}
          onOpenChange={setShowThankYouModal}
          plan={plan || "PRO"}
          credits={credits || 0}
        />
        <ExportModal
          open={showExportModal}
          onOpenChange={setShowExportModal}
          content={exportContent.content}
          title={exportContent.title}
        />
        <PostPreviewModal
          open={showPreviewModal}
          onOpenChange={setShowPreviewModal}
          content={previewContent}
          onSave={handlePreviewSave}
          onCopy={handlePreviewCopy}
          viralScore={viralScore}
          recommendations={recommendations}
        />
      </div>
    </>
  );
}
