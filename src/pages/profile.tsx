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
  Plus,
  Link as LinkIcon
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
};

type SettingsSection =
  | "general"
  | "linkedin"
  | "ai-language"
  | "members"
  | "writing-style"
  | "brand-kits"
  | "auto-comments"
  | "custom-ctas"
  | "chrome-extension";

const SETTINGS_MENU = [
  { id: "general" as SettingsSection, label: "General", icon: Settings },
  { id: "linkedin" as SettingsSection, label: "Cuentas de LinkedIn", icon: Linkedin },
  { id: "ai-language" as SettingsSection, label: "IA y Lenguaje", icon: Sparkles },
  { id: "members" as SettingsSection, label: "Miembros del Workspace", icon: Users },
  { id: "writing-style" as SettingsSection, label: "Estilo de Escritura", icon: PenTool },
  { id: "brand-kits" as SettingsSection, label: "Brand Kits", icon: Palette },
  { id: "auto-comments" as SettingsSection, label: "Auto-plug Comentarios", icon: MessageSquare },
  { id: "custom-ctas" as SettingsSection, label: "CTAs/Post Finishers Personalizados", icon: Target },
  { id: "chrome-extension" as SettingsSection, label: "Configuración de Extensión Chrome", icon: Chrome },
];

export default function Profile({ session }: ProfileProps) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<SettingsSection>("general");
  const [workspaceName, setWorkspaceName] = useState("DEFAULT");
  const [autoPostEnabled, setAutoPostEnabled] = useState(false);
  const [linkedInRole, setLinkedInRole] = useState("individual_creator");
  const [topics, setTopics] = useState<string[]>([]);
  const [newTopic, setNewTopic] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState("es-ES");
  const [savingLanguage, setSavingLanguage] = useState(false);

  useEffect(() => {
    if (session === undefined) return;
    if (!session) {
      router.replace("/signin");
      return;
    }

    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, router]);

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
    } finally {
      setLoading(false);
    }
  };

  const handleSaveWorkspaceName = () => {
    toast.success("Cambios guardados");
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
            className="mb-8"
          >
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              Configuración del Workspace
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Cambia tus preferencias aquí.
            </p>
          </motion.header>

          <div className="flex gap-8">
            {/* Settings Sidebar Menu */}
            <motion.aside
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="w-64 flex-shrink-0"
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

            {/* Main Content Area */}
            <motion.main
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8"
            >
              {/* General Section */}
              {activeSection === "general" && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">
                      Nombre del Workspace
                    </h2>
                    <div className="space-y-4">
                      <input
                        type="text"
                        value={workspaceName}
                        onChange={(e) => setWorkspaceName(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Puedes usar tu agencia o nombre de empresa.
                      </p>
                      <div className="flex gap-3">
                        <Button onClick={handleSaveWorkspaceName}>
                          Guardar Cambios
                        </Button>
                        <Button variant="outline">
                          Descartar
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* LinkedIn Accounts Section */}
              {activeSection === "linkedin" && (
                <div className="space-y-8">
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                          Cuentas de LinkedIn Conectadas
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          Gestiona las cuentas de LinkedIn conectadas a este workspace
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" className="gap-2">
                          <LinkIcon className="h-4 w-4" />
                          Crear Enlace
                        </Button>
                        <Button className="gap-2">
                          <Plus className="h-4 w-4" />
                          Añadir Cuenta
                        </Button>
                      </div>
                    </div>

                    {/* Empty State */}
                    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
                      <div className="mb-6">
                        <svg className="w-32 h-32" viewBox="0 0 200 200" fill="none">
                          <circle cx="100" cy="100" r="80" fill="#E0F2FE" />
                          <path d="M70 90 L90 110 L130 70" stroke="#0EA5E9" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                        No hay Cuentas de LinkedIn Conectadas
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
                        Vincula tu cuenta de LinkedIn para comenzar y acceder a los datos de tu perfil aquí.
                      </p>
                    </div>
                  </div>

                  <div className="pt-8 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                          Páginas de Empresa Conectadas
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          Gestiona las páginas de empresa de LinkedIn conectadas a este workspace.
                        </p>
                      </div>
                      <Button className="gap-2">
                        <Plus className="h-4 w-4" />
                        Añadir Página
                      </Button>
                    </div>

                    {/* Empty State */}
                    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
                      <div className="mb-6">
                        <svg className="w-32 h-32" viewBox="0 0 200 200" fill="none">
                          <circle cx="100" cy="100" r="80" fill="#F1F5F9" />
                          <rect x="60" y="60" width="80" height="80" rx="8" fill="#CBD5E1"/>
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                        No hay Páginas de Empresa Conectadas
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
                        Conecta una página de empresa de LinkedIn para gestionar y rastrear su rendimiento en un solo lugar.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* AI & Language Section */}
              {activeSection === "ai-language" && (
                <div className="space-y-8">
                  {/* Language Selector */}
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                      Idioma Preferido
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                      Selecciona el idioma para entrada de voz y generación de contenido
                    </p>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Idioma de EditorAI
                        </label>
                        <select
                          value={preferredLanguage}
                          onChange={(e) => setPreferredLanguage(e.target.value)}
                          className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="es-ES">🇪🇸 Español (es-ES)</option>
                          <option value="en-US">🇺🇸 English (en-US)</option>
                          <option value="pt-BR">🇧🇷 Português (pt-BR)</option>
                        </select>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
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

                      <div className="flex gap-3">
                        <Button onClick={handleSaveLanguage} disabled={savingLanguage}>
                          {savingLanguage ? "Guardando..." : "Guardar Idioma"}
                        </Button>
                        <Button variant="outline" onClick={() => setPreferredLanguage(profile?.preferred_language || "es-ES")}>
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

              {/* Placeholder for other sections */}
              {!["general", "linkedin", "ai-language", "members"].includes(activeSection) && (
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
