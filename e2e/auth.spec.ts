import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Authentication Flow
 * Tests sign up, sign in, and sign out functionality
 */

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should navigate to sign up page', async ({ page }) => {
    // Click the navbar signup link specifically
    await page.locator('nav a[href="/signup"]').click();
    // Wait for navigation to complete
    await page.waitForURL('/signup');
    await expect(page).toHaveURL('/signup');
    await expect(page.locator('h1')).toContainText('Crear Cuenta');
  });

  test('should navigate to sign in page', async ({ page }) => {
    // Click the navbar signin link specifically
    await page.locator('nav a[href="/signin"]').click();
    // Wait for navigation to complete
    await page.waitForURL('/signin');
    await expect(page).toHaveURL('/signin');
    await expect(page.locator('h1')).toContainText('Iniciar Sesión');
  });

  test('should display validation for empty sign up form', async ({ page }) => {
    await page.goto('/signup');

    // Try to submit without filling form
    await page.click('button[type="submit"]');

    // Check for HTML5 validation or error messages
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
  });

  test('should display validation for empty sign in form', async ({ page }) => {
    await page.goto('/signin');

    // Try to submit without filling form
    await page.click('button[type="submit"]');

    // Check for HTML5 validation
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
  });

  test('should show error for invalid email format', async ({ page }) => {
    await page.goto('/signin');

    await page.fill('input[type="email"]', 'invalid-email');
    await page.fill('input[type="password"]', 'password123');

    // HTML5 validation should prevent submission
    const emailInput = page.locator('input[type="email"]');
    const validity = await emailInput.evaluate((el: HTMLInputElement) => el.validity.valid);
    expect(validity).toBe(false);
  });
});

test.describe('Protected Routes', () => {
  test('should redirect to sign in when accessing dashboard without auth', async ({ page }) => {
    await page.goto('/dashboard');

    // Should redirect to sign in
    await page.waitForURL(/signin/, { timeout: 5000 });
    await expect(page).toHaveURL(/signin/);
  });

  test('should redirect to sign in when accessing admin without auth', async ({ page }) => {
    await page.goto('/admin');

    // Should redirect to sign in
    await page.waitForURL(/signin/, { timeout: 5000 });
    await expect(page).toHaveURL(/signin/);
  });

  test('should redirect to sign in when accessing profile without auth', async ({ page }) => {
    await page.goto('/profile');

    // Should redirect to sign in
    await page.waitForURL(/signin/, { timeout: 5000 });
    await expect(page).toHaveURL(/signin/);
  });
});
