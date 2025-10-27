import { useState, type FormEvent } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import Button from "@/components/Button";
import { supabaseClient } from "@/lib/supabaseClient";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLinkedInLogin = async () => {
    setError(null);

    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: "linkedin_oidc",
      options: {
        redirectTo: typeof window !== "undefined" ? `${window.location.origin}/dashboard` : undefined,
      },
    });

    if (error) {
      setError("No se pudo iniciar sesión con LinkedIn. Inténtalo de nuevo.");
    }
  };

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
            <Button
              onClick={handleLinkedInLogin}
              className="w-full justify-center gap-2 rounded-full bg-[#0A66C2] py-3 text-base font-semibold"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5 fill-white">
                <path d="M20.452 20.452h-3.554v-5.569c0-1.328-.025-3.039-1.852-3.039-1.853 0-2.136 1.445-2.136 2.939v5.669H9.356V9h3.414v1.561h.047c.476-.9 1.637-1.852 3.37-1.852 3.599 0 4.266 2.37 4.266 5.455v6.288ZM5.337 7.433a2.062 2.062 0 1 1 0-4.124 2.062 2.062 0 0 1 0 4.124ZM7.114 20.452H3.56V9h3.555v11.452Z" />
              </svg>
              Continuar con LinkedIn
            </Button>

            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="h-px flex-1 bg-slate-200" />
              o con tu correo
              <span className="h-px flex-1 bg-slate-200" />
            </div>

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
