/**
 * LinkedIn OAuth2 Client
 * Handles authentication flow, token exchange, and profile fetching
 */

const LINKEDIN_AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization";
const LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
const LINKEDIN_PROFILE_URL = "https://api.linkedin.com/v2/me";
const LINKEDIN_EMAIL_URL = "https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))";

export type LinkedInTokenResponse = {
  access_token: string;
  expires_in: number; // seconds
  refresh_token?: string;
  refresh_token_expires_in?: number;
  scope: string;
};

export type LinkedInProfile = {
  id: string;
  localizedFirstName: string;
  localizedLastName: string;
  localizedHeadline?: string;
  profilePicture?: {
    displayImage?: string;
  };
};

export type LinkedInEmail = {
  elements: Array<{
    "handle~": {
      emailAddress: string;
    };
  }>;
};

/**
 * Generate the LinkedIn authorization URL with PKCE
 */
export function generateLinkedInAuthUrl(state: string): string {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    throw new Error("LinkedIn OAuth credentials not configured");
  }

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    scope: "r_liteprofile r_emailaddress w_member_social",
  });

  return `${LINKEDIN_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeLinkedInCode(code: string): Promise<LinkedInTokenResponse> {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("LinkedIn OAuth credentials not configured");
  }

  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const response = await fetch(LINKEDIN_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("[LinkedIn] Token exchange failed:", error);
    throw new Error("Failed to exchange LinkedIn authorization code");
  }

  const data = (await response.json()) as LinkedInTokenResponse;
  return data;
}

/**
 * Fetch LinkedIn profile information
 */
export async function fetchLinkedInProfile(accessToken: string): Promise<LinkedInProfile> {
  const response = await fetch(LINKEDIN_PROFILE_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "cache-control": "no-cache",
      "X-Restli-Protocol-Version": "2.0.0",
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("[LinkedIn] Profile fetch failed:", error);
    throw new Error("Failed to fetch LinkedIn profile");
  }

  const profile = (await response.json()) as LinkedInProfile;
  return profile;
}

/**
 * Fetch LinkedIn email address
 */
export async function fetchLinkedInEmail(accessToken: string): Promise<string> {
  const response = await fetch(LINKEDIN_EMAIL_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "cache-control": "no-cache",
      "X-Restli-Protocol-Version": "2.0.0",
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("[LinkedIn] Email fetch failed:", error);
    throw new Error("Failed to fetch LinkedIn email");
  }

  const data = (await response.json()) as LinkedInEmail;
  const email = data.elements?.[0]?.["handle~"]?.emailAddress;

  if (!email) {
    throw new Error("No email found in LinkedIn profile");
  }

  return email;
}

/**
 * Refresh LinkedIn access token (if refresh_token is available)
 */
export async function refreshLinkedInToken(refreshToken: string): Promise<LinkedInTokenResponse> {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("LinkedIn OAuth credentials not configured");
  }

  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const response = await fetch(LINKEDIN_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("[LinkedIn] Token refresh failed:", error);
    throw new Error("Failed to refresh LinkedIn token");
  }

  const data = (await response.json()) as LinkedInTokenResponse;
  return data;
}
