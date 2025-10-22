/**
 * PostHog Analytics Client
 * Tracks user events and product analytics
 */

import posthog from "posthog-js";

let posthogInitialized = false;

export function initPostHog() {
  if (typeof window === "undefined") return;
  if (posthogInitialized) return;

  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_API_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com";

  if (!apiKey) {
    console.warn("[PostHog] API key not configured. Analytics disabled.");
    return;
  }

  posthog.init(apiKey, {
    api_host: host,
    loaded: (posthog) => {
      if (process.env.NODE_ENV === "development") {
        posthog.opt_out_capturing(); // Disable in development
        console.log("[PostHog] Analytics disabled in development");
      }
    },
    capture_pageview: false, // We'll manually capture pageviews
    capture_pageleave: true,
    autocapture: false, // We'll manually track events
  });

  posthogInitialized = true;
  console.log("[PostHog] Analytics initialized");
}

export function identifyUser(userId: string, properties?: Record<string, unknown>) {
  if (typeof window === "undefined" || !posthogInitialized) return;

  posthog.identify(userId, properties);
}

export function trackEvent(event: string, properties?: Record<string, unknown>) {
  if (typeof window === "undefined" || !posthogInitialized) return;

  posthog.capture(event, properties);
}

export function trackPageView(pageName?: string) {
  if (typeof window === "undefined" || !posthogInitialized) return;

  posthog.capture("$pageview", {
    $current_url: window.location.href,
    page_name: pageName,
  });
}

export function resetUser() {
  if (typeof window === "undefined" || !posthogInitialized) return;

  posthog.reset();
}

// Event tracking helpers
export const analytics = {
  // Auth events
  signIn: (method: "email" | "linkedin") => {
    trackEvent("user_signed_in", { method });
  },

  signUp: (method: "email" | "linkedin") => {
    trackEvent("user_signed_up", { method });
  },

  signOut: () => {
    trackEvent("user_signed_out");
  },

  // Generation events
  postGenerated: (prompt: string, viralScore?: number, creditsRemaining?: number) => {
    trackEvent("post_generated", {
      prompt_length: prompt.length,
      viral_score: viralScore,
      credits_remaining: creditsRemaining,
    });
  },

  postRepurposed: (originalPostId: string, newStyle?: string) => {
    trackEvent("post_repurposed", {
      original_post_id: originalPostId,
      new_style: newStyle,
    });
  },

  // Voice input
  voiceInputStarted: () => {
    trackEvent("voice_input_started");
  },

  voiceInputCompleted: (transcriptLength: number) => {
    trackEvent("voice_input_completed", {
      transcript_length: transcriptLength,
    });
  },

  // Search events
  inspirationSearched: (query: string, platform?: string, resultCount?: number) => {
    trackEvent("inspiration_searched", {
      query_length: query.length,
      platform,
      result_count: resultCount,
    });
  },

  searchSaved: (searchName: string, filters: Record<string, unknown>) => {
    trackEvent("search_saved", {
      search_name: searchName,
      filter_count: Object.keys(filters).length,
    });
  },

  // Saved posts
  postSaved: (postId: string, platform: string) => {
    trackEvent("post_saved", {
      post_id: postId,
      platform,
    });
  },

  postUnsaved: (postId: string) => {
    trackEvent("post_unsaved", {
      post_id: postId,
    });
  },

  // Export events
  postExported: (method: "linkedin" | "txt" | "md") => {
    trackEvent("post_exported", { method });
  },

  // Subscription events
  planViewed: () => {
    trackEvent("plans_modal_opened");
  },

  checkoutStarted: (plan: string, price: number) => {
    trackEvent("checkout_started", {
      plan,
      price,
    });
  },

  subscriptionCompleted: (plan: string, price: number) => {
    trackEvent("subscription_completed", {
      plan,
      price,
    });
  },

  // Calendar events
  postScheduled: (scheduledAt: string, platforms: string[], aiScore?: number) => {
    trackEvent("post_scheduled", {
      scheduled_at: scheduledAt,
      platforms,
      platform_count: platforms.length,
      ai_score: aiScore,
    });
  },

  // LinkedIn OAuth
  linkedinConnected: () => {
    trackEvent("linkedin_account_connected");
  },

  // Page views
  pageViewed: (pageName: string) => {
    trackPageView(pageName);
  },
};

export default posthog;
