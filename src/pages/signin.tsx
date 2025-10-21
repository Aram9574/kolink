"use client";

import { FormEvent, useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import { useRouter } from "next/router";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    const { error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      alert(error.message);
    } else {
      router.push("/dashboard");
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-lightBg px-4 dark:bg-darkBg">
      <h1 className="mb-6 text-3xl font-bold text-primary">KOLINK</h1>
      <form
        onSubmit={handleSignIn}
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-md dark:bg-gray-800"
      >
        <input
          type="email"
          placeholder="Email"
          className="mb-3 w-full rounded-lg border p-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          className="mb-3 w-full rounded-lg border p-2"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-primary py-2 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Iniciando..." : "Iniciar sesión"}
        </button>
        <p className="mt-4 text-center text-sm text-textMain/70 dark:text-gray-300">
          ¿No tienes cuenta?{" "}
          <button
            type="button"
            onClick={() => router.push("/signup")}
            className="font-semibold text-primary hover:underline"
          >
            Regístrate
          </button>
        </p>
      </form>
    </div>
  );
}
