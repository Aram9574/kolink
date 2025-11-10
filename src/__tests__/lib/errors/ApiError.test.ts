/**
 * Unit tests for API Error classes
 */

import {
  ApiError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  RateLimitError,
  InternalServerError,
  ServiceUnavailableError,
  InsufficientCreditsError,
  ExternalApiError,
  DatabaseError,
} from '@/lib/errors/ApiError';

describe('ApiError', () => {
  it('should create base error with correct properties', () => {
    const error = new ApiError('Test error', 500, 'TEST_ERROR', { foo: 'bar' });

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.message).toBe('Test error');
    expect(error.statusCode).toBe(500);
    expect(error.code).toBe('TEST_ERROR');
    expect(error.details).toEqual({ foo: 'bar' });
    expect(error.isOperational).toBe(true);
  });

  it('should serialize to JSON correctly', () => {
    const error = new ApiError('Test error', 500, 'TEST_ERROR', { foo: 'bar' });
    const json = error.toJSON();

    expect(json).toEqual({
      error: 'Test error',
      code: 'TEST_ERROR',
      statusCode: 500,
      details: { foo: 'bar' },
    });
  });

  it('should omit details if not provided', () => {
    const error = new ApiError('Test error', 500, 'TEST_ERROR');
    const json = error.toJSON();

    expect(json).toEqual({
      error: 'Test error',
      code: 'TEST_ERROR',
      statusCode: 500,
    });
  });

  it('should mark as non-operational when specified', () => {
    const error = new ApiError('Test error', 500, 'TEST_ERROR', {}, false);

    expect(error.isOperational).toBe(false);
  });
});

describe('BadRequestError', () => {
  it('should create 400 error', () => {
    const error = new BadRequestError('Invalid input');

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toBeInstanceOf(BadRequestError);
    expect(error.message).toBe('Invalid input');
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('BAD_REQUEST');
    expect(error.isOperational).toBe(true);
  });

  it('should accept details', () => {
    const error = new BadRequestError('Invalid input', { field: 'email' });

    expect(error.details).toEqual({ field: 'email' });
  });
});

describe('UnauthorizedError', () => {
  it('should create 401 error', () => {
    const error = new UnauthorizedError();

    expect(error.statusCode).toBe(401);
    expect(error.code).toBe('UNAUTHORIZED');
    expect(error.message).toBe('Unauthorized. Authentication required.');
  });

  it('should accept custom message', () => {
    const error = new UnauthorizedError('Token expired');

    expect(error.message).toBe('Token expired');
  });
});

describe('ForbiddenError', () => {
  it('should create 403 error', () => {
    const error = new ForbiddenError();

    expect(error.statusCode).toBe(403);
    expect(error.code).toBe('FORBIDDEN');
  });
});

describe('NotFoundError', () => {
  it('should create 404 error', () => {
    const error = new NotFoundError('User');

    expect(error.statusCode).toBe(404);
    expect(error.code).toBe('NOT_FOUND');
    expect(error.message).toBe('User not found');
  });

  it('should use default resource name', () => {
    const error = new NotFoundError();

    expect(error.message).toBe('Resource not found');
  });
});

describe('ConflictError', () => {
  it('should create 409 error', () => {
    const error = new ConflictError('Email already exists');

    expect(error.statusCode).toBe(409);
    expect(error.code).toBe('CONFLICT');
    expect(error.message).toBe('Email already exists');
  });
});

describe('ValidationError', () => {
  it('should create 422 error', () => {
    const error = new ValidationError('Validation failed', {
      fields: { email: 'Invalid email format' }
    });

    expect(error.statusCode).toBe(422);
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.details).toEqual({
      fields: { email: 'Invalid email format' }
    });
  });
});

describe('RateLimitError', () => {
  it('should create 429 error', () => {
    const error = new RateLimitError(60);

    expect(error.statusCode).toBe(429);
    expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(error.message).toBe('Too many requests. Please try again later.');
    expect(error.details).toHaveProperty('retryAfter', 60);
  });

  it('should work without retryAfter', () => {
    const error = new RateLimitError();

    expect(error.details).toHaveProperty('retryAfter', undefined);
  });
});

describe('InternalServerError', () => {
  it('should create 500 error marked as non-operational', () => {
    const error = new InternalServerError('Database connection failed');

    expect(error.statusCode).toBe(500);
    expect(error.code).toBe('INTERNAL_ERROR');
    expect(error.isOperational).toBe(false);
  });

  it('should use default message', () => {
    const error = new InternalServerError();

    expect(error.message).toBe('Internal server error');
  });
});

describe('ServiceUnavailableError', () => {
  it('should create 503 error', () => {
    const error = new ServiceUnavailableError('OpenAI');

    expect(error.statusCode).toBe(503);
    expect(error.code).toBe('SERVICE_UNAVAILABLE');
    expect(error.message).toBe('OpenAI is currently unavailable');
  });
});

describe('InsufficientCreditsError', () => {
  it('should create 402 error with credit details', () => {
    const error = new InsufficientCreditsError(10, 5);

    expect(error.statusCode).toBe(402);
    expect(error.code).toBe('INSUFFICIENT_CREDITS');
    expect(error.message).toBe('Insufficient credits to perform this action');
    expect(error.details).toEqual({
      required: 10,
      available: 5,
    });
  });

  it('should use default values', () => {
    const error = new InsufficientCreditsError();

    expect(error.details).toEqual({
      required: 1,
      available: 0,
    });
  });
});

describe('ExternalApiError', () => {
  it('should create 503 error with service details', () => {
    const originalError = new Error('Connection timeout');
    const error = new ExternalApiError('Stripe', originalError, { orderId: '123' });

    expect(error.statusCode).toBe(503);
    expect(error.code).toBe('EXTERNAL_API_ERROR');
    expect(error.message).toBe('External API error: Stripe');
    expect(error.details).toEqual({
      service: 'Stripe',
      originalError: 'Connection timeout',
      orderId: '123',
    });
  });

  it('should work without original error', () => {
    const error = new ExternalApiError('OpenAI');

    expect(error.details).toHaveProperty('service', 'OpenAI');
    expect(error.details).toHaveProperty('originalError', undefined);
  });
});

describe('DatabaseError', () => {
  it('should create 500 error marked as non-operational', () => {
    const originalError = new Error('Unique constraint violation');
    const error = new DatabaseError('user insert', originalError);

    expect(error.statusCode).toBe(500);
    expect(error.code).toBe('DATABASE_ERROR');
    expect(error.message).toBe('Database error: user insert');
    expect(error.isOperational).toBe(false);
    expect(error.details).toEqual({
      operation: 'user insert',
      originalError: 'Unique constraint violation',
    });
  });
});
