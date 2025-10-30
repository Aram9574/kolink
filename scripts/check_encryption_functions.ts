import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkEncryptionFunctions() {
  console.log("\n🔍 Checking encryption functions...\n");

  // Try to use encrypt_token function
  try {
    const { data, error } = await supabase.rpc('encrypt_token', {
      token: 'test',
      encryption_key: 'test_key_12345678901234567890'
    });

    if (error) {
      console.log("❌ encrypt_token function does NOT exist");
      console.log("   Error:", error.message);
    } else {
      console.log("✅ encrypt_token function exists");
    }
  } catch (err) {
    console.log("❌ encrypt_token function does NOT exist");
  }

  // Try to use decrypt_token function
  try {
    const { data, error } = await supabase.rpc('decrypt_token', {
      encrypted_token: 'test',
      encryption_key: 'test_key_12345678901234567890'
    });

    if (error && error.message.includes('does not exist')) {
      console.log("❌ decrypt_token function does NOT exist");
    } else {
      console.log("✅ decrypt_token function exists");
    }
  } catch (err) {
    console.log("❌ decrypt_token function does NOT exist");
  }
}

checkEncryptionFunctions().then(() => process.exit(0));
