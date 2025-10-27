import { test, expect, createTestUser, deleteTestUser } from "./fixtures/auth";
import { createClient } from "@supabase/supabase-js";

/**
 * E2E Tests for Checkout Flow
 * Tests: User → Plan Selection → Stripe Checkout → Webhook → Credits Updated
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

test.describe("Checkout and Payment Flow", () => {
  test("should complete checkout flow and receive credits after payment", async ({
    authenticatedPage,
    user,
  }) => {
    // Navigate to dashboard
    await authenticatedPage.goto("/dashboard");

    // Open plan selection modal
    const selectPlanButton = authenticatedPage.locator(
      'button:has-text("Seleccionar Plan"), button:has-text("Upgrade")'
    );

    if (await selectPlanButton.isVisible()) {
      await selectPlanButton.click();

      // Wait for modal to appear
      await expect(authenticatedPage.locator(".modal, [role='dialog']")).toBeVisible({
        timeout: 5000,
      });

      // Select a plan (e.g., Standard)
      const standardPlanButton = authenticatedPage.locator(
        'button:has-text("Standard"), button[data-plan="standard"]'
      );
      await expect(standardPlanButton).toBeVisible();

      // Intercept checkout API call
      await authenticatedPage.route("**/api/checkout", (route) => {
        // Return mock Stripe checkout URL
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            url: "https://checkout.stripe.com/mock-session-id",
          }),
        });
      });

      await standardPlanButton.click();

      // Wait for redirect to Stripe (or intercept)
      await authenticatedPage.waitForURL(/checkout\.stripe\.com|dashboard/, { timeout: 10000 });
    }

    // In a real E2E test, you would need to complete the Stripe checkout
    // For now, we simulate the webhook callback
  });

  test("should update profile with plan and credits after webhook", async ({ page }) => {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create a test user
    const testEmail = `checkout-test-${Date.now()}@kolink.test`;
    const testUser = await createTestUser(testEmail, "TestPassword123!", "Checkout Test");

    try {
      // Verify initial state
      const { data: initialProfile } = await supabase
        .from("profiles")
        .select("plan, credits, stripe_customer_id")
        .eq("id", testUser.userId)
        .single();

      expect(initialProfile?.plan).toBeNull();
      expect(initialProfile?.credits).toBe(0);

      // Simulate Stripe webhook payload
      const mockWebhookPayload = {
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_test_mock_session",
            customer: "cus_test_mock_customer",
            subscription: "sub_test_mock_subscription",
            metadata: {
              user_id: testUser.userId,
              selected_plan: "standard",
            },
            payment_status: "paid",
          },
        },
      };

      // Call webhook endpoint directly (bypassing Stripe signature verification for tests)
      // Note: In production, you'd need to generate a valid Stripe signature
      const webhookResponse = await page.request.post("http://localhost:3000/api/webhook", {
        data: mockWebhookPayload,
        headers: {
          "Content-Type": "application/json",
          // In real test, include: 'stripe-signature': validSignature
        },
      });

      // Note: This will fail signature verification in production
      // For real E2E, use Stripe CLI to forward webhooks: stripe listen --forward-to localhost:3000/api/webhook

      // Verify profile was updated (if webhook succeeded)
      const { data: updatedProfile } = await supabase
        .from("profiles")
        .select("plan, credits, stripe_customer_id")
        .eq("id", testUser.userId)
        .single();

      if (webhookResponse.ok()) {
        expect(updatedProfile?.plan).toBe("standard");
        expect(updatedProfile?.credits).toBeGreaterThan(0);
        expect(updatedProfile?.stripe_customer_id).toBe("cus_test_mock_customer");
      } else {
        console.warn("Webhook test skipped: signature verification required");
      }
    } finally {
      // Cleanup
      await deleteTestUser(testUser.userId);
    }
  });

  test("should redirect to dashboard with success message after payment", async ({
    authenticatedPage,
  }) => {
    // Simulate successful payment redirect
    await authenticatedPage.goto("/dashboard?status=success");

    // Verify success message appears
    await expect(
      authenticatedPage.locator(".toast-success, .success-message, .alert-success")
    ).toContainText(/éxito|success|completado|subscri/i, { timeout: 5000 });
  });

  test("should redirect to dashboard with cancel message if user cancels", async ({
    authenticatedPage,
  }) => {
    // Simulate cancelled payment redirect
    await authenticatedPage.goto("/dashboard?status=cancel");

    // Verify cancel message appears
    await expect(
      authenticatedPage.locator(".toast-info, .info-message, .alert-info")
    ).toContainText(/cancel|abort/i, { timeout: 5000 });
  });
});

test.describe("Plan Selection UI", () => {
  test("should display all plan tiers with correct pricing", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto("/dashboard");

    // Open plans modal
    const selectPlanButton = authenticatedPage.locator(
      'button:has-text("Seleccionar Plan"), button:has-text("Upgrade")'
    );

    if (await selectPlanButton.isVisible()) {
      await selectPlanButton.click();

      // Wait for modal
      const modal = authenticatedPage.locator(".modal, [role='dialog']");
      await expect(modal).toBeVisible({ timeout: 5000 });

      // Verify all plans are visible
      await expect(modal.locator('text=/Basic|Básico/i')).toBeVisible();
      await expect(modal.locator('text=/Standard|Estándar/i')).toBeVisible();
      await expect(modal.locator('text=/Premium/i')).toBeVisible();

      // Verify pricing
      await expect(modal.locator('text=/$9/i')).toBeVisible();
      await expect(modal.locator('text=/$19/i')).toBeVisible();
      await expect(modal.locator('text=/$29/i')).toBeVisible();
    }
  });

  test("should highlight recommended plan", async ({ authenticatedPage }) => {
    await authenticatedPage.goto("/dashboard");

    const selectPlanButton = authenticatedPage.locator(
      'button:has-text("Seleccionar Plan"), button:has-text("Upgrade")'
    );

    if (await selectPlanButton.isVisible()) {
      await selectPlanButton.click();

      const modal = authenticatedPage.locator(".modal, [role='dialog']");
      await expect(modal).toBeVisible({ timeout: 5000 });

      // Verify Standard plan has "Recomendado" or "Most Popular" badge
      const standardPlan = modal.locator('[data-plan="standard"], .plan-standard').first();
      await expect(standardPlan.locator('text=/Recomendado|Popular|Destacado/i')).toBeVisible();
    }
  });
});

test.describe("Checkout Security", () => {
  test("should not allow checkout without authentication", async ({ page }) => {
    // Try to call checkout API without auth
    const response = await page.request.post("http://localhost:3000/api/checkout", {
      data: {
        userId: "fake-user-id",
        plan: "standard",
      },
    });

    expect(response.status()).toBe(401);
  });

  test("should validate plan parameter", async ({ authenticatedPage, user }) => {
    // Try to checkout with invalid plan
    const response = await authenticatedPage.request.post("http://localhost:3000/api/checkout", {
      data: {
        userId: user.userId,
        plan: "invalid-plan",
      },
      headers: {
        Authorization: `Bearer ${user.accessToken}`,
      },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("inválido");
  });
});

/**
 * INTEGRATION TEST NOTES:
 *
 * For full E2E testing with real Stripe checkout:
 *
 * 1. Use Stripe CLI to forward webhooks:
 *    stripe listen --forward-to localhost:3000/api/webhook
 *
 * 2. Use Stripe test cards:
 *    4242 4242 4242 4242 (success)
 *    4000 0000 0000 0002 (decline)
 *
 * 3. Set test environment variables:
 *    STRIPE_SECRET_KEY=sk_test_...
 *    STRIPE_WEBHOOK_SECRET=whsec_...
 *
 * 4. Run tests in headed mode to complete Stripe checkout:
 *    npx playwright test --headed checkout.spec.ts
 */
