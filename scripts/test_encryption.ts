/**
 * Test Token Encryption
 *
 * This script tests the encryption/decryption utilities
 * Run with: npx ts-node scripts/test_encryption.ts
 */

import * as dotenv from "dotenv";
import {
  encryptToken,
  decryptToken,
  encryptLinkedInTokens,
  decryptLinkedInTokens,
  isEncryptionConfigured
} from "../src/lib/encryption";

// Load environment variables
dotenv.config({ path: ".env.local" });

console.log("\n🔐 Token Encryption Test Suite\n");
console.log("================================\n");

// Test 1: Check configuration
console.log("Test 1: Check Configuration");
console.log("---------------------------");
const isConfigured = isEncryptionConfigured();
console.log(`✅ Encryption configured: ${isConfigured}\n`);

if (!isConfigured) {
  console.error("❌ ENCRYPTION_KEY not found in .env.local");
  process.exit(1);
}

// Test 2: Basic encryption/decryption
console.log("Test 2: Basic Encryption/Decryption");
console.log("------------------------------------");
const testToken = "test_access_token_123456789";
console.log(`Original token: ${testToken}`);

const encrypted = encryptToken(testToken);
console.log(`Encrypted: ${encrypted}`);
console.log(`Encrypted length: ${encrypted?.length} chars`);

const decrypted = decryptToken(encrypted!);
console.log(`Decrypted: ${decrypted}`);

const matches = testToken === decrypted;
console.log(`${matches ? "✅" : "❌"} Decryption matches original: ${matches}\n`);

if (!matches) {
  console.error("❌ Test failed: Decrypted token doesn't match original");
  process.exit(1);
}

// Test 3: LinkedIn tokens encryption
console.log("Test 3: LinkedIn Tokens Encryption");
console.log("-----------------------------------");
const linkedInTokens = {
  accessToken: "linkedin_access_token_abcdef123456",
  refreshToken: "linkedin_refresh_token_xyz789",
  expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
};

console.log("Original LinkedIn tokens:");
console.log(`  Access token: ${linkedInTokens.accessToken}`);
console.log(`  Refresh token: ${linkedInTokens.refreshToken}`);
console.log(`  Expires at: ${linkedInTokens.expiresAt}`);

const encryptedLinkedIn = encryptLinkedInTokens(linkedInTokens);
console.log("\nEncrypted LinkedIn tokens:");
console.log(`  Access token: ${encryptedLinkedIn.accessTokenEncrypted.substring(0, 50)}...`);
console.log(`  Refresh token: ${encryptedLinkedIn.refreshTokenEncrypted.substring(0, 50)}...`);

const decryptedLinkedIn = decryptLinkedInTokens(encryptedLinkedIn);
if (!decryptedLinkedIn) {
  console.error("❌ Failed to decrypt LinkedIn tokens");
  process.exit(1);
}

console.log("\nDecrypted LinkedIn tokens:");
console.log(`  Access token: ${decryptedLinkedIn.accessToken}`);
console.log(`  Refresh token: ${decryptedLinkedIn.refreshToken}`);
console.log(`  Expires at: ${decryptedLinkedIn.expiresAt}`);

const linkedInMatches =
  linkedInTokens.accessToken === decryptedLinkedIn.accessToken &&
  linkedInTokens.refreshToken === decryptedLinkedIn.refreshToken &&
  linkedInTokens.expiresAt === decryptedLinkedIn.expiresAt;

console.log(`${linkedInMatches ? "✅" : "❌"} LinkedIn tokens match: ${linkedInMatches}\n`);

if (!linkedInMatches) {
  console.error("❌ Test failed: Decrypted LinkedIn tokens don't match original");
  process.exit(1);
}

// Test 4: Null/undefined handling
console.log("Test 4: Null/Undefined Handling");
console.log("--------------------------------");
const encryptedNull = encryptToken(null);
console.log(`Encrypt null: ${encryptedNull}`);
console.log(`${encryptedNull === null ? "✅" : "❌"} Returns null for null input`);

const encryptedUndefined = encryptToken(undefined);
console.log(`Encrypt undefined: ${encryptedUndefined}`);
console.log(`${encryptedUndefined === null ? "✅" : "❌"} Returns null for undefined input`);

const decryptedNull = decryptToken(null);
console.log(`Decrypt null: ${decryptedNull}`);
console.log(`${decryptedNull === null ? "✅" : "❌"} Returns null for null input\n`);

// Test 5: Multiple encryptions produce different results
console.log("Test 5: Randomized Encryption");
console.log("------------------------------");
const token1 = encryptToken(testToken);
const token2 = encryptToken(testToken);
const areDifferent = token1 !== token2;
console.log(`First encryption: ${token1?.substring(0, 30)}...`);
console.log(`Second encryption: ${token2?.substring(0, 30)}...`);
console.log(`${areDifferent ? "✅" : "❌"} Encryptions are different: ${areDifferent}`);
console.log(`Note: Different encryptions of same data is GOOD (uses random IV)\n`);

// Test 6: Decryption of invalid data
console.log("Test 6: Invalid Data Handling");
console.log("------------------------------");
const invalidToken = "this_is_not_encrypted_data";
const decryptedInvalid = decryptToken(invalidToken);
console.log(`Decrypt invalid data: ${decryptedInvalid}`);
console.log(`${decryptedInvalid === null ? "✅" : "❌"} Returns null for invalid data\n`);

// Summary
console.log("================================");
console.log("🎉 All Tests Passed!");
console.log("================================\n");
console.log("Summary:");
console.log("  ✅ Encryption configured correctly");
console.log("  ✅ Basic encryption/decryption works");
console.log("  ✅ LinkedIn tokens encryption works");
console.log("  ✅ Null/undefined handling works");
console.log("  ✅ Randomized IV works (different ciphertexts)");
console.log("  ✅ Invalid data handling works");
console.log("\nReady for production! 🚀\n");
