import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function executeMigration() {
  console.log("\n🚀 Ejecutando Sprint 3 Migration...\n");

  const queries = [
    {
      name: "Add preferred_language column",
      sql: `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'es-ES'`,
    },
    {
      name: "Add LinkedIn access token",
      sql: `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS linkedin_access_token TEXT`,
    },
    {
      name: "Add LinkedIn refresh token",
      sql: `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS linkedin_refresh_token TEXT`,
    },
    {
      name: "Add LinkedIn token expiration",
      sql: `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS linkedin_token_expires_at TIMESTAMPTZ`,
    },
    {
      name: "Add notification preferences",
      sql: `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"email_notifications":true,"credit_reminders":true,"weekly_summary":true,"admin_notifications":true}'::jsonb`,
    },
    {
      name: "Add analytics enabled",
      sql: `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS analytics_enabled BOOLEAN DEFAULT true`,
    },
  ];

  for (const query of queries) {
    console.log(`📝 ${query.name}...`);

    try {
      // Execute using Supabase admin API
      const response = await fetch(
        `https://crdtxyfvbosjiddirtzc.supabase.co/rest/v1/rpc/query`,
        {
          method: "POST",
          headers: {
            apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify({ query: query.sql }),
        }
      );

      // Even if the RPC doesn't exist, we'll try direct table manipulation
      console.log(`   ⚠️  RPC method not available, trying alternative...`);
    } catch (error) {
      console.log(`   ⚠️  ${query.name} - continuing...`);
    }
  }

  // Now verify by trying to update a profile with the new columns
  console.log("\n🔍 Verificando migración...\n");

  try {
    // Try to read the columns
    const { data, error } = await supabase
      .from("profiles")
      .select("preferred_language, notification_preferences, analytics_enabled")
      .limit(1);

    if (error) {
      console.log("❌ Error al verificar - las columnas aún no existen");
      console.log("   Error:", error.message);
      console.log("\n⚠️  Por favor ejecuta manualmente el SQL en Supabase Dashboard");
      console.log("   Archivo: SPRINT_3_MIGRATION_INSTRUCTIONS.md\n");
      return false;
    }

    if (data) {
      console.log("✅ ¡Columnas detectadas exitosamente!");
      console.log("\n📋 Columnas verificadas:");
      if (data.length > 0) {
        const cols = Object.keys(data[0]);
        cols.forEach((col) => console.log(`   ✅ ${col}`));
      }
      return true;
    }
  } catch (err: any) {
    console.log("⚠️  No se pudo verificar automáticamente");
  }

  return false;
}

executeMigration().then((success) => {
  if (!success) {
    console.log("\n" + "=".repeat(80));
    console.log("⚠️  ACCIÓN MANUAL REQUERIDA");
    console.log("=".repeat(80));
    console.log("\nEjecuta este SQL en Supabase Dashboard > SQL Editor:\n");
    console.log(`
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'es-ES';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS linkedin_access_token TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS linkedin_refresh_token TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS linkedin_token_expires_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"email_notifications":true,"credit_reminders":true,"weekly_summary":true,"admin_notifications":true}'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS analytics_enabled BOOLEAN DEFAULT true;
UPDATE profiles SET preferred_language = COALESCE(language, 'es-ES') WHERE preferred_language IS NULL;
    `);
    console.log("\n" + "=".repeat(80) + "\n");
  }
  process.exit(success ? 0 : 1);
});
