import { test, expect, giveCreditsToUser } from "./fixtures/auth";

/**
 * E2E Tests for Content Generation Flow
 * Tests the complete flow: prompt → AI generation → credit deduction → save
 */

test.describe("Content Generation Flow", () => {
  test("should generate post, deduct credit, and save successfully", async ({
    authenticatedPage,
    user,
  }) => {
    // Setup: Give user 10 credits
    await giveCreditsToUser(user.userId, 10);

    // Navigate to dashboard
    await authenticatedPage.goto("/dashboard");

    // Wait for page to load
    await expect(authenticatedPage.locator("h1")).toContainText(/Dashboard|Panel/i);

    // Check initial credits display
    const creditsDisplay = authenticatedPage.locator('[data-testid="credits-display"]').first();
    await expect(creditsDisplay).toBeVisible({ timeout: 10000 });

    // Fill in prompt
    const promptInput = authenticatedPage.locator('textarea[name="prompt"]');
    await expect(promptInput).toBeVisible();
    await promptInput.fill("Escribe un post breve sobre inteligencia artificial");

    // Click generate button
    const generateButton = authenticatedPage.locator('button:has-text("Generar")');
    await expect(generateButton).toBeVisible();
    await generateButton.click();

    // Wait for generation to complete (max 15 seconds)
    await expect(authenticatedPage.locator(".generated-content")).toBeVisible({ timeout: 15000 });

    // Verify generated content appears
    const generatedContent = await authenticatedPage
      .locator(".generated-content")
      .textContent();
    expect(generatedContent).toBeTruthy();
    expect(generatedContent!.length).toBeGreaterThan(10);

    // Verify credits were deducted
    // Note: This assumes the UI updates credits after generation
    const updatedCredits = await authenticatedPage
      .locator('[data-testid="credits-display"]')
      .first()
      .textContent();
    expect(updatedCredits).toContain("9"); // Should be 9 after deduction

    // Verify post was saved in history
    const postHistory = authenticatedPage.locator('[data-testid="post-history"]');
    await expect(postHistory).toBeVisible({ timeout: 5000 });

    // Verify the generated post appears in history
    const lastPost = postHistory.locator(".post-item").first();
    await expect(lastPost).toBeVisible();

    const lastPostContent = await lastPost.textContent();
    expect(lastPostContent).toContain("inteligencia artificial");
  });

  test("should show error when user has no credits", async ({
    authenticatedPage,
    user,
  }) => {
    // Setup: Give user 0 credits
    await giveCreditsToUser(user.userId, 0);

    // Navigate to dashboard
    await authenticatedPage.goto("/dashboard");

    // Wait for page to load
    await expect(authenticatedPage.locator("h1")).toContainText(/Dashboard|Panel/i);

    // Fill in prompt
    const promptInput = authenticatedPage.locator('textarea[name="prompt"]');
    await promptInput.fill("Test prompt");

    // Click generate button
    const generateButton = authenticatedPage.locator('button:has-text("Generar")');
    await generateButton.click();

    // Verify error message appears
    await expect(authenticatedPage.locator(".error-message, .toast-error")).toContainText(
      /sin créditos|no credits|insuficientes/i,
      { timeout: 5000 }
    );
  });

  test("should regenerate content successfully", async ({
    authenticatedPage,
    user,
  }) => {
    // Setup: Give user 10 credits
    await giveCreditsToUser(user.userId, 10);

    // Navigate to dashboard
    await authenticatedPage.goto("/dashboard");

    // Generate first post
    const promptInput = authenticatedPage.locator('textarea[name="prompt"]');
    await promptInput.fill("Escribe sobre tecnología");

    const generateButton = authenticatedPage.locator('button:has-text("Generar")');
    await generateButton.click();

    // Wait for first generation
    await expect(authenticatedPage.locator(".generated-content")).toBeVisible({ timeout: 15000 });

    const firstContent = await authenticatedPage
      .locator(".generated-content")
      .textContent();

    // Click regenerate button
    const regenerateButton = authenticatedPage.locator('button:has-text("Regenerar")');
    await expect(regenerateButton).toBeVisible();
    await regenerateButton.click();

    // Wait for regeneration
    await authenticatedPage.waitForTimeout(2000); // Wait for new content

    const secondContent = await authenticatedPage
      .locator(".generated-content")
      .textContent();

    // Verify content changed
    expect(secondContent).not.toBe(firstContent);

    // Verify 2 credits were deducted (1 for each generation)
    const updatedCredits = await authenticatedPage
      .locator('[data-testid="credits-display"]')
      .first()
      .textContent();
    expect(updatedCredits).toContain("8");
  });

  test("should save generated post for later editing", async ({
    authenticatedPage,
    user,
  }) => {
    // Setup
    await giveCreditsToUser(user.userId, 5);
    await authenticatedPage.goto("/dashboard");

    // Generate post
    const promptInput = authenticatedPage.locator('textarea[name="prompt"]');
    await promptInput.fill("Post de prueba para guardar");

    const generateButton = authenticatedPage.locator('button:has-text("Generar")');
    await generateButton.click();

    // Wait for generation
    await expect(authenticatedPage.locator(".generated-content")).toBeVisible({ timeout: 15000 });

    // Click save button
    const saveButton = authenticatedPage.locator('button:has-text("Guardar")');
    if (await saveButton.isVisible()) {
      await saveButton.click();

      // Verify success message
      await expect(authenticatedPage.locator(".toast-success, .success-message")).toContainText(
        /guardado|saved/i,
        { timeout: 5000 }
      );
    }

    // Reload page and verify post persists
    await authenticatedPage.reload();

    const postHistory = authenticatedPage.locator('[data-testid="post-history"]');
    await expect(postHistory).toBeVisible({ timeout: 5000 });

    // Verify saved post appears
    await expect(postHistory.locator(".post-item")).toHaveCount(1, { timeout: 5000 });
  });
});

test.describe("Generation Edge Cases", () => {
  test("should handle empty prompt gracefully", async ({ authenticatedPage, user }) => {
    await giveCreditsToUser(user.userId, 5);
    await authenticatedPage.goto("/dashboard");

    // Try to generate with empty prompt
    const generateButton = authenticatedPage.locator('button:has-text("Generar")');
    await generateButton.click();

    // Should show validation error or disabled button
    const isDisabled = await generateButton.isDisabled();
    if (!isDisabled) {
      // If not disabled, should show error message
      await expect(authenticatedPage.locator(".error-message")).toBeVisible({ timeout: 3000 });
    }
  });

  test("should handle API errors gracefully", async ({ authenticatedPage, user }) => {
    await giveCreditsToUser(user.userId, 5);
    await authenticatedPage.goto("/dashboard");

    // Intercept API and force error
    await authenticatedPage.route("**/api/post/generate", (route) => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: "Internal server error" }),
      });
    });

    const promptInput = authenticatedPage.locator('textarea[name="prompt"]');
    await promptInput.fill("Test prompt");

    const generateButton = authenticatedPage.locator('button:has-text("Generar")');
    await generateButton.click();

    // Should show error message
    await expect(authenticatedPage.locator(".error-message, .toast-error")).toBeVisible({
      timeout: 5000,
    });
  });
});
