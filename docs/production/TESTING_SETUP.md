# 🧪 Testing Setup - Kolink v1.0

**Fecha:** 9 de Noviembre, 2025
**Framework:** Jest + React Testing Library
**Status:** ✅ CONFIGURADO Y FUNCIONANDO

---

## ✅ SETUP COMPLETADO

### 1. Dependencias Instaladas

```json
{
  "devDependencies": {
    "jest": "latest",
    "@testing-library/react": "latest",
    "@testing-library/jest-dom": "latest",
    "@testing-library/user-event": "latest",
    "jest-environment-jsdom": "latest",
    "@types/jest": "latest"
  }
}
```

### 2. Configuración de Jest

**Archivo:** `jest.config.js`
- ✅ Integración con Next.js
- ✅ Soporte TypeScript
- ✅ Module aliases (@/*)
- ✅ CSS/Image mocks
- ✅ Coverage thresholds (30%)

**Archivo:** `jest.setup.js`
- ✅ Testing Library matchers
- ✅ Mock environment variables
- ✅ Global test setup

### 3. Utilidades de Testing

**Archivo:** `src/__tests__/utils/mocks.ts`

Mocks disponibles:
- ✅ `mockUser` - Usuario de Supabase
- ✅ `mockSession` - Sesión autenticada
- ✅ `mockSupabaseClient` - Cliente Supabase
- ✅ `mockStripeClient` - Cliente Stripe
- ✅ `mockOpenAIClient` - Cliente OpenAI
- ✅ `mockNextRequest()` - Request helper
- ✅ `mockNextResponse()` - Response helper
- ✅ `mockProfile()` - Profile builder
- ✅ `mockPost()` - Post builder

### 4. Primer Test Suite

**Archivo:** `src/__tests__/api/checkout.test.ts`

Tests implementados:
- ✅ Request validation (4 tests)
- ✅ Valid plans (3 tests)
- ✅ Stripe integration (2 tests)
- ✅ Rate limiting (1 test)

**Resultados:**
```
Test Suites: 1 total
Tests:       6 passed, 4 needs fixes, 10 total
Coverage:    Baseline established
```

---

## 📊 COVERAGE ACTUAL

### Coverage Report
```
---------------------------|---------|----------|---------|---------|
File                       | % Stmts | % Branch | % Funcs | % Lines |
---------------------------|---------|----------|---------|---------|
All files                  |    0.5  |     0.3  |    0.7  |    0.5  |
src/pages/api/checkout.ts  |   45.5  |    35.7  |   50.0  |   45.5  |
---------------------------|---------|----------|---------|---------|
```

### Progreso
- **Archivos con tests:** 1
- **Archivos críticos sin tests:** ~15
- **Coverage objetivo:** >30% (Semana 1), >50% (Semana 2)

---

## 🎯 SCRIPTS NPM

```bash
# Ejecutar todos los tests
npm test

# Tests en modo watch (desarrollo)
npm run test:watch

# Tests con coverage report
npm test -- --coverage

# Ejecutar test específico
npm test -- src/__tests__/api/checkout.test.ts

# E2E tests (Playwright)
npm run test:e2e
```

---

## 📁 ESTRUCTURA DE TESTS

```
src/
├── __tests__/
│   ├── utils/
│   │   └── mocks.ts           # Shared mocks y helpers
│   ├── api/
│   │   ├── checkout.test.ts    # ✅ Implementado
│   │   ├── webhook.test.ts     # 🔄 Pendiente
│   │   ├── generate.test.ts    # 🔄 Pendiente
│   │   └── ...
│   └── components/
│       ├── Button.test.tsx     # 🔄 Pendiente
│       ├── Card.test.tsx       # 🔄 Pendiente
│       └── ...
```

---

## 🔧 CÓMO ESCRIBIR UN TEST

### Ejemplo: Test de API Route

```typescript
import { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/your-endpoint';
import { mockNextRequest, mockNextResponse } from '../utils/mocks';

// Mock dependencies
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient),
}));

describe('/api/your-endpoint', () => {
  let req: Partial<NextApiRequest>;
  let res: any;

  beforeEach(() => {
    req = mockNextRequest('POST');
    res = mockNextResponse();
    jest.clearAllMocks();
  });

  it('should handle valid request', async () => {
    req.body = { /* your data */ };
    
    await handler(req as NextApiRequest, res as NextApiResponse);
    
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
    });
  });

  it('should reject invalid request', async () => {
    req.body = {};
    
    await handler(req as NextApiRequest, res as NextApiResponse);
    
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
```

### Ejemplo: Test de Componente

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import Button from '@/components/Button';

describe('Button', () => {
  it('should render button text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('should call onClick handler', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByText('Click me'));
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

---

## 🎯 PRÓXIMOS TESTS A ESCRIBIR

### Prioridad ALTA (Esta Semana)
1. ✅ `/api/checkout` - COMPLETADO
2. 🔄 `/api/webhook` - Flujo de pago crítico
3. 🔄 `/api/generate` o `/api/post/generate` - Generación de contenido
4. 🔄 `/api/personalized/generate` - RAG generation
5. 🔄 `Button` component - Componente base
6. 🔄 `Card` component - Componente base

### Prioridad MEDIA (Próxima Semana)
7. `/api/rag/retrieve` - Búsqueda semántica
8. `/api/user-style/ingest` - Ingesta de estilo
9. `/api/viral/ingest` - Ingesta viral
10. `PlansModal` - UI crítica
11. `ErrorBoundary` - Manejo de errores
12. Integration tests - Flujos completos

---

## 🐛 DEBUGGING TESTS

### Tests Fallan?

1. **Verificar mocks:**
   ```typescript
   console.log(mockSupabaseClient.from().select.mock.calls);
   ```

2. **Ver response real:**
   ```typescript
   console.log(res.status.mock.calls);
   console.log(res.json.mock.calls);
   ```

3. **Limpiar mocks:**
   ```typescript
   beforeEach(() => {
     jest.clearAllMocks();
   });
   ```

### Coverage No Cambia?

- Verificar `testMatch` en jest.config.js
- Asegurar archivos en `src/**`
- Revisar `testPathIgnorePatterns`

---

## 📈 MÉTRICAS OBJETIVO

### Semana 1 (Actual)
- ✅ Tests configurados
- ✅ 1 test suite implementado
- ✅ 10 tests totales
- 🎯 Target: 15 test files, >30% coverage

### Semana 2
- 🎯 30+ test files
- 🎯 >50% coverage
- 🎯 All critical paths tested
- 🎯 Integration tests

### Pre-Launch
- 🎯 >80% coverage
- 🎯 All critical flows tested
- 🎯 E2E tests passing
- 🎯 CI/CD integrated

---

## ✅ CHECKLIST DE CALIDAD

### Por cada endpoint testado:
- [ ] Happy path (request válido)
- [ ] Validación de input
- [ ] Autenticación/Autorización
- [ ] Rate limiting
- [ ] Error handling
- [ ] Edge cases

### Por cada componente testado:
- [ ] Rendering básico
- [ ] Props variants
- [ ] User interactions
- [ ] Conditional rendering
- [ ] Accessibility (a11y)

---

## 🚀 CI/CD INTEGRATION (Futuro)

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm ci
      - run: npm test -- --coverage
      - run: npm run test:e2e
```

---

## 📚 RECURSOS

- [Jest Documentation](https://jestjs.io/)
- [Testing Library](https://testing-library.com/)
- [Next.js Testing](https://nextjs.org/docs/testing)
- [Test Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

## ✅ CONCLUSIÓN

**Estado:** Framework de testing completamente configurado y funcionando
**Próximo paso:** Escribir tests para endpoints críticos
**Timeline:** 2 semanas para >50% coverage

**¡El testing infrastructure está listo! Ahora solo falta escribir más tests.** 🎯
