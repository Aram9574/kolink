import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { openai } from "@/lib/openai";
import type { ToneProfile } from "@/utils/prompts";
import type { LinkedInProfile, LinkedInTokenResponse } from "@/lib/linkedin";

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

/**
 * Enrich user profile with LinkedIn data and generate embeddings
 */
export async function enrichProfileFromLinkedIn(
  userId: string,
  linkedInProfile: LinkedInProfile,
  tokenResponse: LinkedInTokenResponse
): Promise<void> {
  const supabase = getSupabaseAdminClient();

  // Extract profile data
  const fullName = `${linkedInProfile.localizedFirstName} ${linkedInProfile.localizedLastName}`;
  const headline = linkedInProfile.localizedHeadline || null;

  // Generate a basic tone profile from LinkedIn data
  const toneProfile: ToneProfile = await generateToneProfileFromLinkedIn(linkedInProfile);

  // Generate embedding from profile text
  const profileText = [fullName, headline, toneProfile.style, toneProfile.audience].filter(Boolean).join(" ");

  let profileEmbedding: number[] | null = null;
  try {
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-large",
      input: profileText,
    });
    profileEmbedding = embeddingResponse.data[0]?.embedding ?? null;
  } catch (error) {
    console.error("[profileService] Failed to generate embedding:", error);
  }

  // Calculate token expiration
  const expiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000);

  // Encrypt tokens before storing
  const encryptionKey = process.env.ENCRYPTION_KEY;
  let encryptedAccessToken = tokenResponse.access_token;
  let encryptedRefreshToken = tokenResponse.refresh_token ?? null;

  if (encryptionKey) {
    try {
      // Encrypt access token
      const { data: encryptedAccess } = await supabase.rpc("encrypt_token", {
        token_text: tokenResponse.access_token,
        encryption_key: encryptionKey,
      });
      encryptedAccessToken = encryptedAccess || tokenResponse.access_token;

      // Encrypt refresh token if exists
      if (tokenResponse.refresh_token) {
        const { data: encryptedRefresh } = await supabase.rpc("encrypt_token", {
          token_text: tokenResponse.refresh_token,
          encryption_key: encryptionKey,
        });
        encryptedRefreshToken = encryptedRefresh || tokenResponse.refresh_token;
      }
    } catch (encryptError) {
      console.error("[profileService] Token encryption failed:", encryptError);
      // Continue with plaintext tokens if encryption fails
    }
  } else {
    console.warn("[profileService] ENCRYPTION_KEY not set. Tokens stored as plaintext.");
  }

  // Update profile with LinkedIn data
  const { error } = await supabase
    .from("profiles")
    .update({
      headline,
      bio: fullName,
      tone_profile: toneProfile,
      profile_embedding: profileEmbedding,
      linkedin_access_token: encryptedAccessToken,
      linkedin_refresh_token: encryptedRefreshToken,
      linkedin_expires_at: expiresAt.toISOString(),
    })
    .eq("id", userId);

  if (error) {
    console.error("[profileService] Failed to enrich profile:", error);
    throw error;
  }

  console.log(`[profileService] Profile enriched for user ${userId}`);
}

/**
 * Generate a tone profile from LinkedIn data using AI
 */
async function generateToneProfileFromLinkedIn(profile: LinkedInProfile): Promise<ToneProfile> {
  const headline = profile.localizedHeadline || "Professional";
  const fullName = `${profile.localizedFirstName} ${profile.localizedLastName}`;

  const prompt = `Based on this LinkedIn profile:
Name: ${fullName}
Headline: ${headline}

Generate a brief tone profile for their professional content with these fields:
- style: writing style (e.g., "professional", "conversational", "technical")
- audience: target audience (e.g., "entrepreneurs", "developers", "marketers")
- focus: main content focus areas (2-3 keywords)

Return as JSON only, no other text.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a profile analysis assistant. Return only JSON." },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 200,
    });

    const raw = completion.choices[0]?.message?.content?.trim();
    if (!raw) {
      return getDefaultToneProfile();
    }

    const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
    return {
      style: parsed.style || "professional",
      audience: parsed.audience || "professionals",
      focus: parsed.focus || ["leadership", "growth"],
    };
  } catch (error) {
    console.warn("[profileService] Failed to generate AI tone profile, using default:", error);
    return getDefaultToneProfile();
  }
}

function getDefaultToneProfile(): ToneProfile {
  return {
    style: "professional",
    audience: "professionals",
    focus: ["leadership", "growth"],
  };
}
