import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkTables() {
  const requiredTables = [
    'profiles',
    'posts',
    'usage_stats',
    'admin_notifications',
    'admin_audit_logs',
    'inspiration_posts',
    'saved_posts',
    'saved_searches',
    'calendar_events',
    'analytics_events',
    'lead_insights',
    'inbox_messages',
    'user_achievements'
  ];

  console.log("\n🔍 Checking database tables...\n");
  console.log("📋 Table status:");

  for (const table of requiredTables) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(1);

    const exists = !error || !error.message.includes('does not exist');
    console.log(`   ${exists ? "✅" : "❌"} ${table}`);
  }
}

checkTables().then(() => process.exit(0));
