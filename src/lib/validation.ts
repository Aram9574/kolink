/**
 * Centralized Zod validation schemas for API endpoints
 * Ensures consistent input validation across the application
 */

import { z } from "zod";

/**
 * Common validation schemas
 */
export const commonSchemas = {
  uuid: z.string().uuid("Invalid UUID format"),
  email: z.string().email("Invalid email format"),
  nonEmptyString: z.string().min(1, "Field cannot be empty").trim(),
  positiveInt: z.number().int().positive("Must be a positive integer"),
  url: z.string().url("Invalid URL format"),
};

/**
 * User-related schemas
 */
export const userSchemas = {
  userId: commonSchemas.uuid,
  email: commonSchemas.email,
  plan: z.enum(["basic", "standard", "premium"], {
    errorMap: () => ({ message: "Invalid plan. Must be basic, standard, or premium" }),
  }),
  credits: z.number().int().nonnegative("Credits must be non-negative"),
};

/**
 * Content generation schemas
 */
export const contentSchemas = {
  prompt: z
    .string()
    .min(10, "Prompt must be at least 10 characters")
    .max(2000, "Prompt must not exceed 2000 characters")
    .trim(),
  generatedText: z.string().max(10000, "Generated text exceeds maximum length"),
  tone: z.enum(["casual", "professional", "inspirational", "educational", "humorous"], {
    errorMap: () => ({ message: "Invalid tone" }),
  }),
  format: z.enum(["short", "medium", "long"], {
    errorMap: () => ({ message: "Invalid format" }),
  }),
};

/**
 * Payment/Checkout schemas
 */
export const checkoutSchemas = {
  plan: userSchemas.plan,
  userId: userSchemas.userId,
  priceId: z.string().startsWith("price_", "Invalid Stripe price ID"),
  sessionId: z.string().startsWith("cs_", "Invalid Stripe session ID"),
};

/**
 * RAG/Personalization schemas
 */
export const ragSchemas = {
  topic: z
    .string()
    .min(3, "Topic must be at least 3 characters")
    .max(500, "Topic must not exceed 500 characters")
    .trim(),
  intent: z.enum(["educativo", "inspiracional", "promocional", "entretenimiento"], {
    errorMap: () => ({ message: "Invalid intent" }),
  }),
  similarityThreshold: z.number().min(0).max(1, "Similarity threshold must be between 0 and 1"),
  limit: z.number().int().positive().max(100, "Limit must not exceed 100"),
};

/**
 * LinkedIn post schemas
 */
export const linkedinSchemas = {
  postText: z
    .string()
    .min(10, "Post must be at least 10 characters")
    .max(3000, "LinkedIn posts are limited to 3000 characters")
    .trim(),
  hashtags: z.array(z.string().regex(/^#\w+$/, "Invalid hashtag format")).optional(),
  mentions: z.array(z.string().startsWith("@", "Invalid mention format")).optional(),
};

/**
 * Security schemas
 */
export const securitySchemas = {
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password must not exceed 100 characters")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^a-zA-Z0-9]/, "Password must contain at least one special character"),
  token: z.string().length(64, "Invalid token format"),
  totpCode: z.string().regex(/^\d{6}$/, "TOTP code must be 6 digits"),
  sessionId: commonSchemas.uuid,
};

/**
 * Rate limiting helper
 */
export const rateLimitSchemas = {
  ipAddress: z.string().ip("Invalid IP address"),
  userAgent: z.string().min(1, "User agent required"),
};

/**
 * Generic API request validation helper
 * Validates request body against a Zod schema and returns typed data or errors
 */
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return { success: false, errors: result.error };
}

/**
 * Format Zod errors for API responses
 */
export function formatZodErrors(error: z.ZodError): Record<string, string[]> {
  const formatted: Record<string, string[]> = {};

  error.issues.forEach((issue) => {
    const path = issue.path.join(".");
    if (!formatted[path]) {
      formatted[path] = [];
    }
    formatted[path].push(issue.message);
  });

  return formatted;
}

/**
 * API endpoint validation schemas
 */
export const apiEndpointSchemas = {
  // POST /api/generate (legacy)
  generate: z.object({
    userId: userSchemas.userId,
    prompt: contentSchemas.prompt,
    tone: contentSchemas.tone.optional(),
    format: contentSchemas.format.optional(),
  }),

  // POST /api/post/generate (new)
  postGenerate: z.object({
    prompt: contentSchemas.prompt,
    style: z.string().optional(),
    language: z.enum(['es-ES', 'en-US', 'pt-BR']).optional().default('es-ES'),
    toneProfile: z.string().optional(),
    preset: z.string().optional(),
    metadata: z.object({
      objective: z.string().optional(),
      audience: z.string().optional(),
      callToAction: z.string().optional(),
      format: z.string().optional(),
      extraInstructions: z.array(z.string()).optional(),
    }).optional(),
  }),

  // POST /api/checkout
  checkout: z.object({
    userId: checkoutSchemas.userId,
    plan: checkoutSchemas.plan,
  }),

  // POST /api/personalized/generate
  personalizedGenerate: z.object({
    topic: ragSchemas.topic,
    intent: ragSchemas.intent,
    userId: userSchemas.userId,
  }),

  // POST /api/rag/retrieve
  ragRetrieve: z.object({
    topic: ragSchemas.topic,
    userId: userSchemas.userId,
    limit: ragSchemas.limit.optional().default(5),
    similarityThreshold: ragSchemas.similarityThreshold.optional().default(0.7),
  }),

  // POST /api/user-style/ingest
  userStyleIngest: z.object({
    userId: userSchemas.userId,
    posts: z.array(
      z.object({
        text: linkedinSchemas.postText,
        likes: z.number().int().nonnegative().optional().default(0),
        comments: z.number().int().nonnegative().optional().default(0),
        shares: z.number().int().nonnegative().optional().default(0),
        posted_at: z.string().datetime().optional(),
      })
    ).min(1, "At least one post required").max(100, "Maximum 100 posts per batch"),
  }),

  // POST /api/viral/ingest (admin only)
  viralIngest: z.object({
    posts: z.array(
      z.object({
        text: linkedinSchemas.postText,
        author: z.string().min(1, "Author name required"),
        likes: z.number().int().nonnegative(),
        comments: z.number().int().nonnegative(),
        shares: z.number().int().nonnegative(),
        posted_at: z.string().datetime(),
        category: z.string().optional(),
      })
    ).min(1, "At least one post required").max(50, "Maximum 50 posts per batch"),
  }),

  // POST /api/security/password/reset
  passwordReset: z.object({
    token: securitySchemas.token,
    newPassword: securitySchemas.password,
  }),

  // POST /api/security/2fa/verify
  twoFactorVerify: z.object({
    userId: userSchemas.userId,
    code: securitySchemas.totpCode,
  }),

  // POST /api/admin/update-user
  adminUpdateUser: z.object({
    userId: userSchemas.userId,
    plan: userSchemas.plan.optional(),
    credits: userSchemas.credits.optional(),
    email: userSchemas.email.optional(),
  }),

  // POST /api/user-style/ingest (already defined above, keeping for reference)

  // POST /api/rag/retrieve (already defined above)

  // POST /api/security/password/request-reset
  passwordRequestReset: z.object({
    email: userSchemas.email,
  }),

  // POST /api/security/sessions/revoke
  sessionRevoke: z.object({
    sessionId: securitySchemas.sessionId.optional(),
    revokeAll: z.boolean().optional().default(false),
  }),

  // POST /api/admin/delete-user
  adminDeleteUser: z.object({
    userId: userSchemas.userId,
    confirmEmail: userSchemas.email,
  }),

  // POST /api/subscription/cancel
  subscriptionCancel: z.object({
    userId: userSchemas.userId,
    reason: z.string().min(1, "Reason required").max(500).optional(),
  }),

  // POST /api/export/user-data
  exportUserData: z.object({
    userId: userSchemas.userId,
    format: z.enum(['json', 'csv'], { errorMap: () => ({ message: "Format must be json or csv" }) }),
    includeDeleted: z.boolean().optional().default(false),
  }),
};
