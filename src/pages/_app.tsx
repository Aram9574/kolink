import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Session } from "@supabase/supabase-js";
import { supabaseClient } from "@/lib/supabaseClient";
import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { initPostHog, identifyUser, analytics } from "@/lib/posthog";
import Navbar from "@/components/Navbar";

export default function App({ Component, pageProps }: AppProps) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const router = useRouter();

  // Initialize PostHog
  useEffect(() => {
    initPostHog();
  }, []);

  // Track page views
  useEffect(() => {
    const handleRouteChange = (url: string) => {
      const pageName = url.split("?")[0]; // Remove query params
      analytics.pageViewed(pageName);
    };

    router.events.on("routeChangeComplete", handleRouteChange);
    return () => {
      router.events.off("routeChangeComplete", handleRouteChange);
    };
  }, [router.events]);

  useEffect(() => {
    let isMounted = true;

    const resolveSession = async () => {
      const { data } = await supabaseClient.auth.getSession();
      if (isMounted) {
        const newSession = data.session ?? null;
        setSession(newSession);

        // Identify user in PostHog
        if (newSession?.user) {
          identifyUser(newSession.user.id, {
            email: newSession.user.email,
            created_at: newSession.user.created_at,
          });
        }
      }
    };

    resolveSession();

    const {
      data: listener,
    } = supabaseClient.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);

      // Update PostHog identity
      if (newSession?.user) {
        identifyUser(newSession.user.id, {
          email: newSession.user.email,
        });
      }
    });

    return () => {
      isMounted = false;
      listener?.subscription.unsubscribe();
    };
  }, []);

  return (
    <ThemeProvider>
      <NotificationProvider>
        <Navbar session={session} />
        <main className="pt-20 min-h-screen">
          <Toaster
            position="top-center"
            toastOptions={{
              className: "",
              style: {
                background: "var(--background)",
                color: "var(--foreground)",
                borderRadius: "0.5rem",
                border: "1px solid var(--border)",
                fontSize: "14px",
                padding: "12px 16px",
              },
            }}
          />
          <Component {...pageProps} session={session} />
        </main>
      </NotificationProvider>
    </ThemeProvider>
  );
}
