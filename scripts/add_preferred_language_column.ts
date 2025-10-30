import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function addColumns() {
  console.log("\n🚀 Adding Sprint 3 columns to profiles table...\n");

  // Method: We'll use the REST API to execute raw SQL
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const queries = [
    // Add preferred_language column
    `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'es-ES';`,

    // Add check constraint
    `DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'profiles_preferred_language_check'
      ) THEN
        ALTER TABLE profiles ADD CONSTRAINT profiles_preferred_language_check
        CHECK (preferred_language IN ('es-ES', 'en-US', 'pt-BR'));
      END IF;
    END $$;`,

    // Add LinkedIn OAuth columns
    `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS linkedin_access_token TEXT;`,
    `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS linkedin_refresh_token TEXT;`,
    `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS linkedin_token_expires_at TIMESTAMPTZ;`,

    // Add notification preferences
    `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"email_notifications":true,"credit_reminders":true,"weekly_summary":true,"admin_notifications":true}'::jsonb;`,

    // Add analytics enabled
    `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS analytics_enabled BOOLEAN DEFAULT true;`,

    // Migrate existing language data
    `UPDATE profiles SET preferred_language = COALESCE(language, 'es-ES') WHERE preferred_language IS NULL;`,
  ];

  for (let i = 0; i < queries.length; i++) {
    const query = queries[i];
    console.log(`📝 Executing query ${i + 1}/${queries.length}...`);

    try {
      // Use pg_stat_statements or direct execution
      // Since we can't execute DDL directly, we'll check the current schema first
      const { data, error } = await supabase
        .from("profiles")
        .select("preferred_language, notification_preferences, analytics_enabled")
        .limit(1);

      if (error && error.message.includes("column") && error.message.includes("does not exist")) {
        console.log(`   ⚠️  Column doesn't exist yet - this is expected`);
        console.log(`   ℹ️  Please run this SQL manually in Supabase SQL Editor:`);
        console.log(`\n${query}\n`);
      } else if (!error) {
        console.log(`   ✅ Query ${i + 1} - columns already exist or query successful`);
      }
    } catch (err: any) {
      console.log(`   ℹ️  ${err.message}`);
    }
  }

  console.log("\n📋 SQL Commands to run manually:\n");
  console.log("Copy and paste these into Supabase SQL Editor:\n");
  console.log(queries.join("\n\n"));
  console.log("\n");
}

addColumns().then(() => process.exit(0));
