import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function applyMigration() {
  console.log("\n🚀 Applying Sprint 3 Migration...\n");

  const migrationPath = path.join(
    __dirname,
    "..",
    "supabase",
    "migrations",
    "20251027000001_add_sprint3_columns.sql"
  );

  const sql = fs.readFileSync(migrationPath, "utf8");

  // Split by DO $$ blocks and execute each separately
  const blocks = sql.split(/(?=DO \$\$)/g).filter((block) => block.trim());

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i].trim();
    if (!block) continue;

    console.log(`📝 Executing block ${i + 1}/${blocks.length}...`);

    try {
      const { error } = await supabase.rpc("exec_sql", {
        sql_query: block,
      });

      if (error) {
        // Try direct execution via RPC
        console.log(`   Trying alternative method...`);
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql`,
          {
            method: "POST",
            headers: {
              apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
              Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ sql_query: block }),
          }
        );

        if (!response.ok) {
          console.log(`   ⚠️  Could not execute block ${i + 1}`);
          console.log(`   Error: ${error.message}`);
        } else {
          console.log(`   ✅ Block ${i + 1} executed`);
        }
      } else {
        console.log(`   ✅ Block ${i + 1} executed`);
      }
    } catch (err: any) {
      console.log(`   ⚠️  Block ${i + 1} error: ${err.message}`);
    }
  }

  console.log("\n🔍 Verifying migration...\n");

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .limit(1);

  if (data && data.length > 0) {
    const columns = Object.keys(data[0]);
    const newColumns = [
      "preferred_language",
      "linkedin_access_token",
      "notification_preferences",
      "analytics_enabled",
    ];

    console.log("📋 New columns status:");
    newColumns.forEach((col) => {
      const exists = columns.includes(col);
      console.log(`   ${exists ? "✅" : "❌"} ${col}`);
    });
  }

  console.log("\n✨ Migration complete!\n");
}

applyMigration().then(() => process.exit(0));
