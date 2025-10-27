// [Phase 5] Analytics and statistics card component
"use client";

import { useCallback, useEffect, useState } from "react";
import { Eye, MessageCircle, Heart, Repeat2, Users, FileText, Zap } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import Loader from "@/components/Loader";
import { supabaseClient } from "@/lib/supabaseClient";

type TimePeriod = 7 | 30 | 90 | 180;

type StatsData = {
  totals: {
    totalPosts: number;
    creditsUsed: number;
    currentCredits: number;
    plan: string | null;
  };
  performance: {
    avgViralScore: number | null;
  };
  period: {
    currentPosts: number;
    postsChange: number;
    engagementChange: number;
    dailyStats: Array<{
      date: string;
      posts: number;
      engagement: number;
    }>;
  };
};

export default function StatsCard() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<TimePeriod>(30);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        setError("No autorizado");
        setLoading(false);
        return;
      }

      const response = await fetch(`/api/analytics/stats?period=${period}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Error al cargar estadísticas");
      }

      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error("Stats error:", err);
      setError("Error al cargar estadísticas");
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader size={40} />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-8 text-center">
        <p className="text-sm text-slate-600 dark:text-slate-400">{error || "No hay datos disponibles"}</p>
      </div>
    );
  }

  // Preparar datos para los gráficos
  const chartData = stats.period.dailyStats.map((stat) => ({
    date: new Date(stat.date).toLocaleDateString("es-ES", { month: "short", day: "numeric" }),
    posts: stat.posts,
    engagement: stat.engagement,
  }));

  return (
    <div className="space-y-6">
      {/* Time Period Filters */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex gap-2">
          {([7, 30, 90, 180] as TimePeriod[]).map((days) => (
            <button
              key={days}
              onClick={() => setPeriod(days)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                period === days
                  ? "bg-foreground text-background"
                  : "bg-white dark:bg-slate-800 text-foreground hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
              }`}
            >
              {days} Días
            </button>
          ))}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Posts */}
        <MetricCard
          icon={<FileText className="h-4 w-4" />}
          label="Posts"
          value={stats.period.currentPosts}
          change={stats.period.postsChange}
        />

        {/* Engagements */}
        <MetricCard
          icon={<Zap className="h-4 w-4" />}
          label="Puntuación de Engagement"
          value={Math.round(stats.performance.avgViralScore || 0)}
          change={stats.period.engagementChange}
        />

        {/* Impressions (Placeholder) */}
        <MetricCard
          icon={<Eye className="h-4 w-4" />}
          label="Impresiones"
          value={0}
          change={0}
          isPlaceholder
        />

        {/* Comments (Placeholder) */}
        <MetricCard
          icon={<MessageCircle className="h-4 w-4" />}
          label="Comentarios"
          value={0}
          change={0}
          isPlaceholder
        />

        {/* Followers (Placeholder) */}
        <MetricCard
          icon={<Users className="h-4 w-4" />}
          label="Seguidores"
          value={0}
          change={0}
          isPlaceholder
        />

        {/* Credits Used */}
        <MetricCard
          icon={<Zap className="h-4 w-4" />}
          label="Créditos Usados"
          value={stats.totals.creditsUsed}
          change={0}
        />

        {/* Likes (Placeholder) */}
        <MetricCard
          icon={<Heart className="h-4 w-4" />}
          label="Me gusta"
          value={0}
          change={0}
          isPlaceholder
        />

        {/* Reposts (Placeholder) */}
        <MetricCard
          icon={<Repeat2 className="h-4 w-4" />}
          label="Compartidos"
          value={0}
          change={0}
          isPlaceholder
        />
      </div>

      {/* Trends Section */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-4">Tendencias</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Posts Trend */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 transition-colors">
            <h4 className="text-sm font-medium mb-4 text-slate-600 dark:text-slate-400">Posts</h4>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                <XAxis
                  dataKey="date"
                  className="text-xs"
                  tick={{ fill: "currentColor", fontSize: 12 }}
                  stroke="currentColor"
                />
                <YAxis
                  className="text-xs"
                  tick={{ fill: "currentColor", fontSize: 12 }}
                  stroke="currentColor"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "0.5rem",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="posts"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Engagement Trend */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 transition-colors">
            <h4 className="text-sm font-medium mb-4 text-slate-600 dark:text-slate-400">Puntuación de Engagement</h4>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                <XAxis
                  dataKey="date"
                  className="text-xs"
                  tick={{ fill: "currentColor", fontSize: 12 }}
                  stroke="currentColor"
                />
                <YAxis
                  className="text-xs"
                  tick={{ fill: "currentColor", fontSize: 12 }}
                  stroke="currentColor"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "0.5rem",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="engagement"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

// Metric Card Component
function MetricCard({
  icon,
  label,
  value,
  change,
  isPlaceholder = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  change: number;
  isPlaceholder?: boolean;
}) {
  const formatPercentage = (value: number) => {
    const formatted = Math.abs(value).toFixed(1);
    return value >= 0 ? `+${formatted}%` : `-${formatted}%`;
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 mb-2">
          {icon}
          <span className="text-xs font-medium">{label}</span>
        </div>
        {!isPlaceholder && change !== 0 && (
          <span
            className={`text-xs font-medium ${
              change >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
            }`}
          >
            {formatPercentage(change)}
          </span>
        )}
        {!isPlaceholder && change === 0 && (
          <span className="text-xs font-medium text-slate-500 dark:text-slate-500">0.0%</span>
        )}
      </div>
      <div className="flex items-end justify-between">
        <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}
