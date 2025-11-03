import crypto from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { encryptToken, decryptToken } from "@/lib/encryption";

type LinkedInConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope: string;
};

export type LinkedInTokenResponse = {
  accessToken: string;
  expiresIn?: number;
  refreshToken?: string;
};

export type LinkedInProfile = {
  id: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  headline?: string;
  bio?: string;
  profileUrl?: string;
  pictureUrl?: string;
  email?: string;
  industry?: string;
  locale?: string;
};

export type StoredLinkedInTokens = {
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: string | null;
};

type LinkedInMeResponse = {
  id: string;
  localizedFirstName?: string;
  localizedLastName?: string;
  localizedHeadline?: string;
  headline?: string;
  localizedSummary?: string;
  summary?: string;
  industryName?: string;
  industry?: string;
  vanityName?: string;
  profilePicture?: Record<string, unknown>;
};

type LinkedInEmailResponse = {
  elements?: Array<{
    [key: string]: unknown;
  }>;
};

const DEFAULT_SCOPE = "openid profile w_member_social email";

function getLinkedInConfig(): LinkedInConfig {
  const { LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET, LINKEDIN_REDIRECT_URI, LINKEDIN_SCOPES } =
    process.env;

  if (!LINKEDIN_CLIENT_ID || !LINKEDIN_CLIENT_SECRET || !LINKEDIN_REDIRECT_URI) {
    throw new Error(
      "LinkedIn configuration missing. Ensure LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET and LINKEDIN_REDIRECT_URI are defined."
    );
  }

  return {
    clientId: LINKEDIN_CLIENT_ID,
    clientSecret: LINKEDIN_CLIENT_SECRET,
    redirectUri: LINKEDIN_REDIRECT_URI,
    scope: LINKEDIN_SCOPES ?? DEFAULT_SCOPE,
  };
}

function base64Url(buffer: Buffer): string {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function generatePkcePair(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = base64Url(crypto.randomBytes(32));
  const hash = crypto.createHash("sha256").update(codeVerifier).digest();
  const codeChallenge = base64Url(hash);
  return { codeVerifier, codeChallenge };
}

export function buildLinkedInAuthorizationUrl(state: string, codeChallenge: string): string {
  const { clientId, redirectUri, scope } = getLinkedInConfig();
  const url = new URL("https://www.linkedin.com/oauth/v2/authorization");
  url.searchParams.append("response_type", "code");
  url.searchParams.append("client_id", clientId);
  url.searchParams.append("redirect_uri", redirectUri);
  url.searchParams.append("state", state);
  url.searchParams.append("scope", scope);
  url.searchParams.append("code_challenge", codeChallenge);
  url.searchParams.append("code_challenge_method", "S256");
  return url.toString();
}

export async function exchangeCodeForToken(
  code: string,
  codeVerifier: string
): Promise<LinkedInTokenResponse> {
  const { clientId, clientSecret, redirectUri } = getLinkedInConfig();

  const response = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
      code_verifier: codeVerifier,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LinkedIn token exchange failed: ${errorText}`);
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    expiresIn: typeof data.expires_in === "number" ? data.expires_in : undefined,
    refreshToken: typeof data.refresh_token === "string" ? data.refresh_token : undefined,
  };
}

export async function refreshAccessToken(refreshToken: string): Promise<LinkedInTokenResponse> {
  const { clientId, clientSecret } = getLinkedInConfig();

  const response = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LinkedIn refresh token failed: ${errorText}`);
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    expiresIn: typeof data.expires_in === "number" ? data.expires_in : undefined,
    refreshToken: typeof data.refresh_token === "string" ? data.refresh_token : undefined,
  };
}

function parseProfilePicture(me: Record<string, unknown>): string | undefined {
  const profilePicture = me?.profilePicture as Record<string, unknown> | undefined;
  const displayImage = (profilePicture?.["displayImage~"] ?? profilePicture?.displayImage) as
    | Record<string, unknown>
    | undefined;

  const elements = displayImage?.elements as unknown;
  if (!Array.isArray(elements)) {
    return undefined;
  }

  for (let i = elements.length - 1; i >= 0; i -= 1) {
    const element = elements[i] as Record<string, unknown> | undefined;
    const identifiers = element?.identifiers as unknown;
    if (!Array.isArray(identifiers)) {
      continue;
    }
    const candidate = identifiers[0] as Record<string, unknown> | undefined;
    const url = typeof candidate?.identifier === "string" ? candidate.identifier : undefined;
    if (url) {
      return url;
    }
  }
  return undefined;
}

export async function fetchLinkedInProfile(accessToken: string): Promise<LinkedInProfile> {
  const meResponse = await fetch(
    "https://api.linkedin.com/v2/me?projection=(id,localizedFirstName,localizedLastName,localizedHeadline,headline,localizedSummary,industryName,vanityName,profilePicture(displayImage~:playableStreams))",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!meResponse.ok) {
    const errorText = await meResponse.text();
    throw new Error(`LinkedIn profile fetch failed: ${errorText}`);
  }

  const me = (await meResponse.json()) as LinkedInMeResponse;

  const emailResponse = await fetch(
    "https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  let email: string | undefined;
  if (emailResponse.ok) {
    const emailJson = (await emailResponse.json()) as LinkedInEmailResponse;
    const elements = emailJson?.elements as unknown;
    if (Array.isArray(elements) && elements[0]?.["handle~"]?.emailAddress) {
      email = elements[0]["handle~"].emailAddress as string;
    }
  }

  const firstName = me.localizedFirstName ?? undefined;
  const lastName = me.localizedLastName ?? undefined;
  const headline = me.localizedHeadline ?? me.headline ?? undefined;
  const summary = me.localizedSummary ?? me.summary ?? undefined;
  const industry = me.industryName ?? me.industry ?? undefined;
  const vanityName = me.vanityName ?? undefined;
  const profileUrl = vanityName ? `https://www.linkedin.com/in/${vanityName}` : undefined;

  return {
    id: me.id,
    firstName: firstName ?? undefined,
    lastName: lastName ?? undefined,
    fullName: [firstName, lastName].filter(Boolean).join(" ") || undefined,
    headline: headline ?? undefined,
    bio: summary ?? undefined,
    industry: industry ?? undefined,
    profileUrl,
    pictureUrl: parseProfilePicture(me as unknown as Record<string, unknown>),
    email,
  };
}

export async function updateProfileWithLinkedInData(
  supabaseAdmin: SupabaseClient,
  userId: string,
  tokens: LinkedInTokenResponse & { expiresAtIso?: string | null },
  profile: LinkedInProfile
) {
  const expiresAt =
    tokens.expiresAtIso ??
    (typeof tokens.expiresIn === "number"
      ? new Date(Date.now() + tokens.expiresIn * 1000).toISOString()
      : null);

  const updates = {
    linkedin_id: profile.id,
    linkedin_first_name: profile.firstName ?? null,
    linkedin_last_name: profile.lastName ?? null,
    linkedin_full_name: profile.fullName ?? null,
    linkedin_headline: profile.headline ?? null,
    linkedin_summary: profile.bio ?? null,
    linkedin_industry: profile.industry ?? null,
    linkedin_profile_url: profile.profileUrl ?? null,
    linkedin_picture: profile.pictureUrl ?? null,
    linkedin_email: profile.email ?? null,
    linkedin_connected_at: new Date().toISOString(),
    linkedin_token_expires_at: expiresAt,
    linkedin_access_token: encryptToken(tokens.accessToken),
    linkedin_refresh_token: tokens.refreshToken ? encryptToken(tokens.refreshToken) : null,
  };

  const { error } = await supabaseAdmin.from("profiles").update(updates).eq("id", userId);
  if (error) {
    throw error;
  }
}

export async function clearLinkedInConnection(supabaseAdmin: SupabaseClient, userId: string) {
  const updates = {
    linkedin_id: null,
    linkedin_first_name: null,
    linkedin_last_name: null,
    linkedin_full_name: null,
    linkedin_headline: null,
    linkedin_summary: null,
    linkedin_industry: null,
    linkedin_profile_url: null,
    linkedin_picture: null,
    linkedin_email: null,
    linkedin_connected_at: null,
    linkedin_token_expires_at: null,
    linkedin_access_token: null,
    linkedin_refresh_token: null,
  };

  await supabaseAdmin.from("profiles").update(updates).eq("id", userId);
}

export function decryptStoredTokens(row: Record<string, unknown>): StoredLinkedInTokens | null {
  const access = typeof row.linkedin_access_token === "string" ? row.linkedin_access_token : null;
  const refresh = typeof row.linkedin_refresh_token === "string" ? row.linkedin_refresh_token : null;
  if (!access) {
    return null;
  }

  const accessToken = decryptToken(access);
  if (!accessToken) {
    return null;
  }

  return {
    accessToken,
    refreshToken: refresh ? decryptToken(refresh) : null,
    expiresAt: typeof row.linkedin_token_expires_at === "string" ? row.linkedin_token_expires_at : null,
  };
}
