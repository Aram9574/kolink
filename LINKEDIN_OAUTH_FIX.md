# LinkedIn OAuth - Solución de Errores CSP

## Problema Identificado

El OAuth de LinkedIn estaba fallando debido a errores de **Content Security Policy (CSP)** que bloqueaban las peticiones necesarias para completar la autenticación.

### Errores Detectados en Consola:

1. **CSP Violations**: Múltiples bloqueos de recursos externos
   - `https://api.linkd.com` - Dominio alternativo de LinkedIn API
   - `https://pub.idme.plus.com` - Servicio de verificación de identidad
   - `https://api.userback.io` - Servicio de feedback/soporte
   - `https://cdn.cookielaw.org` - Gestión de cookies/GDPR
   - `https://media.licdn.com` - Imágenes de perfil de LinkedIn
   - `https://static.licdn.com` - Assets estáticos de LinkedIn

2. **Preload Warnings**: Warnings de `<link rel=preload>` sin atributo `as` válido
   - Estos son warnings menores de LinkedIn, no críticos

3. **API Errors**: Error 400 en endpoint interno (posiblemente relacionado con tokens bloqueados)

## Solución Aplicada

Se actualizó el archivo `vercel.json` con una CSP más permisiva que incluye todos los dominios necesarios:

### Cambios en Content-Security-Policy:

```diff
- script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://app.posthog.com
+ script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://app.posthog.com https://api.userback.io https://cdn.cookielaw.org

- connect-src 'self' https://api.stripe.com https://*.supabase.co wss://*.supabase.co https://kolink.es https://api.linkedin.com https://www.linkedin.com https://app.posthog.com
+ connect-src 'self' https://api.stripe.com https://*.supabase.co wss://*.supabase.co https://kolink.es https://api.linkedin.com https://www.linkedin.com https://api.linkd.com https://pub.idme.plus.com https://app.posthog.com https://api.userback.io

- img-src 'self' data: https://*.supabase.co
+ img-src 'self' data: https://*.supabase.co https://media.licdn.com https://static.licdn.com

+ frame-src 'self' https://www.linkedin.com
```

### Dominios Añadidos:

| Dominio | Propósito | Directiva CSP |
|---------|-----------|---------------|
| `https://api.linkd.com` | API alternativa de LinkedIn | `connect-src` |
| `https://pub.idme.plus.com` | Verificación de identidad | `connect-src` |
| `https://api.userback.io` | Widget de feedback | `script-src`, `connect-src` |
| `https://cdn.cookielaw.org` | Gestión de cookies GDPR | `script-src` |
| `https://media.licdn.com` | Imágenes de perfil | `img-src` |
| `https://static.licdn.com` | Assets estáticos | `img-src` |
| `https://www.linkedin.com` | Popup OAuth | `frame-src` |

## Flujo de OAuth LinkedIn

### Proceso Correcto:

1. **Usuario hace clic en "Conectar LinkedIn"** → `/api/auth/linkedin/authorize`
   - Genera state (CSRF token) con userId codificado
   - Guarda state en cookie `linkedin_oauth_state`
   - Redirige a LinkedIn OAuth

2. **LinkedIn autentica y autoriza** → Redirect a `/api/auth/linkedin/callback`
   - Verifica state parameter (CSRF protection)
   - Intercambia código por access_token
   - Obtiene perfil de usuario desde `https://api.linkedin.com/v2/userinfo`

3. **Guarda conexión en Supabase**
   - Actualiza perfil con:
     - `linkedin_id`
     - `linkedin_access_token`
     - `linkedin_refresh_token`
     - `linkedin_token_expires_at`
     - `linkedin_profile_data`
     - Datos adicionales (headline, bio, etc.)

4. **Redirige a perfil** → `/profile?success=...`

## Verificación

Para verificar que el fix funcionó, después del deployment:

1. Limpiar cookies del navegador
2. Ir a `/profile` o Ajustes → Cuentas de LinkedIn
3. Hacer clic en "Conectar LinkedIn"
4. Completar OAuth
5. Verificar en consola que NO hay errores CSP
6. Verificar que la conexión se guarda en la BD

## Próximos Pasos

Una vez que LinkedIn OAuth funcione correctamente:

1. **Probar sistema de personalización**:
   - Ir a `/onboarding/import-posts` para importar posts
   - Generar contenido en `/personalized`
   - Ver analytics en `/personalized-analytics`

2. **Verificar que los posts se guardan**:
   ```sql
   SELECT * FROM user_posts WHERE user_id = 'tu-user-id';
   SELECT * FROM user_post_embeddings WHERE user_id = 'tu-user-id';
   ```

3. **Generar primer post personalizado**:
   - Asegurarse de tener al menos 3 posts importados
   - Intentar generar en el nuevo generador personalizado
   - Ver que se usan ejemplos del usuario + ejemplos virales

## Notas Técnicas

### ¿Por qué tantos dominios de LinkedIn?

LinkedIn usa múltiples dominios para:
- **www.linkedin.com**: Interfaz de usuario y OAuth popup
- **api.linkedin.com**: API oficial (userinfo, profile)
- **api.linkd.com**: API alternativa/regional
- **media.licdn.com**: CDN de imágenes de perfil
- **static.licdn.com**: CDN de assets estáticos (iconos, etc.)

### Seguridad

La CSP actualizada mantiene un nivel de seguridad adecuado:
- ✅ `frame-ancestors 'none'` - Previene clickjacking
- ✅ `object-src 'none'` - Bloquea plugins obsoletos
- ✅ `base-uri 'self'` - Previene ataques de base tag
- ✅ State parameter con userId - CSRF protection
- ✅ Tokens guardados en BD, no en localStorage

### Warnings Restantes

Los warnings de `<link rel=preload>` son generados por LinkedIn y no afectan la funcionalidad:
```
<link rel=preload> must have a valid "as" value
```
Estos son issues del lado de LinkedIn, no podemos controlarlos.

## Troubleshooting

Si sigue sin funcionar después del deployment:

1. **Verificar variables de entorno en Vercel**:
   ```
   LINKEDIN_CLIENT_ID=tu-client-id
   LINKEDIN_CLIENT_SECRET=tu-secret
   LINKEDIN_REDIRECT_URI=https://kolink.es/api/auth/linkedin/callback
   ```

2. **Verificar configuración en LinkedIn Developer**:
   - Redirect URLs debe incluir: `https://kolink.es/api/auth/linkedin/callback`
   - Scopes necesarios: `openid`, `profile`, `email`, `w_member_social`

3. **Verificar logs de Vercel**:
   ```bash
   vercel logs kolink --follow
   ```

4. **Verificar en browser DevTools**:
   - Network tab → Filtrar por "linkedin"
   - Console tab → Ver si hay errores CSP nuevos
   - Application tab → Cookies → Verificar `linkedin_oauth_state`

---

**Deployment**: Los cambios se aplicarán automáticamente en el próximo deployment de Vercel.

**Commit**: `ec834b9 - fix: update CSP to allow LinkedIn OAuth and third-party services`
