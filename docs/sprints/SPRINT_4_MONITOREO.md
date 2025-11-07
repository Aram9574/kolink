# 📊 SPRINT 4: MONITOREO Y ALERTAS

**Duración Estimada:** 1 día (3 horas)
**Prioridad:** ALTA - VISIBILIDAD Y OBSERVABILIDAD
**Objetivo:** Visibilidad total de operaciones y alertas proactivas

---

## 📋 RESUMEN DEL SPRINT

Este sprint se enfoca en configurar un sistema completo de monitoreo y alertas para tener visibilidad total de la aplicación en producción. Incluye corrección de configuración de Sentry, alertas críticas, dashboard de métricas, y smoke tests post-deployment.

**Impacto si no se resuelve:**
- ⚠️ Errores silenciosos sin detectar
- ⚠️ Problemas de pagos no notificados
- ⚠️ Degradación de servicio no visible
- ⚠️ Incidentes descubiertos por usuarios (mala experiencia)

---

## 🎯 OBJETIVOS DEL SPRINT

1. ✅ Corregir configuración de Sentry (DSN)
2. ✅ Configurar 5 alertas críticas
3. ✅ Crear dashboard de métricas de negocio
4. ✅ Implementar smoke tests post-deployment
5. ✅ Validar logging centralizado

---

## 📝 TAREAS DETALLADAS

### TAREA 4.1: Corregir Configuración de Sentry
**Tiempo estimado:** 30 minutos
**Prioridad:** ALTA

#### Problema identificado:
`sentry.server.config.ts` línea 8 tiene DSN hardcodeado:

```typescript
// ❌ DSN hardcodeado
dsn: "https://xxx...@sentry.io/xxx"
```

#### Paso 1: Corregir configuración del servidor

```typescript
// sentry.server.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN,

  // Ajustar sample rate para producción
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Habilitar profiling (opcional)
  profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Configurar releases para track deployments
  release: process.env.VERCEL_GIT_COMMIT_SHA,
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV,

  // NO enviar PII (datos personales)
  sendDefaultPii: false,

  // Configurar breadcrumbs
  maxBreadcrumbs: 50,

  // Filtrar eventos sensibles
  beforeSend(event, hint) {
    // No enviar errores de desarrollo
    if (process.env.NODE_ENV === 'development') {
      return null;
    }

    // Remover datos sensibles
    if (event.request?.cookies) {
      delete event.request.cookies;
    }

    return event;
  },
});
```

#### Paso 2: Corregir configuración del cliente

```typescript
// sentry.client.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  replaysSessionSampleRate: 0.1, // 10% de sesiones
  replaysOnErrorSampleRate: 1.0, // 100% de sesiones con error

  integrations: [
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || 'development',

  sendDefaultPii: false,

  beforeSend(event, hint) {
    // Remover PII
    if (event.user?.email) {
      event.user.email = event.user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3');
    }

    return event;
  },
});
```

#### Paso 3: Verificar variables en Vercel

```bash
vercel env ls | grep SENTRY

# Debe mostrar:
# NEXT_PUBLIC_SENTRY_DSN (production)
# SENTRY_AUTH_TOKEN (production) - rotado en Sprint 1
# SENTRY_ORG (production)
# SENTRY_PROJECT (production)
```

Si faltan:
```bash
vercel env add SENTRY_ORG production
# Valor: kolink

vercel env add SENTRY_PROJECT production
# Valor: kolink-production (o el nombre de tu proyecto en Sentry)
```

#### Paso 4: Deploy y validar

```bash
# Commit cambios
git add sentry.*.config.ts
git commit -m "fix: correct Sentry configuration with env vars"
git push

# Deploy
vercel --prod

# Generar error de prueba
curl https://kolink.es/api/test-sentry
```

#### Paso 5: Verificar en Sentry Dashboard

1. Ir a https://sentry.io/organizations/kolink/issues/
2. Debe aparecer el error de prueba
3. Verificar que tiene:
   - ✅ Release (commit SHA)
   - ✅ Environment (production)
   - ✅ Stack trace completo
   - ✅ Breadcrumbs

#### Checklist Tarea 4.1:
- [ ] DSN removido de código (usar env vars)
- [ ] `sentry.server.config.ts` actualizado
- [ ] `sentry.client.config.ts` actualizado
- [ ] Variables verificadas en Vercel (4 variables)
- [ ] Deploy completado
- [ ] Error de prueba visible en Sentry
- [ ] Release tracking funcional

---

### TAREA 4.2: Configurar Alertas Críticas
**Tiempo estimado:** 1 hora
**Prioridad:** CRÍTICA

#### Crear 5 alertas en Sentry

1. Ir a https://sentry.io/organizations/kolink/alerts/rules/
2. Click "Create Alert Rule"

#### Alerta 1: Error Rate en Checkout

```yaml
Nombre: "🚨 High Error Rate - Checkout API"
Tipo: Metric Alert
Métrica: error_count()
Condición: > 5 errors en 5 minutos
Filtro:
  - endpoint:checkout
  - environment:production
Acción:
  - Send email to: tu-email@kolink.es
  - Send Slack notification (si configurado)
Prioridad: Critical
```

#### Alerta 2: Error Rate en Webhook

```yaml
Nombre: "🚨 CRITICAL - Stripe Webhook Failures"
Tipo: Metric Alert
Métrica: error_count()
Condición: > 3 errors en 10 minutos
Filtro:
  - endpoint:webhook
  - environment:production
Acción:
  - Send email IMMEDIATELY
  - Send SMS (si configurado)
  - Create PagerDuty incident (si configurado)
Prioridad: Critical
```

#### Alerta 3: Error Rate en Generación de Contenido

```yaml
Nombre: "⚠️ High Error Rate - Content Generation"
Tipo: Metric Alert
Métrica: error_count()
Condición: > 10 errors en 10 minutos
Filtro:
  - endpoint:generate OR endpoint:post/generate
  - environment:production
Acción:
  - Send email
Prioridad: High
```

#### Alerta 4: Latencia Alta en APIs

```yaml
Nombre: "⏱️ High Latency - API Endpoints"
Tipo: Metric Alert
Métrica: p95(transaction.duration)
Condición: > 3000ms (3 segundos)
Filtro:
  - transaction.op:http.server
  - environment:production
Acción:
  - Send email
  - Log to dashboard
Prioridad: Medium
```

#### Alerta 5: Tasa de Errores Global

```yaml
Nombre: "🔴 Overall Error Rate Spike"
Tipo: Metric Alert
Métrica: error_count()
Condición: > 50 errors en 15 minutos
Filtro:
  - environment:production
Acción:
  - Send email
  - Create Slack thread
Prioridad: High
```

#### Configurar notificaciones en Sentry

1. Settings → Integrations
2. Configurar integraciones:

**Email:**
- ✅ Ya configurado por defecto

**Slack (opcional pero recomendado):**
1. Click "Slack" → "Install"
2. Autorizar workspace
3. Seleccionar canal: `#kolink-alerts`
4. Guardar

**PagerDuty (opcional para on-call):**
1. Crear cuenta en PagerDuty
2. Obtener Integration Key
3. Agregar en Sentry

#### Checklist Tarea 4.2:
- [ ] Alerta 1 (Checkout) configurada
- [ ] Alerta 2 (Webhook) configurada
- [ ] Alerta 3 (Generación) configurada
- [ ] Alerta 4 (Latencia) configurada
- [ ] Alerta 5 (Global) configurada
- [ ] Email notifications funcionando
- [ ] Slack integration configurada (opcional)

---

### TAREA 4.3: Crear Dashboard de Métricas
**Tiempo estimado:** 30 minutos
**Prioridad:** MEDIA

#### Paso 1: Crear dashboard en Sentry

1. Ir a https://sentry.io/organizations/kolink/dashboards/
2. Click "Create Dashboard"
3. Nombre: "Kolink Production Metrics"

#### Agregar widgets:

**Widget 1: Error Rate por Endpoint**
```yaml
Tipo: Line Chart
Métrica: error_count()
Group By: endpoint
Timeframe: Last 24 hours
```

**Widget 2: Latencia p95**
```yaml
Tipo: Line Chart
Métrica: p95(transaction.duration)
Group By: transaction
Timeframe: Last 24 hours
```

**Widget 3: Successful Payments**
```yaml
Tipo: Big Number
Métrica: count()
Filtro: transaction:"/api/webhook" AND status:success
Timeframe: Last 7 days
```

**Widget 4: Failed Webhooks**
```yaml
Tipo: Big Number
Métrica: error_count()
Filtro: endpoint:webhook
Timeframe: Last 7 days
Color: Red (si > 0)
```

**Widget 5: API Response Times**
```yaml
Tipo: Bar Chart
Métrica: avg(transaction.duration)
Group By: endpoint
Timeframe: Last 24 hours
```

**Widget 6: Browser Distribution**
```yaml
Tipo: Pie Chart
Métrica: count()
Group By: browser.name
Timeframe: Last 7 days
```

#### Paso 2: Crear dashboard de negocio (opcional)

Crear página en `/src/pages/admin/metrics.tsx`:

```typescript
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Metrics {
  totalUsers: number;
  totalRevenue: number;
  activeSubscriptions: number;
  postsGenerated: number;
  creditsUsed: number;
}

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  useEffect(() => {
    async function fetchMetrics() {
      // Total usuarios
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Suscripciones activas
      const { count: activeSubscriptions } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .neq('plan', 'free');

      // Revenue estimado
      const { data: plans } = await supabase
        .from('profiles')
        .select('plan');

      const revenue = plans?.reduce((acc, p) => {
        if (p.plan === 'basic') return acc + 9;
        if (p.plan === 'standard') return acc + 19;
        if (p.plan === 'premium') return acc + 29;
        return acc;
      }, 0) || 0;

      // Posts generados
      const { count: postsGenerated } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true });

      setMetrics({
        totalUsers: totalUsers || 0,
        totalRevenue: revenue,
        activeSubscriptions: activeSubscriptions || 0,
        postsGenerated: postsGenerated || 0,
        creditsUsed: 0, // Implementar
      });
    }

    fetchMetrics();
  }, []);

  if (!metrics) return <div>Loading...</div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Métricas de Negocio</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="Total Usuarios"
          value={metrics.totalUsers}
          icon="👥"
        />
        <MetricCard
          title="MRR"
          value={`$${metrics.totalRevenue}`}
          icon="💰"
        />
        <MetricCard
          title="Suscripciones Activas"
          value={metrics.activeSubscriptions}
          icon="✅"
        />
        <MetricCard
          title="Posts Generados"
          value={metrics.postsGenerated}
          icon="📝"
        />
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon }: any) {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-sm">{title}</p>
          <p className="text-3xl font-bold mt-2">{value}</p>
        </div>
        <div className="text-4xl">{icon}</div>
      </div>
    </div>
  );
}
```

#### Checklist Tarea 4.3:
- [ ] Dashboard creado en Sentry
- [ ] 6 widgets agregados
- [ ] Dashboard de negocio creado (opcional)
- [ ] Métricas visibles y actualizadas

---

### TAREA 4.4: Implementar Smoke Tests
**Tiempo estimado:** 1 hora
**Prioridad:** ALTA

#### Paso 1: Crear suite de smoke tests

```typescript
// e2e/smoke/production.spec.ts
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'https://kolink.es';

test.describe('Production Smoke Tests', () => {

  test('Landing page loads successfully', async ({ page }) => {
    const response = await page.goto(BASE_URL);
    expect(response?.status()).toBe(200);

    // Verificar elementos clave
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('[data-testid="pricing-section"]')).toBeVisible();
  });

  test('Sign in page is accessible', async ({ page }) => {
    await page.goto(`${BASE_URL}/signin`);

    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('Sign up page is accessible', async ({ page }) => {
    await page.goto(`${BASE_URL}/signup`);

    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('API health check responds', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/health`);
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.status).toBe('ok');
  });

  test('Checkout API is accessible (requires auth)', async ({ request }) => {
    // Sin auth debe retornar 401
    const response = await request.post(`${BASE_URL}/api/checkout`, {
      data: { userId: 'test', plan: 'basic' }
    });

    expect([401, 403]).toContain(response.status());
  });

  test('Dashboard requires authentication', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);

    // Debe redirigir a signin
    await page.waitForURL(/signin/);
    expect(page.url()).toContain('signin');
  });

  test('Performance: Page load under 3s', async ({ page }) => {
    const startTime = Date.now();
    await page.goto(BASE_URL);
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(3000); // 3 segundos
  });

  test('Critical assets load correctly', async ({ page }) => {
    const response = await page.goto(BASE_URL);

    // Verificar que no hay errores en consola
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.waitForLoadState('networkidle');

    // Permitir algunos errores de analytics/tracking
    const criticalErrors = errors.filter(e =>
      !e.includes('posthog') &&
      !e.includes('analytics')
    );

    expect(criticalErrors).toHaveLength(0);
  });
});
```

#### Paso 2: Crear API health endpoint

```typescript
// src/pages/api/health.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Verificar conexión a Supabase
    const { error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    if (error) throw error;

    // Verificar variables críticas
    const requiredEnvVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'STRIPE_SECRET_KEY',
      'OPENAI_API_KEY',
    ];

    const missingVars = requiredEnvVars.filter(v => !process.env[v]);

    if (missingVars.length > 0) {
      return res.status(500).json({
        status: 'error',
        message: 'Missing environment variables',
        missing: missingVars
      });
    }

    return res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.VERCEL_GIT_COMMIT_SHA || 'dev'
    });

  } catch (error: any) {
    return res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
}
```

#### Paso 3: Configurar GitHub Actions

```yaml
# .github/workflows/smoke-tests.yml
name: Production Smoke Tests

on:
  workflow_dispatch: # Manual trigger
  schedule:
    - cron: '0 */6 * * *' # Cada 6 horas
  deployment_status: # Después de cada deployment

jobs:
  smoke:
    if: github.event_name == 'deployment_status' && github.event.deployment_status.state == 'success'
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install chromium

      - name: Run smoke tests
        run: npx playwright test e2e/smoke/
        env:
          BASE_URL: https://kolink.es

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: smoke-test-results
          path: playwright-report/

      - name: Notify on failure
        if: failure()
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: '🚨 Production Smoke Tests Failed',
              body: `Smoke tests failed after deployment.\n\nCommit: ${context.sha}\nWorkflow: ${context.workflow}\n\nCheck logs: ${context.serverUrl}/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId}`
            })
```

#### Paso 4: Ejecutar tests manualmente

```bash
# Local (apuntando a producción)
BASE_URL=https://kolink.es npx playwright test e2e/smoke/

# Desde GitHub Actions
# Ir a Actions → Production Smoke Tests → Run workflow
```

#### Checklist Tarea 4.4:
- [ ] Suite de smoke tests creada (8 tests)
- [ ] API health endpoint implementado
- [ ] GitHub Actions workflow configurado
- [ ] Tests ejecutados manualmente (todos pasan)
- [ ] Workflow programado cada 6 horas
- [ ] Notificaciones en caso de fallo configuradas

---

### TAREA 4.5: Validar Logging Centralizado
**Tiempo estimado:** 30 minutos
**Prioridad:** MEDIA

#### Paso 1: Implementar logger centralizado

```typescript
// src/lib/logger.ts
import * as Sentry from '@sentry/nextjs';

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

interface LogContext {
  userId?: string;
  endpoint?: string;
  [key: string]: any;
}

export function log(
  level: LogLevel,
  message: string,
  context?: LogContext
) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...context,
  };

  // Console (desarrollo y producción)
  if (process.env.NODE_ENV === 'development' || level === LogLevel.ERROR) {
    console[level === LogLevel.ERROR ? 'error' : 'log'](
      `[${timestamp}] ${level.toUpperCase()}: ${message}`,
      context || ''
    );
  }

  // Sentry (solo errores y warnings en producción)
  if (process.env.NODE_ENV === 'production') {
    if (level === LogLevel.ERROR) {
      Sentry.captureException(new Error(message), {
        level: 'error',
        extra: context,
      });
    } else if (level === LogLevel.WARN) {
      Sentry.captureMessage(message, {
        level: 'warning',
        extra: context,
      });
    }
  }

  // Breadcrumb para contexto
  Sentry.addBreadcrumb({
    category: context?.endpoint || 'general',
    message,
    level: level as any,
    data: context,
  });
}

// Helpers
export const logger = {
  debug: (msg: string, ctx?: LogContext) => log(LogLevel.DEBUG, msg, ctx),
  info: (msg: string, ctx?: LogContext) => log(LogLevel.INFO, msg, ctx),
  warn: (msg: string, ctx?: LogContext) => log(LogLevel.WARN, msg, ctx),
  error: (msg: string, ctx?: LogContext) => log(LogLevel.ERROR, msg, ctx),
};
```

#### Paso 2: Reemplazar console.log en APIs críticas

```typescript
// src/pages/api/checkout.ts
import { logger } from '@/lib/logger';

export default async function handler(req, res) {
  const { userId, plan } = req.body;

  logger.info('Checkout session requested', {
    endpoint: 'checkout',
    userId,
    plan,
  });

  try {
    const session = await stripe.checkout.sessions.create({...});

    logger.info('Checkout session created successfully', {
      endpoint: 'checkout',
      userId,
      sessionId: session.id,
    });

    return res.status(200).json({ sessionId: session.id });

  } catch (error: any) {
    logger.error('Failed to create checkout session', {
      endpoint: 'checkout',
      userId,
      error: error.message,
    });

    return res.status(500).json({ error: 'Internal error' });
  }
}
```

#### Paso 3: Verificar logs en Vercel

```bash
vercel logs --follow | grep -E "(INFO|WARN|ERROR)"
```

#### Paso 4: Verificar breadcrumbs en Sentry

1. Generar error en producción
2. Ir a Sentry → Issues → Seleccionar issue
3. Verificar sección "Breadcrumbs"
4. Debe haber contexto completo del flujo

#### Checklist Tarea 4.5:
- [ ] Logger centralizado implementado
- [ ] Console.log reemplazado en APIs críticas
- [ ] Logs visibles en Vercel
- [ ] Breadcrumbs visibles en Sentry
- [ ] Errores capturados correctamente

---

## ✅ CHECKLIST FINAL DEL SPRINT 4

### Sentry
- [ ] DSN en variables de entorno (no hardcoded)
- [ ] Configuración de servidor correcta
- [ ] Configuración de cliente correcta
- [ ] Release tracking habilitado
- [ ] Error de prueba visible en Sentry

### Alertas
- [ ] Alerta 1 (Checkout) configurada
- [ ] Alerta 2 (Webhook) configurada
- [ ] Alerta 3 (Generación) configurada
- [ ] Alerta 4 (Latencia) configurada
- [ ] Alerta 5 (Global) configurada
- [ ] Email notifications funcionando

### Dashboard
- [ ] Dashboard creado en Sentry
- [ ] 6 widgets agregados
- [ ] Dashboard de negocio creado (opcional)

### Smoke Tests
- [ ] 8 smoke tests creados
- [ ] API health endpoint implementado
- [ ] GitHub Actions workflow configurado
- [ ] Tests ejecutados (todos pasan)

### Logging
- [ ] Logger centralizado implementado
- [ ] Console.log reemplazado en APIs críticas
- [ ] Logs visibles en Vercel y Sentry

---

## 🚨 CRITERIOS DE ÉXITO

Este sprint se considera exitoso cuando:

1. ✅ Sentry configurado correctamente y recibiendo eventos
2. ✅ 5 alertas críticas configuradas y funcionando
3. ✅ Dashboard con métricas visibles
4. ✅ Smoke tests ejecutándose automáticamente
5. ✅ Logging centralizado implementado

---

## 📊 MÉTRICAS

- **Alertas configuradas:** 5/5
- **Smoke tests:** 8/8 passing
- **Cobertura de logging:** APIs críticas
- **Time to detect issues:** < 5 minutos

---

## 🆘 TROUBLESHOOTING

### Problema: Sentry no recibe eventos

**Solución:**
```bash
# Verificar DSN
vercel env ls | grep SENTRY

# Test manual
curl -X POST https://sentry.io/api/YOUR_PROJECT_ID/store/ \
  -H "X-Sentry-Auth: Sentry sentry_key=YOUR_KEY" \
  -d '{"message":"test"}'
```

### Problema: Alertas no se disparan

**Solución:**
1. Verificar configuración de alerta en Sentry
2. Verificar que el filtro es correcto
3. Generar evento manualmente para probar
4. Verificar notificaciones en Settings → Integrations

---

## 📞 RECURSOS

- **Sentry Dashboard:** https://sentry.io/organizations/kolink/
- **Sentry Docs:** https://docs.sentry.io/
- **Playwright Docs:** https://playwright.dev/

---

## 🎯 PRÓXIMO SPRINT

Una vez completado este sprint exitosamente, proceder con:
**[SPRINT 5: OPTIMIZACIONES](./SPRINT_5_OPTIMIZACIONES.md)**

---

**Creado:** 2025-11-05
**Última actualización:** 2025-11-05
**Sprint Owner:** Equipo Kolink
