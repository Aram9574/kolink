/**
 * Script to check if pgvector extension is enabled on Supabase
 */

import { getSupabaseAdminClient } from '../src/lib/supabaseAdmin';

async function checkVectorExtension() {
  const supabase = getSupabaseAdminClient();

  console.log('🔍 Checking if pgvector extension is enabled...\n');

  // Check if vector extension exists
  const { data: extensions, error: extError } = await supabase
    .rpc('check_vector_extension')
    .select('*');

  if (extError) {
    console.log('ℹ️  Cannot check via RPC, trying direct query...');

    // Try to query inspiration_posts to see if embedding column exists
    const { data: posts, error: postsError } = await supabase
      .from('inspiration_posts')
      .select('id, embedding')
      .limit(1);

    if (postsError) {
      console.error('❌ Error querying inspiration_posts:', postsError.message);
      console.log('\n⚠️  pgvector extension is likely NOT enabled.');
    } else {
      console.log('✅ Table inspiration_posts exists');
      console.log('✅ Embedding column is accessible');

      if (posts && posts.length > 0) {
        console.log(`\nFound ${posts.length} post(s)`);
        console.log('Embedding value:', posts[0].embedding ? 'EXISTS' : 'NULL');
      }
    }
  } else {
    console.log('✅ pgvector extension is enabled!');
    console.log('Extensions:', extensions);
  }

  console.log('\n📋 Next steps:');
  console.log('1. Enable pgvector extension in Supabase Dashboard');
  console.log('2. Go to: https://app.supabase.com/project/crdtxyfvbosjiddirtzc/database/extensions');
  console.log('3. Search for "vector" and enable it');
  console.log('4. Run: supabase db push');
}

checkVectorExtension();
