# Kolink v0.5 — Production Deployment Guide

**Last Updated:** October 22, 2025
**Version:** 0.5 Beta

This guide walks you through deploying Kolink to production, including all required services and configuration.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Supabase Setup](#supabase-setup)
3. [Stripe Configuration](#stripe-configuration)
4. [OpenAI Setup](#openai-setup)
5. [Resend Email Service](#resend-email-service)
6. [Sentry Error Tracking](#sentry-error-tracking)
7. [GitHub Repository Setup](#github-repository-setup)
8. [Vercel Deployment](#vercel-deployment)
9. [Environment Variables](#environment-variables)
10. [Post-Deployment](#post-deployment)
11. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting, ensure you have:
- [ ] Node.js 20+ installed locally
- [ ] GitHub account
- [ ] Vercel account
- [ ] Supabase account (free tier is sufficient)
- [ ] Stripe account (test mode for development, live mode for production)
- [ ] OpenAI account with API access
- [ ] Resend account (free tier for testing)
- [ ] Sentry account (optional but recommended)

---

## Supabase Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click **"New Project"**
3. Choose organization and region (closest to your users)
4. Set database password (save this securely!)
5. Wait for project provisioning (~2 minutes)

### 2. Get API Credentials

Navigate to **Settings > API** and copy:
- Project URL: `https://xxxxx.supabase.co`
- Anon/Public Key: `eyJhbGc...`
- Service Role Key: `eyJhbGc...` (keep this secret!)

### 3. Run Database Migrations

Go to **SQL Editor** and run migrations in this order:

**a) Create Profiles Table**
```sql
-- This should already exist from auth setup
-- If not, create it:
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  plan TEXT DEFAULT 'basic',
  credits INTEGER DEFAULT 0,
  stripe_customer_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- System can insert profiles
CREATE POLICY "System can insert profiles" ON profiles
  FOR INSERT WITH CHECK (true);
```

**b) Create Posts Table**
```sql
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt TEXT NOT NULL,
  generated_text TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own posts" ON posts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own posts" ON posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts" ON posts
  FOR DELETE USING (auth.uid() = user_id);
```

**c) Run Phase 5 Migrations**

Copy and paste the contents of these files in order:
1. `docs/database/usage_stats_migration.sql`
2. `docs/database/admin_notifications_migration.sql`
3. `docs/database/admin_system_migration.sql`
4. `docs/database/welcome_email_trigger.sql`

### 4. Create First Admin User

After deploying and signing up with your admin email:
```sql
UPDATE profiles
SET role = 'admin'
WHERE email = 'your-admin@yourdomain.com';
```

### 5. Enable Realtime (Optional)

For admin notifications:
1. Go to **Database > Replication**
2. Enable replication for `admin_notifications` table

---

## Stripe Configuration

### 1. Create Stripe Account

1. Sign up at [stripe.com](https://stripe.com)
2. Complete business verification (for live mode)
3. Get API keys from **Developers > API keys**

### 2. Create Subscription Products

**In Stripe Dashboard:**

1. Go to **Products > Add Product**
2. Create three products:

**Basic Plan**
- Name: Basic
- Pricing: $9 USD/month
- Recurring: Monthly
- Copy Price ID: `price_xxxxx`

**Standard Plan**
- Name: Standard
- Pricing: $19 USD/month
- Recurring: Monthly
- Copy Price ID: `price_xxxxx`

**Premium Plan**
- Name: Premium
- Pricing: $29 USD/month
- Recurring: Monthly
- Copy Price ID: `price_xxxxx`

### 3. Configure Webhook

1. Go to **Developers > Webhooks**
2. Click **Add Endpoint**
3. Endpoint URL: `https://your-domain.com/api/webhook`
4. Select events to listen to:
   - `checkout.session.completed`
5. Copy **Signing Secret**: `whsec_xxxxx`

**Important:** Update webhook URL after Vercel deployment!

### 4. Test Mode vs Live Mode

- Use Test mode during development
- Switch to Live mode for production
- Both modes have separate API keys and webhooks

---

## OpenAI Setup

### 1. Create OpenAI Account

1. Sign up at [platform.openai.com](https://platform.openai.com)
2. Add payment method (required for API access)
3. Navigate to **API Keys**

### 2. Generate API Key

1. Click **Create new secret key**
2. Name it: "Kolink Production"
3. Copy key: `sk-proj-xxxxx`
4. **Important:** This key is shown only once!

### 3. Set Usage Limits

1. Go to **Settings > Limits**
2. Set monthly budget (recommended: $50-100/month)
3. Enable email alerts at 75% and 100%

### 4. Model Configuration

Kolink uses **GPT-4o-mini** for cost efficiency:
- Input: ~$0.15/1M tokens
- Output: ~$0.60/1M tokens
- Fast responses, good quality

---

## Resend Email Service

### 1. Create Resend Account

1. Sign up at [resend.com](https://resend.com)
2. Verify your email
3. Free tier: 100 emails/day, 3,000/month

### 2. Get API Key

1. Go to **API Keys**
2. Create new key: "Kolink Production"
3. Copy key: `re_xxxxx`

### 3. Verify Domain (Recommended)

**For production emails:**

1. Go to **Domains > Add Domain**
2. Enter your domain: `yourdomain.com`
3. Add DNS records (TXT, CNAME for DKIM)
4. Wait for verification (~10 minutes to 24 hours)

**For testing, use:**
- From email: `onboarding@resend.dev`
- Limited to 100 emails/day

### 4. Configure From Email

After domain verification:
- Use: `noreply@yourdomain.com`
- Or: `hello@yourdomain.com`

---

## Sentry Error Tracking

### 1. Create Sentry Account

1. Sign up at [sentry.io](https://sentry.io)
2. Create organization
3. Free tier: 5,000 errors/month

### 2. Create Project

1. Click **Projects > Create Project**
2. Platform: **Next.js**
3. Alert frequency: **On every new issue**
4. Project name: "kolink-production"

### 3. Get DSN

1. Go to **Settings > Projects > kolink-production**
2. Navigate to **Client Keys (DSN)**
3. Copy DSN: `https://xxxxx@sentry.io/xxxxx`

### 4. Configure Alerts

1. **Settings > Alerts > New Alert**
2. Create alerts for:
   - New error types
   - Error frequency spikes
   - Performance degradation

---

## GitHub Repository Setup

### 1. Create Repository

```bash
# Initialize Git (if not already)
git init

# Add remote
git remote add origin https://github.com/yourusername/kolink.git

# Add all files
git add .

# Commit
git commit -m "Initial commit - Kolink v0.5"

# Push
git push -u origin main
```

### 2. Configure GitHub Secrets

Go to **Settings > Secrets and variables > Actions**

Add secrets for CI/CD:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL`

### 3. Enable Actions

1. Go to **Actions** tab
2. CI/CD workflow should run automatically on push
3. Check workflow status and fix any errors

---

## Vercel Deployment

### 1. Import Project

1. Go to [vercel.com](https://vercel.com)
2. Click **Add New > Project**
3. Import from GitHub
4. Select your `kolink` repository

### 2. Configure Project

**Framework Preset:** Next.js
**Root Directory:** `./`
**Build Command:** `npm run build`
**Output Directory:** `.next`

**Node.js Version:** 20.x

### 3. Add Environment Variables

Click **Environment Variables** and add all variables (see section below).

**Important:** Add variables for all environments:
- Production
- Preview
- Development

### 4. Deploy

1. Click **Deploy**
2. Wait for build (~2-5 minutes)
3. Vercel will provide a URL: `kolink-xxxxx.vercel.app`

### 5. Configure Custom Domain (Optional)

1. Go to **Settings > Domains**
2. Add your domain: `yourdomain.com`
3. Update DNS records as instructed
4. Wait for SSL certificate (automatic)

---

## Environment Variables

### Complete .env.local Template

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# OpenAI Configuration
OPENAI_API_KEY=sk-proj-xxxxx

# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
NEXT_PUBLIC_SITE_URL=https://yourdomain.com

# Stripe Price IDs
STRIPE_PRICE_ID_BASIC=price_xxxxx
STRIPE_PRICE_ID_STANDARD=price_xxxxx
STRIPE_PRICE_ID_PREMIUM=price_xxxxx

# Resend Email Configuration
RESEND_API_KEY=re_xxxxx
FROM_EMAIL=noreply@yourdomain.com

# Sentry Configuration (Optional)
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@sentry.io/xxxxx

# General
NODE_ENV=production
```

### Vercel Environment Variables

Add the same variables in Vercel dashboard:
1. Go to **Settings > Environment Variables**
2. Add each variable
3. Select environments: **Production, Preview, Development**
4. **Important:** Don't expose service keys to client!

**Client-safe variables (NEXT_PUBLIC_):**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SENTRY_DSN`

**Server-only variables:**
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `RESEND_API_KEY`

---

## Post-Deployment

### 1. Verify Deployment

**Check these URLs:**
- [ ] Landing page: `https://yourdomain.com`
- [ ] Sign in: `https://yourdomain.com/signin`
- [ ] Sign up: `https://yourdomain.com/signup`
- [ ] Dashboard (after auth): `https://yourdomain.com/dashboard`
- [ ] Admin (after auth): `https://yourdomain.com/admin`

### 2. Test Core Functionality

**Authentication:**
- [ ] Sign up with email
- [ ] Confirm email (check Supabase email templates)
- [ ] Sign in
- [ ] Sign out

**Payments:**
- [ ] Click "Choose Plan"
- [ ] Complete Stripe checkout (use test card: `4242 4242 4242 4242`)
- [ ] Verify webhook received
- [ ] Check profile updated with plan and credits

**Content Generation:**
- [ ] Enter prompt in dashboard
- [ ] Generate content
- [ ] Verify credit deduction
- [ ] Check post saved in history

**Admin Panel:**
- [ ] Access `/admin` as admin user
- [ ] View users table
- [ ] Edit user (change plan/credits)
- [ ] View audit logs

**Email Notifications:**
- [ ] Sign up new user → welcome email
- [ ] Check Resend dashboard for delivery

**Error Monitoring:**
- [ ] Trigger intentional error
- [ ] Check Sentry dashboard
- [ ] Verify error captured

### 3. Update Stripe Webhook URL

**Important:** Update webhook in Stripe dashboard:
1. Go to **Developers > Webhooks**
2. Update endpoint URL to: `https://yourdomain.com/api/webhook`
3. Test webhook with "Send test webhook" button

### 4. Configure CSP (Already in vercel.json)

Check `vercel.json` security headers:
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com https://cdn.vercel-insights.com; connect-src 'self' https://*.supabase.co https://api.stripe.com; frame-src https://js.stripe.com; img-src 'self' data: https:; style-src 'self' 'unsafe-inline';"
        }
      ]
    }
  ]
}
```

### 5. Monitor First 48 Hours

**Daily checks:**
- [ ] Sentry errors
- [ ] Vercel deployment logs
- [ ] Supabase database size
- [ ] OpenAI usage and costs
- [ ] Stripe payment success rate
- [ ] CI/CD pipeline status

---

## Troubleshooting

### Build Fails on Vercel

**Error:** "Module not found"
- Check `package.json` dependencies
- Run `npm install` locally
- Push `package-lock.json` to git

**Error:** "Environment variable not defined"
- Verify all env vars in Vercel
- Redeploy after adding vars

### Stripe Webhook Not Working

**Symptoms:** User plan not updating after payment
- Check webhook signing secret matches `.env`
- Verify webhook URL is correct production URL
- Check Vercel logs: `/api/webhook`
- Test webhook in Stripe dashboard

### Supabase Connection Errors

**Error:** "Invalid API key"
- Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
- Check anon key is from same project
- Ensure service role key is not exposed to client

### Email Not Sending

**Error:** "Email failed to send"
- Check Resend API key is valid
- Verify from email is verified domain
- Check Resend dashboard for bounce/errors
- Ensure daily limit not exceeded (100 emails/day)

### Sentry Not Receiving Errors

- Verify DSN is correct
- Check Sentry project settings
- Ensure `NODE_ENV=production` in Vercel
- Try manual error: `throw new Error('Test')`

### Admin Panel Access Denied

- Verify user role in database:
  ```sql
  SELECT id, email, role FROM profiles WHERE email = 'your@email.com';
  ```
- Update role if needed:
  ```sql
  UPDATE profiles SET role = 'admin' WHERE email = 'your@email.com';
  ```

### CI/CD Pipeline Failing

- Check GitHub Actions logs
- Verify GitHub secrets are set
- Ensure tests pass locally: `npm test`
- Check Node.js version compatibility

---

## Maintenance & Monitoring

### Daily Tasks
- [ ] Review Sentry error dashboard
- [ ] Check Vercel deployment status
- [ ] Monitor Stripe payment success rate

### Weekly Tasks
- [ ] Review admin audit logs
- [ ] Check OpenAI usage and costs
- [ ] Review user growth metrics
- [ ] Check npm security advisories: `npm audit`

### Monthly Tasks
- [ ] Update dependencies: `npm update`
- [ ] Review and optimize Supabase queries
- [ ] Analyze user behavior patterns
- [ ] Plan new features based on feedback

### Backup Strategy

**Supabase:**
- Automatic daily backups (free tier: 7 days retention)
- Manual backup: SQL Editor > Export database

**Vercel:**
- Git history serves as code backup
- Deployment history for rollbacks

**Stripe:**
- Webhook event history (90 days)
- Export customer data via dashboard

---

## Performance Optimization

### 1. Enable Vercel Analytics

```bash
npm install @vercel/analytics
```

Add to `_app.tsx`:
```typescript
import { Analytics } from '@vercel/analytics/react';

// Inside component
<Analytics />
```

### 2. Configure Caching

Add to `next.config.js`:
```javascript
module.exports = {
  // Existing config...

  headers: async () => [
    {
      source: '/api/:path*',
      headers: [
        { key: 'Cache-Control', value: 'no-store, max-age=0' },
      ],
    },
  ],
}
```

### 3. Optimize Images

- Use Next.js Image component
- Lazy load images below the fold
- Serve WebP format with fallback

### 4. Database Indexing

Ensure indexes exist (already in migrations):
```sql
-- Check indexes
SELECT tablename, indexname FROM pg_indexes
WHERE schemaname = 'public';
```

---

## Security Checklist

- [ ] All environment variables are secret (not in git)
- [ ] Service role key never exposed to client
- [ ] RLS policies enabled on all tables
- [ ] CSP headers configured
- [ ] HTTPS enabled (automatic with Vercel)
- [ ] Stripe webhook signature verification
- [ ] Admin routes protected
- [ ] Password reset flow tested
- [ ] Rate limiting considered (future)
- [ ] CORS configured correctly

---

## Cost Estimation

**Monthly costs for ~1,000 active users:**

| Service | Free Tier | Estimated Cost |
|---------|-----------|----------------|
| Vercel | ✅ Hobby (included) | $0 (or $20 Pro) |
| Supabase | ✅ 500MB DB, 2GB bandwidth | $0 (or $25 Pro) |
| OpenAI | ❌ Pay-as-you-go | $30-50/month |
| Stripe | ❌ 2.9% + $0.30 per transaction | Transaction fees |
| Resend | ✅ 3,000 emails/month | $0 (or $20 for 50k) |
| Sentry | ✅ 5,000 errors/month | $0 (or $26 for 50k) |
| **Total** | | **$50-100/month** |

**Revenue (1,000 users):**
- 10% Basic ($9): $900/month
- 5% Standard ($19): $950/month
- 2% Premium ($29): $580/month
- **Total: ~$2,430/month**

**Profit Margin: ~95%** 🚀

---

## Launch Checklist

### Pre-Launch
- [ ] All services configured
- [ ] Database migrations applied
- [ ] Admin user created
- [ ] Stripe live mode enabled
- [ ] Domain configured with SSL
- [ ] Email domain verified
- [ ] Sentry project created
- [ ] CI/CD pipeline passing
- [ ] All tests passing locally

### Launch Day
- [ ] Deploy to production
- [ ] Smoke test all features
- [ ] Monitor Sentry for errors
- [ ] Check Stripe webhooks
- [ ] Verify email delivery
- [ ] Test signup flow
- [ ] Test payment flow
- [ ] Share with initial users

### Post-Launch
- [ ] Monitor first 100 signups
- [ ] Respond to user feedback
- [ ] Fix critical bugs immediately
- [ ] Gather analytics data
- [ ] Plan next iteration

---

## Support Resources

**Documentation:**
- Next.js: https://nextjs.org/docs
- Supabase: https://supabase.com/docs
- Stripe: https://stripe.com/docs
- OpenAI: https://platform.openai.com/docs
- Resend: https://resend.com/docs
- Sentry: https://docs.sentry.io

**Community:**
- Next.js Discord
- Supabase Discord
- Stripe Support Chat

---

## Conclusion

Your Kolink SaaS is now production-ready! 🎉

Follow this checklist to ensure a smooth deployment. Monitor closely in the first week and be prepared to respond to user feedback.

**Questions?** Check the docs or open an issue on GitHub.

---

**Document Version:** 1.0
**Last Updated:** October 22, 2025
**Status:** Production Ready ✅
