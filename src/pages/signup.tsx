import { useState, type FormEvent } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import Button from "@/components/Button";
import { supabaseClient } from "@/lib/supabaseClient";
import toast from "react-hot-toast";

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const handleSignUpLinkedIn = async () => {
    setInfoMessage(null);

    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: "linkedin_oidc",
      options: {
        redirectTo:
          typeof window !== "undefined" ? `${window.location.origin}/account-setup` : undefined,
      },
    });

    if (error) {
      toast.error("No se pudo completar el inicio de sesión con LinkedIn. Inténtalo de nuevo.");
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    setLoading(true);
    setInfoMessage(null);

    try {
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: "",
          },
        },
      });

      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }

      if (data.user) {
        await fetch("/api/createProfile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user: { id: data.user.id, email: data.user.email } }),
        }).catch(() => undefined);
      }

      if (data.session) {
        router.push("/account-setup");
      } else {
        setInfoMessage("Te enviamos un correo para confirmar tu cuenta. Inicia sesión después de confirmar.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Crea tu cuenta | KOLINK</title>
      </Head>
      <main className="flex min-h-screen items-center justify-center bg-white px-4 py-16">
        <div className="w-full max-w-xl space-y-10 text-center">
          <div className="space-y-6">
            <Link href="/" className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-lg font-semibold text-blue-600">
              K
            </Link>
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold text-slate-900 md:text-4xl">
                Crea tu cuenta y haz crecer tu marca personal en LinkedIn
              </h1>
              <p className="text-sm text-slate-500">
                Kolink te ayuda a convertir ideas en publicaciones de alto impacto.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <Button
              onClick={handleSignUpLinkedIn}
              className="w-full justify-center gap-2 rounded-full bg-[#0A66C2] py-3 text-base font-semibold"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5 fill-white">
                <path d="M20.452 20.452h-3.554v-5.569c0-1.328-.025-3.039-1.852-3.039-1.853 0-2.136 1.445-2.136 2.939v5.669H9.356V9h3.414v1.561h.047c.476-.9 1.637-1.852 3.37-1.852 3.599 0 4.266 2.37 4.266 5.455v6.288ZM5.337 7.433a2.062 2.062 0 1 1 0-4.124 2.062 2.062 0 0 1 0 4.124ZM7.114 20.452H3.56V9h3.555v11.452Z" />
              </svg>
              Registrarme con LinkedIn
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
                  placeholder="Mínimo 6 caracteres"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                  Confirmar contraseña
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="w-full rounded-full border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="Repite tu contraseña"
                />
              </div>

              {infoMessage && (
                <p className="rounded-2xl bg-blue-50 px-4 py-3 text-xs text-blue-600">{infoMessage}</p>
              )}

              <Button type="submit" disabled={loading} className="w-full rounded-full py-3 text-base">
                {loading ? "Creando cuenta..." : "Registrarme con email"}
              </Button>
            </form>

            <p className="text-xs text-slate-400">
              Al continuar aceptas nuestros{" "}
              <a href="/legal/terms" className="text-primary hover:underline">Términos</a> y{" "}
              <a href="/legal/privacy" className="text-primary hover:underline">Política de privacidad</a>.
            </p>

            <p className="text-xs text-slate-400">
              ¿Necesitas ayuda? Escríbenos a {" "}
              <a href="mailto:info@kolink.es" className="text-primary hover:underline">
                info@kolink.es
              </a>
            </p>

            <p className="text-sm text-slate-500">
              ¿Ya tienes cuenta?{" "}
              <Link href="/signin" className="font-semibold text-primary hover:underline">
                Inicia sesión
              </Link>
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
