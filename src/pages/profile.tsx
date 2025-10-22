import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Session } from "@supabase/supabase-js";
import { supabaseClient } from "@/lib/supabaseClient";
import { motion } from "framer-motion";
import { User, Mail, CreditCard, LogOut, Sparkles } from "lucide-react";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Loader from "@/components/Loader";
import toast from "react-hot-toast";

type ProfileProps = {
  session: Session | null | undefined;
};

type Profile = {
  id: string;
  email: string;
  plan: string;
  credits: number;
  created_at: string;
};

export default function Profile({ session }: ProfileProps) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

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
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabaseClient.auth.signOut();
    toast.success("Sesión cerrada exitosamente");
    router.push("/signin");
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
        <Card className="max-w-md text-center p-8">
          <p className="text-muted-foreground">No se pudo cargar el perfil</p>
          <Button onClick={() => router.push("/dashboard")} className="mt-4">
            Volver al Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12">
      <div className="mx-auto max-w-4xl px-4 pt-8">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent-muted dark:bg-surface-dark border border-primary/20 mb-4">
            <User className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Mi Perfil</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">
            Configuración de Cuenta
          </h1>
          <p className="text-muted-foreground">
            Administra tu información y preferencias
          </p>
        </motion.header>

        <div className="grid gap-6">
          {/* Profile Info Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Información Personal
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Email
                  </label>
                  <div className="mt-1 flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <p className="text-lg">{profile.email}</p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    ID de Usuario
                  </label>
                  <p className="mt-1 text-sm font-mono text-muted-foreground">
                    {profile.id}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Miembro desde
                  </label>
                  <p className="mt-1">
                    {new Date(profile.created_at).toLocaleDateString("es-ES", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Plan & Credits Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Plan y Créditos
              </h2>
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-lg bg-accent-muted dark:bg-surface-dark border border-primary/20">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Plan Actual
                    </p>
                    <p className="text-2xl font-bold capitalize">
                      {profile.plan || "Free"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Créditos Disponibles
                    </p>
                    <p className="text-2xl font-bold flex items-center gap-2">
                      <Sparkles className="h-6 w-6 text-primary" />
                      {profile.credits}
                    </p>
                  </div>
                </div>

                <Button
                  onClick={() => router.push("/dashboard")}
                  variant="outline"
                  className="w-full"
                >
                  Ver Planes Disponibles
                </Button>
              </div>
            </Card>
          </motion.div>

          {/* Actions Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <h2 className="text-xl font-semibold mb-6">Acciones</h2>
              <div className="space-y-3">
                <Button
                  onClick={() => router.push("/dashboard")}
                  variant="outline"
                  className="w-full justify-start"
                >
                  Volver al Dashboard
                </Button>

                <Button
                  onClick={handleSignOut}
                  variant="ghost"
                  className="w-full justify-start text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Cerrar Sesión
                </Button>
              </div>
            </Card>
          </motion.div>

          {/* Help Text */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-center"
          >
            <p className="text-sm text-muted-foreground">
              ¿Necesitas ayuda? Contáctanos en{" "}
              <a
                href="mailto:support@kolink.com"
                className="text-primary hover:underline"
              >
                support@kolink.com
              </a>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
