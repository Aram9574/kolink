# 🧪 SPRINT 6: TESTING COMPLETO

**Duración Estimada:** 2 días (10 horas)
**Prioridad:** ALTA - VALIDACIÓN PRE-LANZAMIENTO
**Objetivo:** Cobertura de testing completa para garantizar calidad

---

## 📋 RESUMEN DEL SPRINT

Este es el sprint final antes del lanzamiento. Se enfoca en crear una suite completa de tests: unitarios, de integración, E2E, y de carga. El objetivo es garantizar que todas las funcionalidades críticas funcionan correctamente y la aplicación puede manejar carga real.

**Beneficios:**
- ✅ Detectar bugs antes del lanzamiento
- ✅ Validar flujos críticos (pagos, generación, auth)
- ✅ Verificar rendimiento bajo carga
- ✅ Confianza para lanzar a producción

---

## 🎯 OBJETIVOS DEL SPRINT

1. ✅ Tests unitarios para APIs críticas (>60% coverage)
2. ✅ Suite E2E completa (100% passing)
3. ✅ Testing de carga (100 usuarios concurrentes)
4. ✅ LinkedIn OAuth tests
5. ✅ Validación final de todos los flujos críticos

---

## 📝 TAREAS DETALLADAS

### TAREA 6.1: Tests Unitarios para APIs Críticas
**Tiempo estimado:** 4 horas
**Prioridad:** ALTA

#### Objetivo: 60% de cobertura en APIs críticas

#### Paso 1: Configurar Jest (ya configurado)

Verificar que `jest.config.js` existe:

```javascript
// jest.config.js
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/pages/api/**/*.{ts,tsx}',
    'src/lib/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
  ],
  coverageThreshold: {
    global: {
      statements: 60,
      branches: 60,
      functions: 60,
      lines: 60,
    },
  },
};

module.exports = createJestConfig(customJestConfig);
```

#### Paso 2: Crear tests para `/api/checkout`

```typescript
// src/__tests__/api/checkout.test.ts
import { createMocks } from 'node-mocks-http';
import handler from '@/pages/api/checkout';
import Stripe from 'stripe';

// Mock Stripe
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        create: jest.fn().mockResolvedValue({
          id: 'cs_test_123',
          url: 'https://checkout.stripe.com/test',
        }),
      },
    },
  }));
});

describe('/api/checkout', () => {
  it('should return 405 for non-POST requests', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(405);
  });

  it('should create checkout session for valid request', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        userId: 'user-123',
        plan: 'basic',
      },
      headers: {
        authorization: 'Bearer valid-token',
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data).toHaveProperty('sessionId');
    expect(data).toHaveProperty('url');
  });

  it('should return 400 for missing userId', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        plan: 'basic',
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
  });

  it('should return 400 for invalid plan', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        userId: 'user-123',
        plan: 'invalid-plan',
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
  });
});
```

#### Paso 3: Tests para `/api/webhook`

```typescript
// src/__tests__/api/webhook.test.ts
import { createMocks } from 'node-mocks-http';
import handler from '@/pages/api/webhook';
import Stripe from 'stripe';

jest.mock('stripe');
jest.mock('@/lib/supabase');

describe('/api/webhook', () => {
  const mockEvent = {
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_123',
        customer: 'cus_test_123',
        metadata: {
          userId: 'user-123',
          plan: 'basic',
        },
        amount_total: 900, // $9.00
      },
    },
  };

  beforeEach(() => {
    // Mock Stripe webhook verification
    (Stripe.prototype.webhooks.constructEvent as jest.Mock) = jest.fn().mockReturnValue(mockEvent);
  });

  it('should return 405 for non-POST requests', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(405);
  });

  it('should process checkout.session.completed event', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'stripe-signature': 'valid-signature',
      },
      body: Buffer.from(JSON.stringify(mockEvent)),
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data).toEqual({ received: true });
  });

  it('should return 400 for invalid signature', async () => {
    (Stripe.prototype.webhooks.constructEvent as jest.Mock) = jest.fn().mockImplementation(() => {
      throw new Error('Invalid signature');
    });

    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'stripe-signature': 'invalid-signature',
      },
      body: Buffer.from('{}'),
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
  });
});
```

#### Paso 4: Tests para `/api/generate`

```typescript
// src/__tests__/api/generate.test.ts
import { createMocks } from 'node-mocks-http';
import handler from '@/pages/api/generate';

jest.mock('@/lib/openai');
jest.mock('@/lib/supabase');

describe('/api/generate', () => {
  it('should generate content for authenticated user', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        prompt: 'Test prompt',
        userId: 'user-123',
      },
      headers: {
        authorization: 'Bearer valid-token',
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data).toHaveProperty('generatedText');
    expect(data).toHaveProperty('remainingCredits');
  });

  it('should return 401 for unauthenticated request', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        prompt: 'Test prompt',
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(401);
  });

  it('should return 403 when user has no credits', async () => {
    // Mock user with 0 credits
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        prompt: 'Test prompt',
        userId: 'user-no-credits',
      },
      headers: {
        authorization: 'Bearer valid-token',
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(403);
  });
});
```

#### Paso 5: Tests para utilidades (lib/)

```typescript
// src/__tests__/lib/rateLimiter.test.ts
import { rateLimit } from '@/lib/rateLimiter';

describe('rateLimiter', () => {
  it('should allow requests within limit', async () => {
    const userId = 'test-user-' + Date.now();

    for (let i = 0; i < 10; i++) {
      const allowed = await rateLimit(userId, 10);
      expect(allowed).toBe(true);
    }
  });

  it('should block requests exceeding limit', async () => {
    const userId = 'test-user-' + Date.now();

    // First 10 should pass
    for (let i = 0; i < 10; i++) {
      await rateLimit(userId, 10);
    }

    // 11th should be blocked
    const blocked = await rateLimit(userId, 10);
    expect(blocked).toBe(false);
  });
});
```

#### Paso 6: Ejecutar tests y verificar cobertura

```bash
# Ejecutar todos los tests
npm test

# Ejecutar con cobertura
npm test -- --coverage

# Resultado esperado:
# Statements   : 65% ( 150/230 )
# Branches     : 62% ( 80/129 )
# Functions    : 68% ( 45/66 )
# Lines        : 66% ( 145/220 )
```

#### Checklist Tarea 6.1:
- [ ] Jest configurado correctamente
- [ ] Tests para `/api/checkout` (4 tests)
- [ ] Tests para `/api/webhook` (3 tests)
- [ ] Tests para `/api/generate` (3 tests)
- [ ] Tests para `rateLimiter` (2 tests)
- [ ] Cobertura >60% alcanzada
- [ ] Todos los tests pasan

---

### TAREA 6.2: Suite E2E Completa
**Tiempo estimado:** 3 horas
**Prioridad:** CRÍTICA

#### Paso 1: Configurar Playwright (ya configurado)

Verificar `playwright.config.ts`:

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

#### Paso 2: Test E2E - Sign Up Flow

```typescript
// e2e/auth/signup.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Sign Up Flow', () => {
  test('should complete sign up successfully', async ({ page }) => {
    const timestamp = Date.now();
    const email = `test-${timestamp}@kolink.test`;
    const password = 'TestPassword123!';

    await page.goto('/signup');

    // Llenar formulario
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');

    // Esperar redirección
    await page.waitForURL('/dashboard', { timeout: 10000 });

    // Verificar que estamos en dashboard
    expect(page.url()).toContain('/dashboard');
  });

  test('should show error for invalid email', async ({ page }) => {
    await page.goto('/signup');

    await page.fill('input[type="email"]', 'invalid-email');
    await page.fill('input[type="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');

    // Verificar mensaje de error
    await expect(page.locator('.error')).toBeVisible();
  });
});
```

#### Paso 3: Test E2E - Content Generation

```typescript
// e2e/dashboard/generate.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Content Generation Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login antes de cada test
    await page.goto('/signin');
    await page.fill('input[type="email"]', 'test@kolink.es');
    await page.fill('input[type="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('should generate content successfully', async ({ page }) => {
    await page.goto('/dashboard');

    // Llenar prompt
    await page.fill('[data-testid="prompt-input"]', 'Write a post about AI');

    // Generar
    await page.click('[data-testid="generate-button"]');

    // Esperar generación (puede tardar 3-5 segundos)
    await expect(page.locator('[data-testid="generated-content"]')).toBeVisible({ timeout: 10000 });

    // Verificar que hay contenido
    const content = await page.locator('[data-testid="generated-content"]').textContent();
    expect(content).toBeTruthy();
    expect(content!.length).toBeGreaterThan(50);
  });
});
```

#### Paso 4: Ejecutar suite completa

```bash
# Ejecutar todos los E2E tests
npx playwright test

# Ver reporte
npx playwright show-report
```

#### Checklist Tarea 6.2:
- [ ] Playwright configurado
- [ ] Sign up tests (2+ tests)
- [ ] Sign in tests (2+ tests)
- [ ] Content generation tests (2+ tests)
- [ ] Checkout tests (2+ tests)
- [ ] Total: 15+ tests E2E
- [ ] 100% de tests pasando

---

### TAREA 6.3: Testing de Carga
**Tiempo estimado:** 2 horas
**Prioridad:** MEDIA

#### Paso 1: Instalar k6

```bash
# macOS
brew install k6

# Verificar instalación
k6 version
```

#### Paso 2: Crear script de load test

```javascript
// scripts/load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 users
    { duration: '1m', target: 50 },   // Ramp up to 50 users
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '1m', target: 100 },  // Stay at 100 users
    { duration: '30s', target: 0 },   // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'], // 95% of requests < 3s
    http_req_failed: ['rate<0.05'],    // Error rate < 5%
  },
};

const BASE_URL = __ENV.BASE_URL || 'https://kolink.es';

export default function () {
  // Test landing page
  let res = http.get(BASE_URL);
  check(res, {
    'landing page status 200': (r) => r.status === 200,
    'landing page load time < 2s': (r) => r.timings.duration < 2000,
  }) || errorRate.add(1);

  sleep(1);

  // Test API health check
  res = http.get(`${BASE_URL}/api/health`);
  check(res, {
    'health check status 200': (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(2);
}
```

#### Paso 3: Ejecutar load test

```bash
# Test producción
k6 run --env BASE_URL=https://kolink.es scripts/load-test.js
```

**Resultado esperado:**
- p95 < 3s
- Error rate < 5%
- Sistema estable bajo 100 usuarios concurrentes

#### Checklist Tarea 6.3:
- [ ] k6 instalado
- [ ] Script de load test creado
- [ ] Load test ejecutado (100 concurrent users)
- [ ] p95 < 3s
- [ ] Error rate < 5%
- [ ] Resultados documentados

---

### TAREA 6.4: Validación Final
**Tiempo estimado:** 1 hora
**Prioridad:** CRÍTICA

#### Checklist completo de flujos críticos

**Autenticación:**
- [ ] Sign up → Dashboard
- [ ] Sign in → Dashboard
- [ ] Logout → Landing
- [ ] Dashboard sin auth → Redirect signin

**Generación:**
- [ ] Usuario con créditos puede generar
- [ ] Usuario sin créditos → Error 403
- [ ] Contenido se guarda en DB
- [ ] Créditos se decrementan

**Pagos:**
- [ ] Plan → Stripe Checkout
- [ ] Pago → Webhook recibido
- [ ] Perfil actualizado (plan + créditos)
- [ ] Usuario ve créditos actualizados

**Seguridad:**
- [ ] Rate limiting bloquea después de 10 requests
- [ ] CSP headers presentes
- [ ] Sentry captura errores

---

## ✅ CHECKLIST FINAL DEL SPRINT 6

### Tests Unitarios
- [ ] 12+ tests creados
- [ ] Cobertura >60%
- [ ] Todos pasan

### Tests E2E
- [ ] 15+ tests creados
- [ ] 100% pasando

### Load Testing
- [ ] 100 usuarios testeados
- [ ] p95 < 3s
- [ ] Error rate < 5%

### Validación Final
- [ ] Todos los flujos críticos validados
- [ ] Sin bloqueadores

---

## 🚨 CRITERIOS DE ÉXITO

✅ **SI ESTE SPRINT PASA → LISTO PARA PRODUCCIÓN**

---

**Creado:** 2025-11-05
**Última actualización:** 2025-11-05
**Sprint Owner:** Equipo Kolink
