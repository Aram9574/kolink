// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN,

  // Adjust sample rate for production (reduce costs and noise)
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Enable profiling for performance monitoring
  profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Configure releases for deployment tracking
  release: process.env.VERCEL_GIT_COMMIT_SHA,
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // IMPORTANT: Do NOT send PII in production for privacy compliance
  sendDefaultPii: false,

  // Maximum breadcrumbs to keep for context
  maxBreadcrumbs: 50,

  // Filter sensitive data before sending to Sentry
  beforeSend(event, hint) {
    // Skip events in development
    if (process.env.NODE_ENV === 'development') {
      return null;
    }

    // Remove sensitive data from request
    if (event.request) {
      // Remove cookies (may contain auth tokens)
      delete event.request.cookies;

      // Remove sensitive headers
      if (event.request.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers['x-api-key'];
        delete event.request.headers.cookie;
      }
    }

    // Remove PII from user context
    if (event.user) {
      // Keep user ID for tracking, but anonymize email
      if (event.user.email) {
        const parts = event.user.email.split('@');
        if (parts.length === 2) {
          event.user.email = `${parts[0].substring(0, 2)}***@${parts[1]}`;
        }
      }
    }

    return event;
  },
});
