# Configuración de Webhook de Stripe - Kolink

**Última actualización:** 2025-11-07

---

## 📋 Requisitos previos

Antes de configurar el webhook, asegúrate de tener:

- [x] Cuenta de Stripe activa
- [x] Variables de entorno configuradas en Vercel:
  - `STRIPE_SECRET_KEY`
  - `STRIPE_PRICE_ID_BASIC`
  - `STRIPE_PRICE_ID_STANDARD`
  - `STRIPE_PRICE_ID_PREMIUM`
  - `NEXT_PUBLIC_SITE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
- [x] Aplicación desplegada en producción (kolink.es)

---

## 🔧 Configuración del Webhook

### 1. Acceder a Stripe Dashboard

1. Ir a: https://dashboard.stripe.com/webhooks
2. Iniciar sesión con tu cuenta de Stripe
3. Asegurarte de estar en modo **Production** (no Test)

### 2. Crear nuevo endpoint

1. Click en **"Add endpoint"** o **"+ Add an endpoint"**
2. Se abrirá un formulario de configuración

### 3. Configurar el endpoint

#### URL del endpoint

```
https://kolink.es/api/webhook
```

**⚠️ Importante:**
- Usar HTTPS (no HTTP)
- Usar dominio de producción (no vercel.app)
- No agregar parámetros query (?param=value)
- No agregar trailing slash al final

#### Descripción (opcional)

```
Kolink Production Webhook - Payment Processing
```

#### Versión de API

Seleccionar: **Latest API version** o la versión actual de tu cuenta

#### Eventos a escuchar

Seleccionar los siguientes eventos:

**Eventos esenciales:**
- ✅ `checkout.session.completed` - Pago completado exitosamente

**Eventos futuros (opcional, para funcionalidades avanzadas):**
- ⏳ `customer.subscription.updated` - Suscripción actualizada
- ⏳ `customer.subscription.deleted` - Suscripción cancelada
- ⏳ `invoice.payment_succeeded` - Pago recurrente exitoso
- ⏳ `invoice.payment_failed` - Pago recurrente fallido

**Por ahora, solo habilitar:** `checkout.session.completed`

### 4. Guardar el endpoint

1. Click en **"Add endpoint"**
2. Stripe creará el endpoint y mostrará los detalles

### 5. Copiar el Signing Secret

**⚠️ CRÍTICO:** Este paso es esencial para la seguridad

1. En la página del endpoint, buscar la sección **"Signing secret"**
2. Click en **"Reveal"** o **"Click to reveal"**
3. Copiar el secret (comienza con `whsec_...`)

**Ejemplo:**
```
whsec_1234567890abcdefghijklmnopqrstuvwxyz
```

4. **Guardar este secret de forma segura** - lo necesitarás en el siguiente paso

---

## 🔑 Configurar Secret en Vercel

### Opción A: Vercel CLI (recomendado)

```bash
# Navegar al directorio del proyecto
cd /Users/aramzakzuk/Proyectos/kolink

# Agregar o actualizar el secret
vercel env add STRIPE_WEBHOOK_SECRET production

# Pegar el signing secret copiado de Stripe
# (el que comienza con whsec_...)
```

### Opción B: Vercel Dashboard

1. Ir a: https://vercel.com/arams-projects-7f967c6c/kolink/settings/environment-variables
2. Buscar `STRIPE_WEBHOOK_SECRET` en la lista
3. Si existe:
   - Click en **"Edit"**
   - Pegar el nuevo valor
   - Seleccionar **"Production"**
   - Click **"Save"**
4. Si no existe:
   - Click **"Add New"**
   - Name: `STRIPE_WEBHOOK_SECRET`
   - Value: `whsec_...` (pegar el secret)
   - Environment: **Production** ✅
   - Click **"Add"**

### Verificar configuración

```bash
vercel env ls | grep STRIPE_WEBHOOK_SECRET
```

Debería mostrar:
```
STRIPE_WEBHOOK_SECRET     Encrypted     Production     [timestamp]
```

---

## 🚀 Redeploy de la aplicación

**⚠️ IMPORTANTE:** Después de actualizar las variables de entorno, es necesario hacer redeploy

```bash
# Redeploy a producción
vercel --prod

# O forzar redeploy sin cambios
vercel --prod --force
```

Esperar a que el deploy complete (1-3 minutos)

---

## ✅ Validación del Webhook

### 1. Verificar estado en Stripe Dashboard

1. Ir a: https://dashboard.stripe.com/webhooks
2. Click en el endpoint configurado
3. Verificar que muestra:
   - **Status:** Enabled ✅
   - **URL:** https://kolink.es/api/webhook
   - **Events:** checkout.session.completed

### 2. Enviar evento de prueba

**⚠️ Usar con cuidado:** Esto enviará un evento real a tu endpoint

1. En la página del webhook, scroll hasta **"Send test webhook"**
2. Seleccionar evento: `checkout.session.completed`
3. Click **"Send test webhook"**
4. Verificar respuesta:
   - ✅ Status 200 (éxito)
   - ❌ Status 4xx o 5xx (error)

### 3. Revisar logs del evento

#### En Stripe Dashboard:

1. En la misma página, buscar sección **"Recent deliveries"**
2. Click en el evento más reciente
3. Verificar:
   - **Response code:** 200
   - **Response body:** "success"
   - **Timing:** < 5 segundos

#### En Vercel logs:

```bash
# Ver logs en tiempo real
vercel logs --follow

# Filtrar solo logs del webhook
vercel logs --follow | grep webhook
```

Buscar líneas como:
```
📦 Evento recibido: checkout.session.completed
✅ Plan actualizado a Basic para usuario [userId]
```

---

## 🧪 Prueba End-to-End

### Opción A: Stripe CLI (Local testing)

**Instalación:**
```bash
# macOS
brew install stripe/stripe-cli/stripe

# Login
stripe login
```

**Testing local:**
```bash
# Terminal 1: Escuchar webhooks
stripe listen --forward-to http://localhost:3000/api/webhook

# Terminal 2: Dev server
npm run dev

# Terminal 3: Trigger evento
stripe trigger checkout.session.completed
```

### Opción B: Tarjeta de prueba en producción

**⚠️ Solo en modo Test de Stripe**

1. Asegurarte de estar en **Test mode** en Stripe Dashboard
2. Crear checkout session:

```bash
curl https://kolink.es/api/checkout \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [JWT_TOKEN]" \
  -d '{
    "userId": "[USER_ID]",
    "plan": "basic"
  }'
```

3. Abrir URL devuelta en navegador
4. Usar tarjeta de prueba:
   - Número: `4242 4242 4242 4242`
   - Fecha: `12/34` (cualquier fecha futura)
   - CVC: `123`
   - ZIP: `12345`
5. Completar pago
6. Verificar que webhook fue llamado

### Opción C: Transacción real mínima

**⚠️ Implica pago real - usar con precaución**

1. Crear cuenta de prueba con email real
2. Seleccionar plan Basic ($9)
3. Completar pago con tarjeta real
4. Verificar:
   - Webhook recibido (Stripe Dashboard)
   - Créditos asignados (Supabase)
   - Email de confirmación recibido
5. Hacer refund completo inmediatamente (ver REFUND_PROCEDURE.md)

---

## 🚨 Troubleshooting

### Problema: Webhook retorna 400 - Bad Request

**Causas posibles:**
1. Signing secret incorrecto
2. URL del webhook incorrecta
3. Body parser habilitado (debe estar deshabilitado)

**Soluciones:**

1. Verificar signing secret:
```bash
vercel env ls | grep STRIPE_WEBHOOK_SECRET
```

2. Verificar que el endpoint tiene:
```typescript
export const config = {
  api: { bodyParser: false },
};
```

3. Regenerar webhook:
   - Eliminar endpoint en Stripe Dashboard
   - Crear nuevo endpoint
   - Copiar nuevo signing secret
   - Actualizar en Vercel

---

### Problema: Webhook retorna 500 - Internal Server Error

**Causas posibles:**
1. Error en código del webhook
2. Supabase no accesible
3. Variable de entorno faltante

**Soluciones:**

1. Revisar logs en Vercel:
```bash
vercel logs --follow | grep "ERROR\|❌"
```

2. Verificar variables en Vercel:
```bash
vercel env ls | grep -E "(STRIPE|SUPABASE)"
```

3. Verificar conexión a Supabase:
```bash
curl https://kolink.es/api/test-supabase
```

---

### Problema: Webhook se recibe pero no actualiza créditos

**Causas posibles:**
1. `userId` no está en metadata
2. Plan inválido en metadata
3. Error de permisos en Supabase

**Soluciones:**

1. Verificar metadata en checkout:
```typescript
// En src/pages/api/checkout.ts
metadata: {
  user_id: userId,         // ✅ user_id (con guion bajo)
  selected_plan: normalizedPlan
}
```

2. Verificar que webhook use Service Role Key:
```typescript
// En src/pages/api/webhook.tsx
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // ✅ Service role, no anon key
);
```

3. Verificar RLS policies en Supabase:
```sql
-- Debe permitir UPDATE con service role
SELECT * FROM pg_policies WHERE tablename = 'profiles';
```

---

### Problema: Eventos duplicados

**Síntomas:**
- Usuario recibe créditos duplicados
- Webhook se llama múltiples veces

**Causas:**
1. Múltiples endpoints configurados en Stripe
2. Timeout causando retry de Stripe

**Soluciones:**

1. Verificar endpoints en Stripe:
```
https://dashboard.stripe.com/webhooks
```
   - Debe haber solo 1 endpoint para producción
   - Eliminar endpoints duplicados o deshabilitados

2. Implementar idempotencia (futuro):
```typescript
// Verificar si el evento ya fue procesado
const { data: existingLog } = await supabase
  .from('payment_logs')
  .select('id')
  .eq('stripe_session_id', session.id)
  .single();

if (existingLog) {
  console.log('Event already processed');
  return res.status(200).send('already_processed');
}
```

---

## 📊 Monitoreo continuo

### Configurar alertas en Stripe

1. Ir a: https://dashboard.stripe.com/settings/notifications
2. Habilitar:
   - ✅ **Webhook failures** - Notificar si webhook falla
   - ✅ **Endpoint down** - Notificar si endpoint no responde

### Configurar alertas en Sentry (ya configurado)

El webhook ya tiene logging de Sentry configurado. Monitorear en:
- https://sentry.io/organizations/kolink/issues/

**Alertas configuradas:**
- Error rate > 5% en webhook
- Cualquier excepción no capturada

### Health check diario

Ejecutar este comando para verificar que todo funciona:

```bash
# 1. Variables configuradas
vercel env ls | grep -E "(STRIPE|SUPABASE)"

# 2. Webhook activo en Stripe
# (revisar manualmente en Dashboard)

# 3. Últimos logs sin errores
vercel logs --since 1d | grep -E "(ERROR|❌)" | wc -l
# Debería ser 0 o muy bajo
```

---

## 📝 Checklist de configuración

Usar este checklist para verificar configuración completa:

- [ ] Webhook creado en Stripe Dashboard
- [ ] URL: `https://kolink.es/api/webhook`
- [ ] Evento `checkout.session.completed` habilitado
- [ ] Signing secret copiado
- [ ] `STRIPE_WEBHOOK_SECRET` agregado en Vercel
- [ ] Redeploy realizado
- [ ] Evento de prueba enviado (status 200)
- [ ] Logs verificados en Vercel
- [ ] Test end-to-end completado
- [ ] Alertas configuradas en Stripe
- [ ] Monitoreo en Sentry activo
- [ ] Documentación actualizada

---

## 📞 Recursos

- **Stripe Webhooks Docs:** https://stripe.com/docs/webhooks
- **Stripe CLI:** https://stripe.com/docs/stripe-cli
- **Testing Webhooks:** https://stripe.com/docs/webhooks/test
- **Tarjetas de prueba:** https://stripe.com/docs/testing

---

**Última revisión:** 2025-11-07
**Versión:** 1.0
**Mantenido por:** Equipo Kolink
