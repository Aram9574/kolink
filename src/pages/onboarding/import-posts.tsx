/**
 * Página de Onboarding - Importación de Posts
 *
 * Permite al usuario importar sus posts históricos de LinkedIn
 * para que el sistema aprenda su estilo de escritura.
 */

import { useState } from 'react';
import { useRouter } from 'next/router';
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import Navbar from '@/components/Navbar';
import Button from '@/components/Button';
import Card from '@/components/Card';
import Loader from '@/components/Loader';
import { toast } from 'react-hot-toast';

interface PostInput {
  content: string;
  likes?: number;
  comments?: number;
  shares?: number;
  views?: number;
}

export default function ImportPostsPage() {
  const router = useRouter();
  const session = useSession();
  const supabase = useSupabaseClient();

  const [mode, setMode] = useState<'manual' | 'csv'>('manual');
  const [manualPosts, setManualPosts] = useState<string[]>(['', '', '']);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  // Redirigir si no está autenticado
  if (!session) {
    router.push('/signin');
    return null;
  }

  const handleManualImport = async () => {
    // Filtrar posts vacíos
    const validPosts = manualPosts.filter(p => p.trim().length > 0);

    if (validPosts.length === 0) {
      toast.error('Por favor, ingresa al menos un post');
      return;
    }

    setImporting(true);
    setImportProgress(0);

    try {
      const posts: PostInput[] = validPosts.map(content => ({
        content: content.trim(),
        likes: 0,
        comments: 0,
        shares: 0,
        views: 0,
      }));

      setImportProgress(30);

      const response = await fetch('/api/user-style/ingest', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ posts }),
      });

      setImportProgress(60);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al importar posts');
      }

      const result = await response.json();
      setImportProgress(100);

      toast.success(`✅ ${result.posts_created} posts importados exitosamente!`);

      // Esperar un momento para mostrar el progreso completo
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);

    } catch (error: any) {
      console.error('Error importing posts:', error);
      toast.error(error.message || 'Error al importar posts');
      setImportProgress(0);
    } finally {
      setImporting(false);
    }
  };

  const addMoreFields = () => {
    setManualPosts([...manualPosts, '']);
  };

  const removeField = (index: number) => {
    if (manualPosts.length > 1) {
      setManualPosts(manualPosts.filter((_, i) => i !== index));
    }
  };

  const updatePost = (index: number, value: string) => {
    const updated = [...manualPosts];
    updated[index] = value;
    setManualPosts(updated);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-text mb-4">
            Importa tus Posts de LinkedIn
          </h1>
          <p className="text-lg text-text/70 max-w-2xl mx-auto">
            Para generar contenido personalizado, necesitamos aprender tu estilo.
            Importa algunos de tus posts anteriores de LinkedIn.
          </p>
        </div>

        {/* Mode Selector */}
        <div className="flex gap-4 mb-8 justify-center">
          <Button
            onClick={() => setMode('manual')}
            variant={mode === 'manual' ? 'primary' : 'secondary'}
          >
            Pegar Posts Manualmente
          </Button>
          <Button
            onClick={() => setMode('csv')}
            variant={mode === 'csv' ? 'primary' : 'secondary'}
          >
            Subir CSV (Próximamente)
          </Button>
        </div>

        {/* Manual Input Mode */}
        {mode === 'manual' && (
          <Card>
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-2">
                  Ingresa tus posts
                </h3>
                <p className="text-sm text-text/60 mb-4">
                  Copia y pega al menos 3-5 posts tuyos de LinkedIn.
                  Cuantos más posts proporciones, mejor aprenderemos tu estilo.
                </p>
              </div>

              {/* Post inputs */}
              <div className="space-y-4">
                {manualPosts.map((post, index) => (
                  <div key={index} className="relative">
                    <label className="block text-sm font-medium mb-2">
                      Post {index + 1}
                      {manualPosts.length > 1 && (
                        <button
                          onClick={() => removeField(index)}
                          className="ml-2 text-red-500 hover:text-red-700 text-xs"
                        >
                          (Eliminar)
                        </button>
                      )}
                    </label>
                    <textarea
                      value={post}
                      onChange={(e) => updatePost(index, e.target.value)}
                      placeholder={`Pega aquí tu post de LinkedIn ${index + 1}...`}
                      rows={6}
                      className="w-full px-4 py-3 border border-border rounded-lg
                                 focus:ring-2 focus:ring-primary focus:border-transparent
                                 resize-none bg-background text-text"
                      disabled={importing}
                    />
                    <div className="text-xs text-text/50 mt-1">
                      {post.trim().split(/\s+/).length} palabras
                    </div>
                  </div>
                ))}
              </div>

              {/* Add More Button */}
              <Button
                onClick={addMoreFields}
                variant="secondary"
                disabled={importing}
                className="w-full"
              >
                + Agregar otro post
              </Button>

              {/* Progress Bar */}
              {importing && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Importando posts...</span>
                    <span>{importProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${importProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Import Button */}
              <div className="flex gap-4">
                <Button
                  onClick={handleManualImport}
                  variant="primary"
                  disabled={importing}
                  className="flex-1"
                >
                  {importing ? (
                    <>
                      <Loader className="mr-2" />
                      Importando...
                    </>
                  ) : (
                    <>
                      Importar {manualPosts.filter(p => p.trim()).length} Posts
                    </>
                  )}
                </Button>

                <Button
                  onClick={() => router.push('/dashboard')}
                  variant="secondary"
                  disabled={importing}
                >
                  Saltar por ahora
                </Button>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  💡 Consejos para mejores resultados
                </h4>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li>• Importa posts de diferentes temas y formatos</li>
                  <li>• Incluye posts con buen engagement si es posible</li>
                  <li>• Mínimo 3 posts, ideal 10-20 posts</li>
                  <li>• El sistema aprenderá tu tono, estructura y estilo</li>
                </ul>
              </div>
            </div>
          </Card>
        )}

        {/* CSV Mode (Coming Soon) */}
        {mode === 'csv' && (
          <Card>
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-2xl font-bold mb-2">
                Importación CSV
              </h3>
              <p className="text-text/60 mb-6">
                Esta funcionalidad estará disponible próximamente.
                Podrás subir un archivo CSV con todos tus posts.
              </p>
              <Button
                onClick={() => setMode('manual')}
                variant="primary"
              >
                Usar Importación Manual
              </Button>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}
