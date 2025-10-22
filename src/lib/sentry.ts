/**
 * Sentry Error Tracking Utilities
 * Helper functions for capturing errors and monitoring
 */

import * as Sentry from "@sentry/nextjs";

/**
 * Capture an error with context
 */
export const captureError = (
  error: Error,
  context?: Record<string, unknown>
) => {
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', error, 'Context:', context);
    return;
  }

  Sentry.captureException(error, {
    extra: context,
  });
};

/**
 * Capture a message with severity level
 */
export const captureMessage = (
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: Record<string, unknown>
) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[${level.toUpperCase()}] ${message}`, context);
    return;
  }

  Sentry.captureMessage(message, {
    level,
    extra: context,
  });
};

/**
 * Set user context for error tracking
 */
export const setUser = (user: {
  id: string;
  email?: string;
  username?: string;
}) => {
  Sentry.setUser(user);
};

/**
 * Clear user context
 */
export const clearUser = () => {
  Sentry.setUser(null);
};

/**
 * Add breadcrumb for tracking user actions
 */
export const addBreadcrumb = (
  message: string,
  category: string,
  data?: Record<string, unknown>
) => {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: 'info',
  });
};

/**
 * Track API endpoint performance
 */
export const trackAPICall = async <T>(
  endpoint: string,
  method: string,
  fn: () => Promise<T>
): Promise<T> => {
  return await Sentry.withMonitor(
    `API ${method} ${endpoint}`,
    async () => {
      try {
        return await fn();
      } catch (error) {
        captureError(error as Error, {
          endpoint,
          method,
        });
        throw error;
      }
    },
    { schedule: { type: 'crontab', value: '* * * * *' } }
  );
};

/**
 * Track user action performance
 */
export const trackUserAction = async <T>(
  action: string,
  fn: () => Promise<T>
): Promise<T> => {
  addBreadcrumb(action, 'user.action');

  try {
    return await fn();
  } catch (error) {
    captureError(error as Error, { action });
    throw error;
  }
};

export default Sentry;
