#!/usr/bin/env ts-node

import "dotenv/config";
import { getSupabaseAdminClient } from "../src/lib/supabaseAdmin";
import {
  decryptStoredTokens,
  fetchLinkedInProfile,
  refreshAccessToken,
  updateProfileWithLinkedInData,
} from "../src/lib/linkedin";

async function main() {
  const userId = process.argv[2];
  if (!userId) {
    console.error("Usage: pnpm tsx scripts/linkedin-sync-profile.ts <user-id>");
    process.exit(1);
  }

  const admin = getSupabaseAdminClient();

  const { data: row, error } = await admin
    .from("profiles")
    .select(
      "linkedin_access_token, linkedin_refresh_token, linkedin_token_expires_at"
    )
    .eq("id", userId)
    .maybeSingle();

  if (error || !row) {
    console.error("Profile not found or error fetching profile", error);
    process.exit(1);
  }

  const tokens = decryptStoredTokens(row);
  if (!tokens) {
    console.error("LinkedIn is not connected for this user.");
    process.exit(1);
  }

  let accessToken = tokens.accessToken;
  let refreshToken = tokens.refreshToken ?? undefined;
  let expiresAtIso = tokens.expiresAt ?? null;
  let expiresIn: number | undefined;

  if (refreshToken && expiresAtIso) {
    const expiresAtDate = new Date(expiresAtIso);
    if (Number.isFinite(expiresAtDate.getTime()) && Date.now() > expiresAtDate.getTime() - 60 * 1000) {
      try {
        const refreshed = await refreshAccessToken(refreshToken);
        accessToken = refreshed.accessToken;
        refreshToken = refreshed.refreshToken ?? refreshToken;
        expiresIn = refreshed.expiresIn;
        expiresAtIso = typeof refreshed.expiresIn === "number"
          ? new Date(Date.now() + refreshed.expiresIn * 1000).toISOString()
          : null;
        console.log("Token refreshed successfully.");
      } catch (refreshError) {
        console.warn("Unable to refresh token:", refreshError);
      }
    }
  }

  const profile = await fetchLinkedInProfile(accessToken);
  await updateProfileWithLinkedInData(
    admin,
    userId,
    {
      accessToken,
      refreshToken,
      expiresIn,
      expiresAtIso,
    },
    profile
  );

  console.log("LinkedIn profile synchronized for", userId);
}

main().catch((error) => {
  console.error("LinkedIn sync script failed:", error);
  process.exit(1);
});
