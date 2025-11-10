# Plan de Optimización - Kolink v1.0

## 🎯 Objetivos de Performance

### Métricas Objetivo
```yaml
Lighthouse Score:
  Performance: >90
  Accessibility: >95
  Best Practices: >95
  SEO: >90

Core Web Vitals:
  LCP (Largest Contentful Paint): <2.5s
  FID (First Input Delay): <100ms
  CLS (Cumulative Layout Shift): <0.1

API Performance:
  Response Time P50: <300ms
  Response Time P95: <800ms
  Response Time P99: <1500ms

Database:
  Query Time P95: <100ms
  Connection Pool: 80% utilization max
```

---

## 🚀 Optimizaciones Inmediatas (Quick Wins)

### 1. Bundle Size Optimization
**Impacto:** Alto | **Esfuerzo:** Bajo | **Tiempo:** 2 horas

```javascript
// next.config.js
module.exports = {
  // Habilitar compresión
  compress: true,

  // Optimización de imágenes
  images: {
    domains: ['*.supabase.co', 'media.licdn.com'],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    minimumCacheTTL: 60,
  },

  // Tree shaking mejorado
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'framer-motion',
      '@radix-ui/react-*'
    ],
  },

  // Minimizar JavaScript
  swcMinify: true,
}
```

**Resultado Esperado:**
- Bundle size: 3.1MB → ~2.0MB (-35%)
- FCP: Mejora ~20%

### 2. Code Splitting Agresivo
**Impacto:** Alto | **Esfuerzo:** Medio | **Tiempo:** 4 horas

```typescript
// Lazy load componentes pesados
import dynamic from 'next/dynamic';

// Dashboard components
const PlansModal = dynamic(() => import('@/components/PlansModal'), {
  loading: () => <Loader />,
  ssr: false
});

const EditorAI = dynamic(() => import('@/components/EditorAI'), {
  loading: () => <Loader />,
});

const ExportModal = dynamic(() => import('@/components/export/ExportModal'), {
  ssr: false
});

// Charts (muy pesados)
const Recharts = dynamic(() => import('recharts'), {
  ssr: false
});
```

**Resultado Esperado:**
- Initial load: -40%
- TTI (Time to Interactive): -30%

### 3. API Response Caching
**Impacto:** Alto | **Esfuerzo:** Medio | **Tiempo:** 6 horas

```typescript
// lib/cache.ts
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.REDIS_URL!,
  token: process.env.REDIS_TOKEN!,
});

export async function getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 300 // 5 minutos default
): Promise<T> {
  // Check cache
  const cached = await redis.get<T>(key);
  if (cached) return cached;

  // Fetch and cache
  const data = await fetcher();
  await redis.setex(key, ttl, JSON.stringify(data));
  return data;
}

// Uso en API routes
export default async function handler(req, res) {
  const posts = await getCached(
    `posts:${userId}`,
    () => fetchPostsFromDB(userId),
    600 // 10 minutos
  );

  return res.json(posts);
}
```

**Endpoints a Cachear:**
- `/api/stats` (10 min TTL)
- `/api/posts` list (5 min TTL)
- `/api/analytics/stats` (15 min TTL)
- User profile data (10 min TTL)

**Resultado Esperado:**
- API response time: -60% para cached requests
- Database load: -40%

### 4. Database Query Optimization
**Impacto:** Alto | **Esfuerzo:** Medio | **Tiempo:** 6 horas

```sql
-- Índices críticos (si no existen)
CREATE INDEX CONCURRENTLY idx_posts_user_created
  ON posts(user_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_posts_viral_score
  ON posts(viral_score DESC) WHERE viral_score > 70;

CREATE INDEX CONCURRENTLY idx_user_embeddings_user
  ON user_post_embeddings(user_id);

CREATE INDEX CONCURRENTLY idx_generations_user_created
  ON generations(user_id, created_at DESC);

-- Analizar queries lentas
SELECT
  query,
  mean_exec_time,
  calls,
  total_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC
LIMIT 20;
```

**Queries a Optimizar:**
```typescript
// ANTES (N+1 query problem)
const posts = await supabase.from('posts').select('*');
for (const post of posts) {
  const user = await supabase.from('profiles').select('*').eq('id', post.user_id);
}

// DESPUÉS (JOIN)
const posts = await supabase
  .from('posts')
  .select(`
    *,
    profiles (
      id,
      full_name,
      email
    )
  `)
  .order('created_at', { ascending: false })
  .limit(20);
```

**Resultado Esperado:**
- Query time: -50%
- Database connections: -30%

### 5. Image Optimization
**Impacto:** Medio | **Esfuerzo:** Bajo | **Tiempo:** 3 horas

```typescript
// components/OptimizedImage.tsx
import Image from 'next/image';

export default function OptimizedImage({ src, alt, ...props }) {
  return (
    <Image
      src={src}
      alt={alt}
      loading="lazy"
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRg..." // tiny placeholder
      quality={85} // Balance quality/size
      {...props}
    />
  );
}
```

**Resultado Esperado:**
- LCP improvement: -25%
- Bandwidth: -40%

---

## 🔧 Optimizaciones Técnicas (Semana 1-2)

### 6. Implement Request Deduplication
**Impacto:** Medio | **Esfuerzo:** Medio | **Tiempo:** 4 horas

```typescript
// lib/dedupe.ts
const pendingRequests = new Map<string, Promise<any>>();

export async function dedupe<T>(
  key: string,
  fetcher: () => Promise<T>
): Promise<T> {
  // Si ya hay una request en curso, retornar esa promise
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key)!;
  }

  // Crear nueva request
  const promise = fetcher().finally(() => {
    pendingRequests.delete(key);
  });

  pendingRequests.set(key, promise);
  return promise;
}

// Uso en componentes
const data = await dedupe(
  `user:${userId}`,
  () => fetch(`/api/user/${userId}`).then(r => r.json())
);
```

### 7. Connection Pooling Optimization
**Impacto:** Medio | **Esfuerzo:** Bajo | **Tiempo:** 2 horas

```typescript
// lib/db.ts
import { createClient } from '@supabase/supabase-js';

// Pool configuration
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    db: {
      schema: 'public',
    },
    auth: {
      persistSession: false,
    },
    global: {
      headers: {
        'x-connection-pool': 'true',
      },
    },
  }
);

// Reuse connections
let connectionPool: any = null;

export function getDB() {
  if (!connectionPool) {
    connectionPool = supabase;
  }
  return connectionPool;
}
```

### 8. Implement Incremental Static Regeneration
**Impacto:** Alto | **Esfuerzo:** Medio | **Tiempo:** 6 horas

```typescript
// pages/blog/[slug].tsx
export async function getStaticProps({ params }) {
  const post = await getPost(params.slug);

  return {
    props: { post },
    revalidate: 3600, // Regenerar cada hora
  };
}

export async function getStaticPaths() {
  const posts = await getRecentPosts(20); // Solo 20 más populares

  return {
    paths: posts.map(p => ({ params: { slug: p.slug } })),
    fallback: 'blocking', // Generar on-demand el resto
  };
}
```

### 9. Edge Functions para Operaciones Rápidas
**Impacto:** Alto | **Esfuerzo:** Alto | **Tiempo:** 8 horas

```typescript
// pages/api/health.ts → middleware.ts (Edge)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const config = {
  runtime: 'edge',
};

export default async function middleware(req: NextRequest) {
  // Rate limiting en edge
  const ip = req.ip ?? 'anonymous';
  const rateLimit = await checkRateLimit(ip);

  if (!rateLimit.allowed) {
    return new NextResponse('Too Many Requests', { status: 429 });
  }

  return NextResponse.next();
}
```

**Endpoints a mover a Edge:**
- Health checks
- Simple validations
- Rate limiting
- Redirects

### 10. Streaming SSR para Contenido Dinámico
**Impacto:** Medio | **Esfuerzo:** Alto | **Tiempo:** 10 horas

```typescript
// Usar Suspense para streaming
import { Suspense } from 'react';

export default function Dashboard() {
  return (
    <div>
      <Suspense fallback={<StatsSkeleton />}>
        <StatsSection />
      </Suspense>

      <Suspense fallback={<PostsSkeleton />}>
        <RecentPosts />
      </Suspense>
    </div>
  );
}
```

---

## 📊 Monitoreo de Performance

### Herramientas a Implementar

#### 1. Real User Monitoring (RUM)
```typescript
// lib/analytics/performance.ts
export function trackWebVitals(metric: NextWebVitalsMetric) {
  // Enviar a PostHog
  analytics.capture('web_vitals', {
    name: metric.name,
    value: metric.value,
    id: metric.id,
    label: metric.label,
  });

  // Alertar si métricas malas
  if (metric.name === 'LCP' && metric.value > 2500) {
    console.warn('LCP slow:', metric.value);
  }
}
```

#### 2. API Performance Tracking
```typescript
// middleware/performance.ts
export function performanceMiddleware(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;

    analytics.capture('api_performance', {
      endpoint: req.url,
      method: req.method,
      duration,
      status: res.statusCode,
    });

    // Alert si >1s
    if (duration > 1000) {
      logger.warn('Slow API endpoint', {
        endpoint: req.url,
        duration,
      });
    }
  });

  next();
}
```

#### 3. Database Query Monitoring
```sql
-- Habilitar pg_stat_statements
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Query para monitorear queries lentas
CREATE OR REPLACE FUNCTION get_slow_queries()
RETURNS TABLE (
  query text,
  calls bigint,
  mean_time numeric,
  total_time numeric
) AS $$
  SELECT
    query,
    calls,
    ROUND(mean_exec_time::numeric, 2) as mean_time,
    ROUND(total_exec_time::numeric, 2) as total_time
  FROM pg_stat_statements
  WHERE mean_exec_time > 100
  ORDER BY mean_exec_time DESC
  LIMIT 50;
$$ LANGUAGE SQL;
```

---

## 🎁 Performance Budget

### Establecer Límites
```json
{
  "budgets": [
    {
      "resourceSizes": [
        { "resourceType": "script", "budget": 400 },
        { "resourceType": "stylesheet", "budget": 100 },
        { "resourceType": "image", "budget": 500 },
        { "resourceType": "font", "budget": 100 },
        { "resourceType": "total", "budget": 1500 }
      ],
      "resourceCounts": [
        { "resourceType": "script", "budget": 15 },
        { "resourceType": "stylesheet", "budget": 5 },
        { "resourceType": "third-party", "budget": 10 }
      ]
    }
  ]
}
```

### Lighthouse CI
```yaml
# lighthouserc.json
{
  "ci": {
    "collect": {
      "numberOfRuns": 3,
      "url": [
        "http://localhost:3000/",
        "http://localhost:3000/dashboard",
        "http://localhost:3000/pricing"
      ]
    },
    "assert": {
      "preset": "lighthouse:recommended",
      "assertions": {
        "categories:performance": ["error", {"minScore": 0.9}],
        "categories:accessibility": ["error", {"minScore": 0.95}],
        "first-contentful-paint": ["error", {"maxNumericValue": 2000}],
        "largest-contentful-paint": ["error", {"maxNumericValue": 2500}],
        "cumulative-layout-shift": ["error", {"maxNumericValue": 0.1}]
      }
    }
  }
}
```

---

## 📈 Roadmap de Optimización

### Mes 1: Fundamentos
- ✅ Bundle optimization
- ✅ Code splitting
- ✅ Image optimization
- ✅ Basic caching
- ✅ Database indexing

### Mes 2: Avanzado
- CDN para assets estáticos
- Edge functions críticas
- Advanced caching strategies
- Database read replicas
- Connection pooling optimization

### Mes 3: Escala
- Multi-region deployment
- Advanced CDN (Cloudflare)
- Database sharding (si necesario)
- Microservices para AI generation
- Auto-scaling configurado

---

## 💡 Best Practices Continuas

### Desarrollo
```typescript
// Siempre lazy load componentes pesados
const HeavyChart = dynamic(() => import('./HeavyChart'));

// Usar React.memo para componentes puros
const ExpensiveComponent = React.memo(({ data }) => {
  return <div>{/* render */}</div>;
});

// Optimizar re-renders
const memoizedValue = useMemo(() => computeExpensive(data), [data]);
const memoizedCallback = useCallback(() => handleClick(), []);
```

### Deploy
1. Lighthouse check antes de merge
2. Bundle size diff en PR
3. Performance tests automáticos
4. Staging environment preview

---

**Próxima Revisión:** Semana 2
**Responsable:** DevOps Team
**Métricas de Éxito:** Lighthouse >90, API P95 <500ms
