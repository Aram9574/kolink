# 🚀 Vercel Environment Variables Setup Guide

## Configuración de Variables de Entorno en Vercel

### 📋 Paso 1: Acceder a la configuración

1. Ve a tu proyecto en Vercel: https://vercel.com/dashboard
2. Selecciona el proyecto `kolink`
3. Ve a **Settings** → **Environment Variables**

---

## 🔐 Variables REQUERIDAS para Producción

### Supabase
```bash
NEXT_PUBLIC_SUPABASE_URL=https://crdtxyfvbosjiddirtzc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNyZHR4eWZ2Ym9zamlkZGlydHpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5NzY2ODMsImV4cCI6MjA3NjU1MjY4M30.599Y7RIUdx5_pYXGRMmt5kdrqMkfUz6vN-VFIReGnho
SUPABASE_SERVICE_ROLE_KEY=[Obtener de .env.local]
SUPABASE_ACCESS_TOKEN=[Obtener de .env.local]
```

### Next.js URLs
```bash
NEXT_PUBLIC_SITE_URL=https://kolink.es
NEXTAUTH_URL=https://kolink.es
```

### OpenAI
```bash
OPENAI_API_KEY=[Obtener de .env.local]
```

### Stripe (LIVE MODE)
```bash
STRIPE_SECRET_KEY=[Obtener de .env.local - debe empezar con sk_live_]
STRIPE_WEBHOOK_SECRET=[Obtener de .env.local - debe empezar con whsec_]
STRIPE_SUCCESS_URL=https://kolink.es/success
STRIPE_CANCEL_URL=https://kolink.es/cancel
STRIPE_WEBHOOK_URL=https://kolink.es/api/webhook

# Price IDs
STRIPE_PRICE_ID_BASIC=[Obtener de .env.local]
STRIPE_PRICE_ID_STANDARD=[Obtener de .env.local]
STRIPE_PRICE_ID_PREMIUM=[Obtener de .env.local]
```

### Resend (Email)
```bash
RESEND_API_KEY=[Obtener de .env.local]
FROM_EMAIL=info@kolink.es
```

### Upstash Redis
```bash
UPSTASH_REDIS_REST_URL=[Obtener de .env.local]
UPSTASH_REDIS_REST_TOKEN=[Obtener de .env.local]
```

### Encryption
```bash
ENCRYPTION_KEY=[Obtener de .env.local]
```

### PostHog Analytics
```bash
NEXT_PUBLIC_POSTHOG_KEY=[Obtener de .env.local]
NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
```

---

## 📊 Variables OPCIONALES (Recomendadas)

### Sentry Error Monitoring
```bash
NEXT_PUBLIC_SENTRY_DSN=[Tu Sentry DSN de https://sentry.io]
SENTRY_AUTH_TOKEN=[Tu Sentry Auth Token]
```

**Cómo obtener Sentry DSN:**
1. Ve a https://sentry.io
2. Crea un proyecto o usa uno existente
3. Ve a **Settings** → **Projects** → **Your Project** → **Client Keys (DSN)**
4. Copia el DSN

### Vercel Analytics
```bash
VERCEL_ANALYTICS_ID=[Auto-detectado por Vercel, opcional]
```

---

## ⚙️ Configuración en Vercel

### Para CADA variable:

1. **Name**: Nombre de la variable (ej: `OPENAI_API_KEY`)
2. **Value**: Valor de tu `.env.local`
3. **Environment**: Selecciona **Production** ✅
4. Click **Save**

### ⚠️ IMPORTANTE:

- **NO subas** tu `.env.local` a Git (ya está en `.gitignore`)
- **Copia manualmente** cada valor de `.env.local` a Vercel
- Verifica que las **URLs** sean de producción (`https://kolink.es`)
- Verifica que **Stripe** esté en modo LIVE (`sk_live_`)

---

## 🔄 Post-Configuración

### 1. Redeploy el proyecto

Después de agregar las variables:

```bash
# Opción A: Desde Vercel Dashboard
Deployments → Redeploy latest

# Opción B: Desde Git
git push origin main
```

### 2. Verificar las variables

```bash
# En Vercel Dashboard, ve a:
Settings → Environment Variables → Production

# Deberías ver ~20 variables configuradas
```

### 3. Configurar Stripe Webhook

**IMPORTANTE**: Después del primer deploy, configura el webhook:

1. Ve a https://dashboard.stripe.com/webhooks
2. Click **Add endpoint**
3. **Endpoint URL**: `https://kolink.es/api/webhook`
4. **Events to send**: Selecciona `checkout.session.completed`
5. Click **Add endpoint**
6. Copia el **Signing secret** (empieza con `whsec_`)
7. Actualiza `STRIPE_WEBHOOK_SECRET` en Vercel con este valor
8. Redeploy el proyecto

---

## ✅ Checklist de Verificación

- [ ] Todas las variables REQUERIDAS están en Vercel
- [ ] URLs apuntan a `https://kolink.es` (no localhost)
- [ ] Stripe está en modo LIVE (`sk_live_`)
- [ ] FROM_EMAIL es `info@kolink.es`
- [ ] PostHog está configurado
- [ ] Sentry DSN configurado (opcional pero recomendado)
- [ ] Proyecto redeployado después de agregar variables
- [ ] Stripe webhook configurado y testeado
- [ ] Dominio personalizado configurado en Vercel
- [ ] SSL/TLS activo (automático en Vercel)

---

## 🆘 Troubleshooting

### Error: "Missing environment variable"

**Solución:**
1. Verifica que la variable esté en Vercel
2. Asegúrate de seleccionar **Production** environment
3. Redeploy el proyecto

### Stripe webhook falla

**Solución:**
1. Verifica que `STRIPE_WEBHOOK_SECRET` sea correcto
2. Testea el webhook desde Stripe Dashboard
3. Revisa logs en Vercel: Deployments → Tu deployment → Logs

### Email no se envía

**Solución:**
1. Verifica que `FROM_EMAIL` esté verificado en Resend
2. Verifica que `RESEND_API_KEY` sea correcto
3. Revisa logs de Resend: https://resend.com/emails

---

## 📝 Notas

- **Redis legacy**: No necesitas `REDIS_URL` si usas Upstash REST API
- **PostHog**: `POSTHOG_API_KEY` y `NEXT_PUBLIC_POSTHOG_KEY` pueden ser el mismo valor
- **Vercel Analytics**: Se activa automáticamente en proyectos Vercel, no necesitas ID

---

## 🔒 Seguridad

- ✅ Nunca compartas tus claves secretas
- ✅ Usa modo LIVE de Stripe solo en producción
- ✅ Rota las claves periódicamente (cada 3-6 meses)
- ✅ Habilita 2FA en Stripe, Supabase, Vercel
- ✅ Revisa logs de Sentry regularmente

---

**Última actualización**: 2025-10-31
**Versión**: Kolink v0.7
