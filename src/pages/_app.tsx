import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { useEffect, useState } from "react";
import { Session } from "@supabase/supabase-js";
import { supabaseClient } from "@/lib/supabaseClient";
import { Toaster } from "react-hot-toast";
import Navbar from "@/components/Navbar";

export default function App({ Component, pageProps }: AppProps) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    let isMounted = true;

    const resolveSession = async () => {
      const { data } = await supabaseClient.auth.getSession();
      if (isMounted) {
        setSession(data.session ?? null);
      }
    };

    resolveSession();

    const {
      data: listener,
    } = supabaseClient.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      isMounted = false;
      listener?.subscription.unsubscribe();
    };
  }, []);

  return (
    <>
      <Navbar session={session} />
      <main className="pt-20">
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: "#1e293b",
              color: "#fff",
              borderRadius: "10px",
              fontSize: "14px",
              padding: "10px 16px",
            },
          }}
        />
        <Component {...pageProps} session={session} />
      </main>
    </>
  );
}
