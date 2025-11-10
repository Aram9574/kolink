/**
 * Componente: PersonalizedGenerator
 *
 * Generador de posts personalizados usando RAG.
 * Genera variantes A/B optimizadas con el estilo del usuario.
 */

'use client';

import { logger } from '@/lib/logger';
import { useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabaseClient } from '@/lib/supabaseClient';
import Button from '@/components/Button';
import Card from '@/components/Card';
import Loader from '@/components/Loader';
import { toast } from 'react-hot-toast';
import type { ContentIntent } from '@/types/personalization';

interface PersonalizedGeneratorProps {
  session: Session | null | undefined;
  onGenerated?: (generationId: string, variantA: string, variantB: string) => void;
}

export default function PersonalizedGenerator({ session, onGenerated }: PersonalizedGeneratorProps) {

  const [topic, setTopic] = useState('');
  const [intent, setIntent] = useState<ContentIntent>('educativo');
  const [additionalContext, setAdditionalContext] = useState('');
  const [generating, setGenerating] = useState(false);
  const [variantA, setVariantA] = useState('');
  const [variantB, setVariantB] = useState('');
  const [showResults, setShowResults] = useState(false);

  const intents: { value: ContentIntent; label: string; emoji: string }[] = [
    { value: 'educativo', label: 'Educativo', emoji: '📚' },
    { value: 'inspiracional', label: 'Inspiracional', emoji: '✨' },
    { value: 'personal', label: 'Personal/Historia', emoji: '💭' },
    { value: 'thought-leadership', label: 'Thought Leadership', emoji: '💡' },
    { value: 'promocional', label: 'Promocional', emoji: '🚀' },
  ];

  const handleGenerate = async () => {
    if (!session) {
      toast.error('Debes iniciar sesión');
      return;
    }

    if (!topic.trim()) {
      toast.error('Por favor, ingresa un tema');
      return;
    }

    setGenerating(true);
    setShowResults(false);

    try {
      // Get access token
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        throw new Error('Sesión inválida. Por favor, inicia sesión de nuevo.');
      }

      const response = await fetch('/api/personalized/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: session.user.id,
          topic: topic.trim(),
          intent,
          additional_context: additionalContext.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al generar contenido');
      }

      const result = await response.json();

      setVariantA(result.variantA);
      setVariantB(result.variantB);
      setShowResults(true);

      toast.success('✅ Post generado exitosamente!');

      if (onGenerated) {
        onGenerated(result.generation_id, result.variantA, result.variantB);
      }

    } catch (error) {
      logger.error('Error generating content:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error al generar contenido';
      toast.error(errorMessage);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = (text: string, variant: 'A' | 'B') => {
    navigator.clipboard.writeText(text);
    toast.success(`Variante ${variant} copiada al portapapeles`);
  };

  const handleReset = () => {
    setShowResults(false);
    setVariantA('');
    setVariantB('');
    setTopic('');
    setAdditionalContext('');
  };

  return (
    <div className="space-y-6">
      {!showResults ? (
        <>
          {/* Input Form */}
          <Card>
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold mb-2">
                  Genera tu Post Personalizado
                </h3>
                <p className="text-text/60">
                  Describe el tema de tu post y nuestro sistema generará 2 versiones
                  adaptadas a tu estilo único.
                </p>
              </div>

              {/* Topic Input */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Tema del Post *
                </label>
                <textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Ej: Cómo la inteligencia artificial está transformando la medicina moderna"
                  rows={3}
                  className="w-full px-4 py-3 border border-border rounded-lg
                           focus:ring-2 focus:ring-primary focus:border-transparent
                           resize-none bg-background text-text"
                  disabled={generating}
                />
                <div className="text-xs text-text/50 mt-1">
                  {topic.length}/500 caracteres
                </div>
              </div>

              {/* Intent Selector */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Tipo de Contenido *
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {intents.map((int) => (
                    <button
                      key={int.value}
                      onClick={() => setIntent(int.value)}
                      disabled={generating}
                      className={`
                        px-4 py-3 rounded-lg border-2 transition-all
                        ${intent === int.value
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:border-primary/50'
                        }
                        disabled:opacity-50 disabled:cursor-not-allowed
                      `}
                    >
                      <div className="text-2xl mb-1">{int.emoji}</div>
                      <div className="text-sm font-medium">{int.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Additional Context (Optional) */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Contexto Adicional (Opcional)
                </label>
                <textarea
                  value={additionalContext}
                  onChange={(e) => setAdditionalContext(e.target.value)}
                  placeholder="Ej: Enfocado en diagnóstico temprano de cáncer, incluir casos de éxito..."
                  rows={2}
                  className="w-full px-4 py-3 border border-border rounded-lg
                           focus:ring-2 focus:ring-primary focus:border-transparent
                           resize-none bg-background text-text"
                  disabled={generating}
                />
              </div>

              {/* Generate Button */}
              <Button
                onClick={handleGenerate}
                variant="primary"
                disabled={generating || !topic.trim()}
                className="w-full py-4 text-lg"
              >
                {generating ? (
                  <>
                    <Loader className="mr-2" />
                    Generando tu post personalizado...
                  </>
                ) : (
                  '✨ Generar Post Personalizado'
                )}
              </Button>

              {generating && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Procesando...</strong> Estamos analizando tu estilo, buscando posts similares
                    y generando contenido optimizado. Esto puede tomar 5-15 segundos.
                  </p>
                </div>
              )}
            </div>
          </Card>
        </>
      ) : (
        <>
          {/* Results - Variants A & B */}
          <div className="mb-4">
            <Button
              onClick={handleReset}
              variant="secondary"
            >
              ← Generar Nuevo Post
            </Button>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Variant A */}
            <Card>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold">Variante A</h3>
                    <p className="text-sm text-text/60">Versión Corta (150-300 palabras)</p>
                  </div>
                  <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 px-3 py-1 rounded-full text-sm font-medium">
                    Corta
                  </span>
                </div>

                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 whitespace-pre-wrap">
                    {variantA}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => handleCopy(variantA, 'A')}
                    variant="primary"
                    className="flex-1"
                  >
                    📋 Copiar Variante A
                  </Button>
                </div>
              </div>
            </Card>

            {/* Variant B */}
            <Card>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold">Variante B</h3>
                    <p className="text-sm text-text/60">Versión Larga (300-600 palabras)</p>
                  </div>
                  <span className="bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-100 px-3 py-1 rounded-full text-sm font-medium">
                    Larga
                  </span>
                </div>

                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 whitespace-pre-wrap">
                    {variantB}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => handleCopy(variantB, 'B')}
                    variant="primary"
                    className="flex-1"
                  >
                    📋 Copiar Variante B
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Info */}
          <Card>
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2">
                ✅ Posts generados exitosamente
              </h4>
              <p className="text-sm text-green-800 dark:text-green-200">
                Hemos generado 2 versiones basadas en tu estilo y posts virales similares.
                Elige la que más te guste, edítala si es necesario, y publícala en LinkedIn.
              </p>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
