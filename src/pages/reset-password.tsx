import { useState, useEffect, type FormEvent } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { Lock, CheckCircle } from "lucide-react";
import Button from "@/components/Button";
import { PasswordStrengthIndicator } from "@/components/security/PasswordStrengthIndicator";
import { validatePassword } from "@/lib/security/passwordValidation";
import toast from "react-hot-toast";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get token from URL
    const tokenFromUrl = router.query.token as string;
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
    }
  }, [router.query]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!token) {
      setError("Token de recuperación no válido");
      return;
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      toast.error("La contraseña no cumple con los requisitos de seguridad");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/security/password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(true);
        toast.success("Contraseña cambiada exitosamente");

        // Redirect to signin after 3 seconds
        setTimeout(() => {
          router.push("/signin");
        }, 3000);
      } else {
        setError(result.error || "Error al restablecer la contraseña");
      }
    } catch (error) {
      console.error("Password reset error:", error);
      setError("Error al restablecer la contraseña");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <>
        <Head>
          <title>Restablecer contraseña | KOLINK</title>
        </Head>
        <main className="flex min-h-screen items-center justify-center bg-white px-4 py-20">
          <div className="w-full max-w-xl space-y-8 text-center">
            <div className="space-y-6">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <Lock className="h-8 w-8 text-red-600" />
              </div>
              <div className="space-y-3">
                <h1 className="text-3xl font-semibold text-slate-900">
                  Enlace no válido
                </h1>
                <p className="text-sm text-slate-600">
                  El enlace de recuperación no es válido o ha expirado.
                </p>
              </div>

              <Link href="/forgot-password" className="inline-block text-sm font-semibold text-primary hover:underline">
                Solicitar nuevo enlace
              </Link>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Restablecer contraseña | KOLINK</title>
      </Head>
      <main className="flex min-h-screen items-center justify-center bg-white px-4 py-20">
        <div className="w-full max-w-xl space-y-8 text-center">
          {!success ? (
            <>
              <div className="space-y-6">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                  <Lock className="h-8 w-8 text-blue-600" />
                </div>
                <div className="space-y-3">
                  <h1 className="text-3xl font-semibold text-slate-900 md:text-4xl">
                    Crea una nueva contraseña
                  </h1>
                  <p className="text-sm text-slate-600">
                    Ingresa una contraseña segura para proteger tu cuenta
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5 text-left">
                <div className="space-y-2">
                  <label htmlFor="password" className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                    Nueva contraseña
                  </label>
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-full border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder="Mínimo 8 caracteres"
                  />
                  {password && (
                    <div className="pt-2">
                      <PasswordStrengthIndicator password={password} />
                    </div>
                  )}
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

                {error && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                    {error}
                  </div>
                )}

                <Button type="submit" disabled={loading} className="w-full rounded-full py-3 text-base">
                  {loading ? "Restableciendo..." : "Restablecer contraseña"}
                </Button>
              </form>
            </>
          ) : (
            <div className="space-y-6">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div className="space-y-3">
                <h1 className="text-3xl font-semibold text-slate-900">
                  ¡Contraseña restablecida!
                </h1>
                <p className="text-sm text-slate-600">
                  Tu contraseña ha sido cambiada exitosamente. Redirigiendo al inicio de sesión...
                </p>
              </div>

              <Link href="/signin" className="inline-block text-sm font-semibold text-primary hover:underline">
                Ir al inicio de sesión
              </Link>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
