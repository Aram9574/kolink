/**
 * Seed Inspiration Posts
 *
 * Inserts curated inspiration posts into the database.
 * Run with: npx ts-node scripts/seed_inspiration_posts.ts
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface InspirationPost {
  platform: string;
  author: string;
  title: string;
  content: string;
  summary: string;
  metrics: Record<string, number>;
  tags: string[];
  source_url: string;
}

async function loadPostsFromFile(): Promise<InspirationPost[]> {
  const filePath = path.join(process.cwd(), 'data', 'inspiration_posts.json');

  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const posts = JSON.parse(fileContent) as InspirationPost[];
    return posts;
  } catch (error) {
    console.error('❌ Error loading posts file:', error);
    throw error;
  }
}

async function checkExistingPosts(): Promise<number> {
  const { count, error } = await supabase
    .from('inspiration_posts')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('❌ Error checking existing posts:', error);
    return 0;
  }

  return count || 0;
}

async function insertPosts(posts: InspirationPost[], batchSize: number = 10) {
  console.log(`\n📝 Insertando ${posts.length} posts en lotes de ${batchSize}...`);

  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < posts.length; i += batchSize) {
    const batch = posts.slice(i, i + batchSize);

    // Transform posts for insertion (embedding will be null initially)
    const postsToInsert = batch.map(post => ({
      platform: post.platform,
      author: post.author,
      title: post.title,
      content: post.content,
      summary: post.summary,
      metrics: post.metrics,
      tags: post.tags,
      source_url: post.source_url,
      embedding: null, // Will be generated in next script
      captured_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from('inspiration_posts')
      .insert(postsToInsert)
      .select('id, author, title');

    if (error) {
      console.error(`   ❌ Error en lote ${i / batchSize + 1}:`, error.message);
      errors += batch.length;
    } else {
      inserted += data?.length || 0;
      console.log(`   ✅ Lote ${i / batchSize + 1}: ${data?.length} posts insertados`);

      // Show first post of each batch as sample
      if (data && data[0]) {
        console.log(`      └─ Ejemplo: "${data[0].title}" por ${data[0].author}`);
      }
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return { inserted, errors };
}

async function verifyInsertion(): Promise<void> {
  console.log('\n🔍 Verificando inserción...');

  const { data: sample, error } = await supabase
    .from('inspiration_posts')
    .select('id, author, title, tags, metrics')
    .limit(5);

  if (error) {
    console.error('❌ Error verificando:', error);
    return;
  }

  if (sample && sample.length > 0) {
    console.log('\n✅ Ejemplos de posts insertados:');
    sample.forEach((post, idx) => {
      console.log(`\n${idx + 1}. "${post.title}"`);
      console.log(`   Autor: ${post.author}`);
      console.log(`   Tags: ${post.tags.join(', ')}`);
      console.log(`   Viral Score: ${post.metrics.viralScore || 'N/A'}`);
    });
  }

  // Get stats by platform and author
  const { data: stats } = await supabase
    .from('inspiration_posts')
    .select('platform, author');

  if (stats) {
    const platformCounts = stats.reduce((acc, post) => {
      acc[post.platform] = (acc[post.platform] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const authorCounts = stats.reduce((acc, post) => {
      acc[post.author] = (acc[post.author] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('\n📊 Estadísticas:');
    console.log('\nPor plataforma:');
    Object.entries(platformCounts).forEach(([platform, count]) => {
      console.log(`   ${platform}: ${count} posts`);
    });

    console.log('\nTop autores:');
    Object.entries(authorCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .forEach(([author, count]) => {
        console.log(`   ${author}: ${count} post${count > 1 ? 's' : ''}`);
      });
  }
}

async function main() {
  console.log('\n🚀 Seed Inspiration Posts');
  console.log('━'.repeat(60));

  // Check if posts already exist
  const existingCount = await checkExistingPosts();

  if (existingCount > 0) {
    console.log(`\n⚠️  Ya existen ${existingCount} posts en la base de datos.`);
    console.log('\n¿Deseas continuar de todas formas? (duplicará los posts)');
    console.log('Para limpiar la tabla primero, ejecuta:');
    console.log('   DELETE FROM inspiration_posts;');
    console.log('\nContinuando en 3 segundos... (Ctrl+C para cancelar)');

    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  // Load posts from file
  console.log('\n📂 Cargando posts desde archivo...');
  const posts = await loadPostsFromFile();
  console.log(`✅ ${posts.length} posts cargados desde JSON`);

  // Insert posts
  const { inserted, errors } = await insertPosts(posts);

  console.log('\n━'.repeat(60));
  console.log('\n📈 RESUMEN:');
  console.log(`   ✅ Posts insertados: ${inserted}`);
  console.log(`   ❌ Errores: ${errors}`);
  console.log(`   📊 Total en DB: ${existingCount + inserted}`);

  // Verify
  await verifyInsertion();

  console.log('\n━'.repeat(60));
  console.log('\n✅ Seed completado exitosamente!');
  console.log('\n📝 Próximo paso:');
  console.log('   Generar embeddings: npx ts-node scripts/generate_embeddings.ts');
  console.log('');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  });
