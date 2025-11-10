/**
 * Componente: GenerationsHistory
 *
 * Muestra el historial de posts generados con el sistema de personalización
 */

'use client';

import { logger } from '@/lib/logger';
import { useState, useEffect, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabaseClient } from '@/lib/supabaseClient';
import Card from '@/components/Card';
import Loader from '@/components/Loader';
import { toast } from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRouter } from 'next/router';
import Button from '@/components/Button';

interface Generation {
  id: string;
  topic: string;
  intent: string;
  variant_a: string;
  variant_b: string;
  variant_selected?: 'A' | 'B';
  was_published: boolean;
  created_at: string;
}

interface GenerationsHistoryProps {
  session: Session | null | undefined;
  onCreateFirstPost?: () => void;
}

export default function GenerationsHistory({ session, onCreateFirstPost }: GenerationsHistoryProps) {

  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (session) {
      fetchGenerations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const fetchGenerations = async () => {
    if (!session) return;

    try {
      const { data, error } = await supabaseClient
        .from('generations')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      setGenerations(data || []);
    } catch (error) {
      logger.error('Error fetching generations:', error);
      toast.error('Error al cargar historial');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado al portapapeles');
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleCreateClick = useCallback(() => {
    if (onCreateFirstPost) {
      onCreateFirstPost();
      return;
    }
    router.push('/personalized');
  }, [onCreateFirstPost, router]);

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

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader size={32} />
      </div>
    );
  }

  if (generations.length === 0) {
    return (
      <Card>
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-xl font-bold mb-2">
            No hay generaciones aún
          </h3>
          <p className="text-text/60">
            Tus posts generados aparecerán aquí.
          </p>
          <div className="mt-6 flex justify-center">
            <Button onClick={handleCreateClick} className="min-h-[48px]">
              Crear tu primer post
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold">
          Historial de Generaciones
        </h3>
        <span className="text-sm text-text/60">
          {generations.length} {generations.length === 1 ? 'post' : 'posts'}
        </span>
      </div>

      {generations.map((gen) => (
        <Card key={gen.id}>
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{getIntentEmoji(gen.intent)}</span>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
                    {gen.intent}
                  </span>
                  {gen.was_published && (
                    <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 px-2 py-1 rounded-full font-medium">
                      Publicado
                    </span>
                  )}
                </div>
                <h4 className="font-semibold text-lg mb-1">
                  {gen.topic}
                </h4>
                <p className="text-xs text-text/50">
                  {formatDistanceToNow(new Date(gen.created_at), {
                    addSuffix: true,
                    locale: es,
                  })}
                </p>
              </div>

              <button
                onClick={() => toggleExpand(gen.id)}
                className="text-primary hover:text-primary-dark text-sm font-medium"
              >
                {expandedId === gen.id ? 'Ocultar' : 'Ver variantes'}
              </button>
            </div>

            {/* Expanded Content */}
            {expandedId === gen.id && (
              <div className="grid md:grid-cols-2 gap-4 pt-4 border-t border-border">
                {/* Variant A */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">Variante A</span>
                    {gen.variant_selected === 'A' && (
                      <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 px-2 py-1 rounded">
                        Seleccionada
                      </span>
                    )}
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-sm whitespace-pre-wrap max-h-64 overflow-y-auto">
                    {gen.variant_a}
                  </div>
                  <button
                    onClick={() => handleCopy(gen.variant_a)}
                    className="text-xs text-primary hover:text-primary-dark"
                  >
                    📋 Copiar
                  </button>
                </div>

                {/* Variant B */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">Variante B</span>
                    {gen.variant_selected === 'B' && (
                      <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-100 px-2 py-1 rounded">
                        Seleccionada
                      </span>
                    )}
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-sm whitespace-pre-wrap max-h-64 overflow-y-auto">
                    {gen.variant_b}
                  </div>
                  <button
                    onClick={() => handleCopy(gen.variant_b)}
                    className="text-xs text-primary hover:text-primary-dark"
                  >
                    📋 Copiar
                  </button>
                </div>
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
