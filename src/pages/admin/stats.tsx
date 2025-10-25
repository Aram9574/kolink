"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Session } from "@supabase/supabase-js";
import { supabaseClient } from "@/lib/supabaseClient";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { motion } from "framer-motion";
import {
  Shield,
  Users,
  FileText,
  CreditCard,
  TrendingUp,
  Calendar,
  ArrowLeft,
} from "lucide-react";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Loader from "@/components/Loader";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

type AdminStatsProps = {
  session: Session | null | undefined;
};

type GlobalStats = {
  total_users: number;
  paying_users: number;
  total_posts: number;
  total_scheduled: number;
  total_credits_remaining: number;
  users_last_30_days: number;
  posts_last_30_days: number;
};

type UserGrowth = {
  month: string;
  users: number;
};

type PlanDistribution = {
  plan: string;
  count: number;
};

const COLORS = ["#F9D65C", "#1E1E1E", "#4A90E2", "#50C878"];

export default function AdminStats({ session }: AdminStatsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [userGrowth, setUserGrowth] = useState<UserGrowth[]>([]);
  const [planDistribution, setPlanDistribution] = useState<PlanDistribution[]>([]);

  // Redirect if not authenticated
  useEffect(() => {
    if (session === undefined) return;
    if (!session) {
      router.replace("/signin");
    }
  }, [router, session]);

  // Check if user is admin
  useEffect(() => {
    async function checkAdminRole() {
      if (!session?.user?.id) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      const { data, error } = await supabaseClient
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();

      if (error || data?.role !== "admin") {
        setIsAdmin(false);
        router.replace("/dashboard");
        return;
      }

      setIsAdmin(true);
      loadStats();
    }

    checkAdminRole();
  }, [session, router]);

  // Load global statistics
  const loadStats = async () => {
    setLoading(true);
    try {
      const adminClient = getSupabaseAdminClient();

      // Load global stats
      const { data: globalData, error: globalError } = await adminClient
        .from("global_stats")
        .select("*")
        .single();

      if (globalError) {
        console.error("Error loading global stats:", globalError);
      } else {
        setStats(globalData);
      }

      // Load user growth by month (last 6 months)
      const { data: growthData, error: growthError } = await adminClient
        .from("profiles")
        .select("created_at");

      if (!growthError && growthData) {
        const monthCounts: { [key: string]: number } = {};
        const now = new Date();

        // Initialize last 6 months
        for (let i = 5; i >= 0; i--) {
          const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const monthKey = month.toLocaleDateString("es-ES", {
            month: "short",
            year: "numeric",
          });
          monthCounts[monthKey] = 0;
        }

        // Count users by month
        growthData.forEach((user) => {
          const userDate = new Date(user.created_at);
          const monthKey = userDate.toLocaleDateString("es-ES", {
            month: "short",
            year: "numeric",
          });
          if (monthKey in monthCounts) {
            monthCounts[monthKey]++;
          }
        });

        const growthArray = Object.entries(monthCounts).map(([month, users]) => ({
          month,
          users,
        }));
        setUserGrowth(growthArray);
      }

      // Load plan distribution
      const { data: planData, error: planError } = await adminClient
        .from("profiles")
        .select("plan");

      if (!planError && planData) {
        const planCounts: { [key: string]: number } = {};
        planData.forEach((user) => {
          const plan = user.plan || "free";
          planCounts[plan] = (planCounts[plan] || 0) + 1;
        });

        const planArray = Object.entries(planCounts).map(([plan, count]) => ({
          plan,
          count,
        }));
        setPlanDistribution(planArray);
      }
    } catch (error) {
      console.error("Exception loading stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (session === undefined || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader size={40} />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen pb-12">
      <div className="mx-auto max-w-7xl px-4 pt-8">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="outline"
              onClick={() => router.push("/admin")}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Button>
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 mb-4">
            <Shield className="h-4 w-4 text-red-500" />
            <span className="text-sm font-medium text-red-700 dark:text-red-400">
              Panel de Administración
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">
            Estadísticas Globales
          </h1>
          <p className="text-muted-foreground">
            Métricas y análisis del rendimiento de la plataforma
          </p>
        </motion.header>

        {/* Global Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          <Card className="text-center">
            <Users className="h-8 w-8 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats?.total_users || 0}</p>
            <p className="text-sm text-muted-foreground">Total Usuarios</p>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              +{stats?.users_last_30_days || 0} últimos 30 días
            </p>
          </Card>

          <Card className="text-center">
            <CreditCard className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats?.paying_users || 0}</p>
            <p className="text-sm text-muted-foreground">Usuarios de Pago</p>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.total_users
                ? ((stats?.paying_users / stats?.total_users) * 100).toFixed(1)
                : 0}
              % conversión
            </p>
          </Card>

          <Card className="text-center">
            <FileText className="h-8 w-8 text-blue-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats?.total_posts || 0}</p>
            <p className="text-sm text-muted-foreground">Posts Generados</p>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              +{stats?.posts_last_30_days || 0} últimos 30 días
            </p>
          </Card>

          <Card className="text-center">
            <Calendar className="h-8 w-8 text-purple-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats?.total_scheduled || 0}</p>
            <p className="text-sm text-muted-foreground">Posts Programados</p>
            <p className="text-xs text-muted-foreground mt-1">
              Total en calendario
            </p>
          </Card>
        </motion.div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* User Growth Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Crecimiento de Usuarios
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={userGrowth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="month" stroke="#999" />
                  <YAxis stroke="#999" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1E1E1E",
                      border: "1px solid #333",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="users"
                    stroke="#F9D65C"
                    strokeWidth={2}
                    name="Nuevos Usuarios"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </motion.div>

          {/* Plan Distribution Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Distribución de Planes
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={planDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ plan, count }) => `${plan}: ${count}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {planDistribution.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1E1E1E",
                      border: "1px solid #333",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </motion.div>
        </div>

        {/* Credits Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Resumen de Créditos
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-surface-light dark:bg-surface-dark rounded-lg">
                <p className="text-3xl font-bold text-primary">
                  {stats?.total_credits_remaining || 0}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Créditos Totales Disponibles
                </p>
              </div>
              <div className="text-center p-4 bg-surface-light dark:bg-surface-dark rounded-lg">
                <p className="text-3xl font-bold text-green-500">
                  {stats?.total_posts || 0}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Créditos Consumidos (Posts)
                </p>
              </div>
              <div className="text-center p-4 bg-surface-light dark:bg-surface-dark rounded-lg">
                <p className="text-3xl font-bold text-blue-500">
                  {stats?.total_users && stats?.total_credits_remaining
                    ? (stats.total_credits_remaining / stats.total_users).toFixed(1)
                    : 0}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Promedio de Créditos por Usuario
                </p>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
