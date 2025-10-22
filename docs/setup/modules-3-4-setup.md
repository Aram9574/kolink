# Quick Setup Guide: Modules 3 & 4

## 🚀 Quick Start

This guide will help you set up the Notifications and Email modules for Kolink.

---

## 📋 Prerequisites

- Node.js 18+ installed
- Supabase project created
- Vercel project deployed
- Access to Supabase SQL Editor

---

## ⚡ Setup Steps

### 1. Install Dependencies (Already Done)

The `resend` package is already installed. If not:

```bash
npm install resend
```

### 2. Configure Resend

1. **Create Resend Account:**
   - Go to [resend.com](https://resend.com)
   - Sign up for free account (100 emails/day on free tier)

2. **Verify Domain (or use test domain):**
   - Dashboard > Domains > Add Domain
   - Add DNS records (or use `onboarding@resend.dev` for testing)

3. **Generate API Key:**
   - Dashboard > API Keys > Create API Key
   - Copy the key (starts with `re_`)

### 3. Update Environment Variables

**Local Development** (`.env.local`):
```bash
# Email Configuration
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
FROM_EMAIL=noreply@yourdomain.com  # or onboarding@resend.dev for testing
```

**Vercel Production:**
1. Go to Vercel Dashboard > Settings > Environment Variables
2. Add:
   - `RESEND_API_KEY`: Your Resend API key
   - `FROM_EMAIL`: Your verified sender email

### 4. Database Setup

#### A. Admin Notifications Table

Run in Supabase SQL Editor:

```sql
-- Copy from: docs/database/admin_notifications_migration.sql
-- Or run directly:

CREATE TABLE IF NOT EXISTS admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '7 days')
);

CREATE INDEX idx_admin_notifications_user_id ON admin_notifications(user_id);
CREATE INDEX idx_admin_notifications_read ON admin_notifications(read);

ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications"
  ON admin_notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON admin_notifications FOR UPDATE
  USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE admin_notifications;
```

#### B. Enable Realtime

1. Go to Supabase Dashboard > Database > Replication
2. Find `admin_notifications` table
3. Enable Realtime replication

### 5. Welcome Email Trigger (Choose One Option)

#### Option A: Edge Function (Recommended)

1. **Create Edge Function:**
   ```bash
   # In Supabase CLI
   supabase functions new send-welcome-email
   ```

2. **Add function code:**
   ```typescript
   // supabase/functions/send-welcome-email/index.ts
   import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

   serve(async (req) => {
     const { record } = await req.json()

     const response = await fetch('https://your-domain.vercel.app/api/emails/welcome-webhook', {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
         'x-webhook-secret': Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
       },
       body: JSON.stringify({ userId: record.id }),
     })

     return new Response(JSON.stringify(await response.json()), {
       headers: { 'Content-Type': 'application/json' },
       status: response.status,
     })
   })
   ```

3. **Deploy:**
   ```bash
   supabase functions deploy send-welcome-email
   ```

4. **Create Database Webhook:**
   - Go to Database > Webhooks > Create Webhook
   - Name: `send-welcome-email`
   - Table: `profiles`
   - Events: INSERT
   - Type: Edge Function
   - Function: `send-welcome-email`

#### Option B: Database Trigger with pg_net

Run in Supabase SQL Editor:

```sql
-- Enable pg_net extension
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Set service role key (REPLACE WITH YOUR KEY)
ALTER DATABASE postgres SET app.supabase_service_role_key TO 'your-service-role-key-here';

-- Copy the rest from: docs/database/welcome_email_trigger.sql
```

### 6. Test the Setup

#### Test Admin Notification (Realtime)

```sql
-- In Supabase SQL Editor
INSERT INTO admin_notifications (user_id, message, type)
VALUES (
  'your-user-id-here',
  'This is a test notification!',
  'info'
);
```

You should see a toast notification appear in the dashboard instantly.

#### Test Welcome Email

**Option 1: Create new user via signup**
- Go to `/signup`
- Create a new test account
- Check your email inbox

**Option 2: Manual API call**
```bash
curl -X POST https://your-domain.vercel.app/api/emails/welcome-webhook \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: YOUR_SUPABASE_SERVICE_ROLE_KEY" \
  -d '{"userId": "existing-user-id"}'
```

#### Test Weekly Email

```bash
# Get your auth token first (from browser console: supabaseClient.auth.getSession())

curl -X POST https://your-domain.vercel.app/api/emails/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{
    "to": "your-email@example.com",
    "type": "weekly",
    "data": {
      "userName": "Test User",
      "postsGenerated": 15,
      "creditsUsed": 15,
      "creditsRemaining": 35,
      "currentPlan": "Standard"
    }
  }'
```

---

## ✅ Verification Checklist

- [ ] Resend account created and API key obtained
- [ ] Environment variables added to `.env.local` and Vercel
- [ ] `admin_notifications` table created in Supabase
- [ ] Realtime enabled for `admin_notifications` table
- [ ] Welcome email trigger configured (Edge Function OR pg_net)
- [ ] Test notification appears in dashboard
- [ ] Test welcome email received
- [ ] No console errors in browser or Vercel logs

---

## 🐛 Common Issues

### "RESEND_API_KEY is not set"
**Solution:** Ensure env var is set in Vercel and redeployed

### Emails not sending
**Check:**
1. API key is valid (test in Resend dashboard)
2. `FROM_EMAIL` is verified in Resend
3. Check Vercel function logs for errors

### Realtime notifications not appearing
**Check:**
1. Realtime enabled in Supabase for table
2. RLS policies allow SELECT
3. User is authenticated in dashboard
4. Browser console for errors

### Trigger not firing
**Check:**
1. Webhook configured correctly in Supabase
2. Service role key is correct
3. Test webhook manually first
4. Check Supabase logs

---

## 📊 Monitoring

### Resend Dashboard
- Go to [resend.com/dashboard](https://resend.com/dashboard)
- View sent emails, delivery status, opens, clicks

### Supabase Logs
- Database > Logs
- Functions > Logs (for Edge Functions)

### Vercel Logs
- Deployments > View Function Logs
- Real-time logs for `/api/emails/*` endpoints

---

## 🎯 Next Steps

1. **Customize Email Templates:**
   - Edit `src/emails/welcome.html`
   - Edit `src/emails/weekly.html`
   - Test changes with manual API calls

2. **Set Up Weekly Emails:**
   - Create cron job (Vercel Cron)
   - Batch send to active users
   - See `docs/development/module-3-4-implementation.md` for details

3. **Add More Email Types:**
   - Password reset
   - Plan upgrade confirmation
   - Monthly report
   - Custom announcements

4. **Improve Admin Notifications:**
   - Create admin panel to send messages
   - Scheduled notifications
   - User preferences

---

## 📚 Resources

- [Resend Documentation](https://resend.com/docs)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)

---

**Need Help?** Check `docs/development/module-3-4-implementation.md` for detailed documentation.
