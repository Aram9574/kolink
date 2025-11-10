/**
 * Global Error Handler Middleware
 * Provides consistent error handling across all API routes
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { ApiError } from "@/lib/errors/ApiError";
import { logger } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";

/**
 * Check if error is an operational error (expected)
 */
function isOperationalError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.isOperational;
  }
  return false;
}

/**
 * Extract error details for logging
 */
function getErrorDetails(error: unknown): Record<string, unknown> {
  if (error instanceof ApiError) {
    return {
      code: error.code,
      statusCode: error.statusCode,
      message: error.message,
      details: error.details,
      stack: error.stack,
    };
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    error: String(error),
  };
}

/**
 * Send error response to client
 */
function sendErrorResponse(
  res: NextApiResponse,
  error: unknown,
  endpoint: string
) {
  // Handle ApiError instances
  if (error instanceof ApiError) {
    return res.status(error.statusCode).json(error.toJSON());
  }

  // Handle Supabase errors
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    "message" in error
  ) {
    const supabaseError = error as { code: string; message: string };

    // Map common Supabase error codes
    const statusCode =
      supabaseError.code === "23505"
        ? 409 // Unique violation
        : supabaseError.code.startsWith("23")
        ? 400 // Other constraint violations
        : 500;

    logger.error("Supabase error", error, {
      endpoint,
      code: supabaseError.code,
    });

    return res.status(statusCode).json({
      error:
        process.env.NODE_ENV === "production"
          ? "Database error occurred"
          : supabaseError.message,
      code: "DATABASE_ERROR",
    });
  }

  // Handle unknown errors
  logger.error("Unhandled error", error, { endpoint });

  return res.status(500).json({
    error:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : error instanceof Error
        ? error.message
        : "Unknown error",
    code: "INTERNAL_ERROR",
  });
}

/**
 * Global error handler wrapper
 * Wraps an API route handler with error handling
 */
export function withErrorHandler(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      await handler(req, res);
    } catch (error) {
      const endpoint = req.url || "unknown";
      const method = req.method || "unknown";

      // Log error details
      const errorDetails = getErrorDetails(error);
      const isOperational = isOperationalError(error);

      if (isOperational) {
        // Operational errors are expected (validation, auth, etc.)
        logger.warn("Operational error", {
          endpoint,
          method,
          ...errorDetails,
        });
      } else {
        // Programming errors or unexpected failures
        logger.error("Unexpected error", error, {
          endpoint,
          method,
          isOperational: false,
        });

        // Report to Sentry only for non-operational errors
        Sentry.captureException(error, {
          tags: {
            endpoint,
            method,
            errorType: "unexpected",
          },
          extra: errorDetails,
        });
      }

      // Send appropriate response
      sendErrorResponse(res, error, endpoint);
    }
  };
}

/**
 * Async error wrapper for try-catch blocks
 * Usage: const result = await asyncTryCatch(() => riskyOperation())
 */
export async function asyncTryCatch<T>(
  fn: () => Promise<T>,
  errorMessage?: string
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error; // Re-throw ApiErrors
    }

    // Wrap unknown errors
    logger.error(errorMessage || "Async operation failed", error);
    throw new ApiError(
      errorMessage || "Operation failed",
      500,
      "ASYNC_ERROR",
      getErrorDetails(error)
    );
  }
}

/**
 * Safe database operation wrapper
 */
export async function safeDatabaseOperation<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    logger.error(`Database operation failed: ${operationName}`, error);

    // Check if it's a Supabase error with code
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      "message" in error
    ) {
      const dbError = error as { code: string; message: string };
      throw new ApiError(
        `Database error: ${operationName}`,
        500,
        "DATABASE_ERROR",
        {
          operation: operationName,
          code: dbError.code,
          message:
            process.env.NODE_ENV === "production"
              ? undefined
              : dbError.message,
        },
        false
      );
    }

    throw new ApiError(
      `Database operation failed: ${operationName}`,
      500,
      "DATABASE_ERROR",
      { operation: operationName },
      false
    );
  }
}

/**
 * Safe external API call wrapper
 */
export async function safeExternalApiCall<T>(
  apiCall: () => Promise<T>,
  serviceName: string
): Promise<T> {
  try {
    return await apiCall();
  } catch (error) {
    logger.error(`External API call failed: ${serviceName}`, error);

    throw new ApiError(
      `${serviceName} is currently unavailable`,
      503,
      "EXTERNAL_API_ERROR",
      {
        service: serviceName,
        error: error instanceof Error ? error.message : String(error),
      }
    );
  }
}
