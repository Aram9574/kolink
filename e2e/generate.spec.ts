import { test, expect } from "@playwright/test";

// TODO: This test requires authenticated user with credits.
// Skip for now until auth fixtures are implemented.
test.skip("generate post from prompt", async ({ page }) => {
  await page.goto("/dashboard");

  // Rellenar el campo de prompt
  await page.fill('textarea[name="prompt"]', "Escribe un post inspirador sobre IA y salud digital");

  // Hacer clic en generar
  await page.click("text=Generar");

  // Esperar resultado
  await expect(page.getByText(/IA|salud digital/i)).toBeVisible({ timeout: 10000 });
});
