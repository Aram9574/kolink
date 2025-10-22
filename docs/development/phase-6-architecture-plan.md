# Phase 6 — Kolink PRO Architecture Blueprint

**Date:** 2025-01-30  
**Owner:** Codex (GPT-5)  
**Purpose:** Define the production-ready architecture that merges the Kolink v0.5 Beta codebase with the PRO roadmap (SayWhat.ai-style modularity, contextual AI, predictive analytics, enriched auth, and scalability requirements).

---

## 1. System Overview

Kolink PRO will evolve into a **modular, service-oriented platform** where the Next.js app acts as the orchestration layer across Supabase, Redis, dedicated microservices, and third-party APIs. Each core capability (Auth, Writer, Inspiration, Calendar, Analytics) earns its own vertical slice covering:

1. **Data model (Supabase + vector embeddings)**
2. **Domain service (Next API / Edge middleware)**
3. **Client SDK hooks (React Query + Zustand stores)**
4. **UI module (component library + page widget)**

```
┌────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js 15)                │
│  - App Shell: layout, Sidebar, routing                     │
│  - Module Widgets: Editor, Inspiration, Analytics, Calendar │
│  - State: Zustand + React Query + Context bridges          │
└────────────────────────────────────────────────────────────┘
                │                      ▲
                ▼                      │
┌─────────────────────┐  Redis Cache   │  Webhooks / Events
│  API Gateway (Next) │◀───────────────┼──────────────┐
│  - REST + Edge      │                │             │
│  - Auth middleware  │ ▶──────────────┴───────────┐ │
└─────────────────────┘     Service Calls          │ │
                │                                   │ │
        ┌───────┴────────┐                     ┌────┴─────────┐
        │  Supabase Core │◀────────────────────┤ Microservices│
        │  - Postgres    │  Queue / Jobs       │  (FastAPI,   │
        │  - Storage     │────────────────────▶│   Node)      │
        │  - pgvector    │                     │              │
        └────────────────┘                     └──────────────┘
```

---

## 2. Domain Modules

### 2.1 Auth & Profile Intelligence
- **Goal:** LinkedIn OAuth2 + Supabase Auth federation; enriched user knowledge graph.
- **Key pieces:**
  - `/pages/api/auth/linkedin.ts` as OAuth callback handler (Edge-compatible, PKCE + state validation).
  - Supabase `profiles` schema upgrade:  
    `user_id`, `bio`, `headline`, `expertise text[]`, `tone_profile jsonb`, `profile_embedding vector(1536)`, `linkedin_access_token`, `linkedin_refresh_token`, `linkedin_expires_at`.
  - Worker that ingests LinkedIn profile, normalizes into `tone_profile`, triggers embedding job via Writer Service.
  - `src/modules/auth` with hooks: `useLinkedInLogin`, `useSession`, `useProfile`.
  - Secure storage for tokens (KMS or Supabase Vault; for MVP encrypt with `pgcrypto` + service role).

### 2.2 Writer & Repurposing
- **Goal:** Contextual generation/repurposing fused with user embeddings.
- **Key pieces:**
  - Supabase `posts` schema upgrade: `style`, `content`, `hashtags`, `metadata jsonb`, `embedding vector(1536)`, `source_post_id`, `score`, `cta_suggestions`.
  - `/api/post/generate` orchestrates:
    1. Fetch profile context + inspiration cues.
    2. Call `writer-service` (FastAPI) with prompt & embeddings.
    3. Store post + embedding; enqueue analytics event.
  - `/api/post/repurpose` loads original post, calls writer-service for rewrite given new `style/format`.
  - `src/modules/writer`:
    - `services/writerClient.ts` (typed clients)
    - `hooks/usePostGenerator.ts` (React Query mutation)
    - `components/EditorAI.tsx` (rich editor with voice input, suggestions, CTA builder).

### 2.3 Inspiration Hub
- **Goal:** Semantic search across viral content + saved intelligence.
- **Data model:**  
  - `inspiration_posts` (source metadata, vectors)  
  - `saved_posts` (user_id, post_id, notes)  
  - `saved_searches` (user_id, filters jsonb)
- **API:** `/api/inspiration/search` (Edge, cached via Redis), `/api/inspiration/save`.
- **Frontend:** `src/modules/inspiration` for Feed, filters, semantic search UI; states via React Query.

### 2.4 Calendar & Scheduling Intelligence
- **Data model:**  
  - `calendar_events` (post_id, datetime, platforms[], ai_score, recommendation_reason jsonb, status)  
  - optional `platform_credentials` for Buffer/Hootsuite tokens.
- **Service:** `calendar-service` (Node.js) running Prophet/ARIMA job (or Python microservice) to deliver `best_post_time`. Next API just enqueues job via Redis queue (BullMQ) and persists results.
- **Frontend:** `CalendarWidget` with week view, AI suggestions, ability to accept/override recommended slots, integration with Buffer webhooks.

### 2.5 Analytics & Insights
- **Data model:**  
  - `analytics_events` (raw ingestion)  
  - Materialized views `vw_post_performance`, `vw_user_engagement`.
  - `lead_insights` table for top leads detection.
- **Service:** `analytics-service` (Python) for forecasts (Prophet), cohort benchmarking, anomaly detection.
- **API:** `/api/analytics/stats` (present), add `/api/analytics/forecast`, `/api/analytics/leads`.
- **Frontend:** `AnalyticsPanel.tsx` using React Query to fetch KPIs, Chart.js/Recharts for viz, Sentry/PostHog instrumentation.

### 2.6 Integration & Notifications
- **integration-service:** handles LinkedIn post scheduling, Buffer/Hootsuite sync, crossposting (future). Uses JWT from Next API.
- **notification-service:** publishes Slack/web push/email notifications via Redis pub/sub and Resend.

---

## 3. Frontend Architecture

### 3.1 Folder Layout
```
src/
├── app/ (optional migration) or pages/
├── modules/
│   ├── auth/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── services/
│   ├── writer/
│   ├── inspiration/
│   ├── calendar/
│   ├── analytics/
│   └── dashboard/
├── stores/            # Zustand slices (auth, layout, editor, calendar)
├── services/          # Fetchers, clients, shared libs
├── utils/             # prompts.ts, scoring.ts, recommendations.ts, formatters
└── lib/               # supabase, redis, openai wrappers, telemetry
```

### 3.2 State & Data
- **Zustand:** Global UI/application state (session, layout, editor draft, filters).
- **React Query:** Server state with caching (posts, analytics, inspiration results).
- **Feature Flags:** Use Supabase `profiles.features` jsonb or LaunchDarkly (future) to toggle modules per plan.

### 3.3 UI Modules
- Dashboard page renders widget grid using `react-grid-layout` (or custom DnD). Each widget is a module entry point exposing `<ModuleName.Widget />` with internal data fetching.
- `EditorAI.tsx`:
  - Voice input via Web Speech API (`SpeechRecognition`).
  - Buttons: Generate, Regenerate (with last prompt context), Save (persist to Supabase), Copy (clipboard), Share (Buffer), Score badge.
  - Viral feedback panel using `viralScore(text)`, `recommendNextAction(score)`.
- Provide skeletons & optimistic UI for Edge-speed.

---

## 4. Backend & Services

### 4.1 API Gateway (Next.js)
- Centralizes authentication (Supabase JWT check via `supabase.auth.getUser()` or GoTrue admin).
- Provides typed response helpers, error telemetry (Sentry), caching (Redis) & rate limiting (Upstash or custom middleware).
- `src/server/handlers/` for domain-specific logic, promoting reusability across routes.
- Use Edge Runtime where latency critical (`generate`, `search`), Node runtime for heavy operations (Stripe).

### 4.2 Microservices
| Service | Runtime | Responsibilities |
|---------|---------|------------------|
| `writer-service` | Python FastAPI | GPT prompt templating, embeddings, repurposing, scoring heuristics |
| `calendar-service` | Node.js (ts-node) + BullMQ | Forecast optimal posting times, Buffer/Hootsuite sync |
| `analytics-service` | Python | Prophet/ARIMA forecasts, cohort benchmarks, anomaly detection |
| `integration-service` | Node.js | LinkedIn/Buffer API interactions, token refresh |
| `notification-service` | Node.js | Slack alerts, webhooks, Redis pub/sub consumers |

- All services authenticated using signed JWT issued by Next API. Services publish events back via Redis channels (`analytics.metrics`, `calendar.recommendations`).

### 4.3 Redis Layer
- Hosted Redis (Upstash/Redis Enterprise). Use for:
  - Semantic search cache results (`inspiration:search:{hash}`).
  - Rate limiting tokens.
  - Job queue (BullMQ) for asynchronous tasks.
  - Pub/sub between Next API and microservices for notifications/analytics.

---

## 5. Data & Migrations

### 5.1 New Tables & Columns
- `profiles`: add `bio`, `headline`, `expertise text[]`, `tone_profile jsonb`, `profile_embedding`, `linkedin_*` tokens, `features jsonb`.
- `posts`: add `style`, `content`, `summary`, `hashtags text[]`, `embedding`, `score`, `cta_suggestions jsonb`, `source_post_id`.
- `calendar_events`: scheduling metadata, statuses.
- `inspiration_posts`, `saved_posts`, `saved_searches`.
- `analytics_events`, `lead_insights`, update views.

### 5.2 Extensions & Indices
- Enable `pgvector` (Supabase DevOps) for embeddings.
- Create GIN indexes on jsonb fields as needed (filters, tone profile).
- Materialized views for analytics with scheduled refresh (Supabase cron).

### 5.3 Security
- RLS for each table with role-based access (users vs admins).
- Service role policies for internal microservices (using Supabase service key).
- Encrypt OAuth tokens via `pgp_sym_encrypt`.

---

## 6. Observability & Operations

- **PostHog:** Client + server events (module usage, funnel stats). Auto track in Editor, Inspiration search, Calendar actions.
- **Sentry:** Already integrated; extend with microservice instrumentation and release health.
- **Vercel Analytics & Edge**: add instrumentation for page loads.
- **Logging:** Standardize JSON logs (pino) in Next API & Node services. Use structured log ingestion (Logflare or Datadog).
- **Alerting:** Slack notifications for high error rates, missed schedules, analytics anomalies.
- **CI/CD:** Extend GitHub Actions to build/test microservices, run Supabase migration checks, deploy to Vercel + Render/Fly.

---

## 7. Implementation Roadmap

### Phase A — Foundation (Weeks 1-2)
1. Rotate leaked secrets, update `.env.example`.
2. Supabase migrations: pgvector, enriched `profiles`, `posts`, base tables for inspiration/calendar/analytics.
3. Implement LinkedIn OAuth flow + profile ingestion pipeline.
4. Scaffold Redis client, queue infrastructure, shared libs.
5. Introduce module folder structure, Zustand + React Query setup.

### Phase B — AI & Inspiration (Weeks 3-4)
1. Writer service (FastAPI) MVP with embeddings + scoring.
2. `/api/post/generate` + `/api/post/repurpose` rewrites using new service.
3. Build `EditorAI` module with viral scoring + voice input.
4. Inspiration Hub page + semantic search pipeline.

### Phase C — Calendar & Analytics (Weeks 5-6)
1. Calendar service + scheduling endpoint (Prophet-based recommendations).
2. Calendar widget UI + Buffer integration hooks.
3. Analytics service for forecasts + cohort benchmarking.
4. Update Analytics panel with predictive charts, alerts, PostHog instrumentation.

### Phase D — Hardening & Scale (Weeks 7-8)
1. Integrate notification-service (Slack/email alerts).
2. Expand RBAC + feature flag management.
3. Comprehensive testing (unit, contract, integration, load).
4. Observability dashboards, runbooks, deployment automation.

---

## 8. Next Steps

1. Approve architecture blueprint & roadmap.
2. Begin Phase A with migration scripts + LinkedIn auth implementation.
3. Align product stakeholders on phased deliverables (Pro vs Enterprise features).
4. Schedule security review for token storage & microservice auth.

This blueprint will guide code refactors and new module implementation in subsequent tasks.
