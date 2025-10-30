import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Session } from "@supabase/supabase-js";
import { supabaseClient } from "@/lib/supabaseClient";
import { motion } from "framer-motion";
import {
  Settings,
  Linkedin,
  Sparkles,
  Users,
  PenTool,
  Palette,
  MessageSquare,
  Target,
  Chrome,
  Link as LinkIcon,
  BarChart3,
  Bell,
  Download,
  FileJson,
  Trophy,
  Zap,
  TrendingUp
} from "lucide-react";
import Button from "@/components/Button";
import Loader from "@/components/Loader";
import toast from "react-hot-toast";
import Navbar from "@/components/Navbar";

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
  // Gamificación
  xp?: number;
  level?: number;
  streak_days?: number;
  total_posts?: number;
  last_activity_date?: string;
  // LinkedIn
  bio?: string;
  headline?: string;
  expertise?: string[];
  linkedin_profile_url?: string;
};

type SettingsSection =
  | "general"
  | "gamification"
  | "linkedin"
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
  { id: "gamification" as SettingsSection, label: "Mi Progreso", icon: Trophy },
  { id: "linkedin" as SettingsSection, label: "Cuentas de LinkedIn", icon: Linkedin },
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
  const [autoPostEnabled, setAutoPostEnabled] = useState(false);
  const [linkedInRole, setLinkedInRole] = useState("individual_creator");
  const [topics, setTopics] = useState<string[]>([]);
  const [newTopic, setNewTopic] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState("es-ES");
  const [savingLanguage, setSavingLanguage] = useState(false);
  const [toneProfile, setToneProfile] = useState<string>("");
  const [tonePreset, setTonePreset] = useState<string>("profesional");
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  const [notificationPrefs, setNotificationPrefs] = useState({
    email_notifications: true,
    credit_reminders: true,
    weekly_summary: true,
    admin_notifications: true,
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [exportingData, setExportingData] = useState(false);

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

  const loadProfile = async () => {
    if (!session?.user) return;

    try {
      const { data, error } = await supabaseClient
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (error) {
        console.error("Error loading profile:", error);
        toast.error("Error al cargar el perfil");
        return;
      }

      setProfile(data as Profile);
      setWorkspaceName(data.full_name || "DEFAULT");
      setPreferredLanguage(data.preferred_language || "es-ES");
      setToneProfile(data.tone_profile || "");
      setAnalyticsEnabled(data.analytics_enabled !== false);
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
        console.error("Error saving workspace name:", error);
        toast.error("Error al guardar");
      } else {
        toast.success("Cambios guardados");
        if (profile) {
          setProfile({ ...profile, full_name: workspaceName });
        }
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al guardar");
    }
  };

  const handleAddTopic = () => {
    if (newTopic.trim()) {
      setTopics([...topics, newTopic.trim()]);
      setNewTopic("");
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
        console.error("Error saving language:", error);
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

  const handleSaveAnalyticsPrefs = async () => {
    if (!session?.user) return;

    setSavingSettings(true);
    try {
      const { error } = await supabaseClient
        .from("profiles")
        .update({ analytics_enabled: analyticsEnabled })
        .eq("id", session.user.id);

      if (error) {
        toast.error("Error al guardar preferencias de analytics");
      } else {
        toast.success("Preferencias de analytics actualizadas");
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
      console.error("Error exporting data:", error);
      toast.error("Error al exportar datos");
    } finally {
      setExportingData(false);
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

              {/* LinkedIn Accounts Section */}
              {activeSection === "linkedin" && (
                <div className="space-y-8">
                  <div>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
                      <div>
                        <h2 className="text-lg md:text-xl font-semibold text-slate-900 dark:text-white">
                          Perfil de LinkedIn
                        </h2>
                        <p className="text-base md:text-sm text-slate-500 dark:text-slate-400">
                          Tu información profesional de LinkedIn
                        </p>
                      </div>
                      {!profile?.linkedin_profile_url && (
                        <Button className="gap-2 min-h-[48px] md:min-h-0">
                          <Linkedin className="h-5 w-5 md:h-4 md:w-4" />
                          Conectar LinkedIn
                        </Button>
                      )}
                    </div>

                    {/* LinkedIn Profile Data or Empty State */}
                    {profile?.linkedin_profile_url || profile?.headline || profile?.bio ? (
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-6 space-y-6">
                        {/* Connection Status Badge */}
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm font-medium">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            Conectado
                          </div>
                        </div>

                        {/* Profile Info */}
                        <div className="space-y-4">
                          {/* Headline */}
                          {profile.headline && (
                            <div>
                              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Headline
                              </label>
                              <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
                                {profile.headline}
                              </p>
                            </div>
                          )}

                          {/* Bio */}
                          {profile.bio && (
                            <div>
                              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Bio
                              </label>
                              <p className="mt-1 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                                {profile.bio}
                              </p>
                            </div>
                          )}

                          {/* Expertise Tags */}
                          {profile.expertise && profile.expertise.length > 0 && (
                            <div>
                              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Áreas de Expertise
                              </label>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {profile.expertise.map((skill, idx) => (
                                  <span
                                    key={idx}
                                    className="px-3 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium"
                                  >
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Profile Link */}
                          {profile.linkedin_profile_url && (
                            <div>
                              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Perfil
                              </label>
                              <a
                                href={profile.linkedin_profile_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-1 inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium"
                              >
                                <LinkIcon className="h-4 w-4" />
                                Ver en LinkedIn
                              </a>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="pt-4 border-t border-blue-200 dark:border-blue-800 flex flex-col sm:flex-row gap-3">
                          <Button variant="outline" className="gap-2">
                            <Linkedin className="h-4 w-4" />
                            Actualizar Datos
                          </Button>
                          <Button variant="outline" className="gap-2 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20">
                            Desconectar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-16 px-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                        <div className="mb-6">
                          <div className="w-24 h-24 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                            <Linkedin className="w-12 h-12 text-blue-600 dark:text-blue-400" />
                          </div>
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                          Conecta tu LinkedIn
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-6">
                          Vincula tu cuenta de LinkedIn para acceder a tus datos profesionales, importar tu bio y headline, y potenciar la generación de contenido.
                        </p>
                        <Button className="gap-2">
                          <Linkedin className="h-4 w-4" />
                          Conectar LinkedIn
                        </Button>
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

                  {/* Divider */}
                  <div className="border-t border-slate-200 dark:border-slate-800"></div>

                  {/* AI Personal */}
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">
                      Tu IA Personal
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                      Configura tu IA personal para generar posts para ti.
                    </p>

                    <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4 mb-6">
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                      ℹ️ Cada viernes creamos un nuevo post para cada tema que agregues. Puedes encontrar estos posts en &quot;Auto-Pilot Posts&quot;.
                      </p>
                    </div>

                    <div className="space-y-6">
                      {/* Auto Post Generation Toggle */}
                      <div className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-800">
                        <div>
                          <h3 className="font-medium text-slate-900 dark:text-white">
                            Habilitar Generación Automática de Posts
                          </h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            Habilítalo para que la IA genere posts para ti
                          </p>
                        </div>
                        <button
                          onClick={() => setAutoPostEnabled(!autoPostEnabled)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            autoPostEnabled ? "bg-green-500" : "bg-slate-300 dark:bg-slate-700"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              autoPostEnabled ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>

                      {/* LinkedIn Role */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          ¿Quién eres en LinkedIn?
                        </label>
                        <select
                          value={linkedInRole}
                          onChange={(e) => setLinkedInRole(e.target.value)}
                          className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="individual_creator">individual_creator</option>
                          <option value="business">business</option>
                          <option value="influencer">influencer</option>
                        </select>
                      </div>

                      {/* Topics */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          ¿Sobre qué temas publicas?
                        </label>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                          Presiona &apos;Enter&apos; después de añadir cada tema
                        </p>
                        <input
                          type="text"
                          value={newTopic}
                          onChange={(e) => setNewTopic(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleAddTopic()}
                          placeholder="Añadir temas..."
                          className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="flex flex-wrap gap-2 mt-3">
                          {topics.map((topic, index) => (
                            <span
                              key={index}
                              className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm"
                            >
                              {topic}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-3 pt-4">
                        <Button>Guardar Cambios</Button>
                        <Button variant="outline">Descartar</Button>
                      </div>
                    </div>
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
                      Preferencias de Analytics
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                      Controla cómo usamos tus datos para mejorar tu experiencia
                    </p>

                    <div className="space-y-6">
                      {/* Analytics Toggle */}
                      <div className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                        <div className="flex-1">
                          <h3 className="font-medium text-slate-900 dark:text-white mb-1">
                            Habilitar Analytics
                          </h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            Permite que Kolink recopile datos de uso para mejorar el producto
                          </p>
                        </div>
                        <button
                          onClick={() => setAnalyticsEnabled(!analyticsEnabled)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            analyticsEnabled ? "bg-blue-500" : "bg-slate-300 dark:bg-slate-700"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              analyticsEnabled ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>

                      {/* Info Box */}
                      <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <h4 className="text-sm font-medium text-slate-900 dark:text-white mb-2">
                          ¿Qué datos recopilamos?
                        </h4>
                        <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1 list-disc list-inside">
                          <li>Páginas visitadas y tiempo de sesión</li>
                          <li>Acciones realizadas (generar posts, buscar inspiración)</li>
                          <li>Rendimiento de contenido generado (viral scores)</li>
                          <li>Errores y problemas técnicos</li>
                        </ul>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
                          Nunca compartimos tus datos con terceros. Lee nuestra{" "}
                          <a href="/privacy" className="text-blue-600 hover:underline">
                            Política de Privacidad
                          </a>
                        </p>
                      </div>

                      <div className="flex gap-3 pt-4">
                        <Button onClick={handleSaveAnalyticsPrefs} disabled={savingSettings}>
                          {savingSettings ? "Guardando..." : "Guardar Preferencias"}
                        </Button>
                      </div>
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
              {!["general", "gamification", "linkedin", "ai-language", "members", "writing-style", "analytics", "notifications", "data-export"].includes(activeSection) && (
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
    </>
  );
}
