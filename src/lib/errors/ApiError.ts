/**
 * Custom API Error Classes
 * Provides structured error handling across the application
 */

/**
 * Base API Error class
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: Record<string, unknown>;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    details?: Record<string, unknown>,
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);

    // Set the prototype explicitly
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  toJSON() {
    return {
      error: this.message,
      code: this.code,
      statusCode: this.statusCode,
      ...(this.details && { details: this.details }),
    };
  }
}

/**
 * 400 Bad Request - Invalid input
 */
export class BadRequestError extends ApiError {
  constructor(message: string = 'Bad request', details?: Record<string, unknown>) {
    super(message, 400, 'BAD_REQUEST', details);
    Object.setPrototypeOf(this, BadRequestError.prototype);
  }
}

/**
 * 401 Unauthorized - Authentication required
 */
export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Unauthorized. Authentication required.', details?: Record<string, unknown>) {
    super(message, 401, 'UNAUTHORIZED', details);
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

/**
 * 403 Forbidden - Insufficient permissions
 */
export class ForbiddenError extends ApiError {
  constructor(message: string = 'Forbidden. Insufficient permissions.', details?: Record<string, unknown>) {
    super(message, 403, 'FORBIDDEN', details);
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

/**
 * 404 Not Found - Resource not found
 */
export class NotFoundError extends ApiError {
  constructor(resource: string = 'Resource', details?: Record<string, unknown>) {
    super(`${resource} not found`, 404, 'NOT_FOUND', details);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * 409 Conflict - Resource conflict
 */
export class ConflictError extends ApiError {
  constructor(message: string = 'Resource conflict', details?: Record<string, unknown>) {
    super(message, 409, 'CONFLICT', details);
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

/**
 * 422 Unprocessable Entity - Validation failed
 */
export class ValidationError extends ApiError {
  constructor(message: string = 'Validation failed', details?: Record<string, unknown>) {
    super(message, 422, 'VALIDATION_ERROR', details);
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * 429 Too Many Requests - Rate limit exceeded
 */
export class RateLimitError extends ApiError {
  constructor(retryAfter?: number, details?: Record<string, unknown>) {
    super(
      'Too many requests. Please try again later.',
      429,
      'RATE_LIMIT_EXCEEDED',
      { retryAfter, ...details }
    );
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

/**
 * 500 Internal Server Error - Generic server error
 */
export class InternalServerError extends ApiError {
  constructor(message: string = 'Internal server error', details?: Record<string, unknown>) {
    super(message, 500, 'INTERNAL_ERROR', details, false); // Not operational
    Object.setPrototypeOf(this, InternalServerError.prototype);
  }
}

/**
 * 503 Service Unavailable - External service error
 */
export class ServiceUnavailableError extends ApiError {
  constructor(service: string, details?: Record<string, unknown>) {
    super(`${service} is currently unavailable`, 503, 'SERVICE_UNAVAILABLE', details);
    Object.setPrototypeOf(this, ServiceUnavailableError.prototype);
  }
}

/**
 * Insufficient credits error
 */
export class InsufficientCreditsError extends ApiError {
  constructor(required: number = 1, available: number = 0) {
    super(
      'Insufficient credits to perform this action',
      402,
      'INSUFFICIENT_CREDITS',
      { required, available }
    );
    Object.setPrototypeOf(this, InsufficientCreditsError.prototype);
  }
}

/**
 * External API error (OpenAI, Stripe, etc.)
 */
export class ExternalApiError extends ApiError {
  constructor(service: string, originalError?: Error, details?: Record<string, unknown>) {
    super(
      `External API error: ${service}`,
      503,
      'EXTERNAL_API_ERROR',
      {
        service,
        originalError: originalError?.message,
        ...details,
      }
    );
    Object.setPrototypeOf(this, ExternalApiError.prototype);
  }
}

/**
 * Database error
 */
export class DatabaseError extends ApiError {
  constructor(operation: string, originalError?: Error, details?: Record<string, unknown>) {
    super(
      `Database error: ${operation}`,
      500,
      'DATABASE_ERROR',
      {
        operation,
        originalError: originalError?.message,
        ...details,
      },
      false // Not operational
    );
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }
}
