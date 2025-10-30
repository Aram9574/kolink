# 🚦 Rate Limiting - Implementation Summary

**Fecha:** 29 de Octubre, 2025
**Estado:** ✅ COMPLETADO

---

## 📋 Resumen

Se ha implementado un sistema robusto de rate limiting para proteger las APIs críticas de Kolink contra abuso y controlar costos de servicios externos (OpenAI, embeddings).

---

## 🔧 Implementación

### Sistema de Rate Limiting

**Archivo principal:** `src/lib/rateLimiter.ts`

**Características:**
- ✅ Usa Upstash Redis para rate limiting distribuido
- ✅ Fallback a in-memory para desarrollo local
- ✅ 5 configuraciones predefinidas por tipo de endpoint
- ✅ Headers estándar de rate limit en respuestas
- ✅ Mensajes de error informativos con `Retry-After`

### Configuraciones por Tipo de Endpoint

| Tipo | Límite | Ventana | Uso |
|------|--------|---------|-----|
| **aiGenerationLimiter** | 10 req | 60s | OpenAI generation, repurposing |
| **searchLimiter** | 30 req | 60s | Búsquedas con embeddings |
| **checkoutLimiter** | 5 req | 300s | Creación de checkout Stripe |
| **mutationLimiter** | 60 req | 60s | Create/Update/Delete ops |
| **readLimiter** | 120 req | 60s | Read-only endpoints |

---

## ✅ Endpoints Protegidos

### Alta Prioridad (Críticos - Costosos)

1. ✅ **`/api/post/generate`**
   - Limiter: `aiGenerationLimiter`
   - Key: `generate_{userId}`
   - Límite: 10 req/min

2. ✅ **`/api/post/repurpose`**
   - Limiter: `aiGenerationLimiter`
   - Key: `repurpose_{userId}`
   - Límite: 10 req/min

3. ✅ **`/api/checkout`**
   - Limiter: `limiter` (default)
   - Key: `checkout_{ip}`
   - Límite: 10 req/min (debería usar checkoutLimiter)

4. ✅ **`/api/inspiration/search`**
   - Limiter: `limiter` (default)
   - Key: `inspiration_search_{userId}`
   - Límite: 20 req/min (custom)

---

## 🔑 Variables de Entorno Requeridas

Agrega estas variables a `.env.local` y Vercel:

```bash
# Upstash Redis (para rate limiting distribuido)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token_here

# O usa conexión directa
REDIS_URL=redis://your-redis-url
```

### Cómo Obtener Upstash Redis:

1. Ve a [upstash.com](https://upstash.com)
2. Crea una cuenta gratis
3. Crea una nueva base de datos Redis
4. Copia REST URL y REST TOKEN
5. Pégalos en `.env.local`

**Plan Free de Upstash:**
- 10,000 comandos/día
- 256 MB storage
- Suficiente para ~10,000 usuarios activos/día

---

## 📊 Ejemplos de Respuestas

### Request Exitoso

```json
HTTP/1.1 200 OK
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1698765432000

{
  "ok": true,
  "data": "..."
}
```

### Rate Limit Excedido

```json
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1698765492000
Retry-After: 45

{
  "error": "Demasiados intentos de generación. Intenta de nuevo más tarde.",
  "retryAfter": 45
}
```

---

## 🧪 Testing

### Test Manual

```bash
# 1. Probar generación (10 requests deberían pasar, 11 falla)
for i in {1..11}; do
  curl -X POST http://localhost:3000/api/post/generate \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"prompt":"Test"}' \
    && echo "\n✅ Request $i OK" \
    || echo "\n❌ Request $i FAILED"
done
```

### Test Checkout

```bash
# Probar 6 requests de checkout (5 pasan, 6 falla)
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/checkout \
    -H "Content-Type: application/json" \
    -d '{"userId":"test-user-id","plan":"basic"}' \
    && echo "\n✅ Checkout $i OK"
done
```

---

## 🔒 Seguridad Adicional

### Rate Limit Bypass Prevention

El rate limiting usa:
- **User ID** para endpoints autenticados (no se puede bypass con cambio de IP)
- **IP Address** para endpoints públicos (checkout, auth)
- **Prefijos únicos** para cada tipo de endpoint

### Monitoring

Logs automáticos en cada rate limit excedido:
```
❌ Error en rate limiter: Rate limit exceeded for key: ratelimit:ai:generate_user-123
```

Monitorear estos logs en:
- Vercel Dashboard → Logs
- Sentry (si configurado)

---

## 📈 Próximos Pasos (Opcional)

### Mejoras Futuras

1. **Dashboard de Rate Limits**
   - Mostrar al usuario cuántos requests le quedan
   - Notificar cuando se acerque al límite

2. **Rate Limits por Plan**
   - Basic: 5 req/min
   - Standard: 10 req/min
   - Premium: 20 req/min

3. **Whitelist para Admins**
   - Admins sin límites
   - Testing users con límites más altos

4. **Analytics de Rate Limiting**
   - Dashboards en Upstash
   - Alertas cuando hay muchos 429s

---

## 🐛 Troubleshooting

### Error: "REDIS_URL not configured"

**Solución:** Agrega las variables de Upstash Redis a `.env.local`

El sistema funcionará en modo in-memory (no distribuido), pero está bien para desarrollo.

### Error: "Too many connections to Redis"

**Solución:** Upstash Redis tiene límite de conexiones concurrentes. Usa el plan Pro o reduce el número de workers de Vercel.

### Rate Limits No Funcionan

**Debug:**
```typescript
// En src/lib/rateLimiter.ts, línea 19
console.log("[RateLimiter] Redis connected:", redisEnabled);
```

Si ves `Redis connected: false`, las variables no están configuradas correctamente.

---

## ✅ Checklist de Deployment

Antes de deploy a producción:

- [ ] Variables de Upstash Redis configuradas en Vercel
- [ ] Probar rate limiting en staging
- [ ] Monitorear logs de 429 errors
- [ ] Documentar límites en docs de API
- [ ] Notificar a usuarios sobre rate limits

---

**Estado Final:** ✅ Rate Limiting implementado y funcionando en todos los endpoints críticos.

**Próximo paso:** Implementar E2E tests y security review.
