import { logger } from '@/lib/logger';
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import { Session } from "@supabase/supabase-js";
import { supabaseClient } from "@/lib/supabaseClient";
import { motion } from "framer-motion";
import {
  Settings,
  Sparkles,
  Users,
  PenTool,
  Palette,
  MessageSquare,
  Target,
  Chrome,
  BarChart3,
  Bell,
  Download,
  FileJson,
  Trophy,
  Zap,
  TrendingUp,
  Linkedin,
  Link as LinkIcon,
  CreditCard,
} from "lucide-react";
import Button from "@/components/Button";
import Loader from "@/components/Loader";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";
import CookieSettingsCard from "@/components/compliance/CookieSettingsCard";
import Link from "next/link";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import PlansModal from "@/components/PlansModal";

type ProfileProps = {
  session: Session | null | undefined;
};

type Profile = {
  id: string;
  email: string;
  plan: string;
  credits: number;
  created_at: string;
  full_name: string | null;
  features: Record<string, unknown> | null;
  preferred_language?: string;
  timezone?: string;
  // Gamificación
  xp?: number;
  level?: number;
  streak_days?: number;
  total_posts?: number;
  last_activity_date?: string;
  // LinkedIn
  linkedin_id?: string | null;
  linkedin_first_name?: string | null;
  linkedin_last_name?: string | null;
  linkedin_full_name?: string | null;
  linkedin_headline?: string | null;
  linkedin_summary?: string | null;
  linkedin_industry?: string | null;
  linkedin_profile_url?: string | null;
  linkedin_picture?: string | null;
  linkedin_email?: string | null;
  linkedin_connected_at?: string | null;
  linkedin_token_expires_at?: string | null;
};

type SubscriptionInfo = {
  hasSubscription: boolean;
  plan: string;
  credits: number;
  subscription?: {
    id: string;
    status: string;
    current_period_start: number;
    current_period_end: number;
    cancel_at_period_end: boolean;
    priceId: string;
  };
  paymentMethod?: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
};

type SettingsSection =
  | "general"
  | "subscription"
  | "gamification"
  | "integrations"
  | "ai-language"
  | "members"
  | "writing-style"
  | "brand-kits"
  | "auto-comments"
  | "custom-ctas"
  | "chrome-extension"
  | "analytics"
  | "notifications"
  | "data-export";

const SETTINGS_MENU = [
  { id: "general" as SettingsSection, label: "General", icon: Settings },
  { id: "subscription" as SettingsSection, label: "Suscripción y Pagos", icon: CreditCard },
  { id: "gamification" as SettingsSection, label: "Mi Progreso", icon: Trophy },
  { id: "integrations" as SettingsSection, label: "Integraciones", icon: Zap },
  { id: "ai-language" as SettingsSection, label: "IA y Lenguaje", icon: Sparkles },
  { id: "writing-style" as SettingsSection, label: "Estilo de Escritura", icon: PenTool },
  { id: "analytics" as SettingsSection, label: "Analytics", icon: BarChart3 },
  { id: "notifications" as SettingsSection, label: "Notificaciones", icon: Bell },
  { id: "data-export" as SettingsSection, label: "Exportar Datos", icon: Download },
  { id: "members" as SettingsSection, label: "Miembros del Workspace", icon: Users },
  { id: "brand-kits" as SettingsSection, label: "Brand Kits", icon: Palette },
  { id: "auto-comments" as SettingsSection, label: "Auto-plug Comentarios", icon: MessageSquare },
  { id: "custom-ctas" as SettingsSection, label: "CTAs/Post Finishers Personalizados", icon: Target },
  { id: "chrome-extension" as SettingsSection, label: "Configuración de Extensión Chrome", icon: Chrome },
];

export default function Profile({ session }: ProfileProps) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Read section from URL query param
  const sectionFromQuery = router.query.section as SettingsSection | undefined;
  const [activeSection, setActiveSection] = useState<SettingsSection>(sectionFromQuery || "general");
  const [workspaceName, setWorkspaceName] = useState("DEFAULT");
  const [preferredLanguage, setPreferredLanguage] = useState("es-ES");
  const [savingLanguage, setSavingLanguage] = useState(false);
  const [timezone, setTimezone] = useState("UTC");
  const [savingTimezone, setSavingTimezone] = useState(false);
  const [toneProfile, setToneProfile] = useState<string>("");
  const [tonePreset, setTonePreset] = useState<string>("profesional");
  const [notificationPrefs, setNotificationPrefs] = useState({
    email_notifications: true,
    credit_reminders: true,
    weekly_summary: true,
    admin_notifications: true,
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [exportingData, setExportingData] = useState(false);
  const [syncingLinkedIn, setSyncingLinkedIn] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [disconnectingLinkedIn, setDisconnectingLinkedIn] = useState(false);
  const linkedInConnected = Boolean(profile?.linkedin_id);

  // Subscription state
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null);
  const [loadingSubscription, setLoadingSubscription] = useState(false);
  const [cancelingSubscription, setCancelingSubscription] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showPlansModal, setShowPlansModal] = useState(false);

  const formatDateTime = (value?: string | null, options?: Intl.DateTimeFormatOptions) => {
    if (!value) return "—";
    try {
      return new Date(value).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
        ...options,
      });
    } catch {
      return "—";
    }
  };

  useEffect(() => {
    if (session === undefined) return;
    if (!session) {
      router.replace("/signin");
      return;
    }

    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, router]);

  // Update active section when query param changes
  useEffect(() => {
    if (router.query.section) {
      const section = router.query.section as SettingsSection;
      if (SETTINGS_MENU.find(item => item.id === section)) {
        setActiveSection(section);
      }
    }
  }, [router.query.section]);

  useEffect(() => {
    if (router.query.linkedin_success && session?.user) {
      toast.success("LinkedIn conectado correctamente");
      loadProfile();
      router.replace({ pathname: "/profile", query: { section: "integrations" } }, undefined, {
        shallow: true,
      });
    }
    if (router.query.linkedin_error) {
      toast.error(decodeURIComponent(String(router.query.linkedin_error)));
      router.replace({ pathname: "/profile", query: { section: "integrations" } }, undefined, {
        shallow: true,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.query.linkedin_success, router.query.linkedin_error]);

  // Load subscription info when subscription section is active
  useEffect(() => {
    if (activeSection === "subscription" && session?.user && !subscriptionInfo) {
      loadSubscriptionInfo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection, session]);

  const loadProfile = async () => {
    if (!session?.user) return;

    try {
      const { data, error } = await supabaseClient
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (error) {
        logger.error("Error loading profile:", error);
        toast.error("Error al cargar el perfil");
        return;
      }

      setProfile(data as Profile);
      setWorkspaceName(data.full_name || "DEFAULT");
      setPreferredLanguage(data.preferred_language || "es-ES");
      setTimezone(data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
      setToneProfile(data.tone_profile || "");
      if (data.notification_preferences) {
        setNotificationPrefs(data.notification_preferences as typeof notificationPrefs);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveWorkspaceName = async () => {
    if (!session?.user) return;

    try {
      const { error } = await supabaseClient
        .from("profiles")
        .update({ full_name: workspaceName })
        .eq("id", session.user.id);

      if (error) {
        logger.error("Error saving workspace name:", error);
        toast.error("Error al guardar");
      } else {
        toast.success("Cambios guardados");
        if (profile) {
          setProfile({ ...profile, full_name: workspaceName });
        }
      }
    } catch (error) {
      logger.error("Error:", error);
      toast.error("Error al guardar");
    }
  };

  const handleSaveLanguage = async () => {
    if (!session?.user) return;

    setSavingLanguage(true);
    try {
      const { error } = await supabaseClient
        .from("profiles")
        .update({ preferred_language: preferredLanguage })
        .eq("id", session.user.id);

      if (error) {
        logger.error("Error saving language:", error);
        toast.error("Error al guardar el idioma");
      } else {
        toast.success("Idioma actualizado correctamente");
        // Update profile state
        if (profile) {
          setProfile({ ...profile, preferred_language: preferredLanguage });
        }
      }
    } finally {
      setSavingLanguage(false);
    }
  };

  const handleSaveTimezone = async () => {
    if (!session?.user) return;

    setSavingTimezone(true);
    try {
      const { error } = await supabaseClient
        .from("profiles")
        .update({ timezone })
        .eq("id", session.user.id);

      if (error) {
        logger.error("Error saving timezone:", error);
        toast.error("Error al guardar la zona horaria");
      } else {
        toast.success("Zona horaria actualizada correctamente");
        if (profile) {
          setProfile({ ...profile, timezone });
        }
      }
    } finally {
      setSavingTimezone(false);
    }
  };

  const handleSaveToneProfile = async () => {
    if (!session?.user) return;

    setSavingSettings(true);
    try {
      const { error } = await supabaseClient
        .from("profiles")
        .update({ tone_profile: toneProfile })
        .eq("id", session.user.id);

      if (error) {
        toast.error("Error al guardar el estilo de escritura");
      } else {
        toast.success("Estilo de escritura guardado");
      }
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveNotificationPrefs = async () => {
    if (!session?.user) return;

    setSavingSettings(true);
    try {
      const { error } = await supabaseClient
        .from("profiles")
        .update({ notification_preferences: notificationPrefs })
        .eq("id", session.user.id);

      if (error) {
        toast.error("Error al guardar preferencias de notificaciones");
      } else {
        toast.success("Preferencias de notificaciones actualizadas");
      }
    } finally {
      setSavingSettings(false);
    }
  };

  const handleExportData = async () => {
    if (!session?.user) return;

    setExportingData(true);
    try {
      const token = session.access_token;
      const response = await fetch("/api/export/user-data", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Error al exportar datos");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kolink-data-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Datos exportados correctamente");
    } catch (error) {
      logger.error("Error exporting data:", error);
      toast.error("Error al exportar datos");
    } finally {
      setExportingData(false);
    }
  };

  const resolveAccessToken = async (): Promise<string | null> => {
    const { data } = await supabaseClient.auth.getSession();
    return data.session?.access_token ?? null;
  };

  const handleConnectLinkedIn = async () => {
    try {
      const accessToken = await resolveAccessToken();
      if (!accessToken) {
        toast.error("No se pudo obtener tu sesión. Inicia sesión nuevamente.");
        return;
      }

      const link = document.createElement("a");
      link.href = `/api/auth/linkedin/start?token=${encodeURIComponent(accessToken)}`;
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      logger.error("Error starting LinkedIn OAuth:", error);
      toast.error("No se pudo iniciar la conexión con LinkedIn");
    }
  };

  const handleSyncLinkedInProfile = async () => {
    setSyncingLinkedIn(true);
    try {
      const accessToken = await resolveAccessToken();
      if (!accessToken) {
        toast.error("Sesión inválida. Inicia sesión de nuevo.");
        setSyncingLinkedIn(false);
        return;
      }

      const response = await fetch("/api/linkedin/sync-profile", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Error al sincronizar" }));
        toast.error(data.error || "Error al sincronizar con LinkedIn");
        setSyncingLinkedIn(false);
        return;
      }

      toast.success("Perfil de LinkedIn sincronizado");
      await loadProfile();
    } catch (error) {
      logger.error("Error syncing LinkedIn profile:", error);
      toast.error("No se pudo sincronizar con LinkedIn");
    } finally {
      setSyncingLinkedIn(false);
    }
  };

  const handleDisconnectLinkedIn = async () => {
    setDisconnectingLinkedIn(true);
    try {
      const accessToken = await resolveAccessToken();
      if (!accessToken) {
        toast.error("Sesión inválida. Inicia sesión de nuevo.");
        setDisconnectingLinkedIn(false);
        return;
      }

      const response = await fetch("/api/auth/linkedin/disconnect", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Error" }));
        toast.error(data.error || "No se pudo desconectar LinkedIn");
        setDisconnectingLinkedIn(false);
        return;
      }

      toast.success("LinkedIn desconectado");
      setShowDisconnectModal(false);
      await loadProfile();
    } catch (error) {
      logger.error("Error disconnecting LinkedIn:", error);
      toast.error("No se pudo desconectar LinkedIn");
    } finally {
      setDisconnectingLinkedIn(false);
    }
  };

  const loadSubscriptionInfo = async () => {
    setLoadingSubscription(true);
    try {
      const accessToken = await resolveAccessToken();
      if (!accessToken) {
        return;
      }

      const response = await fetch("/api/subscription/info", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSubscriptionInfo(data);
      }
    } catch (error) {
      logger.error("Error loading subscription:", error);
    } finally {
      setLoadingSubscription(false);
    }
  };

  const handleCancelSubscription = async () => {
    setCancelingSubscription(true);
    try {
      const accessToken = await resolveAccessToken();
      if (!accessToken) {
        toast.error("Sesión inválida");
        return;
      }

      const response = await fetch("/api/subscription/cancel", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Suscripción cancelada. Seguirás teniendo acceso hasta el fin del periodo de facturación");
        setShowCancelModal(false);
        await loadSubscriptionInfo();
      } else {
        toast.error(data.error || "No se pudo cancelar la suscripción");
      }
    } catch (error) {
      logger.error("Error canceling subscription:", error);
      toast.error("Error al cancelar la suscripción");
    } finally {
      setCancelingSubscription(false);
    }
  };

  if (loading || session === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader size={40} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="max-w-md text-center p-8 bg-white dark:bg-slate-800 rounded-xl">
          <p className="text-slate-600 dark:text-slate-400">No se pudo cargar el perfil</p>
          <Button onClick={() => router.push("/dashboard")} className="mt-4">
            Volver al Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Navbar session={session} />
      <div className="min-h-screen bg-white pb-16 pt-20 lg:pl-64 dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.header
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 md:mb-8"
          >
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-2">
              Configuración del Workspace
            </h1>
            <p className="text-base md:text-sm text-slate-600 dark:text-slate-400">
              Cambia tus preferencias aquí.
            </p>
          </motion.header>

          <div className="flex flex-col md:flex-row gap-6 md:gap-8">
            {/* Settings Sidebar Menu - Desktop */}
            <motion.aside
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="hidden md:block md:w-64 flex-shrink-0"
            >
              <nav className="space-y-1">
                {SETTINGS_MENU.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveSection(item.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                        activeSection === item.id
                          ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      {item.label}
                    </button>
                  );
                })}
              </nav>
            </motion.aside>

            {/* Settings Dropdown - Mobile */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="md:hidden mb-4"
            >
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Sección
              </label>
              <select
                value={activeSection}
                onChange={(e) => setActiveSection(e.target.value as SettingsSection)}
                className="w-full px-4 py-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {SETTINGS_MENU.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </motion.div>

            {/* Main Content Area */}
            <motion.main
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 md:p-8"
            >
              {/* General Section */}
              {activeSection === "general" && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-lg md:text-xl font-semibold text-slate-900 dark:text-white mb-4 md:mb-6">
                      Nombre del Workspace
                    </h2>
                    <div className="space-y-4">
                      <input
                        type="text"
                        value={workspaceName}
                        onChange={(e) => setWorkspaceName(e.target.value)}
                        className="w-full px-4 py-4 md:py-3 text-base rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-base md:text-sm text-slate-500 dark:text-slate-400">
                        Puedes usar tu agencia o nombre de empresa.
                      </p>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <Button onClick={handleSaveWorkspaceName} className="min-h-[48px] w-full sm:w-auto">
                          Guardar Cambios
                        </Button>
                        <Button variant="outline" className="min-h-[48px] w-full sm:w-auto">
                          Descartar
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-slate-200 dark:border-slate-800"></div>

                  {/* Timezone Selector */}
                  <div>
                    <h2 className="text-lg md:text-xl font-semibold text-slate-900 dark:text-white mb-4 md:mb-6">
                      Zona Horaria
                    </h2>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-base md:text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Selecciona tu zona horaria
                        </label>
                        <select
                          value={timezone}
                          onChange={(e) => setTimezone(e.target.value)}
                          className="w-full px-4 py-4 md:py-3 text-base rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <optgroup label="América">
                            <option value="America/New_York">New York (EST/EDT)</option>
                            <option value="America/Chicago">Chicago (CST/CDT)</option>
                            <option value="America/Denver">Denver (MST/MDT)</option>
                            <option value="America/Los_Angeles">Los Angeles (PST/PDT)</option>
                            <option value="America/Mexico_City">Ciudad de México (CST)</option>
                            <option value="America/Bogota">Bogotá (COT)</option>
                            <option value="America/Lima">Lima (PET)</option>
                            <option value="America/Santiago">Santiago (CLT)</option>
                            <option value="America/Buenos_Aires">Buenos Aires (ART)</option>
                            <option value="America/Sao_Paulo">São Paulo (BRT)</option>
                          </optgroup>
                          <optgroup label="Europa">
                            <option value="Europe/London">Londres (GMT/BST)</option>
                            <option value="Europe/Paris">París (CET/CEST)</option>
                            <option value="Europe/Berlin">Berlín (CET/CEST)</option>
                            <option value="Europe/Madrid">Madrid (CET/CEST)</option>
                            <option value="Europe/Rome">Roma (CET/CEST)</option>
                            <option value="Europe/Amsterdam">Ámsterdam (CET/CEST)</option>
                            <option value="Europe/Brussels">Bruselas (CET/CEST)</option>
                            <option value="Europe/Zurich">Zúrich (CET/CEST)</option>
                            <option value="Europe/Moscow">Moscú (MSK)</option>
                          </optgroup>
                          <optgroup label="Asia">
                            <option value="Asia/Dubai">Dubái (GST)</option>
                            <option value="Asia/Kolkata">Calcuta (IST)</option>
                            <option value="Asia/Singapore">Singapur (SGT)</option>
                            <option value="Asia/Hong_Kong">Hong Kong (HKT)</option>
                            <option value="Asia/Tokyo">Tokio (JST)</option>
                            <option value="Asia/Seoul">Seúl (KST)</option>
                            <option value="Asia/Shanghai">Shanghái (CST)</option>
                          </optgroup>
                          <optgroup label="Oceanía">
                            <option value="Australia/Sydney">Sídney (AEDT/AEST)</option>
                            <option value="Australia/Melbourne">Melbourne (AEDT/AEST)</option>
                            <option value="Pacific/Auckland">Auckland (NZDT/NZST)</option>
                          </optgroup>
                          <optgroup label="África">
                            <option value="Africa/Cairo">El Cairo (EET)</option>
                            <option value="Africa/Johannesburg">Johannesburgo (SAST)</option>
                            <option value="Africa/Lagos">Lagos (WAT)</option>
                          </optgroup>
                          <optgroup label="Otros">
                            <option value="UTC">UTC (Tiempo Universal Coordinado)</option>
                          </optgroup>
                        </select>
                        <p className="text-base md:text-sm text-slate-500 dark:text-slate-400 mt-2">
                          Esta zona horaria se usará para programar posts y mostrar fechas
                        </p>
                      </div>

                      {/* Current Time Preview */}
                      <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
                          Hora Actual en tu Zona
                        </p>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          {new Date().toLocaleString('es-ES', {
                            timeZone: timezone,
                            dateStyle: 'full',
                            timeStyle: 'long'
                          })}
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3">
                        <Button onClick={handleSaveTimezone} disabled={savingTimezone} className="min-h-[48px] w-full sm:w-auto">
                          {savingTimezone ? "Guardando..." : "Guardar Zona Horaria"}
                        </Button>
                        <Button variant="outline" onClick={() => setTimezone(profile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone)} className="min-h-[48px] w-full sm:w-auto">
                          Descartar
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Subscription Section */}
              {activeSection === "subscription" && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-lg md:text-xl font-semibold text-slate-900 dark:text-white mb-2">
                      Suscripción y Pagos
                    </h2>
                    <p className="text-base md:text-sm text-slate-500 dark:text-slate-400 mb-6">
                      Gestiona tu plan, métodos de pago e historial de facturación
                    </p>

                    {loadingSubscription ? (
                      <div className="flex justify-center py-12">
                        <Loader size={40} />
                      </div>
                    ) : subscriptionInfo?.hasSubscription ? (
                      <div className="space-y-6">
                        {/* Current Plan Card */}
                        <div className="p-6 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-200 dark:border-blue-800">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h3 className="text-xl font-bold text-slate-900 dark:text-white capitalize mb-1">
                                Plan {subscriptionInfo.plan}
                              </h3>
                              <p className="text-sm text-slate-600 dark:text-slate-400">
                                {subscriptionInfo.credits} créditos disponibles
                              </p>
                            </div>
                            <div className="px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 text-sm font-semibold">
                              Activo
                            </div>
                          </div>

                          {subscriptionInfo.subscription?.cancel_at_period_end ? (
                            <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 mb-4">
                              <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                                Tu suscripción se cancelará el{" "}
                                {new Date(subscriptionInfo.subscription.current_period_end * 1000).toLocaleDateString("es-ES")}
                              </p>
                              <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                                Seguirás teniendo acceso completo hasta esa fecha
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                              <div className="flex justify-between">
                                <span>Próxima facturación:</span>
                                <span className="font-medium text-slate-900 dark:text-white">
                                  {subscriptionInfo.subscription && new Date(subscriptionInfo.subscription.current_period_end * 1000).toLocaleDateString("es-ES")}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Payment Method */}
                        {subscriptionInfo.paymentMethod && (
                          <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                              Método de Pago
                            </h3>
                            <div className="flex items-center gap-4">
                              <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800">
                                <CreditCard className="h-6 w-6 text-slate-600 dark:text-slate-400" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-900 dark:text-white capitalize">
                                  {subscriptionInfo.paymentMethod.brand} •••• {subscriptionInfo.paymentMethod.last4}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  Expira {subscriptionInfo.paymentMethod.exp_month}/{subscriptionInfo.paymentMethod.exp_year}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex flex-col sm:flex-row gap-3">
                          <Button
                            onClick={() => setShowPlansModal(true)}
                            className="sm:w-auto"
                          >
                            Cambiar Plan
                          </Button>
                          {!subscriptionInfo.subscription?.cancel_at_period_end && (
                            <Button
                              variant="outline"
                              onClick={() => setShowCancelModal(true)}
                              className="sm:w-auto text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              Cancelar Suscripción
                            </Button>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* No Subscription */
                      <div className="text-center py-12">
                        <div className="inline-flex p-4 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
                          <CreditCard className="h-12 w-12 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                          No tienes una suscripción activa
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 max-w-md mx-auto">
                          Plan actual: <span className="font-semibold capitalize">{subscriptionInfo?.plan || "Free"}</span>
                          <br />
                          Créditos disponibles: <span className="font-semibold">{subscriptionInfo?.credits || 0}</span>
                        </p>
                        <Button onClick={() => setShowPlansModal(true)}>
                          Ver Planes Disponibles
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Gamification Section */}
              {activeSection === "gamification" && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-lg md:text-xl font-semibold text-slate-900 dark:text-white mb-2">
                      Mi Progreso
                    </h2>
                    <p className="text-base md:text-sm text-slate-500 dark:text-slate-400 mb-6">
                      Trackea tu nivel, experiencia y racha de días consecutivos
                    </p>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                      {/* Level Card */}
                      <div className="relative overflow-hidden bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border-2 border-yellow-200 dark:border-yellow-800 rounded-xl p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="p-3 bg-yellow-400/20 dark:bg-yellow-500/20 rounded-lg">
                              <Trophy className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
                            </div>
                            <div>
                              <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Nivel Actual</p>
                              <h3 className="text-4xl font-bold text-slate-900 dark:text-white">
                                {profile?.level || 1}
                              </h3>
                            </div>
                          </div>
                        </div>

                        {/* XP Progress Bar */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-600 dark:text-slate-400">Experiencia</span>
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {profile?.xp || 0} / {((profile?.level || 1) * 1000)} XP
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full transition-all duration-500"
                              style={{
                                width: `${Math.min(((profile?.xp || 0) / ((profile?.level || 1) * 1000)) * 100, 100)}%`
                              }}
                            />
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {((profile?.level || 1) * 1000) - (profile?.xp || 0)} XP para el siguiente nivel
                          </p>
                        </div>
                      </div>

                      {/* Streak Card */}
                      <div className="relative overflow-hidden bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-2 border-orange-200 dark:border-orange-800 rounded-xl p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="p-3 bg-orange-400/20 dark:bg-orange-500/20 rounded-lg">
                              <Zap className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                            </div>
                            <div>
                              <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Racha</p>
                              <h3 className="text-4xl font-bold text-slate-900 dark:text-white">
                                {profile?.streak_days || 0}
                              </h3>
                            </div>
                          </div>
                          <div className="text-3xl">🔥</div>
                        </div>

                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {profile?.streak_days && profile.streak_days > 0
                            ? `¡${profile.streak_days} día${profile.streak_days > 1 ? 's' : ''} consecutivo${profile.streak_days > 1 ? 's' : ''} creando contenido!`
                            : "Crea contenido hoy para comenzar tu racha"
                          }
                        </p>

                        {profile?.last_activity_date && (
                          <div className="mt-3 pt-3 border-t border-orange-200 dark:border-orange-800">
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Última actividad: {new Date(profile.last_activity_date).toLocaleDateString('es-ES')}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Total Posts Card */}
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-3 bg-blue-400/20 dark:bg-blue-500/20 rounded-lg">
                            <TrendingUp className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Posts Totales</p>
                            <h3 className="text-4xl font-bold text-slate-900 dark:text-white">
                              {profile?.total_posts || 0}
                            </h3>
                          </div>
                        </div>

                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {profile?.total_posts && profile.total_posts > 0
                            ? `Has generado ${profile.total_posts} post${profile.total_posts > 1 ? 's' : ''} en total`
                            : "Aún no has creado ningún post. ¡Empieza ahora!"
                          }
                        </p>
                      </div>

                      {/* Credits Card */}
                      <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-2 border-purple-200 dark:border-purple-800 rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-3 bg-purple-400/20 dark:bg-purple-500/20 rounded-lg">
                            <Sparkles className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Créditos</p>
                            <h3 className="text-4xl font-bold text-slate-900 dark:text-white">
                              {profile?.credits || 0}
                            </h3>
                          </div>
                        </div>

                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          Plan actual: <span className="font-semibold capitalize">{profile?.plan || 'Free'}</span>
                        </p>
                      </div>
                    </div>

                    {/* Info Box */}
                    <div className="p-6 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-blue-600" />
                        ¿Cómo Gano XP?
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-600 dark:text-slate-400">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-blue-600 dark:text-blue-400 font-bold">+10</span>
                          </div>
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white">Crear un post</p>
                            <p className="text-xs">Genera contenido con IA</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-orange-600 dark:text-orange-400 font-bold">+5</span>
                          </div>
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white">Actividad diaria</p>
                            <p className="text-xs">Ingresa cada día consecutivo</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-green-600 dark:text-green-400 font-bold">+25</span>
                          </div>
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white">Completar perfil</p>
                            <p className="text-xs">LinkedIn, bio, expertise</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-purple-600 dark:text-purple-400 font-bold">+50</span>
                          </div>
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white">Hitos especiales</p>
                            <p className="text-xs">10 posts, 30 días de racha, etc.</p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-800">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          💡 <strong>Pro tip:</strong> Mantén tu racha activa para bonificaciones diarias de XP. ¡Cada día consecutivo vale más!
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === "integrations" && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                      Integraciones disponibles
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Conecta tus cuentas externas para personalizar aún más tus recomendaciones.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-200">
                          <Linkedin className="h-6 w-6" />
                        </span>
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                            LinkedIn
                          </h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            Importa tu información profesional y mantén tu perfil sincronizado con la IA de Kolink.
                          </p>
                        </div>
                      </div>

                      {!linkedInConnected ? (
                        <Button onClick={handleConnectLinkedIn} className="gap-2">
                          Conectar LinkedIn
                        </Button>
                      ) : (
                        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          Conectado
                        </div>
                      )}
                    </div>

                    {!linkedInConnected ? (
                      <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-6 text-sm text-slate-500 dark:text-slate-400 space-y-3">
                        <p className="font-medium text-slate-700 dark:text-slate-200">
                          ¿Qué obtienes al conectar tu LinkedIn?
                        </p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>Sincronizamos tu headline, bio y áreas de expertise para adaptar la IA a tu voz.</li>
                          <li>Próximamente guardaremos tus métricas y borradores favoritos para refinar recomendaciones.</li>
                          <li>Siempre tendrás control para desconectar la cuenta cuando lo necesites.</li>
                        </ul>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex flex-col md:flex-row gap-4 md:gap-6">
                          <div className="flex-shrink-0">
                            {profile?.linkedin_picture ? (
                              <Image
                                src={profile.linkedin_picture}
                                alt="Foto de LinkedIn"
                                width={80}
                                height={80}
                                className="h-20 w-20 rounded-xl object-cover"
                                unoptimized={true}
                              />
                            ) : (
                              <span className="flex h-20 w-20 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-200 text-2xl font-semibold">
                                {(profile?.linkedin_full_name ?? profile?.full_name ?? "?").charAt(0)}
                              </span>
                            )}
                          </div>

                          <div className="flex-1 space-y-2">
                            <div>
                              <p className="text-lg font-semibold text-slate-900 dark:text-white">
                                {profile?.linkedin_full_name ?? profile?.full_name ?? "—"}
                              </p>
                              {profile?.linkedin_headline && (
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                  {profile.linkedin_headline}
                                </p>
                              )}
                            </div>

                            <div className="grid sm:grid-cols-2 gap-3 text-sm">
                              <div>
                                <span className="block text-slate-500 dark:text-slate-400">Correo</span>
                                <span className="text-slate-900 dark:text-slate-200">{profile?.linkedin_email ?? "—"}</span>
                              </div>
                              <div>
                                <span className="block text-slate-500 dark:text-slate-400">Industria</span>
                                <span className="text-slate-900 dark:text-slate-200">{profile?.linkedin_industry ?? "—"}</span>
                              </div>
                              <div>
                                <span className="block text-slate-500 dark:text-slate-400">Conectado el</span>
                                <span className="text-slate-900 dark:text-slate-200">{formatDateTime(profile?.linkedin_connected_at)}</span>
                              </div>
                              <div>
                                <span className="block text-slate-500 dark:text-slate-400">Expira</span>
                                <span className="text-slate-900 dark:text-slate-200">{formatDateTime(profile?.linkedin_token_expires_at)}</span>
                              </div>
                            </div>

                            {profile?.linkedin_summary && (
                              <p className="text-sm text-slate-600 dark:text-slate-300">
                                {profile.linkedin_summary}
                              </p>
                            )}

                            {profile?.linkedin_profile_url && (
                              <a
                                href={profile.linkedin_profile_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:underline"
                              >
                                <LinkIcon className="h-4 w-4" />
                                Ver perfil en LinkedIn
                              </a>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">
                          <Button onClick={handleSyncLinkedInProfile} disabled={syncingLinkedIn} className="sm:w-auto">
                            {syncingLinkedIn ? "Sincronizando..." : "Sincronizar perfil"}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setShowDisconnectModal(true)}
                            className="sm:w-auto"
                          >
                            Desconectar
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* AI & Language Section */}
              {activeSection === "ai-language" && (
                <div className="space-y-8">
                  {/* Language Selector */}
                  <div>
                    <h2 className="text-lg md:text-xl font-semibold text-slate-900 dark:text-white mb-2">
                      Idioma Preferido
                    </h2>
                    <p className="text-base md:text-sm text-slate-500 dark:text-slate-400 mb-6">
                      Selecciona el idioma para entrada de voz y generación de contenido
                    </p>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-base md:text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Idioma de EditorAI
                        </label>
                        <select
                          value={preferredLanguage}
                          onChange={(e) => setPreferredLanguage(e.target.value)}
                          className="w-full px-4 py-4 md:py-3 text-base rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="es-ES">🇪🇸 Español (es-ES)</option>
                          <option value="en-US">🇺🇸 English (en-US)</option>
                          <option value="pt-BR">🇧🇷 Português (pt-BR)</option>
                          <option value="fr-FR">🇫🇷 Français (fr-FR)</option>
                          <option value="de-DE">🇩🇪 Deutsch (de-DE)</option>
                          <option value="it-IT">🇮🇹 Italiano (it-IT)</option>
                        </select>
                        <p className="text-base md:text-sm text-slate-500 dark:text-slate-400 mt-2">
                          Este idioma se usará para reconocimiento de voz y generación de contenido con IA
                        </p>
                      </div>

                      {/* Preview */}
                      <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
                          Vista Previa
                        </p>
                        <p className="text-sm text-slate-700 dark:text-slate-300">
                          {preferredLanguage === "es-ES" && "Escribe tu prompt o usa el micrófono..."}
                          {preferredLanguage === "en-US" && "Write your prompt or use the microphone..."}
                          {preferredLanguage === "pt-BR" && "Escreva seu prompt ou use o microfone..."}
                          {preferredLanguage === "fr-FR" && "Écrivez votre prompt ou utilisez le microphone..."}
                          {preferredLanguage === "de-DE" && "Schreiben Sie Ihren Prompt oder verwenden Sie das Mikrofon..."}
                          {preferredLanguage === "it-IT" && "Scrivi il tuo prompt o usa il microfono..."}
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3">
                        <Button onClick={handleSaveLanguage} disabled={savingLanguage} className="min-h-[48px] w-full sm:w-auto">
                          {savingLanguage ? "Guardando..." : "Guardar Idioma"}
                        </Button>
                        <Button variant="outline" onClick={() => setPreferredLanguage(profile?.preferred_language || "es-ES")} className="min-h-[48px] w-full sm:w-auto">
                          Descartar
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 p-4 text-left">
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      La automatización de publicaciones se reactivará más adelante.
                    </p>
                  </div>
                </div>
              )}

              {/* Workspace Members Section */}
              {activeSection === "members" && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                      Miembros del Workspace
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                      Gestiona miembros y establece su nivel de acceso en tu workspace.
                    </p>

                    {/* Invite Form */}
                    <div className="mb-8">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Invitar miembros del workspace
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="email"
                          placeholder="Ingresa una dirección de correo..."
                          className="flex-1 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <select className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none">
                          <option>Team Member</option>
                          <option>Admin</option>
                        </select>
                        <Button>Enviar Invitación</Button>
                      </div>
                      <a href="#" className="text-sm text-blue-600 hover:underline mt-2 inline-block">
                        Haz clic para ver los permisos de rol
                      </a>
                    </div>

                    {/* Current Members */}
                    <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 font-semibold">
                            Z
                          </div>
                          <span className="text-sm text-slate-900 dark:text-white">
                            {profile.email}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-slate-600 dark:text-slate-400">Admin</span>
                          <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                            •••
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6">
                      <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Invitaciones Pendientes
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        No hay invitaciones pendientes
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Writing Style Section */}
              {activeSection === "writing-style" && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                      Estilo de Escritura
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                      Define tu tono y estilo para que la IA genere contenido alineado con tu voz
                    </p>

                    {/* Tone Presets */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                        Presets de Tono
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {["Profesional", "Casual", "Inspirador", "Educativo"].map((preset) => (
                          <button
                            key={preset}
                            onClick={() => {
                              const presetTexts = {
                                Profesional: "Tono formal y autoritario, con vocabulario técnico cuando sea apropiado. Enfoque en datos y resultados.",
                                Casual: "Tono conversacional y cercano, usando lenguaje simple y directo. Incluye preguntas retóricas.",
                                Inspirador: "Tono motivacional y energético. Usa historias y metáforas para conectar emocionalmente.",
                                Educativo: "Tono informativo y didáctico. Explica conceptos paso a paso con ejemplos claros."
                              };
                              setToneProfile(presetTexts[preset as keyof typeof presetTexts]);
                              setTonePreset(preset.toLowerCase());
                            }}
                            className={`px-4 py-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                              tonePreset === preset.toLowerCase()
                                ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                                : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-blue-300"
                            }`}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Custom Tone Profile */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Describe tu Estilo (Opcional)
                      </label>
                      <textarea
                        value={toneProfile}
                        onChange={(e) => setToneProfile(e.target.value)}
                        rows={5}
                        placeholder="Ej: Soy un emprendedor tech que escribe de forma inspiracional pero con datos concretos. Me gusta usar storytelling y mantener un tono optimista pero realista..."
                        className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      />
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                        Cuanto más detallado seas, mejor podrá la IA replicar tu estilo
                      </p>
                    </div>

                    {/* Preview */}
                    {toneProfile && (
                      <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 mb-6">
                        <p className="text-xs uppercase tracking-wide text-blue-600 dark:text-blue-300 mb-2 font-semibold">
                          Vista Previa de tu Estilo
                        </p>
                        <p className="text-sm text-blue-900 dark:text-blue-100">
                          {toneProfile}
                        </p>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <Button onClick={handleSaveToneProfile} disabled={savingSettings}>
                        {savingSettings ? "Guardando..." : "Guardar Estilo"}
                      </Button>
                      <Button variant="outline" onClick={() => {
                        setToneProfile("");
                        setTonePreset("profesional");
                      }}>
                        Limpiar
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Analytics Section */}
              {activeSection === "analytics" && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                      Privacidad y Analytics
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                      Controla cómo usamos tus datos para mejorar tu experiencia y revisa tu consentimiento en cualquier momento.
                    </p>

                    <CookieSettingsCard />

                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Transparencia total</h4>
                      <ul className="text-sm text-slate-600 dark:text-slate-400 list-disc list-inside space-y-1">
                        <li>Analizamos el uso de funciones para priorizar mejoras.</li>
                        <li>No compartimos datos de comportamiento con terceros.</li>
                        <li>Puedes descargar tus datos en la sección “Exportar Datos”.</li>
                      </ul>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Consulta los detalles en nuestra{" "}
                        <Link href="/legal/privacidad" className="text-blue-600 hover:underline">
                          Política de Privacidad
                        </Link>{" "}
                        y{" "}
                        <Link href="/legal/cookies" className="text-blue-600 hover:underline">
                          Política de Cookies
                        </Link>
                        .
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Notifications Section */}
              {activeSection === "notifications" && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                      Preferencias de Notificaciones
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                      Controla qué notificaciones quieres recibir
                    </p>

                    <div className="space-y-4">
                      {/* Email Notifications */}
                      <div className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-800">
                        <div>
                          <h3 className="font-medium text-slate-900 dark:text-white">
                            Notificaciones por Email
                          </h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            Recibe emails sobre actualizaciones importantes
                          </p>
                        </div>
                        <button
                          onClick={() => setNotificationPrefs({
                            ...notificationPrefs,
                            email_notifications: !notificationPrefs.email_notifications
                          })}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            notificationPrefs.email_notifications ? "bg-blue-500" : "bg-slate-300 dark:bg-slate-700"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              notificationPrefs.email_notifications ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>

                      {/* Credit Reminders */}
                      <div className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-800">
                        <div>
                          <h3 className="font-medium text-slate-900 dark:text-white">
                            Recordatorios de Créditos
                          </h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            Aviso cuando tus créditos estén por agotarse
                          </p>
                        </div>
                        <button
                          onClick={() => setNotificationPrefs({
                            ...notificationPrefs,
                            credit_reminders: !notificationPrefs.credit_reminders
                          })}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            notificationPrefs.credit_reminders ? "bg-blue-500" : "bg-slate-300 dark:bg-slate-700"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              notificationPrefs.credit_reminders ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>

                      {/* Weekly Summary */}
                      <div className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-800">
                        <div>
                          <h3 className="font-medium text-slate-900 dark:text-white">
                            Resumen Semanal
                          </h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            Recibe un resumen de tu actividad cada semana
                          </p>
                        </div>
                        <button
                          onClick={() => setNotificationPrefs({
                            ...notificationPrefs,
                            weekly_summary: !notificationPrefs.weekly_summary
                          })}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            notificationPrefs.weekly_summary ? "bg-blue-500" : "bg-slate-300 dark:bg-slate-700"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              notificationPrefs.weekly_summary ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>

                      {/* Admin Notifications */}
                      <div className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-800">
                        <div>
                          <h3 className="font-medium text-slate-900 dark:text-white">
                            Notificaciones del Admin
                          </h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            Mensajes importantes del equipo de Kolink
                          </p>
                        </div>
                        <button
                          onClick={() => setNotificationPrefs({
                            ...notificationPrefs,
                            admin_notifications: !notificationPrefs.admin_notifications
                          })}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            notificationPrefs.admin_notifications ? "bg-blue-500" : "bg-slate-300 dark:bg-slate-700"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              notificationPrefs.admin_notifications ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-6">
                      <Button onClick={handleSaveNotificationPrefs} disabled={savingSettings}>
                        {savingSettings ? "Guardando..." : "Guardar Preferencias"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Data Export Section */}
              {activeSection === "data-export" && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                      Exportar tus Datos
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                      Descarga una copia de todos tus datos en formato JSON
                    </p>

                    <div className="space-y-6">
                      {/* Info Card */}
                      <div className="p-6 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800">
                        <div className="flex items-start gap-4">
                          <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/40">
                            <FileJson className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
                              Tu Paquete de Datos Incluye:
                            </h3>
                            <ul className="text-sm text-slate-600 dark:text-slate-300 space-y-2">
                              <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                Información de perfil y configuración
                              </li>
                              <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                Todos los posts generados
                              </li>
                              <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                Posts de inspiración guardados
                              </li>
                              <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                Historial de uso y estadísticas
                              </li>
                            </ul>
                          </div>
                        </div>
                      </div>

                      {/* GDPR Info */}
                      <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <h4 className="text-sm font-medium text-slate-900 dark:text-white mb-2">
                          Cumplimiento GDPR
                        </h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          De acuerdo con el Reglamento General de Protección de Datos (GDPR), tienes derecho
                          a acceder, corregir y eliminar tus datos personales. Esta exportación te proporciona
                          una copia completa de toda la información que tenemos sobre ti.
                        </p>
                      </div>

                      {/* Export Button */}
                      <div className="flex gap-3">
                        <Button
                          onClick={handleExportData}
                          disabled={exportingData}
                          className="flex items-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          {exportingData ? "Exportando..." : "Exportar Mis Datos"}
                        </Button>
                      </div>

                      {/* Warning */}
                      <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                        <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-amber-900 dark:text-amber-100 mb-1">
                            Datos Sensibles
                          </p>
                          <p className="text-sm text-amber-800 dark:text-amber-200">
                            El archivo descargado contiene información personal. Guárdalo en un lugar seguro y no lo compartas.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Placeholder for other sections */}
              {!["general", "subscription", "gamification", "integrations", "ai-language", "members", "writing-style", "analytics", "notifications", "data-export"].includes(activeSection) && (
                <div className="text-center py-16">
                  <p className="text-slate-500 dark:text-slate-400">
                    Esta sección está en desarrollo
                  </p>
                </div>
              )}
            </motion.main>
          </div>
        </div>
      </div>

      <ConfirmationModal
        open={showDisconnectModal}
        onOpenChange={setShowDisconnectModal}
        title="Desconectar LinkedIn"
        description="Se eliminará la conexión con LinkedIn y los datos asociados. Podrás volver a conectarla cuando quieras."
        confirmText="Desconectar"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={handleDisconnectLinkedIn}
        loading={disconnectingLinkedIn}
      />

      <ConfirmationModal
        open={showCancelModal}
        onOpenChange={setShowCancelModal}
        title="¿Cancelar suscripción?"
        description="Tu suscripción se cancelará al finalizar el periodo de facturación actual. Seguirás teniendo acceso a todas las funciones hasta esa fecha."
        confirmText="Sí, cancelar"
        cancelText="No, mantener"
        variant="danger"
        onConfirm={handleCancelSubscription}
        loading={cancelingSubscription}
      />

      <PlansModal
        open={showPlansModal}
        onOpenChange={setShowPlansModal}
        userId={session?.user?.id}
      />
    </>
  );
}
