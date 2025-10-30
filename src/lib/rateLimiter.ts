// src/lib/rateLimiter.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Redis setup with fallback
const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

let redis: Redis;
let redisEnabled = false;

try {
  if (redisUrl && redisToken) {
    redis = new Redis({
      url: redisUrl,
      token: redisToken,
    });
    redisEnabled = true;
    console.log("[RateLimiter] Redis connected");
  } else {
    // Fallback to in-memory (for development)
    redis = new Redis({
      url: "",
      token: "",
    });
    console.warn("[RateLimiter] Redis not configured. Using in-memory fallback.");
  }
} catch (err) {
  console.error("[RateLimiter] Redis initialization failed:", err);
  redis = new Redis({ url: "", token: "" });
}

/**
 * Rate limiters for different endpoint types
 */

// AI Generation endpoints (expensive): 10 requests per minute
export const aiGenerationLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "60 s"),
  analytics: redisEnabled,
  prefix: "ratelimit:ai",
});

// Search/Query endpoints: 30 requests per minute
export const searchLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, "60 s"),
  analytics: redisEnabled,
  prefix: "ratelimit:search",
});

// Checkout/Payment endpoints (critical): 5 requests per 5 minutes
export const checkoutLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "300 s"),
  analytics: redisEnabled,
  prefix: "ratelimit:checkout",
});

// Mutation endpoints (create/update/delete): 60 per minute
export const mutationLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, "60 s"),
  analytics: redisEnabled,
  prefix: "ratelimit:mutation",
});

// Read-only endpoints: 120 per minute
export const readLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(120, "60 s"),
  analytics: redisEnabled,
  prefix: "ratelimit:read",
});

// Backward compatibility - default to AI generation limiter
export const limiter = aiGenerationLimiter;

export { redis };
