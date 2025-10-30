import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkProfilesColumns() {
  console.log("\n🔍 Checking profiles table columns...\n");

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .limit(1);

  if (error) {
    console.error("❌ Error:", error);
    return;
  }

  if (data && data.length > 0) {
    const columns = Object.keys(data[0]);
    console.log("✅ Columns found in profiles table:");
    columns.forEach((col) => {
      console.log(`   - ${col}`);
    });

    // Check for specific columns we need
    const requiredColumns = [
      "preferred_language",
      "tone_profile",
      "linkedin_access_token",
      "linkedin_refresh_token",
    ];

    console.log("\n📋 Required columns status:");
    requiredColumns.forEach((col) => {
      const exists = columns.includes(col);
      console.log(`   ${exists ? "✅" : "❌"} ${col}`);
    });
  } else {
    console.log("⚠️  No profiles found in the database");
  }
}

checkProfilesColumns().then(() => process.exit(0));
