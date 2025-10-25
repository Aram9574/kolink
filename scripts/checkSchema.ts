/**
 * Kolink - Supabase Schema Verifier (v0.7)
 * Confirma que la base de datos coincide con el esquema esperado.
 */
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const REQUIRED_COLUMNS = [
  "bio",
  "headline",
  "expertise",
  "tone_profile",
  "profile_embedding",
  "location",
  "website",
  "photo_url",
  "company",
  "position",
  "linkedin_url",
  "interests",
  "language",
  "timezone",
];

async function checkProfilesTable() {
  const { data, error } = await supabase.rpc("get_column_names", {
    table_name: "profiles",
  });

  if (error) {
    console.error("❌ Error al consultar columnas:", error.message);
    process.exit(1);
  }

  const existing = data.map((d: any) => d.column_name);
  const missing = REQUIRED_COLUMNS.filter((col) => !existing.includes(col));

  if (missing.length === 0) {
    console.log("✅ Tabla 'profiles' completamente sincronizada.");
  } else {
    console.warn("⚠️ Columnas faltantes:", missing);
    process.exit(1);
  }
}

checkProfilesTable();
