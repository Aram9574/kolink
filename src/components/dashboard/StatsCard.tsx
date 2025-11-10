// [Phase 5] Analytics and statistics card component
"use client";

import { logger } from '@/lib/logger';
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
      logger.error("Stats error:", err);
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

  // Simple forecasting usando regresión lineal
  const calculateForecast = (data: number[], days: number = 7) => {
    if (data.length < 2) return { trend: "stable", prediction: 0 };

    // Regresión lineal simple
    const n = data.length;
    const xValues = Array.from({ length: n }, (_, i) => i);
    const xMean = xValues.reduce((a, b) => a + b, 0) / n;
    const yMean = data.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denominator = 0;
    for (let i = 0; i < n; i++) {
      numerator += (xValues[i] - xMean) * (data[i] - yMean);
      denominator += (xValues[i] - xMean) ** 2;
    }

    const slope = denominator !== 0 ? numerator / denominator : 0;
    const intercept = yMean - slope * xMean;

    // Predicción para los próximos días
    const prediction = slope * (n + days) + intercept;

    // Determinar tendencia
    const trend = slope > 0.1 ? "up" : slope < -0.1 ? "down" : "stable";

    return { trend, prediction: Math.max(0, Math.round(prediction)), slope };
  };

  const postsData = stats.period.dailyStats.map((s) => s.posts);
  const engagementData = stats.period.dailyStats.map((s) => s.engagement);

  const postsForecast = calculateForecast(postsData);
  const engagementForecast = calculateForecast(engagementData);

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

      {/* Forecasting & Trends Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Posts Forecast */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Proyección de Posts (próximos 7 días)
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600 dark:text-slate-400">Tendencia actual:</span>
              <div className="flex items-center gap-2">
                {postsForecast.trend === "up" && (
                  <span className="text-green-600 dark:text-green-400 font-medium">📈 Creciente</span>
                )}
                {postsForecast.trend === "down" && (
                  <span className="text-red-600 dark:text-red-400 font-medium">📉 Decreciente</span>
                )}
                {postsForecast.trend === "stable" && (
                  <span className="text-slate-600 dark:text-slate-400 font-medium">➡️ Estable</span>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600 dark:text-slate-400">Posts proyectados:</span>
              <span className="text-2xl font-bold text-slate-900 dark:text-white">
                {postsForecast.prediction}
              </span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-500">
              Basado en tu actividad de los últimos {period} días
            </div>
          </div>
        </div>

        {/* Engagement Forecast */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Proyección de Engagement (próximos 7 días)
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600 dark:text-slate-400">Tendencia actual:</span>
              <div className="flex items-center gap-2">
                {engagementForecast.trend === "up" && (
                  <span className="text-green-600 dark:text-green-400 font-medium">📈 Mejorando</span>
                )}
                {engagementForecast.trend === "down" && (
                  <span className="text-red-600 dark:text-red-400 font-medium">📉 Bajando</span>
                )}
                {engagementForecast.trend === "stable" && (
                  <span className="text-slate-600 dark:text-slate-400 font-medium">➡️ Estable</span>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600 dark:text-slate-400">Score proyectado:</span>
              <span className="text-2xl font-bold text-slate-900 dark:text-white">
                {engagementForecast.prediction}
              </span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-500">
              Basado en tu rendimiento de los últimos {period} días
            </div>
          </div>
        </div>
      </div>

      {/* Insights Section */}
      <div className="rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-900/20 p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
          <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          Insights Automáticos
        </h3>
        <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
          {postsForecast.trend === "up" && (
            <li className="flex items-start gap-2">
              <span className="text-green-600 dark:text-green-400">✓</span>
              <span>¡Excelente! Estás generando más contenido. Mantén este ritmo.</span>
            </li>
          )}
          {postsForecast.trend === "down" && (
            <li className="flex items-start gap-2">
              <span className="text-yellow-600 dark:text-yellow-400">⚠</span>
              <span>Tu actividad ha disminuido. Considera establecer un objetivo diario de posts.</span>
            </li>
          )}
          {engagementForecast.trend === "up" && (
            <li className="flex items-start gap-2">
              <span className="text-green-600 dark:text-green-400">✓</span>
              <span>Tu engagement está mejorando. Tu audiencia está respondiendo bien.</span>
            </li>
          )}
          {stats.performance.avgViralScore && stats.performance.avgViralScore > 70 && (
            <li className="flex items-start gap-2">
              <span className="text-purple-600 dark:text-purple-400">⭐</span>
              <span>Score promedio excelente ({Math.round(stats.performance.avgViralScore)}/100). ¡Sigue así!</span>
            </li>
          )}
          {stats.totals.currentCredits < 10 && (
            <li className="flex items-start gap-2">
              <span className="text-red-600 dark:text-red-400">!</span>
              <span>Créditos bajos ({stats.totals.currentCredits}). Considera renovar tu plan.</span>
            </li>
          )}
        </ul>
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
