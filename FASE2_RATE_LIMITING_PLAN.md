# FASE 2 - Plan de Rate Limiting

## Estado Actual

✅ **6/25 endpoints protegidos** (24%)

❌ **19 endpoints SIN protección**

---

## Endpoints con Rate Limiting ✅

1. `/api/post/generate` - AI Generation
2. `/api/post/repurpose` - AI Generation
3. `/api/analytics/stats` - Read-only
4. `/api/calendar/schedule` - Mutations
5. `/api/inspiration/search` - Search
6. `/api/checkout` - Critical (checkout)

---

## Endpoints SIN Rate Limiting ❌

### Prioridad 1: CRÍTICOS (Seguridad/Abuse)

1. **`/api/createProfile`** → AUTH (5 req/5min)
2. **`/api/emails/send`** → AUTH (5 req/5min)
3. **`/api/webhook`** → ESPECIAL (webhook signature validation only)

### Prioridad 2: ADMIN (Protección de recursos)

4. **`/api/admin/audit-logs`** → READ_ONLY (120 req/min)
5. **`/api/admin/users`** → READ_ONLY (120 req/min)
6. **`/api/admin/update-user`** → MUTATIONS (60 req/min)
7. **`/api/admin/delete-user`** → MUTATIONS (60 req/min)
8. **`/api/admin/bulk-embeddings`** → AI_GENERATION (10 req/min)

### Prioridad 3: MUTATIONS (Creación/Actualización)

9. **`/api/inspiration/save`** → MUTATIONS (60 req/min)
10. **`/api/inspiration/searches/create`** → MUTATIONS (60 req/min)
11. **`/api/inspiration/searches/update`** → MUTATIONS (60 req/min)
12. **`/api/inspiration/searches/delete`** → MUTATIONS (60 req/min)

### Prioridad 4: READ-ONLY (Consultas)

13. **`/api/stats`** → READ_ONLY (120 req/min)
14. **`/api/analytics/engagement-pattern`** → READ_ONLY (120 req/min)
15. **`/api/export/download`** → READ_ONLY (30 req/min - archivos pesados)
16. **`/api/export/user-data`** → READ_ONLY (30 req/min - procesamiento)
17. **`/api/inspiration/searches/list`** → READ_ONLY (120 req/min)

### Prioridad 5: ESPECIALES (No necesitan o ya tienen validación)

18. **`/api/generate`** → Ya tiene (proxy a post/generate)
19. **`/api/emails/welcome-webhook`** → Webhook (signature validation)
20. **`/api/test-supabase`** → Development only

---

## Configuraciones por Tipo

```typescript
// src/lib/rateLimit.ts (ya existe)

AI_GENERATION:      10 req/min
SEARCH:             30 req/min
MUTATIONS:          60 req/min
READ_ONLY:         120 req/min
AUTH:                5 req/5min
CHECKOUT:            5 req/5min (ya implementado)
EXPORT:             30 req/min (nuevo)
```

---

## Implementación

### Paso 1: Agregar configuración EXPORT
```typescript
// src/lib/rateLimit.ts

export const RATE_LIMIT_CONFIGS = {
  // ... existing configs

  /**
   * For export/download endpoints
   * 30 requests per minute per user
   */
  EXPORT: {
    maxRequests: 30,
    windowSeconds: 60,
    message: "Too many export requests. Please wait a moment.",
  } as RateLimitConfig,
};
```

### Paso 2: Aplicar a cada endpoint

Patrón de uso:
```typescript
import { rateLimit, RATE_LIMIT_CONFIGS } from "@/lib/rateLimit";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Apply rate limiting
  const rateLimitResult = await rateLimit(req, res, RATE_LIMIT_CONFIGS.MUTATIONS);
  if (!rateLimitResult.allowed) return;

  // ... rest of handler
}
```

---

## Estimación

- **Tiempo por endpoint:** 5-10 minutos
- **Total:** 19 endpoints × 7 min = 2.2 horas
- **Testing:** 30 minutos
- **Total estimado:** 2.5-3 horas

---

## Orden de Implementación

1. Prioridad 1 (críticos): 3 endpoints
2. Prioridad 2 (admin): 5 endpoints
3. Prioridad 3 (mutations): 4 endpoints
4. Prioridad 4 (read-only): 5 endpoints
5. Verificar que todo funciona

---

## Verificación

Después de implementar, verificar con:

```bash
# Test rate limiting on a protected endpoint
for i in {1..15}; do
  curl -X POST http://localhost:3000/api/post/generate \
    -H "Content-Type: application/json" \
    -d '{"prompt":"test"}' \
    -w "\nStatus: %{http_code}\n"
  sleep 0.5
done

# Should see 429 after 10 requests
```

---

## Notas

- Webhooks (Stripe, email) NO necesitan rate limiting tradicional, tienen signature validation
- Development endpoints (`test-supabase`) pueden omitirse
- Los límites se pueden ajustar según métricas de uso real
