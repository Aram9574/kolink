# ⚡ SPRINT 5: OPTIMIZACIONES

**Duración Estimada:** 1 día (6 horas)
**Prioridad:** MEDIA - CALIDAD Y SEGURIDAD DEL CÓDIGO
**Objetivo:** Mejorar calidad, seguridad y rendimiento del código

---

## 📋 RESUMEN DEL SPRINT

Este sprint se enfoca en optimizaciones que mejoran la calidad general del código, la seguridad y el rendimiento. No son bloqueadores para lanzamiento, pero son altamente recomendados antes de producción.

**Beneficios:**
- ✅ Menor superficie de ataque (vulnerabilidades resueltas)
- ✅ Mejor rendimiento (CSP, imágenes optimizadas)
- ✅ Código más limpio (logger condicional)
- ✅ Emails validados en múltiples clientes

---

## 🎯 OBJETIVOS DEL SPRINT

1. ✅ Actualizar dependencias vulnerables
2. ✅ Implementar logger condicional (remover console.log)
3. ✅ Validar emails transaccionales
4. ✅ Mejorar CSP headers (remover unsafe-eval si es posible)
5. ✅ Optimizar imágenes con next/image

---

## 📝 TAREAS DETALLADAS

### TAREA 5.1: Actualizar Dependencias Vulnerables
**Tiempo estimado:** 30 minutos
**Prioridad:** ALTA

#### Problema identificado:
```bash
npm audit
# 3 moderate severity vulnerabilities
# prismjs <1.30.0 - DOM Clobbering vulnerability
```

#### Paso 1: Auditar vulnerabilidades

```bash
npm audit

# Resultado esperado:
# 3 moderate severity vulnerabilities
# Package: @react-email/components
# Dependency: prismjs
# Path: @react-email/components > prismjs
# More info: https://github.com/advisories/GHSA-xxx
```

#### Paso 2: Intentar auto-fix

```bash
# Ver qué se actualizará
npm audit fix --dry-run

# Aplicar auto-fix (sin force)
npm audit fix

# Verificar que resuelve los problemas
npm audit
```

#### Paso 3: Si auto-fix no funciona, actualizar manualmente

```bash
# Actualizar @react-email/components
npm install @react-email/components@latest

# Verificar que no rompe nada
npm run build
```

#### Paso 4: Actualizar otras dependencias menores

```bash
# Ver dependencias desactualizadas
npm outdated

# Actualizar solo patches y minors (seguro)
npm update

# NO actualizar majors aún (breaking changes):
# - next: 15.5.6 → 16.x (postponer)
# - zod: 3.x → 4.x (postponer)
```

#### Paso 5: Validar que todo funciona

```bash
# Build
npm run build

# Verificar que no hay errores
# Verificar que el output es correcto

# Tests
npm test

# Lint
npm run lint

# Auditar nuevamente
npm audit

# Debe mostrar: 0 vulnerabilities
# O solo vulnerabilidades low/info (aceptables)
```

#### Paso 6: Commit y deploy

```bash
git add package.json package-lock.json
git commit -m "chore: update dependencies and fix vulnerabilities"
git push

vercel --prod
```

#### Checklist Tarea 5.1:
- [ ] `npm audit` ejecutado
- [ ] Vulnerabilidades críticas/altas resueltas
- [ ] Build exitoso
- [ ] Tests pasando
- [ ] Lint sin errores
- [ ] Deploy exitoso
- [ ] `npm audit` muestra 0 critical/high vulnerabilities

---

### TAREA 5.2: Implementar Logger Condicional
**Tiempo estimado:** 2 horas
**Prioridad:** MEDIA

#### Problema identificado:
40+ `console.log()` statements en código de producción pueden exponer información sensible.

#### Paso 1: Usar logger centralizado (ya creado en Sprint 4)

El logger ya existe en `/src/lib/logger.ts` (creado en Tarea 4.5).

#### Paso 2: Reemplazar console.log en archivos críticos

**Archivos a actualizar (prioridad alta):**
1. `src/pages/api/checkout.ts`
2. `src/pages/api/webhook.tsx`
3. `src/pages/api/generate.ts`
4. `src/pages/api/post/generate.ts`
5. `src/pages/api/personalized/generate.ts`

**Ejemplo de refactoring:**

**Antes:**
```typescript
// src/pages/api/checkout.ts
console.log('Creating checkout session for user:', userId);
console.log('Plan selected:', plan);
console.error('Error creating session:', error);
```

**Después:**
```typescript
import { logger } from '@/lib/logger';

logger.info('Creating checkout session', { userId, plan });

// En caso de error
logger.error('Failed to create checkout session', {
  userId,
  plan,
  error: error.message,
  stack: error.stack,
});
```

#### Paso 3: Script para encontrar todos los console.log

```bash
# Encontrar todos los console.log/error/warn
grep -r "console\." src/pages/api/ --include="*.ts" --include="*.tsx"

# Resultado (ejemplo):
# src/pages/api/checkout.ts:15:  console.log('Creating session');
# src/pages/api/webhook.tsx:42:  console.error('Webhook error:', err);
# ...
```

#### Paso 4: Actualizar archivos uno por uno

**Plantilla de reemplazo:**

```typescript
// ❌ ANTES
console.log('Message');
console.info('Info message');
console.warn('Warning');
console.error('Error:', error);

// ✅ DESPUÉS
import { logger } from '@/lib/logger';

logger.info('Message');
logger.info('Info message');
logger.warn('Warning');
logger.error('Error', { error: error.message });
```

#### Paso 5: Configurar ESLint para prevenir console.log

```javascript
// .eslintrc.json
{
  "rules": {
    "no-console": ["warn", {
      "allow": ["warn", "error"] // Solo en desarrollo
    }]
  }
}
```

#### Paso 6: Crear script de detección

```json
// package.json
{
  "scripts": {
    "lint:console": "grep -r 'console\\.' src/pages/api/ --include='*.ts' --include='*.tsx' || echo 'No console statements found ✅'"
  }
}
```

```bash
# Ejecutar
npm run lint:console

# Debe retornar: No console statements found ✅
```

#### Paso 7: Validar en producción

```bash
# Deploy
git add .
git commit -m "refactor: replace console.log with centralized logger"
git push

vercel --prod

# Verificar logs en Vercel
vercel logs | head -50

# Debe mostrar logs estructurados:
# [2025-11-05T12:00:00.000Z] INFO: Creating checkout session { userId: '...', plan: 'basic' }
```

#### Checklist Tarea 5.2:
- [ ] Logger centralizado implementado (Sprint 4)
- [ ] Console.log reemplazado en 5 archivos críticos
- [ ] ESLint configurado para detectar console.log
- [ ] Script `lint:console` creado
- [ ] 0 console statements en APIs de producción
- [ ] Logs estructurados visibles en Vercel

---

### TAREA 5.3: Validar Emails Transaccionales
**Tiempo estimado:** 1 hora
**Prioridad:** MEDIA

#### Problema identificado:
Templates de email existen pero no han sido probados en múltiples clientes de email.

#### Paso 1: Listar templates existentes

```bash
ls -la src/emails/

# Resultado:
# welcome.html
# weekly.html
```

#### Paso 2: Enviar emails de prueba

```typescript
// scripts/test-emails.ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

async function testWelcomeEmail() {
  const { data, error } = await resend.emails.send({
    from: process.env.FROM_EMAIL!,
    to: 'TU_EMAIL_DE_PRUEBA@gmail.com', // Reemplazar
    subject: 'TEST - Welcome to Kolink',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #F9D65C; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { background: #F9D65C; color: #1E1E1E; padding: 12px 24px; text-decoration: none; display: inline-block; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Kolink! 🎉</h1>
          </div>
          <div class="content">
            <p>Hi Test User,</p>
            <p>Thank you for signing up! We're excited to have you on board.</p>
            <p>Get started by creating your first post:</p>
            <a href="https://kolink.es/dashboard" class="button">Go to Dashboard</a>
            <p>Best regards,<br>The Kolink Team</p>
          </div>
        </div>
      </body>
      </html>
    `,
  });

  if (error) {
    console.error('Error sending email:', error);
  } else {
    console.log('Email sent successfully:', data);
  }
}

testWelcomeEmail();
```

#### Paso 3: Ejecutar script de prueba

```bash
# Compilar y ejecutar
npx ts-node scripts/test-emails.ts

# Verificar en inbox
```

#### Paso 4: Probar en múltiples clientes

Enviar email de prueba y verificar en:
- ✅ Gmail (web)
- ✅ Gmail (mobile)
- ✅ Outlook (web)
- ✅ Apple Mail (macOS/iOS)
- ✅ Yahoo Mail
- ✅ Thunderbird

**Verificar:**
- [ ] Imágenes se cargan correctamente
- [ ] Botones son clickeables
- [ ] Estilos se aplican correctamente
- [ ] No hay texto cortado
- [ ] Links funcionan
- [ ] Responsive en mobile

#### Paso 5: Usar herramienta de testing (opcional)

**Opción A: Litmus (pago)**
1. Ir a https://litmus.com/
2. Sign up
3. Paste HTML del email
4. Ver preview en 90+ clientes

**Opción B: Email on Acid (pago)**
Similar a Litmus

**Opción C: Mailtrap (free tier)**
1. Ir a https://mailtrap.io/
2. Sign up
3. Configurar SMTP en desarrollo:
```env
# .env.local (solo desarrollo)
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=...
SMTP_PASS=...
```
4. Enviar emails de prueba
5. Ver preview en múltiples clientes

#### Paso 6: Corregir problemas encontrados

**Problemas comunes:**

**1. Botones no clickeables en Outlook:**
```html
<!-- ❌ Mal -->
<a href="..." style="background: #F9D65C; ...">Button</a>

<!-- ✅ Bien (usar tabla) -->
<table><tr><td style="background: #F9D65C; ...">
  <a href="..." style="color: #1E1E1E; text-decoration: none;">Button</a>
</td></tr></table>
```

**2. Estilos no se aplican:**
```html
<!-- Usar estilos inline, no en <style> -->
<p style="color: #333; font-size: 16px;">Text</p>
```

**3. Imágenes rotas:**
```html
<!-- Usar URLs absolutas -->
<img src="https://kolink.es/logo.png" alt="Kolink" />
```

#### Checklist Tarea 5.3:
- [ ] Templates listados
- [ ] Email de prueba enviado exitosamente
- [ ] Probado en Gmail (web + mobile)
- [ ] Probado en Outlook
- [ ] Probado en Apple Mail
- [ ] Todos los links funcionan
- [ ] Responsive en mobile
- [ ] Problemas corregidos (si los hay)

---

### TAREA 5.4: Mejorar CSP Headers
**Tiempo estimado:** 2 horas
**Prioridad:** MEDIA

#### Problema identificado:
```json
// vercel.json
"script-src 'self' 'unsafe-inline' 'unsafe-eval' ..."
```

`unsafe-eval` es un riesgo de seguridad (permite eval(), XSS más fácil).

#### Paso 1: Verificar si unsafe-eval es necesario

```bash
# Buscar uso de eval() en el código
grep -r "eval(" src/ --include="*.ts" --include="*.tsx" --include="*.js"

# Resultado esperado: ninguno o muy pocos
```

#### Paso 2: Implementar nonce-based CSP

**Actualizar `vercel.json`:**

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'nonce-{{nonce}}' https://js.stripe.com https://cdn.vercel-insights.com https://va.vercel-scripts.com; connect-src 'self' https://*.supabase.co https://api.stripe.com https://eu.i.posthog.com https://*.sentry.io; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; frame-src https://js.stripe.com; object-src 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests"
        }
      ]
    }
  ]
}
```

**NOTA:** Next.js no soporta nonces dinámicos en Pages Router fácilmente. Alternativa:

#### Paso 3: Alternativa - Usar hash-based CSP

```bash
# Generar hash de scripts inline
echo -n "console.log('test')" | openssl dgst -sha256 -binary | openssl base64

# Resultado: sha256-abc123...
```

Agregar a CSP:
```json
"script-src 'self' 'sha256-abc123...' https://js.stripe.com ..."
```

#### Paso 4: Opción pragmática - Remover unsafe-eval

Si no se usa eval(), simplemente remover:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline' https://js.stripe.com https://cdn.vercel-insights.com https://va.vercel-scripts.com https://eu.i.posthog.com; connect-src 'self' https://*.supabase.co https://api.stripe.com https://eu.i.posthog.com https://*.sentry.io; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; frame-src https://js.stripe.com; object-src 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests"
        }
      ]
    }
  ]
}
```

**Removido:** `'unsafe-eval'`

#### Paso 5: Validar que no rompe nada

```bash
# Deploy
git add vercel.json
git commit -m "security: improve CSP headers (remove unsafe-eval)"
git push

vercel --prod

# Probar en navegador
# Abrir https://kolink.es
# Abrir DevTools → Console
# Verificar que no hay errores de CSP
```

#### Paso 6: Verificar CSP en SecurityHeaders.com

```bash
# Verificar configuración
curl -I https://kolink.es | grep -i content-security-policy
```

O usar: https://securityheaders.com/?q=kolink.es

**Esperado:** Grade A o B (sin unsafe-eval)

#### Checklist Tarea 5.4:
- [ ] Verificado que no se usa eval()
- [ ] `unsafe-eval` removido de CSP
- [ ] Deployment exitoso
- [ ] No hay errores de CSP en consola
- [ ] Site funciona correctamente
- [ ] SecurityHeaders.com muestra Grade A/B

---

### TAREA 5.5: Optimizar Imágenes con next/image
**Tiempo estimado:** 1.5 horas
**Prioridad:** BAJA

#### Problema identificado:
No se usa `next/image` para optimización automática.

#### Paso 1: Buscar imágenes en el código

```bash
# Buscar tags <img>
grep -r "<img" src/ --include="*.tsx" --include="*.jsx"

# Resultado (ejemplo):
# src/pages/index.tsx:  <img src="/hero.png" alt="Hero" />
# src/components/Navbar.tsx:  <img src="/logo.svg" alt="Logo" />
```

#### Paso 2: Reemplazar con next/image

**Antes:**
```tsx
// src/pages/index.tsx
<img
  src="/hero.png"
  alt="Hero image"
  width="800"
  height="600"
/>
```

**Después:**
```tsx
import Image from 'next/image';

<Image
  src="/hero.png"
  alt="Hero image"
  width={800}
  height={600}
  priority // Para hero images (LCP)
  quality={90}
/>
```

#### Paso 3: Configurar dominios externos (si aplica)

```javascript
// next.config.js
module.exports = {
  images: {
    domains: [
      'images.unsplash.com',
      'avatars.githubusercontent.com',
      // Agregar otros dominios si es necesario
    ],
    formats: ['image/avif', 'image/webp'],
  },
}
```

#### Paso 4: Optimizar imágenes estáticas

```bash
# Instalar imagemin (opcional)
npm install --save-dev imagemin imagemin-mozjpeg imagemin-pngquant

# Comprimir imágenes en public/
# Manualmente o con script
```

#### Paso 5: Usar placeholders

```tsx
<Image
  src="/hero.png"
  alt="Hero"
  width={800}
  height={600}
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRg..." // Generar con plaiceholder
/>
```

#### Paso 6: Validar mejoras de rendimiento

```bash
# Antes y después, medir con Lighthouse
npm run build
npm start

# Abrir http://localhost:3000
# DevTools → Lighthouse → Run
# Comparar Performance score
```

**Esperado:**
- Performance score +5-10 puntos
- LCP (Largest Contentful Paint) mejorado
- CLS (Cumulative Layout Shift) = 0

#### Checklist Tarea 5.5:
- [ ] Imágenes identificadas (lista completa)
- [ ] `<img>` reemplazados con `<Image>`
- [ ] Dominios externos configurados (si aplica)
- [ ] `priority` agregado a hero images
- [ ] Build exitoso
- [ ] Performance score mejorado (Lighthouse)

---

## ✅ CHECKLIST FINAL DEL SPRINT 5

### Dependencias
- [ ] `npm audit` ejecutado
- [ ] Vulnerabilidades críticas/altas resueltas
- [ ] Build y tests pasando
- [ ] Deploy exitoso

### Logger
- [ ] Console.log reemplazado en 5+ archivos críticos
- [ ] ESLint configurado
- [ ] 0 console statements en producción
- [ ] Logs estructurados en Vercel

### Emails
- [ ] Templates probados
- [ ] Validados en Gmail, Outlook, Apple Mail
- [ ] Links y botones funcionan
- [ ] Responsive en mobile

### CSP
- [ ] `unsafe-eval` removido (si es posible)
- [ ] No hay errores de CSP en consola
- [ ] SecurityHeaders.com Grade A/B

### Imágenes
- [ ] `next/image` implementado
- [ ] Performance score mejorado
- [ ] LCP mejorado

---

## 🚨 CRITERIOS DE ÉXITO

Este sprint se considera exitoso cuando:

1. ✅ 0 vulnerabilidades críticas/altas
2. ✅ Logger centralizado en producción
3. ✅ Emails validados en 3+ clientes
4. ✅ CSP sin `unsafe-eval` (si es posible)
5. ✅ Performance score mejorado

---

## 📊 MÉTRICAS

- **Vulnerabilidades resueltas:** 3/3
- **Console.log removidos:** 40+
- **Emails validados:** 2 templates
- **CSP score:** A/B
- **Performance improvement:** +5-10 puntos

---

## 🆘 TROUBLESHOOTING

### Problema: npm audit fix rompe el build

**Solución:**
```bash
# Revertir cambios
git checkout -- package.json package-lock.json

# Actualizar manualmente una a una
npm install PACKAGE@latest

# Probar después de cada una
npm run build
```

### Problema: CSP rompe Stripe/PostHog

**Solución:**
Verificar que los dominios están en `script-src` y `connect-src`:
```json
"script-src 'self' 'unsafe-inline' https://js.stripe.com https://eu.i.posthog.com"
"connect-src 'self' https://api.stripe.com https://eu.i.posthog.com"
```

---

## 📞 RECURSOS

- **npm audit docs:** https://docs.npmjs.com/cli/v10/commands/npm-audit
- **CSP Evaluator:** https://csp-evaluator.withgoogle.com/
- **SecurityHeaders.com:** https://securityheaders.com/
- **Next.js Image docs:** https://nextjs.org/docs/pages/api-reference/components/image

---

## 🎯 PRÓXIMO SPRINT

Una vez completado este sprint exitosamente, proceder con:
**[SPRINT 6: TESTING COMPLETO](./SPRINT_6_TESTING.md)**

---

**Creado:** 2025-11-05
**Última actualización:** 2025-11-05
**Sprint Owner:** Equipo Kolink
