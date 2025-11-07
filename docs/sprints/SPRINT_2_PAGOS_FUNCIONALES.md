# 💰 SPRINT 2: PAGOS FUNCIONALES

**Duración Estimada:** 1 día (5 horas)
**Prioridad:** CRÍTICA - BLOQUEADOR PARA RECEPCIÓN DE PAGOS
**Objetivo:** Habilitar y validar recepción de pagos end-to-end

---

## 📋 RESUMEN DEL SPRINT

Este sprint se enfoca en garantizar que el sistema de pagos con Stripe funcione correctamente en producción. Incluye configuración de variables faltantes, validación del webhook, y monitoreo de transacciones.

**Impacto si no se resuelve:**
- ❌ Checkout de Stripe no funcionará
- ❌ Webhooks fallarán → Pagos procesados sin asignar créditos
- ❌ Usuarios pagando sin recibir servicio
- ❌ Soporte manual masivo

---

## 🎯 OBJETIVOS DEL SPRINT

1. ✅ Configurar TODAS las variables de Stripe en Vercel
2. ✅ Validar webhook en producción
3. ✅ Probar flujo end-to-end: checkout → pago → webhook → créditos
4. ✅ Configurar alertas de Sentry para pagos
5. ✅ Documentar procedimiento de refund

---

## 📝 TAREAS DETALLADAS

### TAREA 2.1: Configurar Variables de Stripe en Vercel
**Tiempo estimado:** 30 minutos
**Prioridad:** CRÍTICA

#### Variables faltantes identificadas:
```env
STRIPE_SECRET_KEY          # ❌ No configurada (rotada en Sprint 1)
STRIPE_WEBHOOK_SECRET      # ❌ No configurada (rotada en Sprint 1)
STRIPE_PRICE_ID_BASIC      # ❌ No configurada
STRIPE_PRICE_ID_STANDARD   # ❌ No configurada
STRIPE_PRICE_ID_PREMIUM    # ❌ No configurada
NEXT_PUBLIC_SITE_URL       # ❌ No configurada
```

#### Obtener Price IDs de Stripe

1. Ir a https://dashboard.stripe.com/products
2. Para cada plan, copiar el Price ID:

```
Plan Basic ($9/mes):
  - Crear producto en Stripe: "Kolink Basic"
  - Precio: $9 USD/mes recurrente
  - Copiar Price ID: price_XXXXXXXXXXXXX

Plan Standard ($19/mes):
  - Crear producto: "Kolink Standard"
  - Precio: $19 USD/mes recurrente
  - Copiar Price ID: price_XXXXXXXXXXXXX

Plan Premium ($29/mes):
  - Crear producto: "Kolink Premium"
  - Precio: $29 USD/mes recurrente
  - Copiar Price ID: price_XXXXXXXXXXXXX
```

#### Script de configuración automatizado:

```bash
#!/bin/bash
# setup-stripe-env.sh

echo "🔧 Configurando variables de Stripe en Vercel..."

# Stripe Keys (ya rotadas en Sprint 1)
vercel env add STRIPE_SECRET_KEY production
vercel env add STRIPE_WEBHOOK_SECRET production

# Price IDs (obtener de Stripe Dashboard)
vercel env add STRIPE_PRICE_ID_BASIC production
vercel env add STRIPE_PRICE_ID_STANDARD production
vercel env add STRIPE_PRICE_ID_PREMIUM production

# Site URL
vercel env add NEXT_PUBLIC_SITE_URL production
# Valor: https://kolink.es

echo "✅ Variables configuradas. Verificando..."
vercel env ls | grep STRIPE
```

#### Ejecutar script:
```bash
chmod +x setup-stripe-env.sh
./setup-stripe-env.sh
```

#### Validación:
```bash
vercel env ls | grep -E "(STRIPE|SITE_URL)"

# Debe mostrar:
# STRIPE_SECRET_KEY (production)
# STRIPE_WEBHOOK_SECRET (production)
# STRIPE_PRICE_ID_BASIC (production)
# STRIPE_PRICE_ID_STANDARD (production)
# STRIPE_PRICE_ID_PREMIUM (production)
# NEXT_PUBLIC_SITE_URL (production)
```

#### Checklist Tarea 2.1:
- [ ] Productos creados en Stripe Dashboard
- [ ] Price IDs copiados
- [ ] 6 variables agregadas a Vercel
- [ ] `vercel env ls` muestra todas las variables
- [ ] Redeploy: `vercel --prod`

---

### TAREA 2.2: Configurar y Validar Webhook de Stripe
**Tiempo estimado:** 2 horas
**Prioridad:** CRÍTICA

#### Paso 1: Configurar webhook en Stripe Dashboard

1. Ir a https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Configurar:
   - **Endpoint URL:** `https://kolink.es/api/webhook`
   - **Description:** "Kolink Production Webhook"
   - **Version:** Latest API version
   - **Events to send:**
     - ✅ `checkout.session.completed`
     - ✅ `customer.subscription.updated` (futuro)
     - ✅ `customer.subscription.deleted` (futuro)
4. Click "Add endpoint"
5. Copiar **Signing Secret** (empieza con `whsec_...`)

#### Paso 2: Actualizar Signing Secret en Vercel

```bash
# Ya configurado en Sprint 1, pero verificar
vercel env ls | grep STRIPE_WEBHOOK_SECRET

# Si no está, agregar
vercel env add STRIPE_WEBHOOK_SECRET production
# Pegar el signing secret copiado
```

#### Paso 3: Probar con Stripe CLI (Local)

```bash
# Instalar Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Escuchar webhooks localmente
stripe listen --forward-to http://localhost:3000/api/webhook

# En otra terminal, iniciar dev server
npm run dev

# En tercera terminal, disparar evento de prueba
stripe trigger checkout.session.completed
```

**Salida esperada:**
```
✅ Received event: checkout.session.completed
✅ Webhook processed successfully
```

#### Paso 4: Validar código del webhook

Verificar que `src/pages/api/webhook.tsx` tiene logging adecuado:

```typescript
// src/pages/api/webhook.tsx
import Stripe from 'stripe';
import { buffer } from 'micro';
import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const buf = await buffer(req);
  const sig = req.headers['stripe-signature']!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
    console.log('[Webhook] ✅ Event verified:', event.type);
  } catch (err: any) {
    console.error('[Webhook] ❌ Signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  // Procesar evento checkout.session.completed
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    console.log('[Webhook] 💰 Checkout completed:', {
      sessionId: session.id,
      customerId: session.customer,
      amount: session.amount_total,
      metadata: session.metadata,
    });

    // Actualizar perfil del usuario
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { userId, plan } = session.metadata as { userId: string; plan: string };

    const credits = plan === 'basic' ? 50 : plan === 'standard' ? 100 : 200;

    const { error } = await supabase
      .from('profiles')
      .update({
        plan,
        credits,
        stripe_customer_id: session.customer as string,
      })
      .eq('id', userId);

    if (error) {
      console.error('[Webhook] ❌ Failed to update profile:', error);
      return res.status(500).json({ error: 'Failed to update profile' });
    }

    console.log('[Webhook] ✅ Profile updated successfully:', { userId, plan, credits });
  }

  res.status(200).json({ received: true });
}
```

#### Checklist Tarea 2.2:
- [ ] Webhook configurado en Stripe Dashboard
- [ ] Endpoint: `https://kolink.es/api/webhook`
- [ ] Evento `checkout.session.completed` habilitado
- [ ] Signing secret actualizado en Vercel
- [ ] Test con Stripe CLI exitoso (local)
- [ ] Código del webhook tiene logging adecuado

---

### TAREA 2.3: Probar Flujo End-to-End en Producción
**Tiempo estimado:** 1.5 horas
**Prioridad:** CRÍTICA

#### Paso 1: Crear usuario de prueba

```bash
# Conectar a Supabase
psql "postgresql://postgres:[PASSWORD]@db.crdtxyfvbosjiddirtzc.supabase.co:5432/postgres"

# Crear usuario de prueba
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'test@kolink.es',
  crypt('TestPassword123!', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW()
);

INSERT INTO profiles (id, email, plan, credits)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'test@kolink.es',
  'free',
  0
);
```

#### Paso 2: Crear sesión de checkout

```bash
curl https://kolink.es/api/checkout \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "userId": "00000000-0000-0000-0000-000000000001",
    "plan": "basic"
  }'
```

**Salida esperada:**
```json
{
  "sessionId": "cs_test_xxxxxxxxxxxxx",
  "url": "https://checkout.stripe.com/c/pay/cs_test_xxxxxxxxxxxxx"
}
```

#### Paso 3: Completar pago

1. Abrir URL en navegador
2. Usar tarjeta de prueba de Stripe:
   - **Número:** `4242 4242 4242 4242`
   - **Fecha:** Cualquier fecha futura (ej: 12/25)
   - **CVC:** Cualquier 3 dígitos (ej: 123)
   - **ZIP:** Cualquier código postal (ej: 12345)
3. Click "Pay"

#### Paso 4: Verificar webhook

1. Ir a Stripe Dashboard → Webhooks
2. Seleccionar el webhook configurado
3. Ver "Recent events"
4. Debe aparecer evento `checkout.session.completed` con status `200`

#### Paso 5: Verificar créditos en Supabase

```sql
-- En psql
SELECT id, email, plan, credits, stripe_customer_id
FROM profiles
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Esperado:
-- plan: 'basic'
-- credits: 50
-- stripe_customer_id: 'cus_xxxxxxxxxxxxx'
```

#### Paso 6: Verificar logs en Vercel

```bash
vercel logs --follow
```

Buscar logs del webhook:
```
[Webhook] ✅ Event verified: checkout.session.completed
[Webhook] 💰 Checkout completed: { sessionId: 'cs_test_...', ... }
[Webhook] ✅ Profile updated successfully: { userId: '...', plan: 'basic', credits: 50 }
```

#### Checklist Tarea 2.3:
- [ ] Usuario de prueba creado
- [ ] Sesión de checkout creada
- [ ] Pago completado con tarjeta de prueba
- [ ] Webhook recibido en Stripe (status 200)
- [ ] Créditos actualizados en Supabase
- [ ] Logs visibles en Vercel

---

### TAREA 2.4: Configurar Monitoreo de Pagos
**Tiempo estimado:** 1 hora
**Prioridad:** ALTA

#### Paso 1: Configurar alertas en Sentry

Agregar a `src/pages/api/checkout.ts`:

```typescript
import * as Sentry from '@sentry/nextjs';

export default async function handler(req, res) {
  try {
    // ... código existente

    const session = await stripe.checkout.sessions.create({
      // ... configuración
    });

    // Log exitoso
    Sentry.addBreadcrumb({
      category: 'payment',
      message: 'Checkout session created',
      level: 'info',
      data: { userId, plan, sessionId: session.id }
    });

    return res.status(200).json({ sessionId: session.id, url: session.url });

  } catch (error) {
    // Log error
    Sentry.captureException(error, {
      tags: { endpoint: 'checkout' },
      extra: { userId: req.body.userId, plan: req.body.plan }
    });

    return res.status(500).json({ error: 'Failed to create checkout session' });
  }
}
```

Agregar a `src/pages/api/webhook.tsx`:

```typescript
import * as Sentry from '@sentry/nextjs';

export default async function handler(req, res) {
  try {
    // ... verificación de evento

    if (event.type === 'checkout.session.completed') {
      // ... actualización de perfil

      Sentry.addBreadcrumb({
        category: 'payment',
        message: 'Webhook processed successfully',
        level: 'info',
        data: { userId, plan, credits }
      });
    }

  } catch (error) {
    Sentry.captureException(error, {
      tags: { endpoint: 'webhook', event_type: event.type },
      level: 'error'
    });

    return res.status(500).json({ error: 'Webhook processing failed' });
  }
}
```

#### Paso 2: Configurar alerts en Sentry Dashboard

1. Ir a https://sentry.io/organizations/kolink/alerts/
2. Click "Create Alert Rule"
3. Configurar alertas:

**Alerta 1: Error rate en /api/checkout**
```
Metric: Error rate
Condition: > 5%
Timeframe: 5 minutes
Filter: endpoint:checkout
Action: Send email + Slack (si configurado)
```

**Alerta 2: Error rate en /api/webhook**
```
Metric: Error rate
Condition: > 1%
Timeframe: 5 minutes
Filter: endpoint:webhook
Action: Send email + Slack (si configurado)
```

**Alerta 3: Webhook failures**
```
Metric: Issue count
Condition: > 3 events in 10 minutes
Filter: event_type:checkout.session.completed
Action: Send email immediately
```

#### Paso 3: Crear tabla de logs de pagos (opcional)

```sql
-- En Supabase SQL Editor
CREATE TABLE IF NOT EXISTS payment_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  plan TEXT NOT NULL,
  amount INTEGER NOT NULL,
  stripe_session_id TEXT NOT NULL,
  stripe_customer_id TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_payment_logs_user_id ON payment_logs(user_id);
CREATE INDEX idx_payment_logs_created_at ON payment_logs(created_at DESC);
CREATE INDEX idx_payment_logs_session_id ON payment_logs(stripe_session_id);

-- RLS
ALTER TABLE payment_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payment logs"
  ON payment_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert payment logs"
  ON payment_logs FOR INSERT
  WITH CHECK (true);
```

Agregar logging en webhook:

```typescript
// En src/pages/api/webhook.tsx después de actualizar perfil
await supabase.from('payment_logs').insert({
  user_id: userId,
  plan,
  amount: session.amount_total,
  stripe_session_id: session.id,
  stripe_customer_id: session.customer as string,
  status: 'completed'
});
```

#### Checklist Tarea 2.4:
- [ ] Sentry logging agregado a `/api/checkout`
- [ ] Sentry logging agregado a `/api/webhook`
- [ ] 3 alertas configuradas en Sentry
- [ ] Tabla `payment_logs` creada (opcional)
- [ ] Logging funcional en producción

---

### TAREA 2.5: Documentar Procedimiento de Refund
**Tiempo estimado:** 30 minutos
**Prioridad:** MEDIA

Crear documento de procedimiento de refund:

```markdown
# Procedimiento de Refund

## Cuándo hacer un refund

- Usuario solicita cancelación dentro de 7 días
- Webhook falló y no se asignaron créditos
- Error técnico impidió el servicio
- Caso de fraude identificado

## Pasos para refund

### 1. Identificar transacción

```bash
# En Stripe Dashboard
Payments → Buscar por email del usuario
```

### 2. Procesar refund

1. Click en el pago
2. Click "Refund payment"
3. Seleccionar:
   - **Full refund** (si es dentro de 7 días)
   - **Partial refund** (si ya consumió créditos)
4. Razón: Seleccionar o escribir motivo
5. Click "Refund"

### 3. Ajustar créditos en Supabase

```sql
UPDATE profiles
SET credits = credits - 50, -- Ajustar según plan
    plan = 'free'
WHERE id = 'USER_ID';
```

### 4. Notificar al usuario

- Enviar email confirmando refund
- Explicar ajuste de créditos si aplica

## Casos especiales

### Usuario ya consumió créditos

```
Créditos asignados: 50
Créditos consumidos: 30
Refund: (50 - 30) / 50 * $9 = $3.60
```

### Webhook falló

1. Hacer refund completo
2. Pedir al usuario que intente nuevamente
3. Monitorear webhook en segundo intento
```

Guardar en `/docs/procedures/REFUND_PROCEDURE.md`

#### Checklist Tarea 2.5:
- [ ] Documento de refund creado
- [ ] Procedimiento probado con pago de prueba
- [ ] Equipo de soporte capacitado

---

## ✅ CHECKLIST FINAL DEL SPRINT 2

### Configuración
- [ ] 6 variables de Stripe configuradas en Vercel
- [ ] Webhook configurado en Stripe Dashboard
- [ ] Endpoint apuntando a `https://kolink.es/api/webhook`
- [ ] Evento `checkout.session.completed` habilitado

### Validación
- [ ] Test con Stripe CLI exitoso (local)
- [ ] Test end-to-end en producción completado
- [ ] Pago procesado correctamente
- [ ] Webhook recibido (status 200)
- [ ] Créditos asignados en Supabase
- [ ] Logs visibles en Vercel

### Monitoreo
- [ ] Sentry logging implementado
- [ ] 3 alertas configuradas en Sentry
- [ ] Tabla `payment_logs` creada (opcional)
- [ ] Dashboard de Stripe configurado

### Documentación
- [ ] Procedimiento de refund documentado
- [ ] Equipo capacitado

---

## 🚨 CRITERIOS DE ÉXITO

Este sprint se considera exitoso cuando:

1. ✅ Todas las variables de Stripe están configuradas
2. ✅ El webhook recibe eventos y responde con status 200
3. ✅ El flujo end-to-end funciona: checkout → pago → webhook → créditos
4. ✅ Las alertas de Sentry están activas
5. ✅ Al menos 1 transacción de prueba completada exitosamente

**⚠️ BLOQUEADOR:** Si el webhook no funciona correctamente, NO lanzar a producción.

---

## 📊 MÉTRICAS

- **Variables configuradas:** 6/6
- **Webhook success rate:** 100%
- **Test transactions:** Mínimo 3
- **Alertas configuradas:** 3/3
- **Documentación completa:** Sí/No

---

## 🆘 TROUBLESHOOTING

### Problema: Webhook retorna 401 Unauthorized

**Solución:**
```typescript
// Verificar que el webhook usa Service Role Key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // NO anon key
);
```

### Problema: Créditos no se actualizan

**Solución:**
1. Verificar logs del webhook en Vercel
2. Verificar que `metadata.userId` se envía en checkout
3. Verificar que el plan es válido ('basic', 'standard', 'premium')
4. Ejecutar manualmente:
```sql
UPDATE profiles
SET plan = 'basic', credits = 50
WHERE id = 'USER_ID';
```

### Problema: Webhook signature verification fails

**Solución:**
```bash
# Verificar que el signing secret es correcto
vercel env ls | grep STRIPE_WEBHOOK_SECRET

# Regenerar webhook en Stripe Dashboard
# Actualizar secret en Vercel
vercel env rm STRIPE_WEBHOOK_SECRET production
vercel env add STRIPE_WEBHOOK_SECRET production
vercel --prod
```

---

## 📞 RECURSOS

- **Stripe Dashboard:** https://dashboard.stripe.com/
- **Stripe Webhooks:** https://dashboard.stripe.com/webhooks
- **Stripe CLI Docs:** https://stripe.com/docs/stripe-cli
- **Stripe Testing Cards:** https://stripe.com/docs/testing

---

## 🎯 PRÓXIMO SPRINT

Una vez completado este sprint exitosamente, proceder con:
**[SPRINT 3: INFRAESTRUCTURA](./SPRINT_3_INFRAESTRUCTURA.md)**

---

**Creado:** 2025-11-05
**Última actualización:** 2025-11-05
**Sprint Owner:** Equipo Kolink
