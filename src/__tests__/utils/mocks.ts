/**
 * Test Mocks and Utilities
 * 
 * Common mocks for Supabase, Stripe, and OpenAI used across tests
 */

import { Session, User } from '@supabase/supabase-js';

// Mock Supabase User
export const mockUser: User = {
  id: 'test-user-id-123',
  email: 'test@example.com',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: '2024-01-01T00:00:00Z',
};

// Mock Supabase Session
export const mockSession: Session = {
  access_token: 'mock-access-token',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: Date.now() / 1000 + 3600,
  refresh_token: 'mock-refresh-token',
  user: mockUser,
};

// Mock Supabase Client
export const mockSupabaseClient = {
  auth: {
    getUser: jest.fn().mockResolvedValue({
      data: { user: mockUser },
      error: null,
    }),
    getSession: jest.fn().mockResolvedValue({
      data: { session: mockSession },
      error: null,
    }),
  },
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({
      data: null,
      error: null,
    }),
  })),
};

// Mock Stripe Client
export const mockStripeClient = {
  checkout: {
    sessions: {
      create: jest.fn().mockResolvedValue({
        id: 'cs_test_mock',
        url: 'https://checkout.stripe.com/test',
      }),
      retrieve: jest.fn().mockResolvedValue({
        id: 'cs_test_mock',
        line_items: {
          data: [{
            price: { id: 'price_test_basic' }
          }]
        }
      }),
    },
  },
  subscriptions: {
    list: jest.fn().mockResolvedValue({
      data: []
    }),
    update: jest.fn().mockResolvedValue({
      id: 'sub_test_mock'
    }),
  },
  webhooks: {
    constructEvent: jest.fn(),
  },
};

// Mock OpenAI Client
export const mockOpenAIClient = {
  chat: {
    completions: {
      create: jest.fn().mockResolvedValue({
        choices: [{
          message: {
            content: 'Generated content from OpenAI mock'
          }
        }]
      }),
    },
  },
  embeddings: {
    create: jest.fn().mockResolvedValue({
      data: [{
        embedding: new Array(1536).fill(0.1)
      }]
    }),
  },
};

// Mock Next.js API Request
export function mockNextRequest(
  method: string = 'GET',
  body: any = {},
  headers: Record<string, string> = {}
): any {
  return {
    method,
    body,
    headers,
    query: {},
    cookies: {},
  };
}

// Mock Next.js API Response
export function mockNextResponse(): any {
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
  };
  return res;
}

// Helper to create mock profile
export function mockProfile(overrides: Partial<any> = {}) {
  return {
    id: mockUser.id,
    email: mockUser.email,
    credits: 10,
    plan: 'free',
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

// Helper to create mock post
export function mockPost(overrides: Partial<any> = {}) {
  return {
    id: 'post-123',
    user_id: mockUser.id,
    prompt: 'Test prompt',
    generated_text: 'Generated test content',
    viral_score: 75,
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}
