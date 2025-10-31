import { useState, type FormEvent } from "react";
import Head from "next/head";
import Link from "next/link";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
import Button from "@/components/Button";
import toast from "react-hot-toast";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (result.success) {
        setSubmitted(true);
      } else {
        toast.error(result.error || "Error al solicitar recuperación");
      }
    } catch (error) {
      console.error("Password reset request error:", error);
      toast.error("Error al solicitar recuperación de contraseña");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>Recuperar contraseña | KOLINK</title>
      </Head>
      <main className="flex min-h-screen items-center justify-center bg-white px-4 py-20">
        <div className="w-full max-w-xl space-y-8 text-center">
          {!submitted ? (
            <>
              <div className="space-y-6">
                <Link href="/signin" className="inline-flex items-center gap-2 text-sm text-slate-600 transition hover:text-slate-900">
                  <ArrowLeft className="h-4 w-4" />
                  Volver al inicio de sesión
                </Link>

                <div className="space-y-3">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                    <Mail className="h-8 w-8 text-blue-600" />
                  </div>
                  <h1 className="text-3xl font-semibold text-slate-900 md:text-4xl">
                    Recupera tu contraseña
                  </h1>
                  <p className="text-sm text-slate-600">
                    Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña
                  </p>
                </div>
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

                <Button type="submit" disabled={loading} className="w-full rounded-full py-3 text-base">
                  {loading ? "Enviando..." : "Enviar enlace de recuperación"}
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
                  ¡Revisa tu correo!
                </h1>
                <p className="text-sm text-slate-600">
                  Si existe una cuenta asociada a <strong>{email}</strong>, recibirás un correo con instrucciones para restablecer tu contraseña.
                </p>
                <p className="text-xs text-slate-500">
                  El enlace expirará en 1 hora por seguridad.
                </p>
              </div>

              <div className="space-y-4 rounded-2xl border border-blue-100 bg-blue-50 p-6 text-left">
                <h3 className="font-semibold text-blue-900">¿No recibes el correo?</h3>
                <ul className="space-y-2 text-sm text-blue-800">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-600" />
                    Revisa tu carpeta de spam o correo no deseado
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-600" />
                    Verifica que ingresaste el correo correcto
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-600" />
                    Espera unos minutos, puede tardar en llegar
                  </li>
                </ul>
              </div>

              <Link href="/signin" className="inline-block text-sm font-semibold text-primary hover:underline">
                Volver al inicio de sesión
              </Link>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
