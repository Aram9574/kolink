import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkFunctions() {
  const query = `
    SELECT routine_name
    FROM information_schema.routines
    WHERE routine_schema = 'public'
    AND routine_name IN (
      'encrypt_token',
      'decrypt_token',
      'upsert_usage_stats',
      'search_inspiration_posts',
      'cleanup_expired_notifications',
      'log_admin_action',
      'is_admin',
      'calculate_level',
      'grant_xp',
      'update_streak'
    )
    ORDER BY routine_name;
  `;

  console.log("\n🔍 Checking database functions...\n");
  console.log("📋 Function status:");

  const { data, error } = await supabase.rpc('exec_sql', { sql: query });

  if (error) {
    // Try direct query
    const { data: pgData, error: pgError } = await supabase
      .from('pg_proc')
      .select('proname');

    console.log("⚠️  Cannot check functions directly. Using alternative method...");

    const requiredFunctions = [
      'encrypt_token',
      'decrypt_token',
      'upsert_usage_stats',
      'search_inspiration_posts',
      'cleanup_expired_notifications',
      'log_admin_action',
      'is_admin',
      'calculate_level',
      'grant_xp',
      'update_streak'
    ];

    requiredFunctions.forEach(func => {
      console.log(`   ❓ ${func} (cannot verify)`);
    });
  } else {
    console.log(data);
  }
}

checkFunctions().then(() => process.exit(0));
