/**
 * Página: Generador Personalizado
 *
 * Página dedicada al sistema de generación personalizada con RAG
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Session } from '@supabase/supabase-js';
import { supabaseClient } from '@/lib/supabaseClient';
import Navbar from '@/components/Navbar';
import PersonalizedGenerator from '@/components/personalization/PersonalizedGenerator';
import GenerationsHistory from '@/components/personalization/GenerationsHistory';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Loader from '@/components/Loader';

interface PersonalizedPageProps {
  session: Session | null | undefined;
}

export default function PersonalizedPage({ session }: PersonalizedPageProps) {
  const router = useRouter();

  const [userPostsCount, setUserPostsCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'generate' | 'history'>('generate');

  useEffect(() => {
    if (!session) {
      router.push('/signin');
      return;
    }

    fetchUserPostsCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const fetchUserPostsCount = async () => {
    if (!session) return;

    try {
      const { count, error } = await supabaseClient
        .from('user_posts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id);

      if (error) throw error;

      setUserPostsCount(count || 0);
    } catch (error) {
      console.error('Error fetching user posts count:', error);
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar session={session} />

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-text mb-4">
            Generador Personalizado con IA
          </h1>
          <p className="text-lg text-text/70 max-w-3xl">
            Genera posts de LinkedIn que mantienen tu voz única y combinan
            técnicas comprobadas de contenido viral.
          </p>
        </div>

        {/* User Posts Status */}
        {!loading && (
          <Card className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`
                  w-12 h-12 rounded-full flex items-center justify-center
                  ${userPostsCount > 0 ? 'bg-green-100 dark:bg-green-900' : 'bg-yellow-100 dark:bg-yellow-900'}
                `}>
                  {userPostsCount > 0 ? (
                    <span className="text-2xl">✓</span>
                  ) : (
                    <span className="text-2xl">⚠️</span>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-lg">
                    {userPostsCount > 0 ? 'Sistema listo' : 'Configura tu estilo'}
                  </h3>
                  <p className="text-sm text-text/60">
                    {userPostsCount > 0
                      ? `Has importado ${userPostsCount} ${userPostsCount === 1 ? 'post' : 'posts'}. El sistema conoce tu estilo.`
                      : 'Importa posts para mejorar la personalización'
                    }
                  </p>
                </div>
              </div>
              {userPostsCount === 0 && (
                <Button
                  onClick={() => router.push('/onboarding/import-posts')}
                  variant="primary"
                >
                  Importar Posts
                </Button>
              )}
              {userPostsCount > 0 && userPostsCount < 10 && (
                <Button
                  onClick={() => router.push('/onboarding/import-posts')}
                  variant="secondary"
                >
                  Importar Más Posts
                </Button>
              )}
            </div>
          </Card>
        )}

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-border">
          <button
            onClick={() => setActiveTab('generate')}
            className={`
              px-6 py-3 font-semibold border-b-2 transition-colors
              ${activeTab === 'generate'
                ? 'border-primary text-primary'
                : 'border-transparent text-text/60 hover:text-text'
              }
            `}
          >
            ✨ Generar Post
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`
              px-6 py-3 font-semibold border-b-2 transition-colors
              ${activeTab === 'history'
                ? 'border-primary text-primary'
                : 'border-transparent text-text/60 hover:text-text'
              }
            `}
          >
            📝 Historial
          </button>
        </div>

        {/* Content */}
        {activeTab === 'generate' && (
          <PersonalizedGenerator
            session={session}
            onGenerated={() => {
              // Refresh history when new generation is created
              setActiveTab('history');
            }}
          />
        )}

        {activeTab === 'history' && <GenerationsHistory session={session} />}

        {/* Help Section */}
        <Card className="mt-8">
          <div className="space-y-4">
            <h3 className="text-xl font-bold">
              ¿Cómo funciona el generador personalizado?
            </h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <div className="text-3xl mb-2">🎯</div>
                <h4 className="font-semibold mb-2">1. Aprende tu estilo</h4>
                <p className="text-sm text-text/60">
                  Analizamos tus posts históricos para entender tu tono,
                  estructura y forma de comunicar.
                </p>
              </div>
              <div>
                <div className="text-3xl mb-2">🔍</div>
                <h4 className="font-semibold mb-2">2. Busca inspiración</h4>
                <p className="text-sm text-text/60">
                  Encontramos posts virales similares a tu tema para
                  incorporar técnicas comprobadas.
                </p>
              </div>
              <div>
                <div className="text-3xl mb-2">✨</div>
                <h4 className="font-semibold mb-2">3. Genera variantes</h4>
                <p className="text-sm text-text/60">
                  IA crea 2 versiones optimizadas: una corta y directa,
                  otra profunda y detallada.
                </p>
              </div>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}
