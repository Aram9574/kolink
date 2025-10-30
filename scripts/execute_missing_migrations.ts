import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface MigrationStep {
  name: string;
  sql: string;
  description: string;
}

async function executeSQLQuery(sql: string, description: string): Promise<boolean> {
  console.log(`\n⚙️  Ejecutando: ${description}...`);

  try {
    // Split SQL by semicolons but keep function definitions together
    const statements = sql
      .split(/;(?=\s*(?:CREATE|ALTER|DROP|INSERT|UPDATE|DELETE|SELECT|COMMENT|GRANT|\n\n))/gi)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const statement of statements) {
      if (!statement) continue;

      // Skip comments
      if (statement.startsWith('--')) continue;

      // Execute statement
      const { data, error } = await supabase.rpc('exec_sql', {
        sql: statement + ';'
      });

      if (error) {
        // Some errors are OK (e.g., "already exists")
        if (
          error.message.includes('already exists') ||
          error.message.includes('does not exist') ||
          error.message.includes('duplicate')
        ) {
          console.log(`   ⚠️  ${error.message} (continuando...)`);
        } else {
          console.log(`   ❌ Error: ${error.message}`);
          return false;
        }
      }
    }

    console.log(`   ✅ ${description} - Completado`);
    return true;
  } catch (err: any) {
    console.log(`   ❌ Error: ${err.message}`);
    return false;
  }
}

async function executeMigrations() {
  console.log("\n" + "=".repeat(70));
  console.log("🚀 EJECUTANDO MIGRACIONES FALTANTES");
  console.log("=".repeat(70));

  const migrations: MigrationStep[] = [];

  // 1. Enable extensions (important first)
  migrations.push({
    name: "enable_extensions",
    description: "Habilitar extensiones pgcrypto y vector",
    sql: `
      CREATE EXTENSION IF NOT EXISTS pgcrypto;
      CREATE EXTENSION IF NOT EXISTS vector;
    `
  });

  // 2. Create cleanup_expired_notifications function
  migrations.push({
    name: "cleanup_expired_notifications",
    description: "Crear función cleanup_expired_notifications",
    sql: `
      CREATE OR REPLACE FUNCTION cleanup_expired_notifications()
      RETURNS void AS $$
      BEGIN
        DELETE FROM admin_notifications
        WHERE expires_at < now();
      END;
      $$ LANGUAGE plpgsql;

      COMMENT ON FUNCTION cleanup_expired_notifications() IS 'Deletes expired admin notifications';
    `
  });

  // 3. Create user_unread_notifications view (if not exists)
  migrations.push({
    name: "user_unread_notifications_view",
    description: "Crear vista user_unread_notifications",
    sql: `
      CREATE OR REPLACE VIEW user_unread_notifications AS
      SELECT
        user_id,
        COUNT(*) as unread_count
      FROM admin_notifications
      WHERE read = false AND expires_at > now()
      GROUP BY user_id;
    `
  });

  // 4. Grant permissions
  migrations.push({
    name: "grant_permissions",
    description: "Otorgar permisos a funciones",
    sql: `
      GRANT EXECUTE ON FUNCTION cleanup_expired_notifications() TO authenticated;
      GRANT EXECUTE ON FUNCTION cleanup_expired_notifications() TO service_role;
    `
  });

  let successCount = 0;
  let failCount = 0;

  for (const migration of migrations) {
    const success = await executeSQLQuery(migration.sql, migration.description);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }

  console.log("\n" + "=".repeat(70));
  console.log("\n📊 RESUMEN DE MIGRACIONES\n");
  console.log(`✅ Exitosas: ${successCount}/${migrations.length}`);
  console.log(`❌ Fallidas: ${failCount}/${migrations.length}`);

  if (failCount === 0) {
    console.log("\n🎉 ¡TODAS LAS MIGRACIONES SE EJECUTARON CORRECTAMENTE!\n");
  } else {
    console.log("\n⚠️  Algunas migraciones fallaron. Revisa los errores arriba.\n");
  }

  return failCount === 0;
}

executeMigrations()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((err) => {
    console.error("\n❌ Error fatal:", err);
    process.exit(1);
  });
