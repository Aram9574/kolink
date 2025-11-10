/**
 * Unit tests for Validation System
 */

import { z } from 'zod';
import { validateRequest, formatZodErrors, apiEndpointSchemas } from '@/lib/validation';

describe('validateRequest', () => {
  const testSchema = z.object({
    name: z.string().min(1),
    age: z.number().min(0).max(150),
    email: z.string().email(),
  });

  it('should validate correct data successfully', () => {
    const data = {
      name: 'John Doe',
      age: 30,
      email: 'john@example.com',
    };

    const result = validateRequest(testSchema, data);

    expect(result.success).toBe(true);
    expect(result.data).toEqual(data);
    expect(result.errors).toBeUndefined();
  });

  it('should return errors for invalid data', () => {
    const data = {
      name: '',
      age: 200,
      email: 'invalid-email',
    };

    const result = validateRequest(testSchema, data);

    expect(result.success).toBe(false);
    expect(result.data).toBeUndefined();
    expect(result.errors).toBeDefined();
    if (result.errors) {
      expect(result.errors.issues.length).toBeGreaterThan(0);
    }
  });

  it('should handle missing required fields', () => {
    const data = {
      name: 'John',
    };

    const result = validateRequest(testSchema, data);

    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
  });

  it('should coerce types when possible', () => {
    const schema = z.object({
      count: z.coerce.number(),
    });

    const data = {
      count: '42',
    };

    const result = validateRequest(schema, data);

    expect(result.success).toBe(true);
    expect(result.data?.count).toBe(42);
  });
});

describe('formatZodErrors', () => {
  it('should format Zod errors into record structure', () => {
    const schema = z.object({
      name: z.string().min(1),
      email: z.string().email(),
    });

    const result = schema.safeParse({
      name: '',
      email: 'invalid-email',
    });

    if (!result.success) {
      const formatted = formatZodErrors(result.error);

      expect(formatted.name).toBeDefined();
      expect(formatted.email).toBeDefined();
      expect(Array.isArray(formatted.name)).toBe(true);
      expect(Array.isArray(formatted.email)).toBe(true);
    } else {
      fail('Should have validation errors');
    }
  });

  it('should handle nested path errors', () => {
    const schema = z.object({
      user: z.object({
        profile: z.object({
          age: z.number(),
        }),
      }),
    });

    const result = schema.safeParse({
      user: {
        profile: {
          age: 'not-a-number',
        },
      },
    });

    if (!result.success) {
      const formatted = formatZodErrors(result.error);

      expect(formatted['user.profile.age']).toBeDefined();
    } else {
      fail('Should have validation errors');
    }
  });

  it('should group multiple errors for same field', () => {
    const schema = z.object({
      password: z.string().min(8).regex(/\d/),
    });

    const result = schema.safeParse({
      password: 'short',
    });

    if (!result.success) {
      const formatted = formatZodErrors(result.error);

      expect(formatted.password).toBeDefined();
      expect(formatted.password.length).toBeGreaterThan(0);
    } else {
      fail('Should have validation errors');
    }
  });

  it('should handle root level errors', () => {
    const schema = z.string().email();

    const result = schema.safeParse('invalid-email');

    if (!result.success) {
      const formatted = formatZodErrors(result.error);

      expect(Object.keys(formatted).length).toBeGreaterThan(0);
    } else {
      fail('Should have validation errors');
    }
  });
});

describe('API Endpoint Schemas', () => {
  describe('postGenerate', () => {
    it('should validate valid post generation request', () => {
      const data = {
        prompt: 'Write about AI trends',
        language: 'es-ES',
      };

      const result = validateRequest(apiEndpointSchemas.postGenerate, data);

      expect(result.success).toBe(true);
      expect(result.data?.prompt).toBe('Write about AI trends');
      expect(result.data?.language).toBe('es-ES');
    });

    it('should reject empty prompt', () => {
      const data = {
        prompt: '',
      };

      const result = validateRequest(apiEndpointSchemas.postGenerate, data);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should apply defaults', () => {
      const data = {
        prompt: 'Test prompt',
      };

      const result = validateRequest(apiEndpointSchemas.postGenerate, data);

      expect(result.success).toBe(true);
      expect(result.data?.language).toBe('es-ES');
    });
  });

  describe('checkout', () => {
    it('should validate valid checkout request', () => {
      const data = {
        userId: 'user_123',
        plan: 'premium',
      };

      const result = validateRequest(apiEndpointSchemas.checkout, data);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(data);
    });

    it('should reject invalid plan', () => {
      const data = {
        userId: 'user_123',
        plan: 'invalid_plan',
      };

      const result = validateRequest(apiEndpointSchemas.checkout, data);

      expect(result.success).toBe(false);
    });

    it('should require userId and plan', () => {
      const data = {};

      const result = validateRequest(apiEndpointSchemas.checkout, data);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      if (result.errors) {
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });
  });

  describe('personalizedGenerate', () => {
    it('should validate valid RAG generation request', () => {
      const data = {
        topic: 'AI in healthcare',
        intent: 'educativo',
        userId: 'user_123',
      };

      const result = validateRequest(apiEndpointSchemas.personalizedGenerate, data);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data?.topic).toBe('AI in healthcare');
        expect(result.data?.intent).toBe('educativo');
      }
    });

    it('should reject invalid intent', () => {
      const data = {
        userId: 'user_123',
        topic: 'Test topic',
        intent: 'invalid_intent',
      };

      const result = validateRequest(apiEndpointSchemas.personalizedGenerate, data);

      expect(result.success).toBe(false);
    });

    it('should reject too short topic', () => {
      const data = {
        userId: 'user_123',
        topic: 'AI',
        intent: 'educativo',
      };

      const result = validateRequest(apiEndpointSchemas.personalizedGenerate, data);

      expect(result.success).toBe(false);
    });
  });
});
