import { logger } from '@/lib/logger';
import { useEffect, useState, type FormEvent } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Loader from "@/components/Loader";
import { supabaseClient } from "@/lib/supabaseClient";
import toast from "react-hot-toast";
import { analytics, resetUser } from "@/lib/posthog";

type ProfileRecord = {
  full_name: string | null;
  features: Record<string, unknown> | null;
  email: string | null;
};

export default function AccountSetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      const { data } = await supabaseClient.auth.getSession();
      const session = data.session;

      if (!session?.user) {
        router.replace("/signin");
        return;
      }

      setSessionUserId(session.user.id);

      const { data: profileData, error } = await supabaseClient
        .from("profiles")
        .select("full_name, features, email")
        .eq("id", session.user.id)
        .maybeSingle();

      if (error) {
        logger.error("Failed to load profile", error);
        toast.error("No se pudo cargar tu perfil");
        router.replace("/dashboard");
        return;
      }

      setProfile(profileData as ProfileRecord);

      const existingName = profileData?.full_name ?? "";
      if (existingName) {
        const parts = existingName.split(" ");
        setFirstName(parts.shift() ?? "");
        setLastName(parts.join(" ") ?? "");
      }

      const features = (profileData?.features as { onboarding_completed?: boolean }) ?? {};
      if (features.onboarding_completed && existingName.trim().length > 0) {
        router.replace("/dashboard");
        return;
      }

      setLoading(false);
    };

    loadProfile();
  }, [router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!sessionUserId) return;

    setSaving(true);
    try {
      const existingFeatures = (profile?.features as Record<string, unknown>) ?? {};
      const updatedFeatures = { ...existingFeatures, onboarding_completed: true };

      const fullName = `${firstName} ${lastName}`.trim();

      const { error } = await supabaseClient
        .from("profiles")
        .update({
          full_name: fullName,
          features: updatedFeatures,
        })
        .eq("id", sessionUserId);

      if (error) {
        toast.error("No pudimos guardar tu información. Intenta nuevamente.");
        setSaving(false);
        return;
      }

      toast.success("Experiencia personalizada lista");
      router.replace("/dashboard");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    // Track sign out event
    analytics.signOut();
    resetUser();

    await supabaseClient.auth.signOut();
    router.replace("/signin");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader size={40} />
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Personaliza tu experiencia | KOLINK</title>
      </Head>
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 px-6 py-20 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
        <button
          onClick={handleLogout}
          className="absolute left-6 top-6 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-500 shadow-sm transition hover:border-slate-300 hover:text-slate-700"
        >
          Cerrar sesión
        </button>

        <div className="grid w-full max-w-6xl gap-12 rounded-[32px] bg-white/70 p-12 shadow-2xl backdrop-blur md:grid-cols-[1.2fr_1fr] dark:bg-slate-900/80">
          <section className="flex flex-col justify-center">
            <div className="mb-6 text-4xl">👋</div>
            <h1 className="text-4xl font-semibold text-slate-900 md:text-5xl dark:text-white">
              ¡Bienvenido! Queremos conocerte
            </h1>
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-300">
              Personaliza tu experiencia respondiendo unas preguntas rápidas. Así Kolink podrá adaptar recomendaciones y contenido a tu estilo.
            </p>
          </section>

          <Card className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">¿Cuál es tu nombre?</h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Lo usaremos para personalizar tu experiencia dentro del dashboard.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="firstName" className="mb-2 block text-xs font-medium uppercase tracking-[0.3em] text-slate-400">
                    Nombre
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    required
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    placeholder="Nombre"
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="mb-2 block text-xs font-medium uppercase tracking-[0.3em] text-slate-400">
                    Apellido
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    required
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    placeholder="Apellido"
                  />
                </div>
              </div>

              <Button type="submit" disabled={saving} className="w-full rounded-2xl py-3 text-base">
                {saving ? "Guardando..." : "Continuar"}
              </Button>
            </form>
          </Card>
        </div>
      </main>
    </>
  );
}

