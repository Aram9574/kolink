"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabaseClient } from "@/lib/supabaseClient";
import Loader from "@/components/Loader";

/**
 * Auth confirmation page
 * Verifies the token and establishes the session
 */
export default function AuthConfirm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuth = async () => {
      try {
        const { token, type, next } = router.query;

        if (!token || typeof token !== "string") {
          setError("Token de autenticación inválido");
          setTimeout(() => router.push("/signin"), 2000);
          return;
        }

        // Verify the token with Supabase
        const { data, error: verifyError } = await supabaseClient.auth.verifyOtp({
          token_hash: token,
          type: (type as "recovery" | "magiclink") || "recovery",
        });

        if (verifyError || !data.session) {
          console.error("[Auth Confirm] Verification error:", verifyError);
          setError("No se pudo verificar la autenticación");
          setTimeout(() => router.push("/signin?error=auth_verification_failed"), 2000);
          return;
        }

        // Session established successfully - redirect to next page
        const nextUrl = typeof next === "string" ? next : "/dashboard";
        router.push(nextUrl);
      } catch (err) {
        console.error("[Auth Confirm] Error:", err);
        setError("Error al procesar la autenticación");
        setTimeout(() => router.push("/signin?error=auth_processing_failed"), 2000);
      }
    };

    if (router.isReady) {
      handleAuth();
    }
  }, [router]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-red-500">
            <svg
              className="mx-auto h-12 w-12"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-semibold mb-2">{error}</h1>
          <p className="text-sm text-muted-foreground">Redirigiendo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <div className="text-center">
        <Loader size={40} />
        <h1 className="mt-4 text-xl font-semibold">Completando autenticación...</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Por favor espera mientras configuramos tu sesión
        </p>
      </div>
    </div>
  );
}
