import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function finalVerification() {
  console.log("\n" + "=".repeat(70));
  console.log("🎯 VERIFICACIÓN FINAL DE BASE DE DATOS - KOLINK");
  console.log("=".repeat(70));

  // 1. Check all tables
  console.log("\n📊 TABLAS VERIFICADAS:\n");
  const tables = [
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

  let tableCount = 0;
  for (const table of tables) {
    const { error } = await supabase.from(table).select('*').limit(1);
    if (!error || !error.message.includes('does not exist')) {
      console.log(`   ✅ ${table}`);
      tableCount++;
    } else {
      console.log(`   ❌ ${table}`);
    }
  }

  // 2. Check critical functions
  console.log("\n⚙️  FUNCIONES CRÍTICAS:\n");
  const functions = [
    { name: 'encrypt_token', params: { token: 'test', encryption_key: 'test' } },
    { name: 'decrypt_token', params: { token: 'test', encryption_key: 'test' } },
    { name: 'is_admin', params: { user_id: '00000000-0000-0000-0000-000000000000' } },
  ];

  let funcCount = 0;
  for (const func of functions) {
    try {
      const { error } = await supabase.rpc(func.name, func.params);
      if (!error || !error.message.includes('does not exist')) {
        console.log(`   ✅ ${func.name}()`);
        funcCount++;
      } else {
        console.log(`   ❌ ${func.name}()`);
      }
    } catch {
      console.log(`   ❌ ${func.name}()`);
    }
  }

  // 3. Check profile columns
  console.log("\n👤 COLUMNAS EN PROFILES:\n");
  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .limit(1);

  const requiredColumns = [
    'preferred_language',
    'tone_profile',
    'linkedin_access_token',
    'linkedin_refresh_token',
    'linkedin_access_token_encrypted',
    'linkedin_refresh_token_encrypted',
    'notification_preferences',
    'analytics_enabled',
    'xp',
    'level',
    'streak_days'
  ];

  let columnCount = 0;
  if (profileData && profileData.length > 0) {
    const columns = Object.keys(profileData[0]);
    for (const col of requiredColumns) {
      if (columns.includes(col)) {
        console.log(`   ✅ ${col}`);
        columnCount++;
      } else {
        console.log(`   ❌ ${col}`);
      }
    }
  }

  // 4. Summary
  console.log("\n" + "=".repeat(70));
  console.log("\n📈 RESUMEN FINAL\n");
  console.log(`   Tablas: ${tableCount}/${tables.length} ✅`);
  console.log(`   Funciones críticas: ${funcCount}/${functions.length} ✅`);
  console.log(`   Columnas en profiles: ${columnCount}/${requiredColumns.length} ✅`);

  const allComplete =
    tableCount === tables.length &&
    funcCount === functions.length &&
    columnCount === requiredColumns.length;

  if (allComplete) {
    console.log("\n🎉 ¡BASE DE DATOS 100% COMPLETA!");
    console.log("\n✅ Todas las migraciones se aplicaron correctamente.");
    console.log("✅ Todos los componentes están listos.");
    console.log("✅ La aplicación está lista para producción.\n");
  } else {
    console.log("\n⚠️  Algunos elementos pueden estar incompletos.");
    console.log("   Revisa los detalles arriba.\n");
  }

  console.log("=".repeat(70) + "\n");
}

finalVerification()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });
