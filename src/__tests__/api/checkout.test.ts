/**
 * Tests for /api/checkout endpoint
 * 
 * Critical payment flow - must be thoroughly tested
 */

import { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/checkout';
import { mockNextRequest, mockNextResponse, mockUser } from '../utils/mocks';

// Mock dependencies
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: mockUser },
        error: null,
      }),
    },
  })),
}));

jest.mock('@/lib/stripe', () => ({
  stripe: {
    checkout: {
      sessions: {
        create: jest.fn().mockResolvedValue({
          id: 'cs_test_mock',
          url: 'https://checkout.stripe.com/test',
        }),
      },
    },
  },
}));

jest.mock('@/lib/rateLimiter', () => ({
  limiter: {
    limit: jest.fn().mockResolvedValue({
      success: true,
      reset: 0,
    }),
  },
}));

describe('/api/checkout', () => {
  let req: Partial<NextApiRequest>;
  let res: any;

  beforeEach(() => {
    req = mockNextRequest('POST');
    res = mockNextResponse();
    jest.clearAllMocks();
  });

  describe('Request Validation', () => {
    it('should reject non-POST requests', async () => {
      req.method = 'GET';
      
      await handler(req as NextApiRequest, res as NextApiResponse);
      
      expect(res.status).toHaveBeenCalledWith(405);
      expect(res.json).toHaveBeenCalledWith({
        error: expect.stringContaining('no permitido')
      });
    });

    it('should reject requests without userId', async () => {
      req.body = { plan: 'basic' };
      
      await handler(req as NextApiRequest, res as NextApiResponse);
      
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should reject requests without plan', async () => {
      req.body = { userId: 'user-123' };
      
      await handler(req as NextApiRequest, res as NextApiResponse);
      
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should reject invalid plan names', async () => {
      req.body = { userId: 'user-123', plan: 'invalid-plan' };
      
      await handler(req as NextApiRequest, res as NextApiResponse);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: expect.stringContaining('inválido')
      });
    });
  });

  describe('Valid Plans', () => {
    it('should accept basic plan', async () => {
      process.env.STRIPE_PRICE_ID_BASIC = 'price_test_basic';
      req.body = { userId: 'user-123', plan: 'basic' };
      await handler(req as NextApiRequest, res as NextApiResponse);
      expect(res.status).not.toHaveBeenCalledWith(400);
    });

    it('should accept standard plan', async () => {
      process.env.STRIPE_PRICE_ID_STANDARD = 'price_test_standard';
      req.body = { userId: 'user-123', plan: 'standard' };
      await handler(req as NextApiRequest, res as NextApiResponse);
      expect(res.status).not.toHaveBeenCalledWith(400);
    });

    it('should accept premium plan', async () => {
      process.env.STRIPE_PRICE_ID_PREMIUM = 'price_test_premium';
      req.body = { userId: 'user-123', plan: 'premium' };
      await handler(req as NextApiRequest, res as NextApiResponse);
      expect(res.status).not.toHaveBeenCalledWith(400);
    });
  });

  describe('Stripe Integration', () => {
    it('should create checkout session with correct parameters', async () => {
      const stripe = require('@/lib/stripe').stripe;
      process.env.STRIPE_PRICE_ID_BASIC = 'price_test_basic';
      
      req.body = { userId: 'user-123', plan: 'basic' };
      
      await handler(req as NextApiRequest, res as NextApiResponse);
      
      expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'payment',
          line_items: expect.arrayContaining([
            expect.objectContaining({
              price: 'price_test_basic',
              quantity: 1,
            })
          ]),
          metadata: expect.objectContaining({
            user_id: 'user-123',
            selected_plan: 'basic',
          }),
        })
      );
    });

    it('should return checkout URL on success', async () => {
      process.env.STRIPE_PRICE_ID_BASIC = 'price_test_basic';
      req.body = { userId: 'user-123', plan: 'basic' };
      
      await handler(req as NextApiRequest, res as NextApiResponse);
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        url: 'https://checkout.stripe.com/test',
      });
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      const { limiter } = require('@/lib/rateLimiter');
      limiter.limit.mockResolvedValueOnce({
        success: false,
        reset: 60000,
      });

      req.body = { userId: 'user-123', plan: 'basic' };
      
      await handler(req as NextApiRequest, res as NextApiResponse);
      
      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.setHeader).toHaveBeenCalledWith('Retry-After', expect.any(Number));
    });
  });
});
