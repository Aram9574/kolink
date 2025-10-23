# 🏗️ Plan de Integración: Arquitectura Monolito → Híbrida

## 📋 Resumen Ejecutivo

Este documento detalla cómo integrar las características propuestas del plan de microservicios **sin romper** la arquitectura actual funcional de Kolink.

**Estrategia:** Evolución incremental hacia arquitectura híbrida, preservando funcionalidad existente.

---

## 🎯 Arquitectura Actual (v0.5)

### Stack Tecnológico Actual
```
Frontend: Next.js 15 (Pages Router) + React 19
Backend: Next.js API Routes (serverless)
Database: Supabase (PostgreSQL + Auth + Realtime)
Payments: Stripe
AI: OpenAI GPT-4o-mini
Email: Resend
Analytics: PostHog + Sentry
Cache: Redis (Upstash)
OAuth: LinkedIn (custom implementation)
```

### Estructura Actual
```
kolink/
├── src/
│   ├── pages/                    # Next.js Pages Router
│   │   ├── api/                  # API Routes serverless
│   │   │   ├── checkout.ts       ✅ Stripe payments
│   │   │   ├── webhook.ts        ✅ Stripe webhooks
│   │   │   ├── generate.ts       ✅ OpenAI generation (legacy)
│   │   │   ├── post/
│   │   │   │   ├── generate.ts   ✅ Contextual AI generation
│   │   │   │   └── repurpose.ts  ✅ Content repurposing
│   │   │   ├── calendar/
│   │   │   │   └── schedule.ts   ✅ AI scheduling
│   │   │   ├── analytics/
│   │   │   │   └── stats.ts      ✅ Enhanced analytics
│   │   │   ├── inspiration/      ✅ Semantic search
│   │   │   ├── inbox/            ⚠️  Placeholder
│   │   │   ├── auth/linkedin/    ✅ OAuth2 flow
│   │   │   ├── emails/           ✅ Transactional emails
│   │   │   └── admin/            ✅ Admin endpoints
│   │   ├── dashboard.tsx         ✅ Main dashboard
│   │   ├── calendar.tsx          ✅ Scheduling view
│   │   ├── inspiration.tsx       ✅ Inspiration hub
│   │   ├── stats.tsx             ✅ Analytics page
│   │   ├── profile.tsx           ✅ User profile
│   │   ├── admin.tsx             ✅ Admin panel
│   │   └── ...                   ✅ Auth pages
│   ├── components/
│   │   ├── Navbar.tsx            ✅ Navigation
│   │   ├── PlansModal.tsx        ✅ Subscription
│   │   ├── EditorAI.tsx          ✅ AI editor
│   │   ├── dashboard/            ✅ Dashboard widgets
│   │   ├── export/               ✅ Export modals
│   │   └── ui/                   ✅ UI primitives
│   ├── contexts/
│   │   ├── ThemeContext.tsx      ✅ Dark mode
│   │   └── NotificationContext.tsx ✅ Notifications
│   ├── lib/
│   │   ├── supabase.ts           ✅ DB client
│   │   ├── stripe.ts             ✅ Payments
│   │   ├── openai.ts             ✅ AI client
│   │   ├── linkedin.ts           ✅ OAuth
│   │   ├── redis.ts              ✅ Cache
│   │   └── ...
│   └── server/                   ✅ Server utilities
└── docs/                         ✅ Documentation
```

---

## 🔄 Arquitectura Propuesta (Plan Original)

```
Microservicios independientes:
- API Gateway (Node/Express)
- IA Service (FastAPI)
- Calendar Service (FastAPI)
- Analytics Service (FastAPI)
- Inbox Service (FastAPI)
- Integrations Service (FastAPI)
- Notifications Service (FastAPI)
```

---

## ⚡ Estrategia de Integración: Arquitectura Híbrida

### Fase 1: Coexistencia (Recomendado) ✅

**Mantener arquitectura actual** y agregar microservicios opcionales que se comunican vía API Routes.

```
┌─────────────────────────────────────────────┐
│          Next.js Application                │
│  ┌──────────────────────────────────────┐   │
│  │     Frontend (Pages Router)          │   │
│  └──────────────────────────────────────┘   │
│                    ↓                         │
│  ┌──────────────────────────────────────┐   │
│  │   API Routes (Current - Serverless)  │   │
│  │  ✅ /api/checkout                     │   │
│  │  ✅ /api/post/generate                │   │
│  │  ✅ /api/calendar/schedule            │   │
│  │  ✅ /api/analytics/stats              │   │
│  │  🆕 /api/inbox/messages (proxy)       │   │
│  └──────────────────────────────────────┘   │
│            ↓         ↓         ↓             │
│     ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│     │ Supabase │ │  OpenAI  │ │  Stripe  │  │
│     └──────────┘ └──────────┘ └──────────┘  │
└─────────────────────────────────────────────┘
              ↓ (opcional)
    ┌──────────────────────────┐
    │  Microservicios FastAPI  │
    │  (Future enhancement)    │
    │  - Inbox Service         │
    │  - Advanced Analytics    │
    │  - Integrations Hub      │
    └──────────────────────────┘
```

**Ventajas:**
- ✅ No rompe nada existente
- ✅ Despliegue incremental
- ✅ Aprovecha infraestructura serverless de Vercel
- ✅ Costos optimizados (no siempre corriendo servicios)
- ✅ Compatibilidad con Supabase, Stripe, OpenAI existentes

---

## 📦 Plan de Implementación Incremental

### MILESTONE 1: Componentes UI Faltantes ⚡ (1-2 días)

**Objetivo:** Crear componentes mencionados en el plan que faltan en la estructura actual.

#### 1.1 Layout Components
```typescript
// src/components/layout/Sidebar.tsx (Mejorado)
// Expandir Navbar.tsx actual para incluir navegación lateral completa
// Items: Dashboard, Content AI, Calendar, Analytics, Inbox, Profile

// src/components/layout/Header.tsx
// Extraer header section del Navbar.tsx actual
// Incluir: Avatar, notificaciones, theme toggle, logout

// src/components/layout/ProtectedRoute.tsx
// Ya existe lógica en _app.tsx, crear componente reutilizable
```

#### 1.2 Dashboard Modules
```typescript
// src/components/dashboard/EngagementChart.tsx ✅ (existe)
// src/components/dashboard/RecentPosts.tsx 🆕
// src/components/dashboard/AIAlerts.tsx 🆕
// src/components/dashboard/Suggestions.tsx 🆕
```

#### 1.3 Inbox Components (Nuevo módulo)
```typescript
// src/components/inbox/MessageList.tsx 🆕
// src/components/inbox/MessageItem.tsx 🆕
// src/components/inbox/ReplyModal.tsx 🆕
// src/components/inbox/FilterBar.tsx 🆕
```

#### 1.4 Pages Faltantes
```typescript
// src/pages/dashboard/inbox.tsx 🆕
// Bandeja de mensajes LinkedIn
// Menciones y engagement
// Respuestas rápidas

// Mejorar src/pages/dashboard.tsx
// Integrar widgets nuevos
```

---

### MILESTONE 2: API Routes Extendidos ⚡ (2-3 días)

**Objetivo:** Completar endpoints faltantes usando Next.js API Routes.

#### 2.1 Inbox Module (Nuevo)
```typescript
// src/pages/api/inbox/messages.ts 🆕
// GET - Lista mensajes LinkedIn
// Integración con LinkedIn Messaging API
// Cache con Redis

// src/pages/api/inbox/reply.ts 🆕
// POST - Enviar respuesta
// Rate limiting con Redis
```

#### 2.2 Integrations Enhanced
```typescript
// src/pages/api/linkedin/post.ts 🆕
// POST - Publicar contenido a LinkedIn
// Integración con LinkedIn Share API

// src/pages/api/linkedin/metrics.ts 🆕
// GET - Obtener métricas de posts
// Cache y agregación
```

#### 2.3 Notifications Enhanced
```typescript
// Extender src/contexts/NotificationContext.tsx ✅
// Agregar sistema de gamificación (XP, badges)
// src/pages/api/notifications/gamification.ts 🆕
```

#### 2.4 Analytics Extended
```typescript
// Extender src/pages/api/analytics/stats.ts ✅
// Agregar:
// - /api/analytics/leads (top leads scoring)
// - /api/analytics/trending (tendencias globales)
// - /api/analytics/benchmarking (comparación industria)
```

---

### MILESTONE 3: WebSocket / Realtime ⚡ (1-2 días)

**Objetivo:** Implementar actualizaciones en tiempo real para inbox.

#### 3.1 Supabase Realtime (Recomendado)
```typescript
// Usar Supabase Realtime ya configurado
// src/lib/realtime.ts 🆕
// Canales para:
// - inbox_messages
// - notifications
// - collaboration (futuro)

// Integrar en:
// - src/pages/dashboard/inbox.tsx
// - src/components/inbox/MessageList.tsx
```

#### 3.2 Alternativa: Socket.io
```typescript
// Si se necesita lógica custom
// src/pages/api/socket.ts 🆕
// Usar Next.js custom server (opcional)
```

---

### MILESTONE 4: Context & State Management ⚡ (1 día)

**Objetivo:** Centralizar estado de aplicación.

#### 4.1 Contexts Adicionales
```typescript
// src/contexts/InboxContext.tsx 🆕
// Gestión estado inbox, mensajes no leídos

// src/contexts/AnalyticsContext.tsx 🆕
// Cache client-side de métricas

// Extender src/contexts/AuthContext.tsx (en _app.tsx)
// Ya existe lógica, extraer a context formal
```

#### 4.2 API Client Centralizado
```typescript
// src/lib/api.ts 🆕
// Axios/Fetch wrapper con:
// - Supabase auth token injection
// - Error handling centralizado
// - Retry logic
// - Request/response interceptors
```

---

### MILESTONE 5: Microservicios Opcionales (Futuro - 1-2 semanas)

**Solo si se necesita escalabilidad masiva o lógica muy compleja.**

#### 5.1 Estructura Propuesta
```
backend/
├── api-gateway/              # Express proxy (opcional)
│   └── Redirige a Next.js API Routes o microservicios
├── microservices/
│   ├── inbox_service/        # FastAPI - Solo si >10k mensajes/día
│   ├── analytics_service/    # FastAPI - Solo si procesamiento pesado
│   └── integrations_service/ # FastAPI - Multi-plataforma complejo
└── docker-compose.yml
```

#### 5.2 Cuándo Migrar a Microservicios
- ✅ Tráfico >100k requests/día
- ✅ Procesamiento ML/AI complejo (>30s)
- ✅ Múltiples integraciones (Twitter, Instagram, TikTok, etc.)
- ✅ Equipo >5 desarrolladores trabajando en paralelo

#### 5.3 Comunicación Híbrida
```typescript
// Next.js API Route puede llamar a microservicio
// src/pages/api/inbox/messages.ts
export default async function handler(req, res) {
  // Si microservicio disponible
  if (process.env.INBOX_SERVICE_URL) {
    const response = await fetch(`${process.env.INBOX_SERVICE_URL}/messages`);
    return res.json(await response.json());
  }

  // Fallback a lógica local
  const messages = await getMessagesFromSupabase();
  return res.json(messages);
}
```

---

## 🎨 Diseño UI/UX - Componentes Específicos

### Sidebar Mejorado
```typescript
// src/components/layout/Sidebar.tsx
const menuItems = [
  { icon: Home, label: 'Dashboard', path: '/dashboard' },
  { icon: Sparkles, label: 'Content AI', path: '/dashboard', active: true },
  { icon: Calendar, label: 'Calendar', path: '/calendar' },
  { icon: BarChart3, label: 'Analytics', path: '/stats' },
  { icon: Inbox, label: 'Inbox', path: '/dashboard/inbox', badge: unreadCount },
  { icon: Lightbulb, label: 'Inspiration', path: '/inspiration' },
  { icon: User, label: 'Profile', path: '/profile' },
];

// Secciones:
// - Main Navigation
// - Settings (Admin, Profile)
// - Credits Badge
// - Theme Toggle
```

### Dashboard Layout
```typescript
// src/pages/dashboard.tsx (mejorado)
<DashboardLayout>
  <Sidebar />
  <main>
    <Header />
    <div className="dashboard-grid">
      <EngagementChart />
      <RecentPosts />
      <AIAlerts />
      <PersonalizedSuggestions />
      <UpcomingSchedule />
    </div>
  </main>
</DashboardLayout>
```

---

## 🔐 Autenticación - Estado Actual

**Ya implementado:**
- ✅ Supabase Auth (email/password)
- ✅ LinkedIn OAuth2 custom
- ✅ Session management en _app.tsx
- ✅ Protected routes logic

**Mejoras propuestas:**
```typescript
// src/lib/auth.ts (nuevo)
export const useAuth = () => {
  // Hook centralizado
  // Ya existe en _app.tsx, extraer
};

// src/components/layout/ProtectedRoute.tsx
export const ProtectedRoute = ({ children }) => {
  const { session, loading } = useAuth();
  if (loading) return <Loader />;
  if (!session) return <Navigate to="/signin" />;
  return children;
};
```

---

## 📊 Base de Datos - Schema Actual vs Propuesto

### Schema Actual (Supabase)
```sql
✅ profiles (id, email, plan, credits, created_at)
✅ posts (id, prompt, generated_text, user_id, created_at)
✅ usage_stats (id, user_id, metric, value, timestamp)
✅ admin_notifications (id, user_id, message, type, read)
```

### Schema Propuesto (Adicional)
```sql
-- Inbox messages
CREATE TABLE inbox_messages (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  platform TEXT, -- 'linkedin', 'twitter', etc.
  message_text TEXT,
  sender_name TEXT,
  sender_profile_url TEXT,
  read BOOLEAN DEFAULT false,
  replied BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Calendar events (ya existe lógica en /api/calendar/schedule.ts)
CREATE TABLE calendar_events (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  post_id UUID REFERENCES posts(id),
  scheduled_time TIMESTAMP,
  status TEXT, -- 'pending', 'published', 'failed'
  platform TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Gamification
CREATE TABLE user_achievements (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  achievement_type TEXT, -- 'first_post', 'viral_post', 'streak_7', etc.
  xp_earned INTEGER,
  unlocked_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🚀 Roadmap de Implementación

### Sprint 1 (Esta Semana) ⚡
- [ ] Crear componentes UI faltantes (Sidebar mejorado, Inbox components)
- [ ] Implementar página /dashboard/inbox.tsx
- [ ] Crear API routes para inbox (/api/inbox/messages, /api/inbox/reply)
- [ ] Integrar Supabase Realtime para inbox
- [ ] Crear schema de inbox_messages en Supabase

### Sprint 2 (Próxima Semana)
- [ ] Extender analytics con leads scoring y trending
- [ ] Implementar gamificación (XP, badges)
- [ ] Crear API routes de LinkedIn posting (/api/linkedin/post)
- [ ] Mejorar dashboard con nuevos widgets
- [ ] Testing E2E de nuevas features

### Sprint 3 (Opcional - Futuro)
- [ ] Evaluar necesidad de microservicios
- [ ] Si es necesario, crear estructura backend/
- [ ] Configurar Docker Compose
- [ ] Migrar endpoints pesados a FastAPI
- [ ] Setup API Gateway con Express

---

## 🎯 Decisiones Arquitectónicas

### ¿Por qué NO migrar todo a microservicios ahora?

1. **Complejidad innecesaria:** El tráfico actual no justifica microservicios
2. **Costos:** Vercel serverless es más económico para <100k requests/día
3. **Velocidad de desarrollo:** Next.js API Routes son más rápidos de iterar
4. **Infraestructura existente:** Supabase, Stripe, OpenAI ya integrados
5. **Despliegue:** Vercel maneja todo automáticamente

### ¿Cuándo considerar microservicios?

- ✅ Necesitas procesamiento ML custom (>30 segundos)
- ✅ Múltiples integraciones complejas (5+ plataformas)
- ✅ Tráfico >100k requests/día
- ✅ Equipo grande (>5 devs) necesita autonomía

---

## 📝 Próximos Pasos Inmediatos

### Implementación Inmediata (Sin romper nada)

1. **Crear componentes UI:**
   ```bash
   src/components/layout/Sidebar.tsx (mejorar Navbar)
   src/components/inbox/MessageList.tsx
   src/components/inbox/MessageItem.tsx
   src/pages/dashboard/inbox.tsx
   ```

2. **Crear API routes:**
   ```bash
   src/pages/api/inbox/messages.ts
   src/pages/api/inbox/reply.ts
   src/pages/api/linkedin/post.ts
   ```

3. **Schema database:**
   ```sql
   -- Ejecutar migration en Supabase
   docs/database/inbox_schema.sql
   ```

4. **Context & hooks:**
   ```bash
   src/contexts/InboxContext.tsx
   src/lib/api.ts (client centralizado)
   ```

---

## ✅ Conclusión

**Recomendación:** Implementar arquitectura **híbrida incremental**:
- Mantener Next.js API Routes como core
- Agregar componentes UI faltantes
- Extender funcionalidades existentes
- Considerar microservicios solo si es necesario en el futuro

**Ventajas:**
- ✅ No rompe código existente
- ✅ Rápido de implementar (1-2 semanas)
- ✅ Aprovecha infraestructura actual
- ✅ Escalable cuando sea necesario

**Tiempo estimado:** 1-2 semanas para completar Milestones 1-4.

---

**Autor:** Claude Code
**Fecha:** 2025-10-23
**Versión Kolink:** v0.6 (propuesto)
