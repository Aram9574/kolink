// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a user loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust sample rate for production (10% of transactions)
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Replay entire sessions that have errors
  replaysOnErrorSampleRate: 1.0,

  // Sample 10% of sessions for general replay
  replaysSessionSampleRate: 0.1,

  // Configure releases for deployment tracking
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || 'development',

  // Do NOT send PII for privacy compliance
  sendDefaultPii: false,

  // Maximum breadcrumbs for debugging context
  maxBreadcrumbs: 50,

  // Session Replay integration with privacy settings
  integrations: [
    Sentry.replayIntegration({
      // Mask all text content (PII protection)
      maskAllText: true,
      // Block all media elements (images, videos)
      blockAllMedia: true,
      // Mask all input values
      maskAllInputs: true,
    }),
  ],

  // Filter out sensitive data before sending
  beforeSend(event) {
    // Skip events in development
    if (process.env.NODE_ENV === 'development') {
      return null;
    }

    // Remove sensitive data from breadcrumbs
    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => {
        if (breadcrumb.data) {
          // Remove tokens and keys
          delete breadcrumb.data.authorization;
          delete breadcrumb.data.token;
          delete breadcrumb.data.apiKey;
          delete breadcrumb.data.password;
          delete breadcrumb.data.credit_card;
        }
        return breadcrumb;
      });
    }

    // Anonymize user email
    if (event.user?.email) {
      const parts = event.user.email.split('@');
      if (parts.length === 2) {
        event.user.email = `${parts[0].substring(0, 2)}***@${parts[1]}`;
      }
    }

    // Remove sensitive query parameters from URLs
    if (event.request?.url) {
      try {
        const url = new URL(event.request.url);
        // Remove sensitive query params
        url.searchParams.delete('token');
        url.searchParams.delete('key');
        url.searchParams.delete('password');
        event.request.url = url.toString();
      } catch (e) {
        // URL parsing failed, keep original
      }
    }

    return event;
  },
});
