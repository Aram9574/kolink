import { Client } from "pg";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function runMigration() {
  console.log("\n🚀 Ejecutando Sprint 3 Migration con PostgreSQL directo...\n");

  // Construct PostgreSQL connection string
  const connectionString = process.env.SUPABASE_DB_URL ||
    `postgresql://postgres.crdtxyfvbosjiddirtzc:${process.env.SUPABASE_DB_PASSWORD}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`;

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log("📡 Conectando a Supabase PostgreSQL...");
    await client.connect();
    console.log("✅ Conectado exitosamente\n");

    const migrations = [
      {
        name: "Add preferred_language column",
        sql: `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'es-ES';`,
      },
      {
        name: "Add check constraint for language",
        sql: `DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'profiles_preferred_language_check'
          ) THEN
            ALTER TABLE profiles ADD CONSTRAINT profiles_preferred_language_check
            CHECK (preferred_language IN ('es-ES', 'en-US', 'pt-BR'));
          END IF;
        END $$;`,
      },
      {
        name: "Add LinkedIn OAuth columns",
        sql: `ALTER TABLE profiles
              ADD COLUMN IF NOT EXISTS linkedin_access_token TEXT,
              ADD COLUMN IF NOT EXISTS linkedin_refresh_token TEXT,
              ADD COLUMN IF NOT EXISTS linkedin_token_expires_at TIMESTAMPTZ;`,
      },
      {
        name: "Add notification preferences",
        sql: `ALTER TABLE profiles
              ADD COLUMN IF NOT EXISTS notification_preferences JSONB
              DEFAULT '{"email_notifications":true,"credit_reminders":true,"weekly_summary":true,"admin_notifications":true}'::jsonb;`,
      },
      {
        name: "Add analytics enabled",
        sql: `ALTER TABLE profiles
              ADD COLUMN IF NOT EXISTS analytics_enabled BOOLEAN DEFAULT true;`,
      },
      {
        name: "Migrate existing language data",
        sql: `UPDATE profiles
              SET preferred_language = COALESCE(language, 'es-ES')
              WHERE preferred_language IS NULL;`,
      },
      {
        name: "Create indexes",
        sql: `CREATE INDEX IF NOT EXISTS idx_profiles_preferred_language ON profiles(preferred_language);
              CREATE INDEX IF NOT EXISTS idx_profiles_linkedin_id ON profiles(linkedin_id) WHERE linkedin_id IS NOT NULL;`,
      },
    ];

    for (const migration of migrations) {
      try {
        console.log(`📝 ${migration.name}...`);
        await client.query(migration.sql);
        console.log(`   ✅ Completado`);
      } catch (error: any) {
        if (error.message.includes("already exists") || error.message.includes("duplicate")) {
          console.log(`   ⚠️  Ya existe (OK)`);
        } else {
          console.log(`   ❌ Error: ${error.message}`);
          throw error;
        }
      }
    }

    console.log("\n🔍 Verificando columnas...\n");

    const result = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'profiles'
      AND column_name IN (
        'preferred_language',
        'linkedin_access_token',
        'linkedin_refresh_token',
        'notification_preferences',
        'analytics_enabled'
      )
      ORDER BY column_name;
    `);

    console.log("📋 Columnas creadas:");
    result.rows.forEach((row) => {
      console.log(`   ✅ ${row.column_name} (${row.data_type})`);
    });

    console.log("\n✨ ¡Migración completada exitosamente!\n");

    await client.end();
    return true;
  } catch (error: any) {
    console.error("\n❌ Error durante la migración:", error.message);
    await client.end();
    return false;
  }
}

runMigration().then((success) => {
  process.exit(success ? 0 : 1);
});
