import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface VerificationResult {
  extensions: { name: string; exists: boolean }[];
  tables: { name: string; exists: boolean }[];
  functions: { name: string; exists: boolean }[];
  missing: {
    extensions: string[];
    tables: string[];
    functions: string[];
  };
}

async function verifyDatabase(): Promise<VerificationResult> {
  const result: VerificationResult = {
    extensions: [],
    tables: [],
    functions: [],
    missing: {
      extensions: [],
      tables: [],
      functions: []
    }
  };

  console.log("\n🔍 VERIFICACIÓN COMPLETA DE BASE DE DATOS\n");
  console.log("=".repeat(60));

  // 1. Check extensions
  console.log("\n📦 Verificando extensiones...\n");
  const requiredExtensions = ['pgcrypto', 'vector'];

  for (const ext of requiredExtensions) {
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = '${ext}') as exists;`
    }).single();

    // Alternative method if exec_sql doesn't exist
    let exists = false;
    try {
      const { data: extData } = await supabase
        .from('pg_extension')
        .select('extname')
        .eq('extname', ext)
        .single();
      exists = !!extData;
    } catch {
      // Try direct query
      exists = false;
    }

    result.extensions.push({ name: ext, exists });
    console.log(`   ${exists ? "✅" : "❌"} ${ext}`);
    if (!exists) result.missing.extensions.push(ext);
  }

  // 2. Check tables
  console.log("\n📊 Verificando tablas...\n");
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

  for (const table of requiredTables) {
    const { error } = await supabase
      .from(table)
      .select('*')
      .limit(1);

    const exists = !error || !error.message.includes('does not exist');
    result.tables.push({ name: table, exists });
    console.log(`   ${exists ? "✅" : "❌"} ${table}`);
    if (!exists) result.missing.tables.push(table);
  }

  // 3. Check functions
  console.log("\n⚙️  Verificando funciones...\n");
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

  for (const func of requiredFunctions) {
    try {
      // Try to call the function to see if it exists
      let exists = false;

      if (func === 'encrypt_token' || func === 'decrypt_token') {
        const { error } = await supabase.rpc(func, {
          token: 'test',
          encryption_key: 'test'
        });
        exists = !error || !error.message.includes('does not exist');
      } else if (func === 'is_admin') {
        const { error } = await supabase.rpc(func, {
          user_id: '00000000-0000-0000-0000-000000000000'
        });
        exists = !error || !error.message.includes('does not exist');
      } else {
        // For other functions, we'll assume they exist if no error
        const { error } = await supabase.rpc(func as any);
        exists = !error || !error.message.includes('does not exist');
      }

      result.functions.push({ name: func, exists });
      console.log(`   ${exists ? "✅" : "❌"} ${func}()`);
      if (!exists) result.missing.functions.push(func);
    } catch (err) {
      result.functions.push({ name: func, exists: false });
      console.log(`   ❌ ${func}()`);
      result.missing.functions.push(func);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("\n📋 RESUMEN\n");

  const totalExtensions = requiredExtensions.length;
  const totalTables = requiredTables.length;
  const totalFunctions = requiredFunctions.length;

  const existingExtensions = result.extensions.filter(e => e.exists).length;
  const existingTables = result.tables.filter(t => t.exists).length;
  const existingFunctions = result.functions.filter(f => f.exists).length;

  console.log(`✅ Extensiones: ${existingExtensions}/${totalExtensions}`);
  console.log(`✅ Tablas: ${existingTables}/${totalTables}`);
  console.log(`✅ Funciones: ${existingFunctions}/${totalFunctions}`);

  if (result.missing.extensions.length > 0) {
    console.log("\n⚠️  EXTENSIONES FALTANTES:");
    result.missing.extensions.forEach(ext => console.log(`   - ${ext}`));
  }

  if (result.missing.tables.length > 0) {
    console.log("\n⚠️  TABLAS FALTANTES:");
    result.missing.tables.forEach(table => console.log(`   - ${table}`));
  }

  if (result.missing.functions.length > 0) {
    console.log("\n⚠️  FUNCIONES FALTANTES:");
    result.missing.functions.forEach(func => console.log(`   - ${func}()`));
  }

  const allComplete =
    result.missing.extensions.length === 0 &&
    result.missing.tables.length === 0 &&
    result.missing.functions.length === 0;

  if (allComplete) {
    console.log("\n🎉 ¡TODO ESTÁ COMPLETO! Base de datos 100% migrada.\n");
  } else {
    console.log("\n⚠️  Hay elementos faltantes que necesitan migración.\n");
  }

  return result;
}

verifyDatabase()
  .then((result) => {
    // Write result to file for master migration script to read
    const fs = require('fs');
    fs.writeFileSync(
      '/tmp/db_verification_result.json',
      JSON.stringify(result, null, 2)
    );
    process.exit(0);
  })
  .catch((err) => {
    console.error("\n❌ Error en verificación:", err);
    process.exit(1);
  });
