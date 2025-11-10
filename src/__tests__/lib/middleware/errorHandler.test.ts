/**
 * Unit tests for Error Handler Middleware
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { withErrorHandler, safeDatabaseOperation, safeExternalApiCall } from '@/lib/middleware/errorHandler';
import { ApiError, UnauthorizedError, InternalServerError } from '@/lib/errors/ApiError';

// Mock dependencies
jest.mock('@/lib/logger');
jest.mock('@sentry/nextjs');

describe('withErrorHandler', () => {
  let mockReq: Partial<NextApiRequest>;
  let mockRes: Partial<NextApiResponse>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });

    mockReq = {
      method: 'POST',
      url: '/api/test',
    };

    mockRes = {
      status: statusMock,
    };
  });

  it('should call handler and pass through successful response', async () => {
    const handler = jest.fn().mockResolvedValue(undefined);
    const wrappedHandler = withErrorHandler(handler);

    await wrappedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(handler).toHaveBeenCalledWith(mockReq, mockRes);
    expect(statusMock).not.toHaveBeenCalled();
  });

  it('should catch ApiError and return JSON response', async () => {
    const error = new UnauthorizedError('Token expired');
    const handler = jest.fn().mockRejectedValue(error);
    const wrappedHandler = withErrorHandler(handler);

    await wrappedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith({
      error: 'Token expired',
      code: 'UNAUTHORIZED',
      statusCode: 401,
    });
  });

  it('should handle non-ApiError exceptions', async () => {
    const error = new Error('Unexpected error');
    const handler = jest.fn().mockRejectedValue(error);
    const wrappedHandler = withErrorHandler(handler);

    await wrappedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith({
      error: expect.any(String),
      code: 'INTERNAL_ERROR',
    });
  });

  it('should handle Supabase errors with proper status codes', async () => {
    const supabaseError = {
      code: '23505', // Unique violation
      message: 'duplicate key value violates unique constraint',
    };
    const handler = jest.fn().mockRejectedValue(supabaseError);
    const wrappedHandler = withErrorHandler(handler);

    await wrappedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(statusMock).toHaveBeenCalledWith(409);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'DATABASE_ERROR',
      })
    );
  });

  it('should include error details in ApiError response', async () => {
    const error = new ApiError('Validation failed', 422, 'VALIDATION_ERROR', {
      field: 'email',
      reason: 'Invalid format',
    });
    const handler = jest.fn().mockRejectedValue(error);
    const wrappedHandler = withErrorHandler(handler);

    await wrappedHandler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(jsonMock).toHaveBeenCalledWith({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      statusCode: 422,
      details: {
        field: 'email',
        reason: 'Invalid format',
      },
    });
  });
});

describe('safeDatabaseOperation', () => {
  it('should return result on successful operation', async () => {
    const operation = jest.fn().mockResolvedValue({ id: '123', name: 'Test' });
    const result = await safeDatabaseOperation(operation, 'test operation');

    expect(result).toEqual({ id: '123', name: 'Test' });
    expect(operation).toHaveBeenCalled();
  });

  it('should throw ApiError on database error', async () => {
    const dbError = {
      code: '23505',
      message: 'duplicate key violation',
    };
    const operation = jest.fn().mockRejectedValue(dbError);

    await expect(
      safeDatabaseOperation(operation, 'insert user')
    ).rejects.toThrow(ApiError);

    await expect(
      safeDatabaseOperation(operation, 'insert user')
    ).rejects.toMatchObject({
      statusCode: 500,
      code: 'DATABASE_ERROR',
      message: 'Database error: insert user',
    });
  });

  it('should wrap generic errors as ApiError', async () => {
    const genericError = new Error('Generic error');
    const operation = jest.fn().mockRejectedValue(genericError);

    await expect(
      safeDatabaseOperation(operation, 'fetch data')
    ).rejects.toThrow(ApiError);

    await expect(
      safeDatabaseOperation(operation, 'fetch data')
    ).rejects.toMatchObject({
      statusCode: 500,
      code: 'DATABASE_ERROR',
      message: 'Database operation failed: fetch data',
    });
  });
});

describe('safeExternalApiCall', () => {
  it('should return result on successful API call', async () => {
    const apiCall = jest.fn().mockResolvedValue({ data: 'success' });
    const result = await safeExternalApiCall(apiCall, 'OpenAI');

    expect(result).toEqual({ data: 'success' });
    expect(apiCall).toHaveBeenCalled();
  });

  it('should throw ApiError on external API failure', async () => {
    const apiError = new Error('API timeout');
    const apiCall = jest.fn().mockRejectedValue(apiError);

    await expect(
      safeExternalApiCall(apiCall, 'Stripe')
    ).rejects.toThrow(ApiError);

    await expect(
      safeExternalApiCall(apiCall, 'Stripe')
    ).rejects.toMatchObject({
      statusCode: 503,
      code: 'EXTERNAL_API_ERROR',
      message: 'Stripe is currently unavailable',
    });
  });

  it('should include error message in details', async () => {
    const apiError = new Error('Connection refused');
    const apiCall = jest.fn().mockRejectedValue(apiError);

    try {
      await safeExternalApiCall(apiCall, 'OpenAI');
      fail('Should have thrown');
    } catch (error) {
      if (error instanceof ApiError) {
        expect(error.details).toMatchObject({
          service: 'OpenAI',
          error: 'Connection refused',
        });
      }
    }
  });
});
