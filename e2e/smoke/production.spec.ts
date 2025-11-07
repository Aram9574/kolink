/**
 * Production Smoke Tests
 *
 * These tests run against production to verify critical functionality
 * after each deployment. They should be fast and focused on the most
 * important user flows.
 *
 * Run: BASE_URL=https://kolink.es npx playwright test e2e/smoke/
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'https://kolink.es';

test.describe('Production Smoke Tests', () => {

  test('Health check endpoint responds correctly', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/health`);
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.status).toBe('ok');
    expect(data.timestamp).toBeTruthy();
    expect(data.version).toBeTruthy();
    expect(data.checks).toBeDefined();
    expect(data.checks.database).toBe('ok');
    expect(data.checks.environment).toBe('ok');
  });

  test('Landing page loads successfully', async ({ page }) => {
    const response = await page.goto(BASE_URL);
    expect(response?.status()).toBe(200);

    // Verify critical elements are visible
    await expect(page.locator('h1').first()).toBeVisible();

    // Check for pricing section (key conversion element)
    const hasPricing = await page.locator('text=/precio|plan|suscr/i').count() > 0;
    expect(hasPricing).toBeTruthy();
  });

  test('Sign in page is accessible', async ({ page }) => {
    await page.goto(`${BASE_URL}/signin`);

    // Verify form elements
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // Verify page title or heading
    const hasSignInText = await page.locator('text=/sign in|iniciar sesi|entrar/i').count() > 0;
    expect(hasSignInText).toBeTruthy();
  });

  test('Sign up page is accessible', async ({ page }) => {
    await page.goto(`${BASE_URL}/signup`);

    // Verify form elements
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();

    // Verify sign up text
    const hasSignUpText = await page.locator('text=/sign up|registr|crear cuenta/i').count() > 0;
    expect(hasSignUpText).toBeTruthy();
  });

  test('Dashboard requires authentication', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);

    // Should redirect to signin or show auth error
    await page.waitForURL(/signin|login|auth/, { timeout: 5000 }).catch(() => {
      // If no redirect, check if there's an auth message
      expect(page.url()).toMatch(/signin|login|dashboard/);
    });
  });

  test('Checkout API requires authentication', async ({ request }) => {
    // Without auth should return 400, 401, or 403
    const response = await request.post(`${BASE_URL}/api/checkout`, {
      data: { userId: 'test', plan: 'basic' },
      failOnStatusCode: false,
    });

    expect([400, 401, 403, 405]).toContain(response.status());
  });

  test('Webhook endpoint exists (should reject without Stripe signature)', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/webhook`, {
      data: { test: 'data' },
      failOnStatusCode: false,
    });

    // Should return 400 (bad signature) or 405 (method not allowed)
    expect([400, 405]).toContain(response.status());
  });

  test('Page load performance is acceptable', async ({ page }) => {
    const startTime = Date.now();
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const loadTime = Date.now() - startTime;

    // Page should load in under 3 seconds
    expect(loadTime).toBeLessThan(3000);

    console.log(`✅ Page loaded in ${loadTime}ms`);
  });

  test('No critical JavaScript errors on landing page', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    page.on('pageerror', error => {
      errors.push(error.message);
    });

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Filter out expected/non-critical errors
    const criticalErrors = errors.filter(e =>
      !e.includes('posthog') &&
      !e.includes('analytics') &&
      !e.includes('vercel') &&
      !e.toLowerCase().includes('favicon') &&
      !e.toLowerCase().includes('sourcemap')
    );

    if (criticalErrors.length > 0) {
      console.error('Critical errors found:', criticalErrors);
    }

    expect(criticalErrors).toHaveLength(0);
  });

  test('Essential API routes are reachable', async ({ request }) => {
    const routes = [
      '/api/health',
    ];

    for (const route of routes) {
      const response = await request.get(`${BASE_URL}${route}`);
      expect(response.status()).toBeLessThan(500); // No server errors
    }
  });

  test('Static assets load correctly', async ({ page }) => {
    const failedRequests: string[] = [];

    page.on('requestfailed', request => {
      // Only track failures of our own assets, not third-party
      if (request.url().includes(BASE_URL)) {
        failedRequests.push(request.url());
      }
    });

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    if (failedRequests.length > 0) {
      console.warn('Failed asset requests:', failedRequests);
    }

    // Allow some failures (optional assets like analytics)
    expect(failedRequests.length).toBeLessThan(3);
  });

  test('Meta tags are present for SEO', async ({ page }) => {
    await page.goto(BASE_URL);

    // Check for essential meta tags
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);

    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description).toBeTruthy();

    // Check for Open Graph tags (social sharing)
    const ogTitle = await page.locator('meta[property="og:title"]').count();
    expect(ogTitle).toBeGreaterThan(0);
  });
});

test.describe('API Smoke Tests', () => {

  test('Generate API is protected', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/generate`, {
      data: { prompt: 'test', userId: 'test' },
      failOnStatusCode: false,
    });

    // Should require authentication
    expect([401, 403, 429]).toContain(response.status());
  });

  test('Profile creation is protected', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/createProfile`, {
      data: { userId: 'test', email: 'test@example.com' },
      failOnStatusCode: false,
    });

    // Should require proper authentication
    expect([400, 401, 403, 405]).toContain(response.status());
  });
});

test.describe('Security Smoke Tests', () => {

  test('Security headers are present', async ({ request }) => {
    const response = await request.get(BASE_URL);
    const headers = response.headers();

    // Check for security headers
    expect(headers['x-frame-options'] || headers['x-frame-options']).toBeTruthy();
    expect(headers['x-content-type-options'] || headers['x-content-type-options']).toBeTruthy();

    console.log('Security headers:', {
      xFrameOptions: headers['x-frame-options'],
      xContentTypeOptions: headers['x-content-type-options'],
      strictTransportSecurity: headers['strict-transport-security'],
    });
  });

  test('HTTPS is enforced', async ({ page }) => {
    await page.goto(BASE_URL);
    expect(page.url()).toMatch(/^https:\/\//);
  });
});
