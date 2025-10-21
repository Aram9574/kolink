"use client";

import { FormEvent, useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import { useRouter } from "next/router";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
    });
    

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    if (data?.user) {
      const token = data.session?.access_token;
      try {
        await fetch("/api/createProfile", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ user: data.user }),
        });
      } catch (profileError) {
        console.error("Error creating profile:", profileError);
      }
    }

    alert("Revisa tu correo para confirmar tu cuenta.");
    router.push("/signin");
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-lightBg px-4 dark:bg-darkBg">
      <h1 className="mb-6 text-3xl font-bold text-primary">KOLINK</h1>
      <form
        onSubmit={handleSignUp}
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
          {loading ? "Creando..." : "Crear cuenta"}
        </button>
        <p className="mt-4 text-center text-sm text-textMain/70 dark:text-gray-300">
          ¿Ya tienes cuenta?{" "}
          <button
            type="button"
            onClick={() => router.push("/signin")}
            className="font-semibold text-primary hover:underline"
          >
            Inicia sesión
          </button>
        </p>
      </form>
    </div>
  );
}
