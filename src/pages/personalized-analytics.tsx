/**
 * Página: Analytics de Personalización
 *
 * Muestra métricas y estadísticas del sistema de generación personalizada
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Session } from '@supabase/supabase-js';
import { supabaseClient } from '@/lib/supabaseClient';
import Navbar from '@/components/Navbar';
import Card from '@/components/Card';
import Loader from '@/components/Loader';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface AnalyticsData {
  totalGenerations: number;
  totalUserPosts: number;
  mostUsedIntent: string;
  variantASelected: number;
  variantBSelected: number;
  publishedPosts: number;
  recentGenerations: Array<{
    id: string;
    topic: string;
    intent: string;
    created_at: string;
  }>;
}

interface PersonalizedAnalyticsPageProps {
  session: Session | null | undefined;
}

export default function PersonalizedAnalyticsPage({ session }: PersonalizedAnalyticsPageProps) {
  const router = useRouter();

  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) {
      router.push('/signin');
      return;
    }

    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const fetchAnalytics = async () => {
    if (!session) return;

    try {
      // Fetch total generations
      const { count: genCount } = await supabaseClient
        .from('generations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id);

      // Fetch total user posts
      const { count: postsCount } = await supabaseClient
        .from('user_posts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id);

      // Fetch all generations for detailed analytics
      const { data: generations } = await supabaseClient
        .from('generations')
        .select('*')
        .eq('user_id', session.user.id);

      // Calculate intent distribution
      const intentCounts: Record<string, number> = {};
      let variantACount = 0;
      let variantBCount = 0;
      let publishedCount = 0;

      generations?.forEach((gen) => {
        intentCounts[gen.intent] = (intentCounts[gen.intent] || 0) + 1;
        if (gen.variant_selected === 'A') variantACount++;
        if (gen.variant_selected === 'B') variantBCount++;
        if (gen.was_published) publishedCount++;
      });

      const mostUsedIntent = Object.entries(intentCounts).sort(
        ([, a], [, b]) => b - a
      )[0]?.[0] || 'N/A';

      // Recent generations
      const { data: recent } = await supabaseClient
        .from('generations')
        .select('id, topic, intent, created_at')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      setAnalytics({
        totalGenerations: genCount || 0,
        totalUserPosts: postsCount || 0,
        mostUsedIntent,
        variantASelected: variantACount,
        variantBSelected: variantBCount,
        publishedPosts: publishedCount,
        recentGenerations: recent || [],
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader size={40} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar session={session} />
        <div className="flex items-center justify-center py-20">
          <Loader size={40} />
        </div>
      </div>
    );
  }

  const getIntentEmoji = (intent: string) => {
    const emojiMap: Record<string, string> = {
      'educativo': '📚',
      'inspiracional': '✨',
      'personal': '💭',
      'thought-leadership': '💡',
      'promocional': '🚀',
    };
    return emojiMap[intent] || '📝';
  };

  const variantPreference =
    analytics && analytics.variantASelected + analytics.variantBSelected > 0
      ? (
          (analytics.variantASelected /
            (analytics.variantASelected + analytics.variantBSelected)) *
          100
        ).toFixed(0)
      : 50;

  return (
    <div className="min-h-screen bg-background">
      <Navbar session={session} />

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-text mb-4">
            Analytics de Personalización
          </h1>
          <p className="text-lg text-text/70">
            Métricas y estadísticas de tu contenido generado
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Generations */}
          <Card>
            <div className="text-center">
              <div className="text-4xl mb-2">📊</div>
              <div className="text-3xl font-bold text-primary mb-1">
                {analytics?.totalGenerations || 0}
              </div>
              <div className="text-sm text-text/60">Posts Generados</div>
            </div>
          </Card>

          {/* User Posts */}
          <Card>
            <div className="text-center">
              <div className="text-4xl mb-2">📝</div>
              <div className="text-3xl font-bold text-blue-600 mb-1">
                {analytics?.totalUserPosts || 0}
              </div>
              <div className="text-sm text-text/60">Posts Importados</div>
            </div>
          </Card>

          {/* Published */}
          <Card>
            <div className="text-center">
              <div className="text-4xl mb-2">🚀</div>
              <div className="text-3xl font-bold text-green-600 mb-1">
                {analytics?.publishedPosts || 0}
              </div>
              <div className="text-sm text-text/60">Posts Publicados</div>
            </div>
          </Card>

          {/* Most Used Intent */}
          <Card>
            <div className="text-center">
              <div className="text-4xl mb-2">
                {getIntentEmoji(analytics?.mostUsedIntent || '')}
              </div>
              <div className="text-xl font-bold text-purple-600 mb-1 capitalize">
                {analytics?.mostUsedIntent || 'N/A'}
              </div>
              <div className="text-sm text-text/60">Intent Más Usado</div>
            </div>
          </Card>
        </div>

        {/* Variant Preference */}
        <Card className="mb-8">
          <h3 className="text-xl font-bold mb-4">
            Preferencia de Variantes
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Variante A (Corta)</span>
                <span className="font-semibold">
                  {analytics?.variantASelected || 0} selecciones
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                <div
                  className="bg-blue-500 h-4 rounded-full transition-all"
                  style={{ width: `${variantPreference}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Variante B (Larga)</span>
                <span className="font-semibold">
                  {analytics?.variantBSelected || 0} selecciones
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                <div
                  className="bg-purple-500 h-4 rounded-full transition-all"
                  style={{ width: `${100 - Number(variantPreference)}%` }}
                />
              </div>
            </div>

            {analytics && analytics.variantASelected + analytics.variantBSelected > 0 && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-4">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Insight:</strong>{' '}
                  {Number(variantPreference) > 60
                    ? 'Prefieres contenido corto y directo. Considera experimentar con variantes largas para temas complejos.'
                    : Number(variantPreference) < 40
                    ? 'Prefieres contenido profundo y detallado. Ideal para thought leadership y contenido educativo.'
                    : 'Tienes un balance equilibrado. Adaptas el formato según el tema.'}
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Recent Activity */}
        <Card>
          <h3 className="text-xl font-bold mb-4">
            Actividad Reciente
          </h3>
          {analytics && analytics.recentGenerations.length > 0 ? (
            <div className="space-y-3">
              {analytics.recentGenerations.map((gen) => (
                <div
                  key={gen.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getIntentEmoji(gen.intent)}</span>
                    <div>
                      <div className="font-semibold">{gen.topic}</div>
                      <div className="text-xs text-text/50">
                        {formatDistanceToNow(new Date(gen.created_at), {
                          addSuffix: true,
                          locale: es,
                        })}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                    {gen.intent}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-text/60">
              No hay actividad reciente
            </div>
          )}
        </Card>

        {/* Tips */}
        {analytics && analytics.totalUserPosts < 10 && (
          <Card className="mt-8 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
            <h3 className="text-xl font-bold mb-2 text-yellow-900 dark:text-yellow-100">
              💡 Mejora tu personalización
            </h3>
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              Has importado solo {analytics.totalUserPosts} posts. Para mejores resultados,
              importa al menos 10 posts históricos. Esto ayudará al sistema a entender mejor
              tu estilo de escritura.
            </p>
          </Card>
        )}
      </main>
    </div>
  );
}
