import { FormEvent, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabaseClient } from "@/lib/supabaseClient";
import { motion } from "framer-motion";
import { Sparkles, Mail, Lock, Linkedin } from "lucide-react";
import Button from "@/components/Button";
import Card from "@/components/Card";
import { Input } from "@/components/ui/input";
import toast from "react-hot-toast";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Handle OAuth error messages
    const { error, linkedin } = router.query;
    if (error) {
      const errorMessages: Record<string, string> = {
        linkedin_denied: "Acceso denegado a LinkedIn",
        missing_code: "Error en la autenticación con LinkedIn",
        state_mismatch: "Error de seguridad. Intenta de nuevo.",
        signin_failed: "No se pudo iniciar sesión",
        signup_failed: "No se pudo crear la cuenta",
        linkedin_error: "Error al conectar con LinkedIn",
      };
      toast.error(errorMessages[error as string] || "Error de autenticación");
    }
    if (linkedin === "connected") {
      toast.success("¡Perfil de LinkedIn conectado exitosamente!");
    }
  }, [router.query]);

  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);

    try {
      const { error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("¡Bienvenido de nuevo!");
        router.push("/dashboard");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLinkedInSignIn = () => {
    window.location.href = "/api/auth/linkedin/login";
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <Sparkles className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">KOLINK</span>
          </Link>
          <h1 className="text-2xl font-bold mb-2">Iniciar Sesión</h1>
          <p className="text-muted-foreground">
            Bienvenido de nuevo a tu espacio creativo
          </p>
        </div>

        {/* Form */}
        <Card>
          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  className="pl-10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full"
            >
              {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white dark:bg-gray-800 px-4 text-muted-foreground">
                o continúa con
              </span>
            </div>
          </div>

          {/* LinkedIn Sign-in Button */}
          <button
            onClick={handleLinkedInSignIn}
            type="button"
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
          >
            <Linkedin className="w-5 h-5 text-[#0A66C2]" />
            Continuar con LinkedIn
          </button>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              ¿No tienes cuenta?{" "}
              <Link
                href="/signup"
                className="font-medium text-primary hover:underline"
              >
                Regístrate gratis
              </Link>
            </p>
          </div>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-8">
          Al iniciar sesión, aceptas nuestros{" "}
          <Link href="#" className="underline hover:text-primary">
            Términos de Servicio
          </Link>{" "}
          y{" "}
          <Link href="#" className="underline hover:text-primary">
            Política de Privacidad
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
