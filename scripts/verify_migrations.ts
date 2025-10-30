/**
 * Migration Verification Script
 *
 * Checks which database tables exist to determine which migrations have been applied.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Tables that should exist according to migrations
const EXPECTED_TABLES = {
  '20250101000100_create_profiles': ['profiles'],
  '20250101000200_create_posts': ['posts'],
  '20250101000300_create_usage_stats': ['usage_stats'],
  '20250101000400_create_admin_tables': ['admin_notifications', 'admin_audit_logs'],
  '20250101000500_create_inspiration': ['inspiration_posts', 'saved_searches'],
  '20250101000600_create_calendar': ['scheduled_posts'],
  '20250101000700_create_analytics': ['post_analytics'],
  '20250101000800_create_inbox': ['inbox_messages'],
  '20250101001000_create_views': [], // Views, not tables
};

async function checkTableExists(tableName: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true })
      .limit(1);

    return !error;
  } catch (err) {
    return false;
  }
}

async function checkExtensionExists(extName: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .rpc('exec_sql', {
        sql: `SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = '${extName}');`
      });

    if (error) {
      console.log(`   Checking extension ${extName} via query...`);
      // Try alternate method
      return false;
    }

    return data;
  } catch (err) {
    return false;
  }
}

async function verifyMigrations() {
  console.log('\n🔍 Verificando estado de migraciones...\n');
  console.log('━'.repeat(60));

  // Check extensions first
  console.log('\n📦 EXTENSIONES:');
  const extensions = ['uuid-ossp', 'pgcrypto', 'vector'];

  for (const ext of extensions) {
    const exists = await checkExtensionExists(ext);
    const status = exists ? '✅' : '❌';
    console.log(`   ${status} ${ext}`);
  }

  console.log('\n📊 TABLAS:');

  const results = {
    existing: [] as string[],
    missing: [] as string[],
  };

  // Check all expected tables
  const allTables = Object.values(EXPECTED_TABLES).flat();
  const uniqueTables = [...new Set(allTables)];

  for (const table of uniqueTables) {
    const exists = await checkTableExists(table);
    if (exists) {
      results.existing.push(table);
      console.log(`   ✅ ${table}`);
    } else {
      results.missing.push(table);
      console.log(`   ❌ ${table}`);
    }
  }

  console.log('\n━'.repeat(60));
  console.log('\n📈 RESUMEN:');
  console.log(`   ✅ Tablas existentes: ${results.existing.length}/${uniqueTables.length}`);
  console.log(`   ❌ Tablas faltantes: ${results.missing.length}/${uniqueTables.length}`);

  if (results.missing.length > 0) {
    console.log('\n⚠️  MIGRACIONES PENDIENTES:');

    for (const [migration, tables] of Object.entries(EXPECTED_TABLES)) {
      const missingForMigration = tables.filter(t => results.missing.includes(t));
      if (missingForMigration.length > 0) {
        console.log(`\n   📄 ${migration}`);
        missingForMigration.forEach(t => console.log(`      - ${t}`));
      }
    }

    console.log('\n💡 Para aplicar migraciones pendientes:');
    console.log('   npx supabase db push');
    console.log('   o ejecuta manualmente los archivos .sql faltantes\n');
  } else {
    console.log('\n✅ Todas las migraciones principales están aplicadas!\n');
  }

  // Check for specific columns to verify Sprint 3 migration
  console.log('\n🔍 Verificando columnas de Sprint 3...');

  const { data: profilesData, error: profilesError } = await supabase
    .from('profiles')
    .select('preferred_language')
    .limit(1);

  if (!profilesError && profilesData) {
    console.log('   ✅ preferred_language existe en profiles');
  } else {
    console.log('   ❌ preferred_language NO existe en profiles');
    console.log('   💡 Ejecuta: scripts/apply_sprint3_migration.ts');
  }
}

verifyMigrations()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  });
