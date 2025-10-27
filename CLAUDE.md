# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Kolink v0.4 is a professional Next.js SaaS application with modern UI/UX integrating Supabase (authentication & database), Stripe (payments), and OpenAI (content generation). The application features a complete design system with dark mode, professional landing page, dashboard with AI content generation, and subscription management.

## Development Commands

### Setup
```bash
npm install
```

### Development
```bash
npm run dev           # Start dev server with Turbopack on localhost:3000
```

### Build & Production
```bash
npm run build         # Production build with Turbopack
npm start             # Start production server
```

### Linting
```bash
npm run lint          # Run ESLint
```

## Environment Variables

Required environment variables (see `.env.local`):

**Supabase:**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for webhook operations

**Stripe:**
- `STRIPE_SECRET_KEY` - Stripe API secret key
- `STRIPE_WEBHOOK_SECRET` - Webhook signing secret
- `STRIPE_PRICE_ID_BASIC` - Basic plan price ID
- `STRIPE_PRICE_ID_STANDARD` - Standard plan price ID
- `STRIPE_PRICE_ID_PREMIUM` - Premium plan price ID

**OpenAI:**
- `OPENAI_API_KEY` - OpenAI API key for GPT-4o-mini

**Resend (Email):**
- `RESEND_API_KEY` - Resend API key for transactional emails
- `FROM_EMAIL` - Verified sender email address

**LinkedIn OAuth (via Supabase Auth):**
- LinkedIn OAuth is now integrated through Supabase Auth's built-in provider
- Configure LinkedIn OIDC credentials in Supabase Dashboard > Authentication > Providers
- No application environment variables needed (credentials stored in Supabase)
- Supabase callback URL: `https://crdtxyfvbosjiddirtzc.supabase.co/auth/v1/callback`
- See `docs/linkedin-oauth-migration.md` for setup instructions

**Redis / Messaging:**
- `REDIS_URL` - Connection URL for Redis/Upstash (cache, queues, pub/sub)

**Analytics & Monitoring:**
- `POSTHOG_API_KEY` - PostHog project API key (client)
- `POSTHOG_HOST` - PostHog host URL (default `https://app.posthog.com`)
- `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` - Existing Sentry configuration
- `VERCEL_ANALYTICS_ID` - Optional Vercel Analytics ID

**General / App:**
- `NEXT_PUBLIC_SITE_URL` - Site URL for Stripe redirects and OAuth
- `SUPABASE_EDGE_FUNCTION_KEY` - Optional: service key for Edge functions (for gated routes)

## Architecture

### Pages Router Structure

This project uses Next.js Pages Router (not App Router). Key files:

- `src/pages/_app.tsx` - Root component with global session management and Navbar
- `src/pages/_document.tsx` - Custom document for HTML structure
- `src/pages/index.tsx` - Landing page
- `src/pages/signin.tsx` - Sign in page
- `src/pages/signup.tsx` - Sign up page
- `src/pages/dashboard.tsx` - Main dashboard with plan selection and AI generation
- `src/pages/inspiration.tsx` - (Phase 6) Semantic inspiration hub (to be implemented)
- `src/pages/calendar.tsx` - (Phase 6) Scheduling calendar (to be implemented)

### API Routes

Located in `src/pages/api/`:

- `checkout.ts` - Creates Stripe checkout sessions for plan subscriptions
- `webhook.ts` - Handles Stripe webhooks (checkout.session.completed) to update user profiles
- `generate.ts` - Backwards-compatible entrypoint that proxies to `/api/post/generate`
- `post/generate.ts` - Contextual AI generation (Phase 6)
- `post/repurpose.ts` - Reformula posts manteniendo coherencia semántica (Phase 6)
- `analytics/stats.ts` - Enhanced analytics endpoint with forecasts (Phase 6)
- `inspiration/search.ts` - Semantic inspiration lookup (Phase 6)
- `inspiration/save.ts` - Persist saved posts or searches (Phase 6)
- `calendar/schedule.ts` - AI-assisted scheduling (Phase 6)
- `createProfile.ts` - Creates user profile in Supabase after signup
- `test-supabase.ts` - Development endpoint for testing Supabase connection

### Data Flow

1. **Authentication**:
   - **Email/Password**: Managed by Supabase Auth with `signInWithPassword()` and `signUp()`
   - **LinkedIn OAuth**: Uses Supabase Auth's built-in provider via `signInWithOAuth({ provider: 'linkedin_oidc' })`
   - Session state in `_app.tsx` via `supabaseClient.auth.onAuthStateChange()`
   - OAuth flow: User clicks LinkedIn button → Supabase handles OAuth → Auto-redirect to dashboard
2. **Subscription Flow**:
   - User selects plan in dashboard → `/api/checkout` creates Stripe session
   - Stripe redirects to checkout → User completes payment
   - Stripe webhook hits `/api/webhook` → Updates profile with plan and credits
   - User redirected to dashboard with success message
3. **Content Generation**:
   - User submits prompt in dashboard → `/api/generate` endpoint
   - Validates user auth, checks credits
   - Calls OpenAI API (gpt-4o-mini)
   - Deducts 1 credit, stores post in `posts` table
   - Returns generated content and remaining credits

### Database Schema (Supabase)

**profiles table:**
- `id` (UUID, references auth.users)
- `email` (text)
- `plan` (text: 'basic', 'standard', 'premium')
- `credits` (integer)
- `stripe_customer_id` (text, nullable)
- `created_at` (timestamp)

**posts table:**
- `id` (UUID, primary key)
- `prompt` (text)
- `generated_text` (text)
- `user_id` (UUID, references profiles.id)
- `created_at` (timestamp)

### Client Libraries

- `src/lib/supabase.ts` & `src/lib/supabaseClient.ts` - Supabase client instances
- `src/lib/stripe.ts` - Stripe client (server-side only)
- `src/lib/openai.ts` - OpenAI client

### Components

Reusable UI components in `src/components/`:

- `Navbar.tsx` - Navigation with auth state (sign in/out)
- `Button.tsx` - Styled button with variants
- `Card.tsx` - Card container for content
- `Loader.tsx` - Loading spinner
- `ThemeToggle.tsx` - Dark/light mode toggle

### Styling

- TailwindCSS for styling
- Global styles in `src/styles/globals.css`
- Dark mode via CSS variables

### Path Aliases

Use `@/*` to import from `src/`:
```typescript
import { supabase } from "@/lib/supabase";
import Button from "@/components/Button";
```

## Security Configuration

Strict security headers configured in `vercel.json`:

- CSP policy restricts script/connect sources to Stripe, Supabase, Vercel
- Frame protection (X-Frame-Options: DENY)
- HSTS, content sniffing protection
- Redirects to block rogue routes: `/wallet/*`, `/connect/*`, `/blocknative/*`

## Stripe Webhook Setup

The webhook endpoint (`/api/webhook`) uses `micro` to parse raw body for signature verification:
- Disabled Next.js body parser with `export const config = { api: { bodyParser: false } }`
- Verifies webhook signature before processing
- Updates profile with plan and credits on `checkout.session.completed` event

## Plan Tiers

Three subscription tiers defined in dashboard:
- **Basic**: $9 USD/mes
- **Standard**: $19 USD/mes (highlighted)
- **Premium**: $29 USD/mes

Each plan maps to corresponding Stripe price IDs in environment variables.

## UI/UX System (v0.4)

### Design System
- **Colors**: Primary (#F9D65C), Secondary (#1E1E1E), Backgrounds, Accents
- **Typography**: Inter font family with weights 400, 600, 700
- **Components**: shadcn/ui-inspired components in `src/components/ui/`
- **Animations**: Framer Motion for smooth transitions
- **Icons**: lucide-react for consistent iconography
- **Dark Mode**: Full theme system with localStorage persistence

### Key Components
- `PlansModal`: Subscription plan selection with animations
- `ThankYouModal`: Post-payment success celebration
- `Navbar`: Dynamic navbar with credits counter and theme toggle
- `ThemeContext`: Global theme management (SSR-safe)

### Pages
- `/`: Professional landing page with hero, features, pricing
- `/dashboard`: AI content generator with history and autosave
- `/profile`: User profile with plan/credits info
- `/signin`, `/signup`: Redesigned auth pages

## Development Notes

- Uses React 19 and Next.js 15.5.6
- TypeScript with strict mode enabled
- Turbopack enabled for faster builds
- Toasts for user feedback via `react-hot-toast`
- Framer Motion for animations
- All client components marked with "use client"
- ThemeProvider wraps entire app in `_app.tsx`

## Phase 5 Features (v0.5 Beta)

### Analytics & Stats
- `/stats` page with comprehensive user metrics
- Real-time charts with Recharts
- API endpoint `/api/stats` for aggregated data
- Database table `usage_stats` for tracking

### Export & Sharing
- LinkedIn export (OAuth-ready dummy endpoint)
- Download as .txt or .md formats
- Export modal with loading states
- Integrated in dashboard posts

### Architecture
- `src/components/dashboard/StatsCard.tsx` - Analytics component
- `src/components/export/ExportModal.tsx` - Export functionality
- `src/pages/api/export/` - Export endpoints

### Notifications & Reminders (Module 3)
- `NotificationContext`: Global notification management system
- Toast notifications for all user actions (save, delete, generate)
- Credit reminder system (localStorage, 24h interval, threshold: 10 credits)
- Supabase Realtime for admin→user notifications
- Database table `admin_notifications` with RLS policies

### Transactional Emails (Module 4)
- Resend integration for email delivery
- Welcome email on user signup (automated via Supabase trigger)
- Weekly summary email (manual/cron)
- HTML templates in `src/emails/` (welcome.html, weekly.html)
- API endpoints: `/api/emails/send.ts`, `/api/emails/welcome-webhook.ts`
- Template variable replacement system

## Contexts

- `ThemeContext` (`src/contexts/ThemeContext.tsx`): Dark/light mode with localStorage
- `NotificationContext` (`src/contexts/NotificationContext.tsx`): Global notifications, credit reminders, realtime admin messages

## Documentation

- `/docs/development/phase-4-ui-plan.md` - Complete Phase 4 implementation
- `/docs/development/phase-5-implementation-summary.md` - Phase 5 progress and roadmap
- `/docs/development/module-3-4-implementation.md` - Notifications and Email implementation
- `/docs/linkedin-oauth-migration.md` - LinkedIn OAuth migration to Supabase Auth
- `/docs/database/usage_stats_migration.sql` - Database migration for analytics
- `/docs/database/admin_notifications_migration.sql` - Admin notifications table
- `/docs/database/welcome_email_trigger.sql` - Trigger for welcome emails

## Authentication

### OAuth Providers

**LinkedIn (via Supabase Auth):**
- Implementation: `supabaseClient.auth.signInWithOAuth({ provider: 'linkedin_oidc' })`
- Used in: `src/pages/signin.tsx`, `src/pages/signup.tsx`
- Configuration: Supabase Dashboard > Authentication > Providers > LinkedIn
- Auto-redirects to `/dashboard` after successful authentication

**Deprecated Custom LinkedIn OAuth:**
- Old implementation in `/api/auth/linkedin/*` is deprecated
- Kept for backward compatibility but should not be used
- See migration docs for details
