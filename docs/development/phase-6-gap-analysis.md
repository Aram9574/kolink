# Phase 6 — Gap Analysis vs. Production Specification

**Date:** 2025-01-30  
**Prepared by:** Codex (GPT-5)  
**Scope:** Compare current Kolink v0.5 Beta implementation with the production-ready requirements described for the Kolink PRO release.

---

## 1. Authentication & Profile Intelligence

- **Current state:** Supabase email/password auth with `profiles` table storing `{ id, email, plan, credits, stripe_customer_id, created_at, role?, last_login? }`. Admin role extensions exist from Phase 5. No OAuth integrations, no enriched profile data, no embeddings workflow.
- **Spec gap:** LinkedIn OAuth2 login flow, enriched Supabase auth (LinkedIn token exchange, refresh handling), and profile bootstrap (bio, expertise array, tone profile JSON, 1536-dim embedding). LinkedIn import + OpenAI embedding pipeline is absent. No storage for `tone_profile`, `embedding`, or `expertise`.
- **Impact:** Missing contextual user modelling blocks downstream personalization (post generation, recommendations, analytics segmentation).

## 2. AI Content Services

- **Current state:** `/api/generate` route accepts `{ prompt }`, deducts credits, calls GPT-4o-mini, stores post text (no metadata). No modular service layer; call made directly inside API route. No embeddings or style handling. Writer microservice not present.
- **Spec gap:** `/api/post/generate` should accept `{ prompt, style, userId }`, merge tone/profile context, produce optimized copy, write post record with `{ style, content, embedding }`, and return enriched payload. Vector storage + embedding generation missing. No caching/queueing via Redis.
- **Repurpose:** `/api/post/repurpose` endpoint absent (no route, no business logic to fetch existing post embeddings, semantic consistency checks, or rewriting prompts).
- **Utilities:** `src/utils/prompts.ts`, `scoring.ts`, `recommendations.ts` folders absent; viral scoring logic not implemented.

## 3. Inspiration Hub & Semantic Search

- **Current state:** No `inspiration.tsx` page or supporting components/APIs. No dataset of viral posts, no semantic search endpoints, no saved searches or favorites. Supabase schema lacks supporting tables (`inspiration_posts`, `saved_posts`, `saved_searches`).
- **Spec gap:** Required semantic similarity search using embeddings, filter UI, storing favorites. Also expects edge-ready API route for search with redis caching and supabase pgvector indexes.

## 4. Editor AI Experience

- **Current state:** Dashboard contains inline text area for prompt submission; no standalone `EditorAI.tsx`. Voice input (Web Speech API), regenerate flows, dynamic suggestions, or CTA/emoji prompts not present. Viral feedback visualizations absent. Autosave exists via NotificationContext reminder but not integrated with scoring.
- **Spec gap:** Rich editor component with actions, context-aware suggestions, viral score indicator, `recommendNextAction` integration, copy/save flows, and Web Speech mic controls.

## 5. Scheduling & Calendar Intelligence

- **Current state:** No calendar page or API routes. Database lacks `calendar_events`. No integration with Prophet/ARIMA, Buffer/Hootsuite webhooks, or AI scheduling recommendations.
- **Spec gap:** `/api/calendar/schedule` route, predictive modelling (Prophet or ARIMA via Python microservice or JS alt), Supabase table for events, UI widget similar to week timeline with AI recommendations, real-time sync/integration-service hooks. Redis pub/sub for notifications not configured.

## 6. Advanced Analytics & Predictive Insights

- **Current state:** `/api/stats` returns simple counters; `StatsCard` visualizes posts & credits. No predictive analytics, cohort benchmarking, PostHog instrumentation, or lead detection. Prophet/ARIMA forecasts absent. Supabase lacks `analytics` table or views (`vw_post_performance`, `vw_user_engagement`).
- **Spec gap:** Data pipeline for storing engagement metrics, forecast jobs (likely microservice), analytics panel with charts/alerts, PostHog + Sentry deeper instrumentation, plus integration with Redis for caching and streaming metrics.

## 7. Dashboard & Modular Architecture

- **Current state:** `dashboard.tsx` provides linear layout (hero, prompt input, list of generated posts). No drag & drop widget system, no modular architecture akin to SayWhat.ai. State managed locally; no Zustand or React Query usage despite stack listing. No Edge Function wrappers.
- **Spec gap:** Modular widget architecture (Sidebar, Post Generator, Inspiration Feed, Analytics Overview, Calendar Timeline), global state via Zustand, server interactions via React Query, persisted layout, and plug-and-play micro frontends. Needs virtualization & skeleton loading states.

## 8. Infrastructure & Services

- **Redis:** No `src/lib/redis.ts`; absence of client, caching helpers, or pub/sub integration.
- **Microservices:** Recommended services (writer-service, calendar-service, analytics-service, integration-service, notification-service) not scaffolded; no API gateway pattern or JWT service-to-service auth.
- **Edge Functions:** Current API routes run on default runtime; no `runtime = 'edge'` declarations or handler adjustments.
- **Predictive Models:** No Prophet/ARIMA integration (likely requires Python service or npm-based alt like `prophet-js`/`timeseries-analysis`).

## 9. Payments & Plans

- **Current state:** Stripe subscription flow implemented (checkout, webhook). Credits deduction working. Need to validate multi-tier quotas for new premium roadmap features (e.g., analytics add-ons, extra AI tokens) once architecture updated.
- **Spec consideration:** Ensure new tables & services respect plan entitlements (RBAC + feature flags). Might require Supabase functions/policies updates.

## 10. Observability & Security Upgrades

- **Current state:** Sentry integrated; CI pipeline established. RLS for new tables from Phase 5 (admin) exists.
- **Spec gap:** Need PostHog analytics, Vercel Analytics instrumentation, enriched logging (structured JSON), Slack alerts, LinkedIn OAuth security (state, PKCE), Supabase RBAC review for new tables, JWT flows for microservices. OAuth tokens & LinkedIn data need encrypted storage/secrets rotation.

## 11. Environment & Configuration

- **Current state:** `.env.local` missing required keys from new spec (`LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `REDIS_URL`). Duplicate/placeholder values present for Resend (security concern). No config for Prophet service or microservices.
- **Spec gap:** Introduce full variable set, sanitize secrets (rotate leaked keys), document per-service configuration, update `CLAUDE.md`/README accordingly.

---

### Summary of Immediate Priorities

1. **Authentication overhaul** — LinkedIn OAuth2 + enriched profile schema + embedding pipeline.
2. **AI service layer** — Modular writer service with profile context, embeddings, repurpose endpoint, Redis caching.
3. **Data model migrations** — pgvector setup for profiles/posts, new tables for inspiration, calendar, analytics, plus RLS policies.
4. **Frontend refactor** — Introduce modular dashboard architecture with dedicated modules (Editor, Inspiration, Analytics, Calendar) using Zustand + React Query.
5. **Predictive analytics stack** — Forecasting microservice/APIs, analytics dashboards, alerts, and instrumentation (PostHog, Sentry deep linking).

Deliverables above unblock subsequent roadmap items (autoscheduling integrations, marketplace, multichannel posting, etc.).
