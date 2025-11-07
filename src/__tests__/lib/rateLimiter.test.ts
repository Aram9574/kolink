/**
 * Tests for rate limiter utility
 *
 * Tests the Redis-based distributed rate limiting
 */

// Mock Upstash Redis and Ratelimit
jest.mock('@upstash/redis', () => ({
  Redis: jest.fn().mockImplementation(() => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    incr: jest.fn().mockResolvedValue(1),
  })),
}));

jest.mock('@upstash/ratelimit', () => {
  const mockRatelimit = jest.fn().mockImplementation(() => ({
    limit: jest.fn().mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 9,
      reset: Date.now() + 60000,
    }),
  }));

  mockRatelimit.slidingWindow = jest.fn().mockReturnValue({});

  return {
    Ratelimit: mockRatelimit,
  };
});

import { aiGenerationLimiter, checkoutLimiter, searchLimiter, readLimiter, mutationLimiter } from '@/lib/rateLimiter';

describe('rateLimiter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should export aiGenerationLimiter', () => {
    expect(aiGenerationLimiter).toBeDefined();
    expect(typeof aiGenerationLimiter.limit).toBe('function');
  });

  it('should export checkoutLimiter', () => {
    expect(checkoutLimiter).toBeDefined();
    expect(typeof checkoutLimiter.limit).toBe('function');
  });

  it('should export searchLimiter', () => {
    expect(searchLimiter).toBeDefined();
    expect(typeof searchLimiter.limit).toBe('function');
  });

  it('should export readLimiter', () => {
    expect(readLimiter).toBeDefined();
    expect(typeof readLimiter.limit).toBe('function');
  });

  it('should export mutationLimiter', () => {
    expect(mutationLimiter).toBeDefined();
    expect(typeof mutationLimiter.limit).toBe('function');
  });

  it('should allow requests through limiter', async () => {
    const identifier = 'test-user-1';

    const result = await aiGenerationLimiter.limit(identifier);

    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('limit');
    expect(result).toHaveProperty('remaining');
    expect(result).toHaveProperty('reset');
  });
});
