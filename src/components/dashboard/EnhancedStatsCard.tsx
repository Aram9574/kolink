"use client";

import { logger } from '@/lib/logger';
import { useCallback, useEffect, useState } from "react";
import {
  FileText,
  Zap,
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  BarChart2,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import Loader from "@/components/Loader";
import { supabaseClient } from "@/lib/supabaseClient";
import Button from "@/components/Button";
import Papa from "papaparse";
import toast from "react-hot-toast";

type DateRange = "day" | "week" | "month" | "all";
type ChartType = "line" | "bar";

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
  alerts: string[];
  forecast: {
    nextBestSlot: string;
    predictedEngagementLift: number;
  };
};

type ComparisonPeriod = "week" | "month";

export default function EnhancedStatsCard() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>("month");
  const [chartType, setChartType] = useState<ChartType>("line");
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonPeriod, setComparisonPeriod] = useState<ComparisonPeriod>("week");

  const getDaysForRange = (range: DateRange): number => {
    switch (range) {
      case "day":
        return 1;
      case "week":
        return 7;
      case "month":
        return 30;
      case "all":
        return 365;
      default:
        return 30;
    }
  };

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: sessionData } = await supabaseClient.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        setError("No autorizado. Por favor, inicia sesión nuevamente.");
        setLoading(false);
        return;
      }

      const days = getDaysForRange(dateRange);
      const response = await fetch(`/api/analytics/stats?period=${days}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Error desconocido" }));
        throw new Error(errorData.error || `Error ${response.status}`);
      }

      const data = await response.json();
      setStats(data);

      const hasFallbackAlerts =
        Array.isArray(data.alerts) &&
        data.alerts.some((message: string) =>
          message.toLowerCase().includes("datos en blanco")
        );

      if (hasFallbackAlerts) {
        toast("Mostramos estadísticas vacías temporalmente. Intenta más tarde.", { icon: "ℹ️" });
      } else {
        toast.success("Estadísticas cargadas correctamente");
      }
    } catch (err) {
      logger.error("Stats error:", err);
      const errorMessage = err instanceof Error ? err.message : "Error al cargar estadísticas";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const handleExportCSV = () => {
    if (!stats) {
      toast.error("No hay datos para exportar");
      return;
    }

    try {
      // Export daily stats
      const dailyData = stats.period.dailyStats.map((stat) => ({
        Fecha: new Date(stat.date).toLocaleDateString("es-ES"),
        "Posts Generados": stat.posts,
        "Score de Engagement": stat.engagement,
      }));

      const csv = Papa.unparse(dailyData);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `kolink-stats-${dateRange}-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Estadísticas exportadas correctamente");
    } catch (error) {
      logger.error("Export error:", error);
      toast.error("Error al exportar estadísticas");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader size={40} />
        <span className="ml-3 text-sm text-slate-600 dark:text-slate-400">Cargando estadísticas...</span>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 p-8 text-center">
        <p className="text-sm font-medium text-red-900 dark:text-red-200 mb-2">
          {error || "No hay datos disponibles"}
        </p>
        <Button onClick={loadStats} variant="outline" className="mt-4">
          Reintentar
        </Button>
      </div>
    );
  }

  // Prepare chart data
  const chartData = stats.period.dailyStats.map((stat) => ({
    date: new Date(stat.date).toLocaleDateString("es-ES", { month: "short", day: "numeric" }),
    posts: stat.posts,
    engagement: stat.engagement,
  }));

  // Calculate comparison data
  const getComparisonData = () => {
    if (!showComparison) return null;

    const periodDays = comparisonPeriod === "week" ? 7 : 30;
    const currentPeriod = stats.period.dailyStats.slice(-periodDays);
    const previousPeriod = stats.period.dailyStats.slice(-periodDays * 2, -periodDays);

    const currentTotal = currentPeriod.reduce((sum, stat) => sum + stat.posts, 0);
    const previousTotal = previousPeriod.reduce((sum, stat) => sum + stat.posts, 0);
    const change = previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : 0;

    const currentEngagement = currentPeriod.reduce((sum, stat) => sum + stat.engagement, 0) / currentPeriod.length;
    const previousEngagement = previousPeriod.reduce((sum, stat) => sum + stat.engagement, 0) / previousPeriod.length;
    const engagementChange = previousEngagement > 0 ? ((currentEngagement - previousEngagement) / previousEngagement) * 100 : 0;

    return {
      current: currentTotal,
      previous: previousTotal,
      change,
      currentEngagement: Math.round(currentEngagement),
      previousEngagement: Math.round(previousEngagement),
      engagementChange,
    };
  };

  const comparisonData = getComparisonData();

  return (
    <div className="space-y-6">
      {/* Filters and Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Date Range Filters */}
        <div className="flex flex-wrap gap-2">
          {(["day", "week", "month", "all"] as DateRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                dateRange === range
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
              }`}
            >
              <Calendar className="h-4 w-4 inline mr-1" />
              {range === "day" && "Hoy"}
              {range === "week" && "7 Días"}
              {range === "month" && "30 Días"}
              {range === "all" && "Todo"}
            </button>
          ))}
        </div>

        {/* Chart Type and Export */}
        <div className="flex gap-2">
          <button
            onClick={() => setChartType(chartType === "line" ? "bar" : "line")}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors"
            title="Cambiar tipo de gráfico"
          >
            <BarChart2 className="h-4 w-4" />
          </button>
          <Button onClick={handleExportCSV} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Comparison Toggle */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setShowComparison(!showComparison)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            showComparison
              ? "bg-purple-600 text-white"
              : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
          }`}
        >
          Comparar Períodos
        </button>
        {showComparison && (
          <div className="flex gap-2">
            <button
              onClick={() => setComparisonPeriod("week")}
              className={`px-3 py-1 rounded text-xs font-medium ${
                comparisonPeriod === "week"
                  ? "bg-purple-600 text-white"
                  : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
              }`}
            >
              Semanas
            </button>
            <button
              onClick={() => setComparisonPeriod("month")}
              className={`px-3 py-1 rounded text-xs font-medium ${
                comparisonPeriod === "month"
                  ? "bg-purple-600 text-white"
                  : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
              }`}
            >
              Meses
            </button>
          </div>
        )}
      </div>

      {/* Comparison Cards */}
      {showComparison && comparisonData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
            <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
              Posts - {comparisonPeriod === "week" ? "Semana" : "Mes"} Actual vs Anterior
            </h3>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">{comparisonData.current}</p>
                <p className="text-sm text-slate-500 dark:text-slate-500">vs {comparisonData.previous} anterior</p>
              </div>
              <div className={`flex items-center gap-1 ${
                comparisonData.change >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
              }`}>
                {comparisonData.change >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                <span className="text-lg font-semibold">{Math.abs(comparisonData.change).toFixed(1)}%</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
            <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
              Engagement - {comparisonPeriod === "week" ? "Semana" : "Mes"} Actual vs Anterior
            </h3>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">{comparisonData.currentEngagement}</p>
                <p className="text-sm text-slate-500 dark:text-slate-500">vs {comparisonData.previousEngagement} anterior</p>
              </div>
              <div className={`flex items-center gap-1 ${
                comparisonData.engagementChange >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
              }`}>
                {comparisonData.engagementChange >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                <span className="text-lg font-semibold">{Math.abs(comparisonData.engagementChange).toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={<FileText className="h-4 w-4" />}
          label="Posts Generados"
          value={stats.period.currentPosts}
          change={stats.period.postsChange}
        />
        <MetricCard
          icon={<Zap className="h-4 w-4" />}
          label="Viral Score Promedio"
          value={Math.round(stats.performance.avgViralScore || 0)}
          change={stats.period.engagementChange}
        />
        <MetricCard
          icon={<Zap className="h-4 w-4" />}
          label="Créditos Usados"
          value={stats.totals.creditsUsed}
          change={0}
        />
        <MetricCard
          icon={<Zap className="h-4 w-4" />}
          label="Créditos Disponibles"
          value={stats.totals.currentCredits}
          change={0}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Posts Chart */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
          <h4 className="text-sm font-medium mb-4 text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Posts Generados
          </h4>
          <ResponsiveContainer width="100%" height={250}>
            {chartType === "line" ? (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "currentColor", fontSize: 11 }}
                  stroke="currentColor"
                  opacity={0.5}
                />
                <YAxis
                  tick={{ fill: "currentColor", fontSize: 11 }}
                  stroke="currentColor"
                  opacity={0.5}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(15, 23, 42, 0.9)",
                    border: "1px solid rgba(148, 163, 184, 0.2)",
                    borderRadius: "0.5rem",
                    color: "#fff",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="posts"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: "#3b82f6", r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            ) : (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "currentColor", fontSize: 11 }}
                  stroke="currentColor"
                  opacity={0.5}
                />
                <YAxis
                  tick={{ fill: "currentColor", fontSize: 11 }}
                  stroke="currentColor"
                  opacity={0.5}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(15, 23, 42, 0.9)",
                    border: "1px solid rgba(148, 163, 184, 0.2)",
                    borderRadius: "0.5rem",
                    color: "#fff",
                  }}
                />
                <Bar dataKey="posts" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Engagement Chart */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
          <h4 className="text-sm font-medium mb-4 text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Evolución del Viral Score
          </h4>
          <ResponsiveContainer width="100%" height={250}>
            {chartType === "line" ? (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "currentColor", fontSize: 11 }}
                  stroke="currentColor"
                  opacity={0.5}
                />
                <YAxis
                  tick={{ fill: "currentColor", fontSize: 11 }}
                  stroke="currentColor"
                  opacity={0.5}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(15, 23, 42, 0.9)",
                    border: "1px solid rgba(148, 163, 184, 0.2)",
                    borderRadius: "0.5rem",
                    color: "#fff",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="engagement"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={{ fill: "#8b5cf6", r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            ) : (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "currentColor", fontSize: 11 }}
                  stroke="currentColor"
                  opacity={0.5}
                />
                <YAxis
                  tick={{ fill: "currentColor", fontSize: 11 }}
                  stroke="currentColor"
                  opacity={0.5}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(15, 23, 42, 0.9)",
                    border: "1px solid rgba(148, 163, 184, 0.2)",
                    borderRadius: "0.5rem",
                    color: "#fff",
                  }}
                />
                <Bar dataKey="engagement" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Insights Section */}
      <div className="rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-900/20 p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
          <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          Insights Automáticos
        </h3>
        <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
          {stats.period.postsChange > 0 && (
            <li className="flex items-start gap-2">
              <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5" />
              <span>Tu actividad ha aumentado un {stats.period.postsChange.toFixed(1)}% respecto al período anterior.</span>
            </li>
          )}
          {stats.performance.avgViralScore && stats.performance.avgViralScore > 70 && (
            <li className="flex items-start gap-2">
              <span className="text-purple-600 dark:text-purple-400">⭐</span>
              <span>Excelente score promedio ({Math.round(stats.performance.avgViralScore)}/100). ¡Sigue así!</span>
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
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  change: number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 mb-2">
          {icon}
          <span className="text-xs font-medium">{label}</span>
        </div>
        {change !== 0 && (
          <span
            className={`text-xs font-medium flex items-center gap-1 ${
              change >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
            }`}
          >
            {change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(change).toFixed(1)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}
