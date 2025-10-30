/**
 * Generate Embeddings for Inspiration Posts
 *
 * Uses OpenAI's text-embedding-3-small model to generate vector embeddings
 * for semantic search functionality.
 *
 * Cost: ~$0.02 per 1M tokens (~$0.50 for 100 posts)
 *
 * Run with: npx ts-node scripts/generate_embeddings.ts
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

if (!OPENAI_API_KEY) {
  console.error('❌ Missing OPENAI_API_KEY in .env.local');
  console.error('Add your OpenAI API key to .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
  },
});

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

interface InspirationPost {
  id: string;
  title: string;
  content: string;
  summary: string;
  author: string;
  tags: string[];
}

/**
 * Get posts without embeddings
 */
async function getPostsWithoutEmbeddings(): Promise<InspirationPost[]> {
  const { data, error } = await supabase
    .from('inspiration_posts')
    .select('id, title, content, summary, author, tags')
    .is('embedding', null);

  if (error) {
    console.error('❌ Error fetching posts:', error);
    throw error;
  }

  return data || [];
}

/**
 * Generate embedding for a post
 */
async function generateEmbedding(post: InspirationPost): Promise<number[]> {
  // Combine relevant fields for embedding
  const textToEmbed = [
    post.title,
    post.content,
    post.summary,
    post.author,
    post.tags.join(', '),
  ].join(' | ');

  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: textToEmbed,
      encoding_format: 'float',
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error(`❌ Error generating embedding for post ${post.id}:`, error);
    throw error;
  }
}

/**
 * Update post with embedding
 */
async function updatePostEmbedding(postId: string, embedding: number[]): Promise<void> {
  // Supabase expects embeddings as strings in the format: '[1.0, 2.0, 3.0]'
  const embeddingString = `[${embedding.join(',')}]`;

  const { error } = await supabase
    .from('inspiration_posts')
    .update({ embedding: embeddingString })
    .eq('id', postId);

  if (error) {
    console.error(`❌ Error updating post ${postId}:`, error);
    throw error;
  }
}

/**
 * Process posts in batches
 */
async function processPosts(posts: InspirationPost[], batchDelay: number = 1000) {
  console.log(`\n📝 Procesando ${posts.length} posts...`);
  console.log('━'.repeat(60));

  let processed = 0;
  let errors = 0;
  const startTime = Date.now();

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    const progress = `[${i + 1}/${posts.length}]`;

    try {
      console.log(`\n${progress} 🔄 Procesando: "${post.title}" - ${post.author}`);

      // Generate embedding
      console.log(`   ⚙️  Generando embedding...`);
      const embedding = await generateEmbedding(post);
      console.log(`   ✅ Embedding generado (${embedding.length} dimensiones)`);

      // Update in database
      console.log(`   💾 Guardando en base de datos...`);
      await updatePostEmbedding(post.id, embedding);
      console.log(`   ✅ Guardado exitosamente`);

      processed++;

      // Delay between requests to avoid rate limiting
      if (i < posts.length - 1) {
        const delay = batchDelay;
        console.log(`   ⏳ Esperando ${delay}ms antes del siguiente...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    } catch (error) {
      errors++;
      console.error(`   ❌ Error procesando post:`, error instanceof Error ? error.message : error);
      console.log(`   ⏭️  Continuando con el siguiente...`);
    }
  }

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  console.log('\n━'.repeat(60));
  console.log('\n📊 RESUMEN:');
  console.log(`   ✅ Posts procesados: ${processed}`);
  console.log(`   ❌ Errores: ${errors}`);
  console.log(`   ⏱️  Tiempo total: ${duration}s`);
  console.log(`   ⚡ Promedio: ${(parseFloat(duration) / posts.length).toFixed(2)}s por post`);

  return { processed, errors };
}

/**
 * Verify embeddings
 */
async function verifyEmbeddings() {
  console.log('\n🔍 Verificando embeddings...');

  const { data: withEmbeddings, error: withError } = await supabase
    .from('inspiration_posts')
    .select('id, title, author, embedding')
    .not('embedding', 'is', null)
    .limit(5);

  const { count: totalCount } = await supabase
    .from('inspiration_posts')
    .select('*', { count: 'exact', head: true });

  const { count: withEmbeddingCount } = await supabase
    .from('inspiration_posts')
    .select('*', { count: 'exact', head: true })
    .not('embedding', 'is', null);

  if (withError) {
    console.error('❌ Error verificando:', withError);
    return;
  }

  console.log(`\n📈 Estadísticas:`);
  console.log(`   Total posts: ${totalCount ?? 0}`);
  console.log(`   Con embeddings: ${withEmbeddingCount ?? 0}`);
  console.log(`   Sin embeddings: ${(totalCount ?? 0) - (withEmbeddingCount ?? 0)}`);

  if (withEmbeddings && withEmbeddings.length > 0) {
    console.log(`\n✅ Ejemplos de posts con embeddings:`);
    withEmbeddings.forEach((post, idx) => {
      const embeddingPreview = post.embedding
        ? `${post.embedding.slice(0, 50)}...`
        : 'null';
      console.log(`\n${idx + 1}. "${post.title}" - ${post.author}`);
      console.log(`   Embedding: ${embeddingPreview}`);
    });
  }

  if (withEmbeddingCount === totalCount && (totalCount ?? 0) > 0) {
    console.log('\n✅ ¡Todos los posts tienen embeddings!');
    console.log('\n🎯 Próximo paso:');
    console.log('   Implementar búsqueda semántica en /api/inspiration/search');
  }
}

/**
 * Estimate cost
 */
function estimateCost(posts: InspirationPost[]) {
  // text-embedding-3-small: $0.02 per 1M tokens
  // Rough estimate: ~500 tokens per post
  const tokensPerPost = 500;
  const totalTokens = posts.length * tokensPerPost;
  const costPerMillionTokens = 0.02;
  const estimatedCost = (totalTokens / 1_000_000) * costPerMillionTokens;

  console.log(`\n💰 Estimación de costo:`);
  console.log(`   Posts: ${posts.length}`);
  console.log(`   Tokens estimados: ~${totalTokens.toLocaleString()}`);
  console.log(`   Costo estimado: ~$${estimatedCost.toFixed(4)} USD`);
  console.log(`   Modelo: text-embedding-3-small`);
}

/**
 * Main function
 */
async function main() {
  console.log('\n🚀 Generate Embeddings for Inspiration Posts');
  console.log('━'.repeat(60));

  // Get posts without embeddings
  console.log('\n📂 Buscando posts sin embeddings...');
  const posts = await getPostsWithoutEmbeddings();

  if (posts.length === 0) {
    console.log('\n✅ No hay posts sin embeddings. ¡Todo listo!');
    await verifyEmbeddings();
    return;
  }

  console.log(`✅ Encontrados ${posts.length} posts sin embeddings`);

  // Estimate cost
  estimateCost(posts);

  // Confirm before proceeding
  console.log('\n⚠️  Continuando en 3 segundos... (Ctrl+C para cancelar)');
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Process posts
  const { processed, errors } = await processPosts(posts);

  // Verify results
  await verifyEmbeddings();

  console.log('\n━'.repeat(60));
  if (processed === posts.length && errors === 0) {
    console.log('\n✅ Embeddings generados exitosamente!');
  } else {
    console.log('\n⚠️  Proceso completado con algunos errores');
    console.log('   Ejecuta el script de nuevo para procesar los pendientes');
  }
  console.log('');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  });
