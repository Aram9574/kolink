# 🚀 Production Deployment Checklist - Kolink v0.7

## ✅ Pre-Deployment Status

**Fecha**: 2025-10-31
**Versión**: Kolink v0.7 - Production Ready
**Estado**: ✅ LISTO PARA DESPLIEGUE

---

## 📊 Verificación Completada

### ✅ Código y Build
- [x] ESLint: **0 warnings**
- [x] TypeScript: **0 errors**
- [x] Build de producción: **EXITOSO**
- [x] Tests unitarios (Jest): **PASADOS**
- [x] Tests E2E (Playwright): **CONFIGURADOS**
- [x] Schema de base de datos: **HEALTHY**

### ✅ Código Limpio
- [x] Todos los cambios commiteados
- [x] 2 commits nuevos con historial completo
- [x] Sin archivos pendientes de commit
- [x] .gitignore actualizado

### ✅ Documentación
- [x] README.md actualizado con v0.7
- [x] VERCEL_ENV_SETUP.md creado
- [x] .env.example completo y actualizado
- [x] CLAUDE.md con instrucciones actualizadas

---

## 🔐 Variables de Entorno Requeridas

### Core Services (CRÍTICO)
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://crdtxyfvbosjiddirtzc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[Ya configurado]
SUPABASE_SERVICE_ROLE_KEY=[Ya configurado]
SUPABASE_ACCESS_TOKEN=[Ya configurado]

# OpenAI
OPENAI_API_KEY=[Ya configurado]

# Stripe (LIVE MODE)
STRIPE_SECRET_KEY=[Ya configurado - sk_live_*]
STRIPE_WEBHOOK_SECRET=[Ya configurado]
STRIPE_PRICE_ID_BASIC=[Ya configurado]
STRIPE_PRICE_ID_STANDARD=[Ya configurado]
STRIPE_PRICE_ID_PREMIUM=[Ya configurado]

# URLs
NEXT_PUBLIC_SITE_URL=https://kolink.es
NEXTAUTH_URL=https://kolink.es

# Email
RESEND_API_KEY=[Ya configurado]
FROM_EMAIL=info@kolink.es

# Redis/Cache
UPSTASH_REDIS_REST_URL=[Ya configurado]
UPSTASH_REDIS_REST_TOKEN=[Ya configurado]

# Encryption
ENCRYPTION_KEY=[Ya configurado]
```

### Analytics & Monitoring (RECOMENDADO)
```bash
# PostHog
NEXT_PUBLIC_POSTHOG_KEY=[Ya configurado]
NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com

# Sentry (Configurar en sentry.io)
NEXT_PUBLIC_SENTRY_DSN=[Pendiente - obtener de Sentry]
SENTRY_AUTH_TOKEN=[Pendiente - obtener de Sentry]
```

---

## 📋 Pasos de Despliegue

### 1. Push a GitHub ✅ LISTO
```bash
git push origin main
```

**Estado actual**: Código ya commiteado, listo para push

### 2. Configurar Variables en Vercel

1. Ve a: https://vercel.com/dashboard
2. Selecciona proyecto `kolink`
3. Settings → Environment Variables
4. Copia TODAS las variables de `.env.local`
5. Asegúrate de seleccionar **Production** environment
6. Guarda cada variable

**Guía detallada**: Ver `VERCEL_ENV_SETUP.md`

### 3. Configurar Dominio Personalizado

1. En Vercel: Settings → Domains
2. Agregar `kolink.es`
3. Configurar registros DNS según instrucciones de Vercel
4. Esperar propagación DNS (5-30 minutos)
5. SSL se activa automáticamente

### 4. Configurar Stripe Webhook

**IMPORTANTE**: Hacer DESPUÉS del primer deploy

1. Ve a: https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. **Endpoint URL**: `https://kolink.es/api/webhook`
4. **Events**: Selecciona `checkout.session.completed`
5. Click "Add endpoint"
6. Copia el **Signing secret** (whsec_...)
7. Actualiza `STRIPE_WEBHOOK_SECRET` en Vercel
8. Redeploy el proyecto en Vercel

### 5. Verificar Supabase

1. Ve a: https://supabase.com/dashboard
2. Verifica allowed domains incluya `kolink.es`
3. Settings → API
4. Confirma URLs de redirect incluyan `https://kolink.es/*`

### 6. Verificar Resend

1. Ve a: https://resend.com
2. Verifica que `info@kolink.es` esté verificado
3. Domains → Confirma `kolink.es` configurado con SPF/DKIM

---

## 🧪 Post-Deployment Testing

### Test 1: Signup/Login
- [ ] Ir a `https://kolink.es/signup`
- [ ] Crear cuenta nueva
- [ ] Verificar email de bienvenida llega
- [ ] Login con credenciales nuevas

### Test 2: Generación de Contenido
- [ ] Ir a Dashboard
- [ ] Generar un post con IA
- [ ] Verificar que se consume 1 crédito
- [ ] Verificar contenido se guarda

### Test 3: Checkout de Stripe
- [ ] Seleccionar un plan
- [ ] Completar checkout (usa tarjeta de prueba: `4242 4242 4242 4242`)
- [ ] Verificar redirección a dashboard
- [ ] Verificar créditos se agregan al perfil

### Test 4: Admin Panel
- [ ] Crear usuario admin:
```sql
UPDATE profiles
SET role = 'admin'
WHERE email = 'tu-email@kolink.es';
```
- [ ] Ir a `https://kolink.es/admin`
- [ ] Verificar panel carga correctamente
- [ ] Verificar estadísticas se muestran

### Test 5: Monitoring
- [ ] Verificar Sentry captura errores
- [ ] Verificar PostHog trackea eventos
- [ ] Revisar logs en Vercel

---

## 🔍 Verificación de Servicios

### Supabase
```bash
# Verificar conexión
curl https://crdtxyfvbosjiddirtzc.supabase.co/rest/v1/
```

### Stripe
- Dashboard: https://dashboard.stripe.com/test/payments
- Verificar modo LIVE está activo
- Verificar webhooks funcionan

### Vercel
- Logs: https://vercel.com/dashboard/deployments
- Analytics: https://vercel.com/dashboard/analytics

---

## ⚠️ Troubleshooting

### Error: "Missing environment variable"
**Solución**: Verificar que la variable esté en Vercel > Settings > Environment Variables > Production

### Build falla en Vercel
**Solución**:
1. Revisar logs en Vercel Deployments
2. Verificar que `npm run build` funciona localmente
3. Verificar variables de entorno requeridas estén configuradas

### Stripe webhook falla
**Solución**:
1. Verificar `STRIPE_WEBHOOK_SECRET` en Vercel
2. Testear webhook desde Stripe Dashboard
3. Revisar logs: Vercel > Deployments > Latest > Logs
4. Buscar errores relacionados con `/api/webhook`

### Emails no se envían
**Solución**:
1. Verificar FROM_EMAIL verificado en Resend
2. Verificar RESEND_API_KEY correcto
3. Revisar logs en https://resend.com/emails
4. Verificar registros DNS (SPF, DKIM)

### 404 en rutas
**Solución**:
1. Verificar rewrites en vercel.json
2. Limpiar cache de Vercel
3. Redeploy completo

---

## 📈 Métricas de Éxito

### Día 1
- [ ] 0 errores críticos en Sentry
- [ ] Al menos 1 signup exitoso
- [ ] Al menos 1 transacción de Stripe completada
- [ ] Todos los emails enviados correctamente

### Semana 1
- [ ] Uptime > 99.9%
- [ ] Tiempo de respuesta promedio < 500ms
- [ ] 0 errores de base de datos
- [ ] Backup de BD funcionando

---

## 🔒 Seguridad Post-Deploy

### Inmediato
- [ ] Habilitar 2FA en Vercel
- [ ] Habilitar 2FA en Supabase
- [ ] Habilitar 2FA en Stripe
- [ ] Revisar CORS policies en Supabase
- [ ] Verificar RLS policies activas

### Primera Semana
- [ ] Audit de seguridad con `npm audit`
- [ ] Revisar logs de acceso sospechoso
- [ ] Configurar alertas de Sentry
- [ ] Configurar backups automáticos en Supabase

---

## 📝 Comandos Útiles

### Despliegue Manual (si no usas GitHub Auto-Deploy)
```bash
# Deploy a producción
vercel --prod

# Ver logs en tiempo real
vercel logs --follow

# Ver deployments recientes
vercel ls
```

### Verificación Local
```bash
# Verificar build
npm run build

# Ejecutar tests
npm test
npm run test:e2e

# Linting
npm run lint

# Verificar schema de BD
npm run predeploy:verify
```

### Mantenimiento
```bash
# Actualizar dependencias
npm update

# Audit de seguridad
npm audit

# Limpiar cache
rm -rf .next node_modules
npm install
npm run build
```

---

## 🎯 KPIs a Monitorear

### Técnicos
- **Uptime**: > 99.9%
- **Response Time**: < 500ms (p95)
- **Error Rate**: < 0.1%
- **Build Time**: < 2 minutos

### Negocio
- **Conversión Signup**: > 2%
- **Conversión Checkout**: > 10%
- **Email Delivery Rate**: > 98%
- **User Retention (D7)**: > 40%

---

## 🆘 Contactos de Emergencia

### Servicios Críticos
- **Vercel Support**: https://vercel.com/support
- **Supabase Support**: https://supabase.com/dashboard/support
- **Stripe Support**: https://support.stripe.com
- **Resend Support**: https://resend.com/support

### Rollback de Emergencia
```bash
# En Vercel Dashboard
Deployments → [Previous Deployment] → Promote to Production

# O via CLI
vercel rollback [deployment-url]
```

---

## ✅ Checklist Final Pre-Launch

- [ ] Código pusheado a main
- [ ] Variables de entorno en Vercel
- [ ] Dominio kolink.es configurado
- [ ] SSL activo
- [ ] Stripe webhook configurado y testeado
- [ ] Supabase permite kolink.es
- [ ] FROM_EMAIL verificado
- [ ] Usuario admin creado
- [ ] Tests básicos pasados
- [ ] Sentry configurado (opcional pero recomendado)
- [ ] PostHog configurado
- [ ] Backup de BD configurado
- [ ] Documentación revisada
- [ ] Team informado

---

**Estado Final**: ✅ LISTO PARA DESPLIEGUE
**Última actualización**: 2025-10-31
**Versión**: Kolink v0.7
**Next Step**: Push to GitHub y configurar Vercel

🚀 **¡Buena suerte con el lanzamiento!**
