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
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

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
    // Create admin Supabase client for user creation (bypasses email confirmation)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Create test user using admin client (or skip if exists)
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: TEST_USER.email,
      password: TEST_USER.password,
      email_confirm: true, // Auto-confirm email for tests
      user_metadata: {
        full_name: TEST_USER.name,
      },
    });

    // Ignore "already registered" errors - user exists from previous test run
    if (createError && !createError.message.toLowerCase().includes("already been registered")) {
      throw new Error(`Failed to create test user: ${createError.message}`);
    }

    // Sign in with regular client to get a valid session
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email: TEST_USER.email,
      password: TEST_USER.password,
    });

    if (signInError || !authData.session) {
      throw new Error(`Auth sign in failed: ${signInError?.message}`);
    }

    const { session } = authData;

    // Ensure profile exists with onboarding completed
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({
        id: authData.user.id,
        email: TEST_USER.email,
        full_name: TEST_USER.name,
        features: { onboarding_completed: true },
        credits: 10, // Give test user some credits
      }, { onConflict: "id" });

    if (profileError) {
      console.warn(`Warning: Failed to create profile: ${profileError.message}`);
    }

    // Extract the project reference from the Supabase URL for localStorage key
    const projectRef = supabaseUrl.split("//")[1]?.split(".")[0];
    const storageKey = `sb-${projectRef}-auth-token`;

    // Inject session into browser storage
    await page.goto("/");
    await page.evaluate(
      ({ session, storageKey }) => {
        // Inject Supabase session into localStorage
        localStorage.setItem(
          storageKey,
          JSON.stringify(session)
        );
      },
      { session, storageKey }
    );

    // Reload to apply session
    await page.reload();

    // Wait for authentication to be recognized
    await page.waitForTimeout(1000);

    await use(page);

    // Cleanup: sign out after test
    await supabase.auth.signOut();
  },

  user: async ({}, use) => {
    // Create admin client for user creation
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Create test user using admin client (or skip if exists)
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: TEST_USER.email,
      password: TEST_USER.password,
      email_confirm: true,
      user_metadata: {
        full_name: TEST_USER.name,
      },
    });

    // Ignore "already registered" errors - user exists from previous test run
    if (createError && !createError.message.toLowerCase().includes("already been registered")) {
      throw new Error(`Failed to create test user: ${createError.message}`);
    }

    // Sign in with regular client to get session
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email: TEST_USER.email,
      password: TEST_USER.password,
    });

    if (signInError || !authData.session) {
      throw new Error(`User fixture sign in failed: ${signInError?.message}`);
    }

    // Ensure profile exists with onboarding completed
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({
        id: authData.user.id,
        email: TEST_USER.email,
        full_name: TEST_USER.name,
        features: { onboarding_completed: true },
        credits: 10, // Give test user some credits
      }, { onConflict: "id" });

    if (profileError) {
      console.warn(`Warning: Failed to create profile: ${profileError.message}`);
    }

    const userDataResult: AuthenticatedUser = {
      email: TEST_USER.email,
      password: TEST_USER.password,
      userId: authData.user!.id,
      accessToken: authData.session.access_token,
    };

    await use(userDataResult);

    // Cleanup
    await supabase.auth.signOut();
  },
});

/**
 * Helper: Create a new user for testing
 */
export async function createTestUser(email: string, password: string, name: string) {
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: name,
    },
  });

  if (error) {
    throw new Error(`Failed to create test user: ${error.message}`);
  }

  // Sign in to get access token
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data: authData } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  return {
    userId: data.user!.id,
    email,
    accessToken: authData?.session?.access_token || "",
  };
}

/**
 * Helper: Delete a test user
 */
export async function deleteTestUser(userId: string) {
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

  if (error) {
    console.warn(`Failed to delete test user ${userId}:`, error.message);
  }
}

/**
 * Helper: Give credits to test user
 */
export async function giveCreditsToUser(userId: string, credits: number) {
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ credits })
    .eq("id", userId);

  if (error) {
    throw new Error(`Failed to give credits: ${error.message}`);
  }
}

export { expect };
