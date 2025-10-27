"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { Session } from "@supabase/supabase-js";
import { supabaseClient } from "@/lib/supabaseClient";
import { Cog, LifeBuoy, Users, LogOut } from "lucide-react";

export function ProfileAvatarMenu() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [fullName, setFullName] = useState<string>("");
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    let active = true;

    const resolve = async () => {
      const { data } = await supabaseClient.auth.getSession();
      if (!active) return;
      const currentSession = data.session;
      setSession(currentSession);
      if (currentSession?.user) {
        setEmail(currentSession.user.email ?? "");
        const { data: profile } = await supabaseClient
          .from("profiles")
          .select("full_name")
          .eq("id", currentSession.user.id)
          .maybeSingle();
        if (profile?.full_name) {
          setFullName(profile.full_name);
        }
      } else {
        setEmail("");
        setFullName("");
      }
    };

    resolve();

    const { data: listener } = supabaseClient.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        setEmail(newSession.user.email ?? "");
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const initials = useMemo(() => {
    const source = fullName.trim() || email;
    if (!source) return "U";
    const parts = source.split(" ").filter(Boolean);
    if (parts.length === 0) return source.charAt(0).toUpperCase();
    return parts
      .map((part) => part.charAt(0).toUpperCase())
      .join("")
      .slice(0, 2);
  }, [fullName, email]);

  if (!session) {
    return null;
  }

  const handleNavigate = (path: string) => {
    router.push(path);
  };

  const handleSupport = () => {
    window.location.href = "mailto:info@kolink.es";
  };

  const handleCommunity = () => {
    window.open("https://community.kolink.es", "_blank", "noopener,noreferrer");
  };

  const handleLogout = async () => {
    await supabaseClient.auth.signOut();
    router.replace("/signin");
  };

  return (
    <aside className="pointer-events-none fixed left-6 top-1/2 z-30 hidden -translate-y-1/2 flex-col gap-4 lg:flex">
      <div className="group relative pointer-events-auto">
        <button
          type="button"
          className="flex h-12 w-12 items-center justify-center rounded-full border border-blue-100 bg-white text-base font-semibold text-blue-600 shadow-lg transition group-hover:scale-105"
        >
          {initials}
        </button>
        <div className="invisible absolute left-16 top-1/2 w-56 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-4 text-left opacity-0 shadow-2xl transition-all group-hover:visible group-hover:translate-x-2 group-hover:opacity-100 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Cuenta</p>
          <ul className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-200">
            <li>
              <button
                type="button"
                onClick={() => handleNavigate("/profile")}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 transition hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-slate-800"
              >
                <Cog className="h-4 w-4" /> Ajustes
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={handleSupport}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 transition hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-slate-800"
              >
                <LifeBuoy className="h-4 w-4" /> Soporte
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={handleCommunity}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 transition hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-slate-800"
              >
                <Users className="h-4 w-4" /> Comunidad
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-red-500 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
              >
                <LogOut className="h-4 w-4" /> Cerrar sesión
              </button>
            </li>
          </ul>
        </div>
      </div>
    </aside>
  );
}
