import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for Kolink v0.7.3
 * ------------------------------------------
 * • Test directory: ./e2e
 * • Base URL: http://localhost:3000
 * • Browsers: Chromium, Firefox, WebKit
 * • CI-friendly (auto retries, no test.only)
 * • Local dev server auto-launch
 */

export default defineConfig({
  testDir: "./e2e",

  // Run tests in parallel
  fullyParallel: true,

  // Prevent accidental test.only commits
  forbidOnly: !!process.env.CI,

  // Retry failed tests automatically in CI
  retries: process.env.CI ? 2 : 0,

  // Limit workers in CI
  workers: process.env.CI ? 1 : undefined,

  // Reporter setup
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
  ],

  // Shared settings for all tests
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",          // Capture trace for failed tests
    screenshot: "only-on-failure",    // Save screenshot when a test fails
    video: "retain-on-failure",       // Keep video for failed tests
    headless: true,                   // Run in headless mode
  },

  // Browsers to run on
  projects: [
    {
      name: "Chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "Firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "WebKit",
      use: { ...devices["Desktop Safari"] },
    },
  ],

  // Automatically start local dev server before running tests
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120000, // wait up to 2 min for server start
  },
});
