/**
 * Validation Middleware
 * Provides reusable validation middleware for API routes
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { validateRequest, formatZodErrors } from "@/lib/validation";
import { logger } from "@/lib/logger";

/**
 * Creates a validation middleware for an API route
 * Usage:
 * ```ts
 * export default withValidation(apiEndpointSchemas.checkout, handler);
 * ```
 */
export function withValidation<T>(
  schema: z.ZodSchema<T>,
  handler: (req: NextApiRequest, res: NextApiResponse, validatedData: T) => Promise<void> | void
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const validation = validateRequest(schema, req.body);

    if (!validation.success) {
      const errors = formatZodErrors(validation.errors);
      logger.warn("Validation failed", {
        path: req.url,
        method: req.method,
        errors,
      });

      return res.status(400).json({
        error: "Invalid request data",
        details: errors,
      });
    }

    // Pass validated data to handler
    return handler(req, res, validation.data);
  };
}

/**
 * Validates authentication token and extracts user
 */
export async function validateAuth(
  req: NextApiRequest
): Promise<{ userId: string; token: string } | { error: string; status: number }> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { error: "No authorization token provided", status: 401 };
  }

  const token = authHeader.replace("Bearer ", "");

  if (!token || token.length < 10) {
    return { error: "Invalid token format", status: 401 };
  }

  return { userId: "", token }; // Will be completed with actual Supabase validation
}

/**
 * Combined middleware: validates auth + request body
 */
export function withAuthValidation<T>(
  schema: z.ZodSchema<T>,
  handler: (
    req: NextApiRequest,
    res: NextApiResponse,
    validatedData: T,
    userId: string
  ) => Promise<void> | void
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    // Validate method
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // Validate request body
    const validation = validateRequest(schema, req.body);

    if (!validation.success) {
      const errors = formatZodErrors(validation.errors);
      logger.warn("Validation failed", {
        path: req.url,
        method: req.method,
        errors,
      });

      return res.status(400).json({
        error: "Invalid request data",
        details: errors,
      });
    }

    // Extract userId from validated data (if present)
    const data = validation.data as Record<string, unknown>;
    const userId = (data.userId as string) || "";

    return handler(req, res, validation.data, userId);
  };
}
