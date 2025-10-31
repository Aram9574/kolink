// [Phase 5] Statistics and analytics page
import { useEffect } from "react";
import { useRouter } from "next/router";
import { Session } from "@supabase/supabase-js";
import { motion } from "framer-motion";
import { BarChart3 } from "lucide-react";
import EnhancedStatsCard from "@/components/dashboard/EnhancedStatsCard";
import Loader from "@/components/Loader";
import Navbar from "@/components/Navbar";

type StatsProps = {
  session: Session | null | undefined;
};

export default function Stats({ session }: StatsProps) {
  const router = useRouter();

  useEffect(() => {
    if (session === undefined) return;
    if (!session) {
      router.replace("/signin");
    }
  }, [session, router]);

  if (session === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader size={40} />
      </div>
    );
  }

  return (
    <>
      <Navbar session={session} />
      <div className="min-h-screen bg-slate-50 pb-16 pt-20 lg:pl-64 dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent-muted dark:bg-surface-dark border border-primary/20 mb-4">
            <BarChart3 className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Estadísticas</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">
            Tus Métricas de Uso
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Visualiza tu progreso y actividad en KOLINK
          </p>
        </motion.header>

        {/* Stats Component */}
          <EnhancedStatsCard />
        </div>
      </div>
    </>
  );
}
