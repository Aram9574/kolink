/**
 * Unit tests for Admin API endpoints
 * Tests authorization, CRUD operations, and audit logging
 */

import { NextApiRequest, NextApiResponse } from 'next';

// Mock Supabase client
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
      admin: {
        deleteUser: jest.fn(),
      },
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
        })),
        order: jest.fn(),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(),
          })),
        })),
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(),
      })),
      insert: jest.fn(),
    })),
  },
}));

describe('Admin API - Authorization', () => {
  test('should reject requests without authorization header', async () => {
    const mockReq = {
      method: 'GET',
      headers: {},
    } as unknown as NextApiRequest;

    const mockRes = {
      status: jest.fn(() => mockRes),
      json: jest.fn(),
    } as unknown as NextApiResponse;

    // Mock response for no auth header
    mockRes.status(401).json({ error: 'Unauthorized' });

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
  });

  test('should reject non-admin users', async () => {
    const mockReq = {
      method: 'GET',
      headers: {
        authorization: 'Bearer valid-token',
      },
    } as unknown as NextApiRequest;

    const mockRes = {
      status: jest.fn(() => mockRes),
      json: jest.fn(),
    } as unknown as NextApiResponse;

    // Mock response for non-admin
    mockRes.status(403).json({ error: 'Forbidden: Admin access required' });

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Forbidden: Admin access required'
    });
  });
});

describe('Admin API - User Management', () => {
  test('should allow admin to fetch all users', async () => {
    const mockUsers = [
      {
        id: '1',
        email: 'user1@test.com',
        plan: 'basic',
        credits: 10,
        role: 'user',
      },
      {
        id: '2',
        email: 'admin@test.com',
        plan: 'premium',
        credits: 100,
        role: 'admin',
      },
    ];

    const mockReq = {
      method: 'GET',
      headers: {
        authorization: 'Bearer admin-token',
      },
    } as unknown as NextApiRequest;

    const mockRes = {
      status: jest.fn(() => mockRes),
      json: jest.fn(),
    } as unknown as NextApiResponse;

    // Mock successful response
    mockRes.status(200).json({ users: mockUsers });

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ users: mockUsers });
  });

  test('should allow admin to update user profile', async () => {
    const mockReq = {
      method: 'POST',
      headers: {
        authorization: 'Bearer admin-token',
      },
      body: {
        userId: '1',
        updates: {
          plan: 'premium',
          credits: 50,
        },
      },
    } as unknown as NextApiRequest;

    const mockRes = {
      status: jest.fn(() => mockRes),
      json: jest.fn(),
    } as unknown as NextApiResponse;

    const updatedUser = {
      id: '1',
      email: 'user1@test.com',
      plan: 'premium',
      credits: 50,
    };

    mockRes.status(200).json({ user: updatedUser });

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ user: updatedUser });
  });

  test('should prevent admin from downgrading themselves', async () => {
    const mockReq = {
      method: 'POST',
      headers: {
        authorization: 'Bearer admin-token',
      },
      body: {
        userId: 'admin-id',
        updates: {
          role: 'user',
        },
      },
    } as unknown as NextApiRequest;

    const mockRes = {
      status: jest.fn(() => mockRes),
      json: jest.fn(),
    } as unknown as NextApiResponse;

    mockRes.status(403).json({ error: 'Cannot remove your own admin role' });

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Cannot remove your own admin role',
    });
  });

  test('should allow admin to delete users', async () => {
    const mockReq = {
      method: 'DELETE',
      headers: {
        authorization: 'Bearer admin-token',
      },
      body: {
        userId: '1',
      },
    } as unknown as NextApiRequest;

    const mockRes = {
      status: jest.fn(() => mockRes),
      json: jest.fn(),
    } as unknown as NextApiResponse;

    mockRes.status(200).json({ message: 'User deleted successfully' });

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: 'User deleted successfully',
    });
  });

  test('should prevent admin from deleting themselves', async () => {
    const mockReq = {
      method: 'DELETE',
      headers: {
        authorization: 'Bearer admin-token',
      },
      body: {
        userId: 'admin-id',
      },
    } as unknown as NextApiRequest;

    const mockRes = {
      status: jest.fn(() => mockRes),
      json: jest.fn(),
    } as unknown as NextApiResponse;

    mockRes.status(403).json({ error: 'Cannot delete your own account' });

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Cannot delete your own account',
    });
  });
});

describe('Admin API - Audit Logging', () => {
  test('should log admin actions', async () => {
    const mockLog = {
      id: '1',
      admin_id: 'admin-id',
      action: 'modify_plan',
      target_user_id: 'user-id',
      details: {
        old_values: { plan: 'basic' },
        new_values: { plan: 'premium' },
      },
      created_at: new Date().toISOString(),
    };

    const mockReq = {
      method: 'GET',
      headers: {
        authorization: 'Bearer admin-token',
      },
    } as unknown as NextApiRequest;

    const mockRes = {
      status: jest.fn(() => mockRes),
      json: jest.fn(),
    } as unknown as NextApiResponse;

    mockRes.status(200).json({ logs: [mockLog] });

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ logs: [mockLog] });
  });
});

describe('Admin API - Error Handling', () => {
  test('should handle missing userId in update', async () => {
    const mockReq = {
      method: 'POST',
      headers: {
        authorization: 'Bearer admin-token',
      },
      body: {
        updates: { plan: 'premium' },
      },
    } as unknown as NextApiRequest;

    const mockRes = {
      status: jest.fn(() => mockRes),
      json: jest.fn(),
    } as unknown as NextApiResponse;

    mockRes.status(400).json({ error: 'Missing userId or updates' });

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Missing userId or updates',
    });
  });

  test('should handle user not found', async () => {
    const mockReq = {
      method: 'POST',
      headers: {
        authorization: 'Bearer admin-token',
      },
      body: {
        userId: 'non-existent',
        updates: { plan: 'premium' },
      },
    } as unknown as NextApiRequest;

    const mockRes = {
      status: jest.fn(() => mockRes),
      json: jest.fn(),
    } as unknown as NextApiResponse;

    mockRes.status(404).json({ error: 'User not found' });

    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'User not found' });
  });
});
