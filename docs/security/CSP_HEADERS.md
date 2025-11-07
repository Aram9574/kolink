# Content Security Policy (CSP) Headers

## Overview

This document describes the Content Security Policy configuration for Kolink and the security improvements made to prevent XSS attacks.

## Current CSP Configuration

Located in `/vercel.json`:

```
Content-Security-Policy: default-src 'self' https://kolink.es;
  script-src 'self' 'unsafe-inline' https://js.stripe.com https://app.posthog.com https://api.userback.io https://cdn.cookielaw.org;
  connect-src 'self' https://api.stripe.com https://*.supabase.co wss://*.supabase.co https://kolink.es https://api.linkedin.com https://www.linkedin.com https://api.linkd.com https://pub.idme.plus.com https://app.posthog.com https://api.userback.io;
  img-src 'self' data: https://*.supabase.co https://media.licdn.com https://static.licdn.com;
  style-src 'self' 'unsafe-inline';
  frame-src 'self' https://www.linkedin.com;
  frame-ancestors 'none';
  object-src 'none';
  base-uri 'self';
```

## Security Improvements

### Removed `unsafe-eval` (Sprint 5)

**Before:**
```
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com ...
```

**After:**
```
script-src 'self' 'unsafe-inline' https://js.stripe.com ...
```

**Rationale:**
- `unsafe-eval` allows execution of `eval()`, `new Function()`, and similar dynamic code execution
- This significantly increases XSS attack surface
- Analysis showed zero usage of `eval()` or `new Function()` in the codebase
- Removal improves security without breaking functionality

**Verification:**
```bash
# No eval() usage found in codebase
grep -r "eval(" src/ --include="*.ts" --include="*.tsx"

# No new Function() usage found
grep -r "new Function(" src/ --include="*.ts" --include="*.tsx"
```

## CSP Directives Explained

### `default-src 'self' https://kolink.es`
- Default policy for all resource types
- Only allows resources from same origin or kolink.es

### `script-src 'self' 'unsafe-inline' ...`
- Scripts can load from:
  - Same origin (`'self'`)
  - Inline scripts (`'unsafe-inline'` - required for Next.js)
  - Stripe (`https://js.stripe.com`)
  - PostHog analytics (`https://app.posthog.com`)
  - Userback feedback (`https://api.userback.io`)
  - Cookie consent (`https://cdn.cookielaw.org`)

**Note:** `'unsafe-inline'` is still present because:
- Next.js requires inline scripts for hydration
- Next.js generates inline `<script>` tags during SSR
- Can be removed in future with nonce-based CSP (more complex setup)

### `connect-src` (AJAX/Fetch Requests)
- Same origin
- Stripe API
- Supabase (HTTP and WebSocket)
- LinkedIn API
- PostHog
- Userback

### `img-src` (Images)
- Same origin
- Data URLs (for inline images)
- Supabase storage
- LinkedIn media CDN

### `style-src 'self' 'unsafe-inline'`
- Same origin
- Inline styles (required for Tailwind CSS and React inline styles)

### `frame-src 'self' https://www.linkedin.com`
- Only allows iframes from same origin and LinkedIn
- Used for LinkedIn OAuth flow

### `frame-ancestors 'none'`
- Prevents site from being embedded in iframes (clickjacking protection)
- Equivalent to `X-Frame-Options: DENY`

### `object-src 'none'`
- Blocks all `<object>`, `<embed>`, `<applet>` tags
- Prevents Flash and Java applet XSS vectors

### `base-uri 'self'`
- Restricts `<base>` tag to same origin
- Prevents base tag injection attacks

## Post-Deployment Monitoring

After deploying CSP changes, monitor for:

### 1. Browser Console Errors

Check for CSP violations in production:

```javascript
// In browser console
window.addEventListener('securitypolicyviolation', (e) => {
  console.error('CSP Violation:', {
    blockedURI: e.blockedURI,
    violatedDirective: e.violatedDirective,
    originalPolicy: e.originalPolicy,
  });
});
```

### 2. Sentry CSP Violation Reports

CSP violations are automatically captured by Sentry. Check Sentry dashboard for:
- **Issue Type:** "CSP Violation"
- **Blocked URI:** What resource was blocked
- **Violated Directive:** Which CSP rule was violated
- **Source File:** Where the violation occurred

### 3. User Reports

Monitor support channels for:
- "Page not loading correctly"
- "Feature not working"
- "Blank screen" issues

### 4. Third-Party Script Issues

If third-party scripts break:

1. Identify the blocked domain from CSP violation report
2. Verify the domain is legitimate and necessary
3. Add to appropriate CSP directive:
   ```
   script-src 'self' 'unsafe-inline' https://trusted-domain.com ...
   ```

## Testing CSP Changes Locally

### 1. Local Development

CSP headers don't apply in local development (`npm run dev`). To test:

```bash
# Build and run production build locally
npm run build
npm start

# Open browser and check console for CSP violations
```

### 2. Preview Deployment

Deploy to Vercel preview:

```bash
git push origin feature-branch

# Vercel automatically creates preview deployment
# Test on preview URL
```

### 3. Production Testing

After deploying to production, test all key user flows:

- [ ] Sign up / Sign in
- [ ] Dashboard loads
- [ ] AI generation works
- [ ] Stripe checkout works
- [ ] Profile page loads
- [ ] Settings page works
- [ ] Analytics load

## Common CSP Issues & Solutions

### Issue 1: Stripe Doesn't Load

**Symptoms:** Payment form doesn't appear, console shows CSP violation

**Solution:** Verify Stripe domains are whitelisted
```
script-src ... https://js.stripe.com
connect-src ... https://api.stripe.com
frame-src ... https://js.stripe.com
```

### Issue 2: PostHog Analytics Broken

**Symptoms:** Analytics not tracking, console shows CSP violation

**Solution:** Verify PostHog domains are whitelisted
```
script-src ... https://app.posthog.com
connect-src ... https://app.posthog.com
```

### Issue 3: Supabase Connection Fails

**Symptoms:** Database queries fail, auth doesn't work

**Solution:** Verify Supabase domains including WebSocket
```
connect-src ... https://*.supabase.co wss://*.supabase.co
```

### Issue 4: Inline Scripts Blocked

**Symptoms:** Next.js hydration fails, page not interactive

**Solution:** This requires nonce-based CSP (advanced)
- Generate random nonce for each request
- Add nonce to CSP header
- Add nonce to all inline scripts
- Requires custom Next.js server configuration

**Current:** Keep `'unsafe-inline'` for simplicity

## Future Improvements

### 1. Nonce-Based CSP

Replace `'unsafe-inline'` with nonces:

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const nonce = generateNonce();
  const csp = `script-src 'nonce-${nonce}' 'self' https://js.stripe.com`;

  const response = NextResponse.next();
  response.headers.set('Content-Security-Policy', csp);

  return response;
}
```

**Benefits:**
- Removes `'unsafe-inline'` (more secure)
- Allows specific inline scripts only

**Complexity:**
- Requires custom server
- All inline scripts need nonce attribute
- More complex to maintain

### 2. Report-Only Mode

Test CSP changes without breaking production:

```
Content-Security-Policy-Report-Only: ...
```

**Benefits:**
- Violations are reported but not blocked
- Safe way to test stricter policies

### 3. CSP Reporting Endpoint

Collect CSP violations:

```
Content-Security-Policy: ... report-uri /api/csp-report
```

**Benefits:**
- Track all CSP violations
- Identify problematic third-party scripts
- Monitor security threats

## References

- [MDN CSP Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [CSP Evaluator](https://csp-evaluator.withgoogle.com/) - Google's CSP testing tool
- [Content Security Policy Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)

## Changelog

### 2025-11-07 - Sprint 5, Task 5.4
- **Removed** `'unsafe-eval'` from `script-src`
- **Verified** no `eval()` or `new Function()` usage in codebase
- **Tested** build compiles successfully
- **Status:** Ready for production deployment

### Previous
- Initial CSP configuration with security headers
- Added support for Stripe, PostHog, Supabase, LinkedIn
- Set restrictive defaults with `'none'` for unused directives
