/**
 * Token Encryption Utilities
 *
 * Uses Node.js crypto module to encrypt/decrypt sensitive tokens
 * Compatible with Supabase pgp_sym_encrypt/decrypt functions
 *
 * Algorithm: AES-256-CBC
 */

import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";
const _KEY_LENGTH = 32; // 256 bits (reserved for future validation)
const IV_LENGTH = 16; // 128 bits

/**
 * Get encryption key from environment
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error("ENCRYPTION_KEY environment variable is not set");
  }

  // Convert hex string to Buffer or use first 32 bytes of string
  if (key.length === 64) {
    // Hex string (32 bytes = 64 hex chars)
    return Buffer.from(key, "hex");
  } else {
    // Regular string - hash to get 32 bytes
    return crypto.createHash("sha256").update(key).digest();
  }
}

/**
 * Encrypt a token
 * @param token - The plaintext token to encrypt
 * @returns Base64-encoded encrypted token (IV + ciphertext)
 */
export function encryptToken(token: string | null | undefined): string | null {
  if (!token) {
    return null;
  }

  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(token, "utf8", "base64");
    encrypted += cipher.final("base64");

    // Combine IV and encrypted data, then base64 encode
    const combined = Buffer.concat([
      iv,
      Buffer.from(encrypted, "base64")
    ]);

    return combined.toString("base64");
  } catch (error) {
    console.error("Encryption error:", error);
    throw new Error("Failed to encrypt token");
  }
}

/**
 * Decrypt a token
 * @param encryptedToken - Base64-encoded encrypted token (IV + ciphertext)
 * @returns Decrypted plaintext token
 */
export function decryptToken(encryptedToken: string | null | undefined): string | null {
  if (!encryptedToken) {
    return null;
  }

  try {
    const key = getEncryptionKey();
    const combined = Buffer.from(encryptedToken, "base64");

    // Extract IV and encrypted data
    const iv = combined.subarray(0, IV_LENGTH);
    const encrypted = combined.subarray(IV_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

    let decrypted = decipher.update(encrypted.toString("base64"), "base64", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    console.error("Decryption error:", error);
    // Return null on decryption failure (invalid key or corrupted data)
    return null;
  }
}

/**
 * Check if encryption is properly configured
 */
export function isEncryptionConfigured(): boolean {
  try {
    getEncryptionKey();
    return true;
  } catch {
    return false;
  }
}
