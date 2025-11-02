# Guía Rápida de Implementación

## Setup en 5 Minutos

### Paso 1: Configurar Base de Datos

```bash
# 1. Ir a Supabase Dashboard > SQL Editor
# 2. Copiar y ejecutar: docs/database/personalization_schema.sql
```

### Paso 2: Configurar Variables de Entorno

```bash
# .env.local
OPENAI_API_KEY=sk-proj-xxx...
ADMIN_EMAILS=tu_email@dominio.com
```

### Paso 3: Probar el Sistema

```typescript
// Test básico de ingesta
const testIngest = async () => {
  const response = await fetch('http://localhost:3000/api/user-style/ingest', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      posts: [
        {
          content: 'Hoy aprendí que la IA puede ayudar en diagnósticos médicos. El futuro es ahora.',
          likes: 50,
          comments: 5,
          shares: 2,
          views: 1000,
        },
      ],
    }),
  });

  const result = await response.json();
  console.log('✅ Posts importados:', result);
};

// Test de generación
const testGenerate = async () => {
  const response = await fetch('http://localhost:3000/api/personalized/generate', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId: session.user.id,
      topic: 'El impacto de la IA en la educación',
      intent: 'educativo',
    }),
  });

  const generation = await response.json();
  console.log('✅ Variante A:', generation.variantA);
  console.log('✅ Variante B:', generation.variantB);
};
```

---

## Ejemplo Completo: Componente React

```typescript
// src/components/PersonalizedGenerator.tsx
'use client';

import { useState } from 'react';
import { useSupabaseClient, useSession } from '@supabase/auth-helpers-react';

export default function PersonalizedGenerator() {
  const supabase = useSupabaseClient();
  const session = useSession();

  const [topic, setTopic] = useState('');
  const [intent, setIntent] = useState<string>('educativo');
  const [loading, setLoading] = useState(false);
  const [variantA, setVariantA] = useState('');
  const [variantB, setVariantB] = useState('');

  const handleGenerate = async () => {
    if (!session || !topic) return;

    setLoading(true);

    try {
      const response = await fetch('/api/personalized/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: session.user.id,
          topic,
          intent,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error('Error al generar contenido');
      }

      const data = await response.json();
      setVariantA(data.variantA);
      setVariantB(data.variantB);
    } catch (error) {
      console.error('Error:', error);
      alert('Error al generar contenido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Generador Personalizado</h1>

      {/* Input */}
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-2">
            Tema del Post
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="ej: El futuro de la IA en medicina"
            className="w-full px-4 py-2 border rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Intención
          </label>
          <select
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg"
          >
            <option value="educativo">Educativo</option>
            <option value="inspiracional">Inspiracional</option>
            <option value="personal">Personal/Storytelling</option>
            <option value="thought-leadership">Thought Leadership</option>
            <option value="promocional">Promocional</option>
          </select>
        </div>

        <button
          onClick={handleGenerate}
          disabled={!topic || loading}
          className="w-full bg-primary text-white py-3 rounded-lg font-semibold
                     hover:bg-primary-dark disabled:opacity-50"
        >
          {loading ? 'Generando...' : 'Generar Post Personalizado'}
        </button>
      </div>

      {/* Resultados */}
      {(variantA || variantB) && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Variante A */}
          <div className="border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Variante A</h3>
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                Corta
              </span>
            </div>
            <div className="prose prose-sm max-w-none">
              <p className="whitespace-pre-wrap">{variantA}</p>
            </div>
            <button className="mt-4 w-full bg-blue-500 text-white py-2 rounded-lg">
              Usar Variante A
            </button>
          </div>

          {/* Variante B */}
          <div className="border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Variante B</h3>
              <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                Larga
              </span>
            </div>
            <div className="prose prose-sm max-w-none">
              <p className="whitespace-pre-wrap">{variantB}</p>
            </div>
            <button className="mt-4 w-full bg-purple-500 text-white py-2 rounded-lg">
              Usar Variante B
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## Importar Posts desde CSV

```typescript
// utils/importPosts.ts
import Papa from 'papaparse';

export async function importFromCSV(
  file: File,
  accessToken: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      complete: async (results) => {
        const posts = results.data.map((row: any) => ({
          content: row.content || row.text,
          linkedin_post_id: row.post_id,
          published_at: row.date,
          likes: parseInt(row.likes) || 0,
          comments: parseInt(row.comments) || 0,
          shares: parseInt(row.shares) || 0,
          views: parseInt(row.views) || 0,
        }));

        // Dividir en chunks de 50 posts
        const chunkSize = 50;
        for (let i = 0; i < posts.length; i += chunkSize) {
          const chunk = posts.slice(i, i + chunkSize);

          const response = await fetch('/api/user-style/ingest', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ posts: chunk }),
          });

          if (!response.ok) {
            reject(new Error(`Error en chunk ${i / chunkSize + 1}`));
            return;
          }

          console.log(`Chunk ${i / chunkSize + 1} importado`);
        }

        resolve();
      },
      error: (error) => reject(error),
    });
  });
}

// Uso
const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file || !session) return;

  try {
    await importFromCSV(file, session.access_token);
    alert('Posts importados exitosamente!');
  } catch (error) {
    console.error('Error:', error);
    alert('Error al importar posts');
  }
};
```

---

## Formato CSV para Importación

```csv
content,post_id,date,likes,comments,shares,views
"Hoy aprendí sobre IA en medicina. Increíble potencial.",123456,2025-01-15,150,12,5,3000
"El futuro del trabajo remoto es híbrido.",123457,2025-01-10,200,20,8,5000
```

---

## Script de Seed para Testing

```typescript
// scripts/seedViralPosts.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const viralPosts = [
  {
    content: `La IA no reemplazará tu trabajo.

Una persona usando IA sí lo hará.

Aquí están las 5 herramientas de IA que uso diariamente:

1. ChatGPT - Para escribir y editar contenido
2. Midjourney - Para crear visuales impactantes
3. Claude - Para analizar documentos largos
4. Notion AI - Para organizar mis ideas
5. Grammarly - Para pulir mi escritura

¿Cuál usas tú? 👇`,
    topics: ['IA', 'Productividad', 'Herramientas'],
    intent: 'educativo',
    likes: 5000,
    comments: 300,
    shares: 150,
    views: 100000,
    has_hook: true,
    has_cta: true,
    uses_emojis: true,
    author_industry: 'tech',
    author_follower_range: '50k-100k',
  },
  {
    content: `Hace 5 años me rechazaron de 50 empresas.

Hoy dirijo mi propia startup valuada en $10M.

Esto es lo que aprendí:

No se trata de ser el más inteligente.
Se trata de ser el más persistente.

Cada "no" te acerca a un "sí".

Tu momento llegará. ✨`,
    topics: ['Emprendimiento', 'Motivación', 'Startup'],
    intent: 'inspiracional',
    likes: 8000,
    comments: 500,
    shares: 250,
    views: 150000,
    has_hook: true,
    has_cta: false,
    uses_emojis: true,
    author_industry: 'entrepreneurship',
    author_follower_range: '100k-500k',
  },
];

async function seed() {
  const response = await fetch('http://localhost:3000/api/viral/ingest', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.ADMIN_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ posts: viralPosts }),
  });

  const result = await response.json();
  console.log('Seed completado:', result);
}

seed();
```

---

## Monitoreo y Logs

```typescript
// utils/analytics.ts
export async function trackGeneration(
  userId: string,
  generationId: string,
  topic: string,
  selectedVariant: 'A' | 'B'
) {
  // Actualizar generation con variante seleccionada
  const { error } = await supabase
    .from('generations')
    .update({
      variant_selected: selectedVariant,
    })
    .eq('id', generationId);

  if (error) {
    console.error('Error tracking selection:', error);
  }

  // También puedes enviar a PostHog, Mixpanel, etc.
  if (window.posthog) {
    window.posthog.capture('post_variant_selected', {
      generation_id: generationId,
      topic,
      variant: selectedVariant,
    });
  }
}
```

---

## Testing

```typescript
// __tests__/personalization.test.ts
import { generateEmbedding } from '@/lib/ai/embeddings';
import { generateLinkedInPost } from '@/lib/ai/generation';

describe('Personalization System', () => {
  test('should generate embeddings', async () => {
    const embedding = await generateEmbedding('Test content');
    expect(embedding).toHaveLength(3072);
    expect(embedding[0]).toBeTypeOf('number');
  });

  test('should generate LinkedIn post variants', async () => {
    const result = await generateLinkedInPost(
      'AI in healthcare',
      'educativo',
      [], // Sin ejemplos de usuario para test
      [], // Sin ejemplos virales
      undefined,
      { model: 'gpt-4o', temperature: 0.7 }
    );

    expect(result.variantA).toBeTruthy();
    expect(result.variantB).toBeTruthy();
    expect(result.variantA.length).toBeGreaterThan(100);
  });
});
```

---

## Próximos Pasos

1. **Implementar UI de onboarding** para importar posts
2. **Crear página de generación** con preview de variantes
3. **Agregar tracking de métricas** después de publicar
4. **Implementar análisis de estilo** del usuario
5. **Crear dashboard de analytics** de generaciones

¡El sistema está listo para usarse! 🚀
