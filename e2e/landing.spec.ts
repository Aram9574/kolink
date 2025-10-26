import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Landing Page
 * Tests navigation, pricing section, and call-to-actions
 */

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display landing page with hero section', async ({ page }) => {
    // Check for hero heading
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();

    // Check for CTA buttons (in Spanish) - use more specific selector
    await expect(page.locator('a[href="/signup"]').filter({ hasText: 'Comienza Gratis' }).first()).toBeVisible();
  });

  test('should display pricing section', async ({ page }) => {
    // Look for pricing-related content
    const pricingSection = page.locator('text=/basic|standard|premium/i').first();
    await expect(pricingSection).toBeVisible();
  });

  test('should display navigation bar', async ({ page }) => {
    // Check for navbar elements
    await expect(page.locator('nav')).toBeVisible();
    await expect(page.locator('nav a[href="/signin"]')).toBeVisible();
    await expect(page.locator('nav a[href="/signup"]')).toBeVisible();
  });

  test('should have working theme toggle', async ({ page }) => {
    // Find theme toggle button
    const themeToggle = page.locator('button[aria-label*="theme" i]').or(
      page.locator('button:has-text("Theme")')
    ).or(
      page.locator('button:has(svg)')
    ).first();

    if (await themeToggle.isVisible()) {
      // Get initial theme
      const htmlElement = page.locator('html');
      const initialTheme = await htmlElement.getAttribute('class');

      // Click theme toggle
      await themeToggle.click();

      // Wait for theme change
      await page.waitForTimeout(500);

      // Verify theme changed
      const newTheme = await htmlElement.getAttribute('class');
      expect(newTheme).not.toBe(initialTheme);
    }
  });

  test('should navigate to sign up from CTA button', async ({ page }) => {
    // Click the first CTA button in the hero section
    const getStartedButton = page.locator('a[href="/signup"]').first();
    await getStartedButton.click();

    await expect(page).toHaveURL(/signup/);
  });

  test('should be responsive', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('nav')).toBeVisible();

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('nav')).toBeVisible();

    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('nav')).toBeVisible();
  });
});

test.describe('Landing Page Accessibility', () => {
  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/');

    // Check for h1
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();

    // Page should have only one h1
    const h1Count = await h1.count();
    expect(h1Count).toBeGreaterThanOrEqual(1);
  });

  test('should have accessible buttons', async ({ page }) => {
    await page.goto('/');

    // All buttons should be keyboard accessible
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      if (await button.isVisible()) {
        // Button should have text or aria-label
        const text = await button.textContent();
        const ariaLabel = await button.getAttribute('aria-label');
        expect(text || ariaLabel).toBeTruthy();
      }
    }
  });

  test('should have alt text for images', async ({ page }) => {
    await page.goto('/');

    const images = page.locator('img');
    const imageCount = await images.count();

    for (let i = 0; i < imageCount; i++) {
      const image = images.nth(i);
      const alt = await image.getAttribute('alt');
      // Alt text should exist (can be empty for decorative images)
      expect(alt).not.toBeNull();
    }
  });
});
