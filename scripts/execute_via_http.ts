import * as dotenv from "dotenv";
import fetch from "node-fetch";
import * as fs from "fs";

dotenv.config({ path: ".env.local" });

async function executeSQL(sql: string): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  // Extract project ref
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  if (!projectRef) {
    throw new Error("Could not extract project ref");
  }

  // Use Supabase SQL endpoint
  const endpoint = `${supabaseUrl}/rest/v1/rpc/exec_sql`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": serviceRoleKey,
        "Authorization": `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ query: sql }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.log(`   ⚠️  HTTP ${response.status}: ${error}`);
      return false;
    }

    const data = await response.json();
    return true;
  } catch (err: any) {
    console.log(`   ❌ ${err.message}`);
    return false;
  }
}

async function executeMigrationsViaHTTP() {
  console.log("\n" + "=".repeat(70));
  console.log("🚀 EJECUTANDO MIGRACIONES VÍA HTTP API");
  console.log("=".repeat(70));

  const sqlFile = fs.readFileSync("scripts/PENDING_MIGRATIONS.sql", "utf-8");

  // Split into individual statements
  const statements = sqlFile
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--') && s !== 'SELECT');

  console.log(`\n📝 Encontradas ${statements.length} sentencias SQL\n`);

  let successCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    console.log(`${i + 1}. Ejecutando...`);

    const success = await executeSQL(statement + ';');
    if (success) {
      successCount++;
      console.log(`   ✅ Completado\n`);
    } else {
      console.log(`   ⚠️  Continuando...\n`);
    }
  }

  console.log("=".repeat(70));
  console.log(`\n📊 Resultado: ${successCount}/${statements.length} ejecutadas\n`);

  return successCount > 0;
}

executeMigrationsViaHTTP()
  .then(() => {
    console.log("✅ Proceso completado. Ahora voy a verificar el estado final...\n");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Error:", err.message);
    process.exit(1);
  });
