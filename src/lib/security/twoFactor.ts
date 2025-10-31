/**
 * Two-Factor Authentication (2FA) Utilities
 * TOTP-based authentication implementation
 */

import crypto from 'crypto';

export interface TwoFactorSetup {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export interface TwoFactorVerification {
  isValid: boolean;
  remainingAttempts?: number;
}

/**
 * Generate a base32 secret for TOTP
 */
export function generateTOTPSecret(): string {
  const buffer = crypto.randomBytes(20);
  return base32Encode(buffer);
}

/**
 * Generate backup codes for 2FA
 */
export function generateBackupCodes(count: number = 8): string[] {
  const codes: string[] = [];

  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    // Format as XXXX-XXXX
    codes.push(`${code.slice(0, 4)}-${code.slice(4, 8)}`);
  }

  return codes;
}

/**
 * Hash a backup code for storage
 */
export function hashBackupCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

/**
 * Verify a backup code against hash
 */
export function verifyBackupCode(code: string, hash: string): boolean {
  return hashBackupCode(code) === hash;
}

/**
 * Generate QR code URL for TOTP setup
 */
export function generateQRCodeURL(
  secret: string,
  email: string,
  issuer: string = 'Kolink'
): string {
  const otpauthUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;
  // Using qr-code-styling or similar library on client side
  return otpauthUrl;
}

/**
 * Verify TOTP code
 */
export function verifyTOTP(token: string, secret: string, window: number = 1): boolean {
  const now = Math.floor(Date.now() / 1000 / 30);

  // Check current time and window before/after
  for (let i = -window; i <= window; i++) {
    const time = now + i;
    const expectedToken = generateTOTP(secret, time);

    if (constantTimeCompare(token, expectedToken)) {
      return true;
    }
  }

  return false;
}

/**
 * Generate TOTP token for a given time
 */
function generateTOTP(secret: string, time: number): string {
  const buffer = Buffer.alloc(8);
  buffer.writeUInt32BE(0, 0);
  buffer.writeUInt32BE(time, 4);

  const secretBuffer = base32Decode(secret);
  const hmac = crypto.createHmac('sha1', secretBuffer);
  hmac.update(buffer);
  const hash = hmac.digest();

  const offset = hash[hash.length - 1] & 0x0f;
  const binary =
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff);

  const otp = binary % 1000000;
  return otp.toString().padStart(6, '0');
}

/**
 * Base32 encoding
 */
function base32Encode(buffer: Buffer): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += alphabet[(value << (5 - bits)) & 31];
  }

  return output;
}

/**
 * Base32 decoding
 */
function base32Decode(input: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const cleanInput = input.replace(/=+$/, '').toUpperCase();

  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (let i = 0; i < cleanInput.length; i++) {
    const index = alphabet.indexOf(cleanInput[i]);
    if (index === -1) {
      throw new Error('Invalid base32 character');
    }

    value = (value << 5) | index;
    bits += 5;

    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(output);
}

/**
 * Constant time string comparison (prevents timing attacks)
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Encrypt 2FA secret for storage
 */
export function encryptSecret(secret: string, key: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);

  let encrypted = cipher.update(secret, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
}

/**
 * Decrypt 2FA secret from storage
 */
export function decryptSecret(encryptedSecret: string, key: string): string {
  const parts = encryptedSecret.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted secret format');
  }

  const [ivHex, encrypted, authTagHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Rate limiting for 2FA attempts
 */
export interface RateLimitResult {
  allowed: boolean;
  remainingAttempts: number;
  retryAfter?: number; // seconds
}

const attemptStore = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  identifier: string,
  maxAttempts: number = 5,
  windowSeconds: number = 300
): RateLimitResult {
  const now = Date.now();
  const existing = attemptStore.get(identifier);

  // Clean up old entries
  if (existing && existing.resetAt < now) {
    attemptStore.delete(identifier);
  }

  const current = attemptStore.get(identifier) || { count: 0, resetAt: now + windowSeconds * 1000 };

  if (current.count >= maxAttempts) {
    const retryAfter = Math.ceil((current.resetAt - now) / 1000);
    return {
      allowed: false,
      remainingAttempts: 0,
      retryAfter,
    };
  }

  return {
    allowed: true,
    remainingAttempts: maxAttempts - current.count - 1,
  };
}

export function recordAttempt(identifier: string, windowSeconds: number = 300): void {
  const now = Date.now();
  const existing = attemptStore.get(identifier);

  if (existing && existing.resetAt > now) {
    existing.count++;
  } else {
    attemptStore.set(identifier, {
      count: 1,
      resetAt: now + windowSeconds * 1000,
    });
  }
}

export function resetAttempts(identifier: string): void {
  attemptStore.delete(identifier);
}
