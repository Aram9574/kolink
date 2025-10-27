import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import type { ToneProfile } from "@/utils/prompts";

export type ProfileRecord = {
  id: string;
  email?: string | null;
  plan?: string | null;
  credits?: number | null;
  bio?: string | null;
  headline?: string | null;
  expertise?: string[] | null;
  tone_profile?: ToneProfile | null;
  profile_embedding?: number[] | null;
  features?: Record<string, unknown> | null;
};

export async function getUserProfile(userId: string): Promise<ProfileRecord | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      [
        "id",
        "email",
        "plan",
        "credits",
        "bio",
        "headline",
        "expertise",
        "tone_profile",
        "profile_embedding",
        "features",
      ].join(",")
    )
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("[profileService] Failed to fetch profile", error);
    throw error;
  }

  return data as ProfileRecord | null;
}

export type ProfileToneHints = {
  fullName?: string;
  headline?: string | null;
  bio?: string | null;
  expertise?: string[];
  toneProfile?: ToneProfile | null;
};

export function mapProfileToContext(profile: ProfileRecord): ProfileToneHints {
  return {
    fullName: profile.email ?? undefined,
    headline: profile.headline,
    bio: profile.bio,
    expertise: profile.expertise ?? undefined,
    toneProfile: profile.tone_profile ?? undefined,
  };
}

export function getDefaultToneProfile(): ToneProfile {
  return {
    style: "professional",
    audience: "professionals",
    focus: ["leadership", "growth"],
  };
}
