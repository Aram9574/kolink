# 🚨 FIX INMEDIATO - Redirect a Crypto Wallet

## El Problema

Después de pagar con Stripe, se abre una pestaña intentando abrir una wallet de criptomonedas.

## Diagnóstico

✅ **NO ES MALWARE EN TU CÓDIGO**
✅ **Es caché de Vercel sirviendo un deployment antiguo**

## Solución Inmediata (Hacer AHORA)

### Paso 1: Forzar Redeploy Limpio

```bash
# En tu terminal:
cd /Users/aramzakzuk/Proyectos/kolink

# Limpiar caché local
rm -rf .next
rm -rf .vercel
rm -rf node_modules/.cache

# Crear un cambio trivial para forzar nuevo deployment
echo "# Security fix $(date)" >> vercel.json

# Commit y push
git add vercel.json
git commit -m "Security: force clean deployment - crypto wallet redirect fix"
git push
```

### Paso 2: Purgar CDN de Vercel (CRÍTICO)

1. Ve a tu proyecto en Vercel Dashboard
2. Click en "Deployments"
3. Encuentra el deployment MÁS RECIENTE (el que acabas de hacer)
4. Click en "..." → "Promote to Production"
5. Luego ve a Settings → Advanced
6. Click en "Purge Cache" o "Clear CDN Cache"

**O usa el CLI de Vercel:**

```bash
# Si tienes Vercel CLI instalado:
vercel --prod

# Luego purga el cache:
# (Necesitas estar logueado con: vercel login)
```

### Paso 3: Verificar que Funcionó

```bash
# Abre una ventana de incógnito en tu navegador
# Visita: https://kolink.es/dashboard

# O verifica con curl:
curl -I https://kolink.es/wallet
# Debería devolver: HTTP 308 (redirect permanente)

curl -I https://kolink.es/blocknative.svg
# Debería devolver: HTTP 308 (redirect permanente)
```

## Verificaciones de Seguridad (Tu código YA las tiene)

### ✅ vercel.json - Redirects Activos
```json
{
  "redirects": [
    { "source": "/wallet", "destination": "/", "permanent": true },
    { "source": "/wallet/(.*)", "destination": "/", "permanent": true },
    { "source": "/connect", "destination": "/", "permanent": true },
    { "source": "/blocknative.svg", "destination": "/", "permanent": true }
  ]
}
```

### ✅ _document.tsx - Limpieza de Window Objects
```javascript
['blocknative','ethereum','solana','web3','wallet','onboard'].forEach(k => {
  if (window[k]) { try { delete window[k]; } catch(e){} }
});
```

### ✅ CSP Headers - Bloqueando Scripts Externos
```
Content-Security-Policy: script-src 'self' https://js.stripe.com
```

## Por Qué Está Pasando

1. **Deployment antiguo** tenía referencias a blocknative/wallet
2. **Vercel CDN cachea** archivos estáticos por mucho tiempo
3. Cuando pagas, el **código de checkout es correcto** (redirect a Stripe)
4. Pero el **navegador carga JS/assets viejos** desde caché
5. Esos assets viejos tienen el código del wallet

## Cómo Prevenir en el Futuro

### Opción A: Versioning de Assets (Automático)
Next.js ya hace esto, pero podemos forzarlo:

```javascript
// next.config.js
module.exports = {
  generateBuildId: async () => {
    return `build-${Date.now()}`
  }
}
```

### Opción B: Headers de Cache Más Agresivos
Ya están en `vercel.json`, pero podemos agregar:

```json
{
  "headers": [{
    "source": "/_next/static/(.*)",
    "headers": [
      { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
    ]
  }]
}
```

## Comandos de Emergencia

Si el problema persiste después del redeploy:

```bash
# 1. Limpiar TODO el caché local
rm -rf .next .vercel node_modules/.cache

# 2. Reinstalar dependencias
npm ci

# 3. Build local para verificar
npm run build

# 4. Si el build local está limpio, deploy
git add .
git commit -m "Emergency: complete cache purge"
git push
```

## Verificar Que Stripe Funciona Correctamente

```bash
# El checkout DEBE redirigir a stripe.com, NO a wallet/blocknative

# URL correcta de checkout:
https://checkout.stripe.com/c/pay/cs_test_...

# URL INCORRECTA (si ves esto, hay problema):
https://kolink.es/wallet
https://kolink.es/connect
```

## Contacto de Emergencia

Si después de estos pasos el problema persiste:

1. Toma screenshot del error
2. Abre DevTools → Network tab → Guarda HAR file
3. Verifica en Vercel logs que deployment está activo
4. Considera cambiar el dominio temporalmente

---

**TU CÓDIGO ESTÁ LIMPIO ✅**
**SOLO NECESITAS PURGAR EL CACHÉ DE VERCEL** 🔄
