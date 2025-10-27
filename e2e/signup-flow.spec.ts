import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

/**
 * E2E Tests for Complete Signup Flow
 * Tests: Signup → Email Confirmation → Login → Dashboard Access
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

test.describe("Complete Signup Flow", () => {
  test("should sign up new user successfully", async ({ page }) => {
    const testEmail = `signup-test-${Date.now()}@kolink.test`;
    const testPassword = "TestPassword123!";

    // Navigate to signup page
    await page.goto("/signup");

    // Verify signup form is visible
    await expect(page.locator("h1")).toContainText(/Crear Cuenta|Sign Up/i);

    // Fill signup form
    await page.fill('input[type="email"], input[name="email"]', testEmail);
    await page.fill('input[type="password"], input[name="password"]', testPassword);

    // Submit form
    await page.click('button[type="submit"], button:has-text("Crear")');

    // Wait for redirect or success message
    await page.waitForURL(/dashboard|signin|signup/, { timeout: 10000 });

    // Verify user was created in Supabase
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: users } = await supabase.auth.admin.listUsers();
    const newUser = users?.users.find((u) => u.email === testEmail);

    expect(newUser).toBeDefined();
    expect(newUser?.email).toBe(testEmail);

    // Verify profile was created
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("email", testEmail)
      .single();

    expect(profile).toBeDefined();
    expect(profile?.email).toBe(testEmail);
    expect(profile?.credits).toBe(0); // New users start with 0 credits
    expect(profile?.plan).toBeNull(); // No plan by default

    // Cleanup
    if (newUser) {
      await supabase.auth.admin.deleteUser(newUser.id);
    }
  });

  test("should prevent signup with existing email", async ({ page }) => {
    const existingEmail = "existing-user@kolink.test";
    const password = "TestPassword123!";

    // Create user first
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    await supabase.auth.signUp({
      email: existingEmail,
      password,
    });

    // Try to sign up again with same email
    await page.goto("/signup");

    await page.fill('input[type="email"]', existingEmail);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator(".error-message, .toast-error, .alert-danger")).toContainText(
      /ya existe|already exist|registered/i,
      { timeout: 5000 }
    );

    // Cleanup
    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: users } = await adminSupabase.auth.admin.listUsers();
    const user = users?.users.find((u) => u.email === existingEmail);
    if (user) {
      await adminSupabase.auth.admin.deleteUser(user.id);
    }
  });

  test("should validate email format", async ({ page }) => {
    await page.goto("/signup");

    // Fill with invalid email
    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill("invalid-email");

    // Check HTML5 validation
    const isValid = await emailInput.evaluate((el: HTMLInputElement) => el.validity.valid);
    expect(isValid).toBe(false);
  });

  test("should validate password strength", async ({ page }) => {
    await page.goto("/signup");

    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');

    await emailInput.fill("test@example.com");

    // Try weak password
    await passwordInput.fill("123");

    // Try to submit
    await page.click('button[type="submit"]');

    // Should show error or prevent submission
    const submitButton = page.locator('button[type="submit"]');
    const isDisabled = await submitButton.isDisabled();

    if (!isDisabled) {
      // If not disabled, should show validation error
      await expect(page.locator(".error-message, .validation-error")).toBeVisible({
        timeout: 3000,
      });
    }
  });
});

test.describe("Sign In After Signup", () => {
  test("should sign in with newly created account", async ({ page }) => {
    const testEmail = `signin-test-${Date.now()}@kolink.test`;
    const testPassword = "TestPassword123!";

    // Create user via API
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
    });

    expect(signupError).toBeNull();
    expect(signupData.user).toBeDefined();

    // Sign out if auto-signed in
    await supabase.auth.signOut();

    // Navigate to signin page
    await page.goto("/signin");

    // Fill signin form
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);

    // Submit
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await page.waitForURL(/dashboard/, { timeout: 10000 });

    // Verify dashboard loads
    await expect(page.locator("h1, h2")).toContainText(/Dashboard|Panel/i);

    // Verify user is authenticated (check for sign out button or user menu)
    await expect(page.locator('button:has-text("Cerrar"), [data-testid="user-menu"]')).toBeVisible(
      { timeout: 5000 }
    );

    // Cleanup
    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);
    if (signupData.user) {
      await adminSupabase.auth.admin.deleteUser(signupData.user.id);
    }
  });

  test("should show error for wrong password", async ({ page }) => {
    const testEmail = `wrongpass-test-${Date.now()}@kolink.test`;
    const correctPassword = "CorrectPassword123!";
    const wrongPassword = "WrongPassword123!";

    // Create user
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    await supabase.auth.signUp({
      email: testEmail,
      password: correctPassword,
    });

    await supabase.auth.signOut();

    // Try to sign in with wrong password
    await page.goto("/signin");

    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', wrongPassword);
    await page.click('button[type="submit"]');

    // Should show error
    await expect(page.locator(".error-message, .toast-error, .alert-danger")).toContainText(
      /inválid|incorrect|wrong|password/i,
      { timeout: 5000 }
    );

    // Cleanup
    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: users } = await adminSupabase.auth.admin.listUsers();
    const user = users?.users.find((u) => u.email === testEmail);
    if (user) {
      await adminSupabase.auth.admin.deleteUser(user.id);
    }
  });

  test("should show error for non-existent user", async ({ page }) => {
    await page.goto("/signin");

    await page.fill('input[type="email"]', "nonexistent@kolink.test");
    await page.fill('input[type="password"]', "SomePassword123!");
    await page.click('button[type="submit"]');

    // Should show error
    await expect(page.locator(".error-message, .toast-error")).toContainText(
      /no exist|not found|invalid/i,
      { timeout: 5000 }
    );
  });
});

test.describe("Email Confirmation Flow", () => {
  test.skip("should send confirmation email on signup", async ({ page }) => {
    // TODO: Implement email testing with a service like Mailhog or Ethereal
    // This test requires email interception to verify confirmation links
  });

  test.skip("should confirm email via link", async ({ page }) => {
    // TODO: Implement after email testing setup
    // This would:
    // 1. Create user
    // 2. Intercept confirmation email
    // 3. Extract confirmation link
    // 4. Visit link and verify account is confirmed
  });
});

test.describe("Sign Out", () => {
  test("should sign out successfully", async ({ page }) => {
    const testEmail = `signout-test-${Date.now()}@kolink.test`;
    const testPassword = "TestPassword123!";

    // Create and sign in user
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
    });

    // Navigate to app (should be authenticated)
    await page.goto("/dashboard");

    // Wait for dashboard to load
    await expect(page.locator("h1, h2")).toContainText(/Dashboard|Panel/i, { timeout: 10000 });

    // Click sign out button
    const signOutButton = page.locator(
      'button:has-text("Cerrar"), button:has-text("Sign Out"), a:has-text("Cerrar")'
    );
    await expect(signOutButton).toBeVisible({ timeout: 5000 });
    await signOutButton.click();

    // Should redirect to landing or signin page
    await page.waitForURL(/signin|^\/$/, { timeout: 10000 });

    // Verify user cannot access protected routes
    await page.goto("/dashboard");
    await page.waitForURL(/signin/, { timeout: 5000 });

    // Cleanup
    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);
    if (data.user) {
      await adminSupabase.auth.admin.deleteUser(data.user.id);
    }
  });
});
