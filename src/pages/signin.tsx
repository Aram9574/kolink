import { useState, type FormEvent } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import Button from "@/components/Button";
import { supabaseClient } from "@/lib/supabaseClient";
import { analytics } from "@/lib/posthog";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error: signInError } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    // Track successful sign in
    analytics.signIn("email");

    const userId = data.user?.id;
    if (!userId) {
      router.push("/dashboard");
      return;
    }

    const { data: profileData } = await supabaseClient
      .from("profiles")
      .select("features, full_name")
      .eq("id", userId)
      .maybeSingle();

    const features = (profileData?.features as Record<string, unknown>) ?? {};
    const hasCompleted = Boolean((features as { onboarding_completed?: boolean }).onboarding_completed);
    const hasName = Boolean(profileData?.full_name && profileData.full_name.trim().length > 0);

    router.push(!hasCompleted || !hasName ? "/account-setup" : "/dashboard");
  }

  return (
    <>
      <Head>
        <title>Inicia sesión | KOLINK</title>
      </Head>
      <main className="flex min-h-screen items-center justify-center bg-white px-4 py-20">
        <div className="w-full max-w-xl space-y-8 text-center">
          <div className="space-y-6">
            <Link href="/" className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-lg font-semibold text-blue-600">
              K
            </Link>
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold text-slate-900 md:text-4xl">
                Bienvenido de nuevo a Kolink
              </h1>
              <p className="text-sm text-slate-500">
                Inicia sesión para seguir creando contenido que conecta en LinkedIn.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-5 text-left">
              <div className="space-y-2">
                <label htmlFor="email" className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                  Correo electrónico
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-full border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="nombre@empresa.com"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                  Contraseña
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-full border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="Ingresa tu contraseña"
                />
              </div>

              {error && (
                <p className="rounded-2xl bg-red-50 px-4 py-3 text-xs text-red-600">{error}</p>
              )}

              <Button type="submit" disabled={loading} className="w-full rounded-full py-3 text-base">
                {loading ? "Iniciando sesión..." : "Iniciar sesión"}
              </Button>
            </form>

            <p className="text-xs text-slate-400">
              ¿Necesitas ayuda? Escríbenos a {" "}
              <a href="mailto:info@kolink.es" className="text-primary hover:underline">
                info@kolink.es
              </a>
            </p>

            <p className="text-sm text-slate-500">
              ¿Aún no tienes cuenta?{" "}
              <Link href="/signup" className="font-semibold text-primary hover:underline">
                Regístrate
              </Link>
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
