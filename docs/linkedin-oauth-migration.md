# LinkedIn OAuth Migration to Supabase Auth

## Overview

We've migrated from a custom LinkedIn OAuth implementation to Supabase's built-in OAuth provider. This simplifies the authentication flow and resolves DMA blocking issues.

## Changes Made

### 1. Updated Authentication Pages

**signin.tsx** and **signup.tsx** now use:
```typescript
await supabaseClient.auth.signInWithOAuth({
  provider: 'linkedin_oidc',
  options: {
    redirectTo: `${window.location.origin}/dashboard`,
  },
});
```

### 2. Removed Custom OAuth Flow

The following custom implementation is now deprecated:
- `/api/auth/linkedin/login.ts` - OAuth initiation
- `/api/auth/linkedin/callback.ts` - Callback handler
- `/lib/linkedin.ts` - LinkedIn API client

### 3. Session Management

Session handling in `_app.tsx` remains unchanged and works automatically:
```typescript
supabaseClient.auth.onAuthStateChange((_event, newSession) => {
  setSession(newSession);
});
```

## Supabase Dashboard Configuration

### Step 1: Access LinkedIn Provider Settings

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: **crdtxyfvbosjiddirtzc**
3. Navigate to **Authentication** > **Providers**
4. Find and enable **LinkedIn (OIDC)**

### Step 2: Configure LinkedIn Provider

Enter the following credentials:

**Client ID:**
```
78alxhd6hs6cu0
```

**Client Secret:** *(obtenlo desde LinkedIn Developer Portal; no lo guardes en el repositorio)*

**Redirect URL (automatically provided by Supabase):**
```
https://crdtxyfvbosjiddirtzc.supabase.co/auth/v1/callback
```

### Step 3: Update LinkedIn Developer Portal

1. Go to [LinkedIn Developers](https://www.linkedin.com/developers/apps)
2. Select your app (Client ID: 78alxhd6hs6cu0)
3. Navigate to **Auth** section
4. Update **Authorized redirect URLs** to include:
   ```
   https://crdtxyfvbosjiddirtzc.supabase.co/auth/v1/callback
   ```
5. Save changes

### Step 4: Test the Flow

1. Go to https://kolink.es/signin
2. Click "Continuar con LinkedIn"
3. Complete LinkedIn authorization
4. Should redirect to /dashboard automatically

## Benefits

1. **Simplified Code**: No custom OAuth implementation needed
2. **Better Security**: Supabase handles token management and PKCE
3. **Automatic Session Management**: Works seamlessly with existing session handling
4. **DMA Compliance**: Supabase's implementation handles regional restrictions better
5. **Easier Maintenance**: One less integration to maintain

## Troubleshooting

### Error: "Invalid OAuth Provider"

**Solution**: Verify LinkedIn OIDC is enabled in Supabase Dashboard

### Error: "Redirect URI Mismatch"

**Solution**: Ensure LinkedIn Developer Portal has the correct Supabase callback URL

### Session Not Created After Login

**Solution**: Check that `onAuthStateChange` listener is active in `_app.tsx`

### User Profile Not Created

**Solution**: Ensure the `profiles` table has proper RLS policies and triggers for OAuth users

## Migration Checklist

- [x] Update signin.tsx to use Supabase OAuth
- [x] Update signup.tsx to use Supabase OAuth
- [x] Update .env.local documentation
- [x] Create automatic profile trigger for OAuth users
- [x] Document duplicate email handling
- [ ] Configure LinkedIn provider in Supabase Dashboard
- [ ] Update LinkedIn Developer Portal redirect URLs
- [ ] Apply migration 20250101001200_auto_create_profile_trigger.sql
- [ ] Test authentication flow
- [ ] Remove deprecated API routes (optional)
- [ ] Update CLAUDE.md documentation

## Automatic Profile Creation

### Problem
Users registering via LinkedIn OAuth did not automatically get a profile created in the `profiles` table, causing errors in the application.

### Solution
A database trigger (`handle_new_user()`) was implemented that:
1. Automatically creates a profile when any user registers (email or OAuth)
2. Extracts user information from `auth.users.raw_user_meta_data`
3. Sets default values (free plan, 10 credits)
4. For LinkedIn OAuth users, additionally populates:
   - `linkedin_id`
   - `headline`
   - `bio`
   - `linkedin_profile_url`

### Migration File
`supabase/migrations/20250101001200_auto_create_profile_trigger.sql`

**To apply:**
```bash
# Via Supabase CLI
supabase db push

# Or manually in Supabase SQL Editor
# Copy and paste the contents of the migration file
```

## Duplicate Email Handling

Users attempting to register with LinkedIn using an email already registered via email/password (or vice versa) are handled by Supabase Auth's built-in logic.

**Configuration:** See `docs/authentication/duplicate-emails-handling.md` for detailed information.

**Recommended Settings:**
- **Allow Multiple Accounts per Email**: DISABLED
- **Link accounts automatically** (LinkedIn provider): ENABLED

This allows users to link their LinkedIn account to an existing email account seamlessly.

## Additional Notes

- The old custom OAuth routes can remain in the codebase for backward compatibility
- ✅ Profile creation webhook/trigger implemented (see above)
- Monitor PostHog analytics to ensure OAuth conversion rates remain stable
- For duplicate email scenarios, see `docs/authentication/duplicate-emails-handling.md`
