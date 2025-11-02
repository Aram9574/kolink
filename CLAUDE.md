# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Kolink v1.0 is a professional Next.js SaaS application with modern UI/UX integrating Supabase (authentication & database), Stripe (payments), and OpenAI (content generation). The application features a complete design system with dark mode, professional landing page, dashboard with AI content generation, subscription management, and **personalized LinkedIn content generation using RAG (Retrieval-Augmented Generation)**.

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
- `src/pages/dashboard/index.tsx` - Main dashboard with plan selection and AI generation
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
   - Session state in `_app.tsx` via `supabaseClient.auth.onAuthStateChange()`
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
- `/docs/database/usage_stats_migration.sql` - Database migration for analytics
- `/docs/database/admin_notifications_migration.sql` - Admin notifications table
- `/docs/database/welcome_email_trigger.sql` - Trigger for welcome emails

## Security Features (v1.0)

### Two-Factor Authentication (2FA)
- TOTP-based authentication (compatible with Google Authenticator, Authy, etc.)
- QR code generation for easy setup
- Manual secret entry option
- 8 backup codes for account recovery
- Rate limiting (5 attempts per 5 minutes)
- Encrypted secret storage (AES-256-GCM)
- Security alerts on enable/disable

### Password Security
- **Robust validation** with real-time feedback
- **Strength indicator** with visual progress bar
- **Requirements:**
  - Minimum 8 characters (recommended 12+)
  - Uppercase, lowercase, numbers, special characters
  - No common passwords (top 100 list blocked)
  - No sequential patterns or repeated characters
- **Password history** tracking to prevent reuse

### Password Recovery
- Secure token-based recovery system
- SHA-256 hashed tokens (never stored in plain text)
- 1-hour token expiration
- Single-use enforcement
- Email notifications
- Security alerts on reset requests
- IP address and device tracking

### Session Management
- Multi-device session tracking
- Device information (type, OS, browser)
- IP address and geolocation
- Last activity timestamps
- Current session identification
- Individual session revocation
- Bulk session revocation (all except current)
- Security alerts for suspicious logins
- Automatic cleanup of expired sessions

### Data Encryption
- **In Transit:** HTTPS/TLS, secure WebSocket, CSP headers
- **At Rest:**
  - AES-256-GCM for 2FA secrets
  - SHA-256 for tokens and password hashes
  - Supabase encryption for database

### Security Alerts & Monitoring
- Real-time security event notifications
- Alert types: new device, new location, password changes, 2FA events, suspicious activity
- Severity levels: low, medium, high, critical
- Email and in-app notifications
- Complete login history audit trail

### Architecture
- `/src/lib/security/passwordValidation.ts` - Password strength validation
- `/src/lib/security/twoFactor.ts` - 2FA implementation (TOTP, backup codes, encryption)
- `/src/components/security/PasswordStrengthIndicator.tsx` - Real-time password feedback UI
- `/src/components/security/TwoFactorSetup.tsx` - 2FA setup wizard
- `/src/components/security/ActiveSessions.tsx` - Session management UI
- `/src/pages/security.tsx` - Comprehensive security dashboard
- `/src/pages/forgot-password.tsx` - Password recovery request
- `/src/pages/reset-password.tsx` - Password reset with token
- `/src/pages/api/security/` - Security API endpoints

### Database Tables
- `user_2fa_settings` - 2FA configuration and encrypted secrets
- `user_2fa_attempts` - 2FA verification attempts tracking
- `password_reset_tokens` - Password recovery tokens (hashed)
- `user_sessions` - Active session tracking across devices
- `login_history` - Complete login audit trail
- `security_alerts` - Security event notifications
- `password_history` - Password hashes to prevent reuse
- `password_policies` - Configurable password requirements
- `security_metrics` - Daily security metrics aggregation

### API Endpoints
- `POST /api/security/2fa/setup` - Initialize 2FA setup
- `POST /api/security/2fa/verify` - Verify TOTP code
- `POST /api/security/password/request-reset` - Request password reset
- `POST /api/security/password/reset` - Reset password with token
- `GET /api/security/sessions/list` - Get active sessions
- `POST /api/security/sessions/revoke` - Revoke sessions

### Environment Variables
- `ENCRYPTION_KEY` - 256-bit hex key for 2FA secret encryption

## Personalization System (v1.0)

Kolink v1.0 introduces a sophisticated **RAG (Retrieval-Augmented Generation)** system for generating personalized LinkedIn posts that maintain the user's unique voice while incorporating viral content patterns.

### Overview
- **User Style Learning**: Imports and analyzes user's historical LinkedIn posts
- **Viral Content Corpus**: Curated database of high-engagement posts
- **Vector Search**: pgvector with HNSW indices for semantic similarity
- **AI Generation**: GPT-4o generates A/B variants optimized for engagement

### Architecture

**Database Tables:**
- `user_posts` - User's historical posts with engagement metrics
- `user_post_embeddings` - 3072-dimensional vectors (text-embedding-3-large)
- `viral_corpus` - Curated viral posts with detailed metadata
- `viral_embeddings` - Vector embeddings of viral content
- `generations` - Generated content with A/B variants
- `post_metrics` - Engagement tracking for published posts
- `rag_cache` - Performance optimization cache (24h TTL)

**API Endpoints:**
- `POST /api/user-style/ingest` - Import user's historical posts
- `POST /api/viral/ingest` - Add viral posts to corpus (admin only)
- `POST /api/rag/retrieve` - Semantic search for similar content
- `POST /api/personalized/generate` - Generate personalized A/B variants

**AI Utilities:**
- `/src/lib/ai/embeddings.ts` - OpenAI embedding generation & similarity
- `/src/lib/ai/generation.ts` - GPT-4o content generation with RAG context
- `/src/types/personalization.ts` - Complete TypeScript type definitions

### Generation Flow
1. User provides topic + intent (educativo, inspiracional, etc.)
2. System generates embedding of the topic
3. Vector search retrieves:
   - Top 3 similar posts from user's history (for style)
   - Top 5 similar viral posts (for patterns)
4. GPT-4o generates 2 variants with context:
   - Variant A: Short (150-300 words)
   - Variant B: Long (300-600 words)
5. User selects variant and publishes
6. System tracks engagement metrics

### Performance Optimizations
- **HNSW Indices**: 10-100x faster than IVFFlat for vector search
- **RAG Cache**: 24h cache reduces latency from ~5s to ~500ms
- **Batch Embeddings**: Process up to 100 posts per API call
- **SQL Functions**: Native PostgreSQL functions for similarity search

### Cost Estimates (per 1000 monthly active users)
- Embeddings: ~$30/month
- Generation (50 posts/user): ~$350/month
- **Total with cache**: ~$280/month

### Documentation
- **Complete Guide**: `/docs/personalization/README.md`
- **Quick Start**: `/docs/personalization/QUICK_START.md`
- **Implementation Summary**: `/docs/personalization/IMPLEMENTATION_SUMMARY.md`
- **Database Schema**: `/docs/database/personalization_schema.sql`

### Environment Variables
- `ADMIN_EMAILS` - Comma-separated list of admin emails for viral corpus ingestion

### Security
- Row Level Security (RLS) on all user tables
- Admin-only access to viral corpus ingestion
- JWT authentication required for all endpoints
- Input validation and sanitization

## Authentication
