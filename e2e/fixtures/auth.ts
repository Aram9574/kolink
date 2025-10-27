import { test as base, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

/**
 * E2E Test Fixtures for Authentication
 *
 * Provides authenticated browser contexts for testing protected routes
 * without having to manually sign in for each test.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export type AuthenticatedUser = {
  email: string;
  password: string;
  userId: string;
  accessToken: string;
};

// Test user credentials (should exist in test database)
export const TEST_USER = {
  email: `test-${Date.now()}@kolink-e2e.test`,
  password: "TestPassword123!",
  name: "E2E Test User",
};

export const TEST_ADMIN = {
  email: "admin@kolink-e2e.test",
  password: "AdminPassword123!",
  name: "E2E Admin User",
};

/**
 * Extended test with authenticated context
 * Usage: test('my test', async ({ authenticatedPage, user }) => { ... })
 */
export const test = base.extend<{
  authenticatedPage: Page;
  user: AuthenticatedUser;
}>({
  authenticatedPage: async ({ page }: { page: Page }, use) => {
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Create test user (or sign in if exists)
    let authResponse = await supabase.auth.signUp({
      email: TEST_USER.email,
      password: TEST_USER.password,
      options: {
        data: {
          full_name: TEST_USER.name,
        },
        emailRedirectTo: undefined, // Skip email confirmation
      },
    });

    // If user already exists, sign in instead
    if (authResponse.error?.message?.includes("already registered")) {
      authResponse = await supabase.auth.signInWithPassword({
        email: TEST_USER.email,
        password: TEST_USER.password,
      });
    }

    if (authResponse.error || !authResponse.data.session) {
      throw new Error(`Auth setup failed: ${authResponse.error?.message}`);
    }

    const { session } = authResponse.data;

    // Inject session into browser storage
    await page.goto("/");
    await page.evaluate(
      ({ session }) => {
        // Inject Supabase session into localStorage
        const supabaseSession = {
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_in: session.expires_in,
          token_type: session.token_type,
          user: session.user,
        };

        localStorage.setItem(
          `sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.split("//")[1]?.split(".")[0]}-auth-token`,
          JSON.stringify(supabaseSession)
        );
      },
      { session }
    );

    // Reload to apply session
    await page.reload();

    await use(page);

    // Cleanup: sign out after test
    await supabase.auth.signOut();
  },

  user: async ({}, use) => {
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Create or sign in test user
    let authResponse = await supabase.auth.signUp({
      email: TEST_USER.email,
      password: TEST_USER.password,
      options: {
        data: {
          full_name: TEST_USER.name,
        },
      },
    });

    if (authResponse.error?.message?.includes("already registered")) {
      authResponse = await supabase.auth.signInWithPassword({
        email: TEST_USER.email,
        password: TEST_USER.password,
      });
    }

    if (authResponse.error || !authResponse.data.session) {
      throw new Error(`User fixture failed: ${authResponse.error?.message}`);
    }

    const userData: AuthenticatedUser = {
      email: TEST_USER.email,
      password: TEST_USER.password,
      userId: authResponse.data.user!.id,
      accessToken: authResponse.data.session.access_token,
    };

    await use(userData);

    // Cleanup
    await supabase.auth.signOut();
  },
});

/**
 * Helper: Create a new user for testing
 */
export async function createTestUser(email: string, password: string, name: string) {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name,
      },
    },
  });

  if (error) {
    throw new Error(`Failed to create test user: ${error.message}`);
  }

  return {
    userId: data.user!.id,
    email,
    accessToken: data.session!.access_token,
  };
}

/**
 * Helper: Delete a test user
 */
export async function deleteTestUser(userId: string) {
  const supabase = createClient(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey
  );

  const { error } = await supabase.auth.admin.deleteUser(userId);

  if (error) {
    console.warn(`Failed to delete test user ${userId}:`, error.message);
  }
}

/**
 * Helper: Give credits to test user
 */
export async function giveCreditsToUser(userId: string, credits: number) {
  const supabase = createClient(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey
  );

  const { error } = await supabase
    .from("profiles")
    .update({ credits })
    .eq("id", userId);

  if (error) {
    throw new Error(`Failed to give credits: ${error.message}`);
  }
}

export { expect };
