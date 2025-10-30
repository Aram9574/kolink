import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config({ path: ".env.local" });

// Parse Supabase URL to get database connection string
function getPostgresConnectionString(): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

  if (!projectRef) {
    throw new Error("Could not extract project ref from Supabase URL");
  }

  // For direct DB access, we need the database password
  // This should be in your .env.local as SUPABASE_DB_PASSWORD
  const dbPassword = process.env.SUPABASE_DB_PASSWORD;

  if (!dbPassword) {
    console.log("\n⚠️  SUPABASE_DB_PASSWORD not found in .env.local");
    console.log("Por favor agrega la contraseña de tu base de datos.");
    console.log("\nPuedes encontrarla en:");
    console.log("Supabase Dashboard → Settings → Database → Connection string");
    throw new Error("Missing SUPABASE_DB_PASSWORD");
  }

  return `postgresql://postgres.${projectRef}:${dbPassword}@aws-0-us-west-1.pooler.supabase.com:6543/postgres`;
}

async function executeMigrationsDirectly() {
  console.log("\n" + "=".repeat(70));
  console.log("🚀 EJECUTANDO MIGRACIONES FALTANTES (Método Directo)");
  console.log("=".repeat(70));

  // Try to get connection string
  let pool: Pool;
  try {
    const connectionString = getPostgresConnectionString();
    pool = new Pool({ connectionString });
  } catch (err: any) {
    console.log("\n❌ No se pudo conectar directamente a la base de datos");
    console.log("\n📋 En su lugar, voy a generar el SQL para que lo ejecutes manualmente.\n");

    // Generate SQL file
    const sql = `
-- ============================================================================
-- MIGRACIONES FALTANTES - Kolink Database
-- Ejecuta este SQL en Supabase Dashboard → SQL Editor
-- ============================================================================

-- 1. Habilitar extensiones (si no están)
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Crear función cleanup_expired_notifications
CREATE OR REPLACE FUNCTION cleanup_expired_notifications()
RETURNS void AS $$
BEGIN
  DELETE FROM admin_notifications
  WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_expired_notifications() IS 'Deletes expired admin notifications';

-- 3. Crear vista user_unread_notifications
CREATE OR REPLACE VIEW user_unread_notifications AS
SELECT
  user_id,
  COUNT(*) as unread_count
FROM admin_notifications
WHERE read = false AND expires_at > now()
GROUP BY user_id;

-- 4. Otorgar permisos
GRANT EXECUTE ON FUNCTION cleanup_expired_notifications() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_notifications() TO service_role;

-- Verificación
SELECT 'Migraciones completadas exitosamente!' AS status;
`;

    const fs = require('fs');
    fs.writeFileSync('scripts/PENDING_MIGRATIONS.sql', sql);

    console.log("✅ SQL generado en: scripts/PENDING_MIGRATIONS.sql");
    console.log("\n📝 PASOS A SEGUIR:");
    console.log("1. Abre Supabase Dashboard: https://app.supabase.com");
    console.log("2. Ve a SQL Editor");
    console.log("3. Copia el contenido de scripts/PENDING_MIGRATIONS.sql");
    console.log("4. Pega y ejecuta (Run)");
    console.log("\nO bien, copia el SQL que está en el portapapeles ahora mismo.\n");

    // Copy to clipboard
    try {
      const { exec } = require('child_process');
      exec(`echo '${sql}' | pbcopy`);
      console.log("✅ SQL copiado al portapapeles! Solo pégalo en Supabase.\n");
    } catch {
      console.log("(No se pudo copiar al portapapeles automáticamente)\n");
    }

    return false;
  }

  // If we got here, we have a database connection
  console.log("\n✅ Conexión a base de datos establecida");

  try {
    // Execute migrations
    console.log("\n⚙️  Ejecutando migraciones...\n");

    // 1. Enable extensions
    await pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');
    console.log("   ✅ pgcrypto habilitada");

    await pool.query('CREATE EXTENSION IF NOT EXISTS vector;');
    console.log("   ✅ vector habilitada");

    // 2. Create cleanup function
    await pool.query(`
      CREATE OR REPLACE FUNCTION cleanup_expired_notifications()
      RETURNS void AS $$
      BEGIN
        DELETE FROM admin_notifications
        WHERE expires_at < now();
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log("   ✅ cleanup_expired_notifications() creada");

    // 3. Create view
    await pool.query(`
      CREATE OR REPLACE VIEW user_unread_notifications AS
      SELECT
        user_id,
        COUNT(*) as unread_count
      FROM admin_notifications
      WHERE read = false AND expires_at > now()
      GROUP BY user_id;
    `);
    console.log("   ✅ user_unread_notifications vista creada");

    // 4. Grant permissions
    await pool.query('GRANT EXECUTE ON FUNCTION cleanup_expired_notifications() TO authenticated;');
    await pool.query('GRANT EXECUTE ON FUNCTION cleanup_expired_notifications() TO service_role;');
    console.log("   ✅ Permisos otorgados");

    console.log("\n🎉 ¡TODAS LAS MIGRACIONES COMPLETADAS!\n");

    await pool.end();
    return true;
  } catch (err: any) {
    console.error("\n❌ Error ejecutando migraciones:", err.message);
    await pool.end();
    return false;
  }
}

executeMigrationsDirectly()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((err) => {
    console.error("\n❌ Error fatal:", err);
    process.exit(1);
  });
