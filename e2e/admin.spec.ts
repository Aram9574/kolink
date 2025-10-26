import { test, expect } from "@playwright/test";

// TODO: This test requires authenticated admin user.
// Skip for now until auth fixtures are implemented.
test.skip("admin can access dashboard", async ({ page }) => {
  // Ir directamente al panel de admin
  await page.goto("/admin");

  // Verificar que el texto principal aparece
  await expect(page.getByText("Admin Panel")).toBeVisible();
});
