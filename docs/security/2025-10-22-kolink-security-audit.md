# Auditoría de seguridad — limpieza de rutas maliciosas
**Proyecto:** KOLINK  
**Fecha:** 2025-10-22  
**Autor:** Comet IA / Alejandro (operador)  
**Resumen:** Se identificó una versión antigua del deployment que servía un modal de "Connect Wallet" (assets externos: blocknative / hm.baidu). Se aplicaron medidas de mitigación, hardening y verificación. Resultado: ✅ PRODUCTION limpio y CSP activo.

---

## 1. Acciones realizadas

1. **vercel.json** añadido/actualizado con:
   - Redirects permanentes que redirigen rutas peligrosas al `/`:
     - `/wallet`, `/wallet/*`
     - `/connect`, `/connect/*`
     - `/blocknative.svg`, `/blocknative/*`
   - Headers de seguridad aplicados a todas las rutas:
     - `X-Frame-Options: DENY`
     - `Referrer-Policy: no-referrer`
     - `X-Content-Type-Options: nosniff`
     - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
     - `Permissions-Policy: geolocation=(), microphone=()`
     - `Content-Security-Policy`: restrictiva (solo `self`, `https://*.vercel.app`, `https://js.stripe.com`, `https://*.supabase.co`)

2. **pages/_document.tsx** añadido/actualizado con un snippet preventivo que intenta borrar variables globales inyectadas por wallets (`blocknative`, `ethereum`, `web3`, `wallet`, `onboard`).

3. Limpieza de artefactos y purge CDN en Vercel:
   - `.next`, `.vercel`, cache locales borrados antes de build.
   - Purge CDN en Vercel con las rutas:
     ```
     /wallet,/wallet/*,/blocknative,/blocknative.svg,/blocknative/*,/connect,/connect/*,/_connect,/_wallet,/_next/static/*,/_next/static/chunks/*,/_next/static/media/*,/public/*,/assets/*,/images/*,/icons/*,/favicon.ico
     ```

4. Redeploy forzado del build limpio y promoción del deployment seguro a producción (`kolink-gamma.vercel.app` es el dominio de producción actual).

---

## 2. Resultado de la verificación (resumen)

- **Deployment promovido:** AWwLcoyru — commit: `Security: remove rogue routes and add strict CSP`
- **Dominio de producción principal:** `https://kolink-gamma.vercel.app`
- **Rutas maliciosas:** redirigidas permanentemente a `/` (HTTP 308)
- **CSP:** aplicada y en efecto; bloquea inyecciones de `blocknative` y `hm.baidu`
- **CDN:** purgado
- **Webhooks de Stripe:** apuntan a `https://kolink-gamma.vercel.app/api/webhook` y muestran 0% de errores
- **Estado final:** PASS — producción limpia

---

## 3. Archivos claves en repo

- `/vercel.json` — redirects + headers de seguridad
- `/pages/_document.tsx` — limpieza de variables globales en cliente
- `/docs/security/2025-10-22-kolink-security-audit.md` — este documento (auditoría)

---

## 4. Cómo reproducir la verificación (comandos)

Desde una terminal o CI (recomendado ejecutar como usuario con permisos de lectura):

```bash
# 1) Comprobar redirect en production actual
curl -I https://kolink-gamma.vercel.app/wallet

# 2) Comprobar redirect en alias principal si aplica
curl -I https://kolink.vercel.app/wallet

# 3) Comprobar que blocknative.svg no devuelve 200
curl -I https://kolink-gamma.vercel.app/blocknative.svg

# 4) Descargar HTML del dashboard y buscar indicadores
curl -s -D - "https://kolink-gamma.vercel.app/dashboard?status=success" -o /tmp/dashboard.html
grep -Ei "blocknative|baidu|hm.baidu|wallet|connect" /tmp/dashboard.html || true

# 5) Verificar headers de seguridad y cache
curl -I https://kolink-gamma.vercel.app/ | egrep -i "content-security-policy|x-frame-options|strict-transport-security|x-vercel-cache"
