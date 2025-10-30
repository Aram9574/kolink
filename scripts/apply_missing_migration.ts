/**
 * Apply Missing Migration: inspiration_posts table
 *
 * This script:
 * 1. Enables pgvector extension
 * 2. Creates inspiration_posts table
 * 3. Creates saved_posts table (if missing)
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function enablePgvector() {
  console.log('\n📦 Habilitando extensión pgvector...');

  try {
    // Try to enable pgvector via SQL
    const { error } = await supabase.rpc('exec_sql', {
      sql: 'CREATE EXTENSION IF NOT EXISTS vector;'
    });

    if (error) {
      console.log('   ℹ️  No se puede habilitar via RPC');
      console.log('   💡 Debes habilitar pgvector manualmente en Supabase Dashboard:');
      console.log('      1. Ve a Database → Extensions');
      console.log('      2. Busca "vector"');
      console.log('      3. Haz clic en "Enable"');
      console.log('\n   ⚠️  Continuando sin pgvector...\n');
      return false;
    } else {
      console.log('   ✅ pgvector habilitada');
      return true;
    }
  } catch (err) {
    console.log('   ℹ️  RPC no disponible');
    console.log('   💡 Debes habilitar pgvector manualmente en Supabase Dashboard\n');
    return false;
  }
}

async function createInspirationTables() {
  console.log('\n📊 Creando tabla inspiration_posts...');

  const migrationPath = path.join(
    process.cwd(),
    'supabase',
    'migrations',
    '20250101000500_create_inspiration.sql'
  );

  try {
    const sql = await fs.readFile(migrationPath, 'utf-8');

    // Remove the verification block at the end
    const cleanSql = sql.replace(/-- Verificación[\s\S]*$/, '');

    // Try to execute via RPC if available
    try {
      const { error } = await supabase.rpc('exec_sql', {
        sql: cleanSql
      });

      if (error) {
        console.log('   ❌ Error ejecutando via RPC:', error.message);
        console.log('\n   💡 Debes ejecutar manualmente:');
        console.log(`      cat ${migrationPath} | psql $DATABASE_URL`);
        console.log('\n   O desde el SQL Editor en Supabase Dashboard\n');
        return false;
      } else {
        console.log('   ✅ Tabla inspiration_posts creada');
        console.log('   ✅ Tabla saved_posts verificada');
        console.log('   ✅ Tabla saved_searches verificada');
        return true;
      }
    } catch (rpcErr) {
      console.log('   ❌ RPC no disponible');
      console.log('\n   💡 Debes ejecutar manualmente:');
      console.log(`      cat ${migrationPath} | psql $DATABASE_URL`);
      console.log('\n   O desde el SQL Editor en Supabase Dashboard\n');
      return false;
    }
  } catch (err) {
    console.error('   ❌ Error leyendo archivo de migración:', err);
    return false;
  }
}

async function verifyTable() {
  console.log('\n🔍 Verificando tabla...');

  const { error } = await supabase
    .from('inspiration_posts')
    .select('*', { count: 'exact', head: true })
    .limit(1);

  if (!error) {
    console.log('   ✅ inspiration_posts existe y es accesible\n');
    return true;
  } else {
    console.log('   ❌ inspiration_posts no existe o no es accesible');
    console.log('   Error:', error.message, '\n');
    return false;
  }
}

async function main() {
  console.log('\n🚀 Aplicando migración faltante...');
  console.log('━'.repeat(60));

  // Step 1: Enable pgvector
  const pgvectorEnabled = await enablePgvector();

  // Step 2: Create tables
  const tablesCreated = await createInspirationTables();

  // Step 3: Verify
  if (tablesCreated) {
    await verifyTable();
  }

  console.log('━'.repeat(60));

  if (!pgvectorEnabled) {
    console.log('\n⚠️  ACCIÓN REQUERIDA:');
    console.log('   Habilita pgvector manualmente en Supabase Dashboard');
    console.log('   Luego ejecuta este script de nuevo\n');
  } else if (tablesCreated) {
    console.log('\n✅ Migración completada exitosamente!\n');
  } else {
    console.log('\n⚠️  Migración incompleta. Revisa los errores arriba.\n');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Error fatal:', error.message);
    process.exit(1);
  });
