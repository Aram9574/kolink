/**
 * Rate Limiting Middleware
 * Provides consistent rate limiting across API routes
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { limiter } from "@/lib/rateLimiter";
import { logger } from "@/lib/logger";

/**
 * Rate limit configurations for different endpoint types
 */
export const rateLimitConfigs = {
  // Authentication endpoints (stricter)
  auth: {
    requests: 5,
    window: 60, // seconds
    keyPrefix: "auth",
  },
  // Content generation (moderate)
  generation: {
    requests: 10,
    window: 60,
    keyPrefix: "gen",
  },
  // Admin operations (very strict)
  admin: {
    requests: 10,
    window: 300, // 5 minutes
    keyPrefix: "admin",
  },
  // General API (lenient)
  general: {
    requests: 30,
    window: 60,
    keyPrefix: "api",
  },
  // Payment operations (strict)
  payment: {
    requests: 5,
    window: 60,
    keyPrefix: "payment",
  },
};

/**
 * Extracts client identifier from request
 */
function getClientIdentifier(req: NextApiRequest): string {
  // Try to get real IP from headers (for proxied requests)
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    return ips.split(",")[0].trim();
  }

  // Fallback to socket address
  return req.socket.remoteAddress || "unknown";
}

/**
 * Apply rate limiting to an endpoint
 */
export async function applyRateLimit(
  req: NextApiRequest,
  res: NextApiResponse,
  config: keyof typeof rateLimitConfigs = "general"
): Promise<boolean> {
  try {
    const clientId = getClientIdentifier(req);
    const limitConfig = rateLimitConfigs[config];
    const key = `${limitConfig.keyPrefix}_${clientId}`;

    const { success, reset } = await limiter.limit(key);

    if (!success) {
      const retryAfter = Math.ceil(reset / 1000);
      res.setHeader("Retry-After", retryAfter.toString());
      res.setHeader("X-RateLimit-Limit", limitConfig.requests.toString());
      res.setHeader("X-RateLimit-Remaining", "0");
      res.setHeader("X-RateLimit-Reset", new Date(Date.now() + reset).toISOString());

      logger.warn("Rate limit exceeded", {
        clientId,
        endpoint: req.url,
        config,
        retryAfter,
      });

      res.status(429).json({
        error: "Too many requests. Please try again later.",
        retryAfter,
      });

      return false;
    }

    return true;
  } catch (error) {
    // Log error but don't block request if rate limiter fails
    logger.error("Rate limiter error", error, {
      endpoint: req.url,
      config,
    });
    return true; // Allow request to proceed
  }
}

/**
 * Rate limiting middleware wrapper
 */
export function withRateLimit(
  config: keyof typeof rateLimitConfigs,
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const allowed = await applyRateLimit(req, res, config);

    if (!allowed) {
      return; // Response already sent by applyRateLimit
    }

    return handler(req, res);
  };
}

/**
 * Combined middleware: method validation + rate limiting
 */
export function withMethodAndRateLimit(
  method: string | string[],
  config: keyof typeof rateLimitConfigs,
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    // Validate HTTP method
    const allowedMethods = Array.isArray(method) ? method : [method];

    if (!allowedMethods.includes(req.method || "")) {
      return res.status(405).json({
        error: `Method ${req.method} not allowed. Allowed: ${allowedMethods.join(", ")}`,
      });
    }

    // Apply rate limiting
    const allowed = await applyRateLimit(req, res, config);

    if (!allowed) {
      return;
    }

    return handler(req, res);
  };
}
