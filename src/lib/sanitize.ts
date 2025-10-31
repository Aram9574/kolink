import DOMPurify from "dompurify";

/**
 * Sanitizes user input to prevent XSS attacks
 * @param input - The string to sanitize
 * @param options - DOMPurify configuration options
 * @returns Sanitized string safe for rendering
 */
export function sanitizeInput(
  input: string,
  options?: DOMPurify.Config
): string {
  // Check if we're in a browser environment
  if (typeof window === "undefined") {
    // For server-side, we'll use a basic sanitization
    // In production, consider using a server-side sanitizer like isomorphic-dompurify
    return input
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;")
      .replace(/\//g, "&#x2F;");
  }

  // Default configuration for DOMPurify
  const defaultConfig = {
    ALLOWED_TAGS: [
      "b",
      "i",
      "em",
      "strong",
      "u",
      "p",
      "br",
      "span",
      "a",
      "ul",
      "ol",
      "li",
    ],
    ALLOWED_ATTR: ["href", "title", "target", "rel"],
    ALLOW_DATA_ATTR: false,
    ...options,
  };

  // @ts-expect-error - Type mismatch between DOMPurify versions
  return DOMPurify.sanitize(input, defaultConfig);
}

/**
 * Sanitizes plain text (removes all HTML tags)
 * @param input - The string to sanitize
 * @returns Plain text without any HTML
 */
export function sanitizePlainText(input: string): string {
  if (typeof window === "undefined") {
    return input
      .replace(/<[^>]*>/g, "")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
}

/**
 * Sanitizes user input for use in URLs
 * @param input - The URL string to sanitize
 * @returns Sanitized URL or empty string if invalid
 */
export function sanitizeUrl(input: string): string {
  try {
    const url = new URL(input);
    // Only allow http and https protocols
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return "";
    }
    return url.toString();
  } catch {
    return "";
  }
}

/**
 * Validates and sanitizes email addresses
 * @param email - The email to validate
 * @returns Sanitized email or empty string if invalid
 */
export function sanitizeEmail(email: string): string {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const trimmed = email.trim().toLowerCase();

  if (!emailRegex.test(trimmed)) {
    return "";
  }

  return sanitizePlainText(trimmed);
}

/**
 * Sanitizes user input for use in database queries
 * Prevents SQL injection and other database attacks
 * @param input - The string to sanitize
 * @returns Sanitized string
 */
export function sanitizeForDatabase(input: string): string {
  // Remove null bytes
  let sanitized = input.replace(/\0/g, "");

  // Escape special characters
  sanitized = sanitized
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\x00/g, "\\0")
    .replace(/\x1a/g, "\\Z");

  return sanitized;
}

/**
 * Validates and sanitizes a numeric input
 * @param input - The number or string to validate
 * @param options - Validation options (min, max, integer)
 * @returns Validated number or null if invalid
 */
export function sanitizeNumber(
  input: string | number,
  options?: { min?: number; max?: number; integer?: boolean }
): number | null {
  const num = typeof input === "string" ? parseFloat(input) : input;

  if (isNaN(num) || !isFinite(num)) {
    return null;
  }

  if (options?.integer && !Number.isInteger(num)) {
    return null;
  }

  if (options?.min !== undefined && num < options.min) {
    return null;
  }

  if (options?.max !== undefined && num > options.max) {
    return null;
  }

  return num;
}
