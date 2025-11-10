/**
 * Tests for cache utility
 * 
 * In-memory caching with TTL support
 */

import { cache, getCached, cacheKeys, invalidateCache } from '@/lib/cache';

describe('Cache Utility', () => {
  beforeEach(() => {
    cache.clear();
    jest.clearAllMocks();
  });

  describe('getCached', () => {
    it('should fetch and cache data on first call', async () => {
      const fetchFn = jest.fn().mockResolvedValue({ data: 'test' });
      
      const result = await getCached('test-key', fetchFn, 300);
      
      expect(fetchFn).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ data: 'test' });
    });

    it('should return cached data on second call', async () => {
      const fetchFn = jest.fn().mockResolvedValue({ data: 'test' });
      
      await getCached('test-key', fetchFn, 300);
      const result = await getCached('test-key', fetchFn, 300);
      
      expect(fetchFn).toHaveBeenCalledTimes(1); // Only called once
      expect(result).toEqual({ data: 'test' });
    });

    it('should respect TTL and refetch after expiration', async () => {
      jest.useFakeTimers();
      const fetchFn = jest.fn()
        .mockResolvedValueOnce({ data: 'first' })
        .mockResolvedValueOnce({ data: 'second' });
      
      await getCached('test-key', fetchFn, 1); // 1 second TTL
      
      // Fast forward past TTL
      jest.advanceTimersByTime(2000);
      
      const result = await getCached('test-key', fetchFn, 1);
      
      expect(fetchFn).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ data: 'second' });
      
      jest.useRealTimers();
    });
  });

  describe('cache.set', () => {
    it('should set value directly in cache', () => {
      cache.set('direct-key', { value: 'direct' }, 300);
      
      const stats = cache.getStats();
      expect(stats.size).toBe(1);
      expect(stats.keys).toContain('direct-key');
    });
  });

  describe('cache.invalidate', () => {
    it('should remove specific key from cache', async () => {
      const fetchFn = jest.fn().mockResolvedValue({ data: 'test' });
      await getCached('test-key', fetchFn, 300);
      
      cache.invalidate('test-key');
      
      const stats = cache.getStats();
      expect(stats.size).toBe(0);
    });

    it('should not throw if key does not exist', () => {
      expect(() => cache.invalidate('non-existent')).not.toThrow();
    });
  });

  describe('cache.invalidatePattern', () => {
    it('should remove keys matching pattern', async () => {
      const fetchFn = jest.fn().mockResolvedValue({ data: 'test' });
      await getCached('user:123:posts', fetchFn, 300);
      await getCached('user:123:profile', fetchFn, 300);
      await getCached('user:456:posts', fetchFn, 300);
      
      cache.invalidatePattern('user:123:');
      
      const stats = cache.getStats();
      expect(stats.size).toBe(1);
      expect(stats.keys).toContain('user:456:posts');
    });
  });

  describe('cache.clear', () => {
    it('should remove all entries', async () => {
      const fetchFn = jest.fn().mockResolvedValue({ data: 'test' });
      await getCached('key1', fetchFn, 300);
      await getCached('key2', fetchFn, 300);
      await getCached('key3', fetchFn, 300);
      
      cache.clear();
      
      const stats = cache.getStats();
      expect(stats.size).toBe(0);
    });
  });

  describe('cacheKeys helpers', () => {
    it('should generate correct userProfile key', () => {
      const key = cacheKeys.userProfile('user-123');
      expect(key).toBe('user:user-123:profile');
    });

    it('should generate correct userPosts key', () => {
      const key = cacheKeys.userPosts('user-123');
      expect(key).toBe('user:user-123:posts');
    });

    it('should generate correct userStats key', () => {
      const key = cacheKeys.userStats('user-123');
      expect(key).toBe('user:user-123:stats');
    });

    it('should generate correct viralPosts key without topic', () => {
      const key = cacheKeys.viralPosts();
      expect(key).toBe('viral:all');
    });

    it('should generate correct viralPosts key with topic', () => {
      const key = cacheKeys.viralPosts('tech');
      expect(key).toBe('viral:tech');
    });

    it('should generate correct ragRetrieve key', () => {
      const key = cacheKeys.ragRetrieve('user-123', 'AI-content');
      expect(key).toBe('rag:user-123:AI-content');
    });
  });

  describe('invalidateCache helpers', () => {
    it('should invalidate all user keys', async () => {
      const fetchFn = jest.fn().mockResolvedValue({ data: 'test' });
      await getCached('user:123:posts', fetchFn, 300);
      await getCached('user:123:profile', fetchFn, 300);
      await getCached('user:456:posts', fetchFn, 300);
      
      invalidateCache.user('123');
      
      const stats = cache.getStats();
      expect(stats.size).toBe(1);
    });

    it('should invalidate user posts', async () => {
      const fetchFn = jest.fn().mockResolvedValue({ data: 'test' });
      await getCached(cacheKeys.userPosts('123'), fetchFn, 300);
      await getCached(cacheKeys.userStats('123'), fetchFn, 300);
      await getCached(cacheKeys.userProfile('123'), fetchFn, 300);
      
      invalidateCache.userPosts('123');
      
      const stats = cache.getStats();
      expect(stats.size).toBe(1);
      expect(stats.keys).toContain(cacheKeys.userProfile('123'));
    });
  });

  describe('cache.getStats', () => {
    it('should return correct stats', async () => {
      const fetchFn = jest.fn().mockResolvedValue({ data: 'test' });
      await getCached('key1', fetchFn, 300);
      await getCached('key2', fetchFn, 300);
      
      const stats = cache.getStats();
      
      expect(stats.size).toBe(2);
      expect(stats.keys).toHaveLength(2);
      expect(stats.keys).toContain('key1');
      expect(stats.keys).toContain('key2');
    });
  });
});
