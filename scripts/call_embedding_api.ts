/**
 * Helper script to call the embedding generation API
 *
 * Make sure dev server is running: npm run dev
 * Then run: npx ts-node scripts/call_embedding_api.ts
 */

const ADMIN_KEY = 'dev-admin-key-change-in-production';
const API_URL = 'http://localhost:3000/api/admin/generate-embeddings';

async function main() {
  console.log('\n🚀 Calling Embedding Generation API...');
  console.log('━'.repeat(60));
  console.log(`\n📡 URL: ${API_URL}`);
  console.log(`🔑 Admin Key: ${ADMIN_KEY}\n`);

  console.log('⏳ Sending request...\n');

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ adminKey: ADMIN_KEY }),
    });

    const data = await response.json();

    console.log('━'.repeat(60));

    if (!response.ok) {
      console.error('\n❌ Error Response:');
      console.error(`   Status: ${response.status}`);
      console.error(`   Message: ${data.error || data.message}`);
      if (data.details) {
        console.error(`   Details:`, JSON.stringify(data.details, null, 2));
      }
      process.exit(1);
    }

    console.log('\n✅ Success!\n');
    console.log('📊 Results:');
    console.log(`   Total posts: ${data.total}`);
    console.log(`   ✅ Processed: ${data.processed}`);
    console.log(`   ❌ Errors: ${data.errors}`);

    if (data.results && data.results.length > 0) {
      console.log('\n📝 Details:');

      const successful = data.results.filter((r: any) => r.status === 'success');
      const failed = data.results.filter((r: any) => r.status === 'error');

      if (successful.length > 0) {
        console.log(`\n✅ Successfully processed (${successful.length}):`);
        successful.slice(0, 5).forEach((r: any) => {
          console.log(`   - "${r.title}"`);
        });
        if (successful.length > 5) {
          console.log(`   ... and ${successful.length - 5} more`);
        }
      }

      if (failed.length > 0) {
        console.log(`\n❌ Failed (${failed.length}):`);
        failed.forEach((r: any) => {
          console.log(`   - "${r.title}"`);
          console.log(`     Error: ${r.error}`);
        });
      }
    }

    console.log('\n━'.repeat(60));
    console.log('\n✅ Embedding generation completed!');
    console.log('\n🎯 Next step:');
    console.log('   Test search: curl http://localhost:3000/api/inspiration/search?q=leadership\n');
  } catch (error) {
    console.error('\n❌ Fatal error:');
    console.error(error instanceof Error ? error.message : error);
    console.log('\n💡 Troubleshooting:');
    console.log('   1. Is dev server running? (npm run dev)');
    console.log('   2. Did you create the SQL function in Supabase?');
    console.log('   3. Is OPENAI_API_KEY in .env.local?\n');
    process.exit(1);
  }
}

main();
