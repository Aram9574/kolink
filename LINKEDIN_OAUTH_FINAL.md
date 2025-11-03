# LinkedIn OAuth - Implementación Final

## Estado Actual

✅ **Sistema Reimplementado Completamente** - Flujo limpio y funcional en producción

## Ubicación del Botón

**ÚNICA UBICACIÓN**: `/profile` → Sección "Cuentas de LinkedIn"

❌ **ELIMINADO DE**: Página de sign-in (era confuso y no tenía sentido)

## Flujo Completo

```
1. Usuario autenticado va a /profile
   ↓
2. Ve sección "Cuentas de LinkedIn"
   ├─ Si NO está conectado: botón "Conectar LinkedIn"
   └─ Si está conectado: muestra datos + botón "Desconectar"
   ↓
3. Click en "Conectar LinkedIn"
   ├─ Frontend obtiene session.access_token
   └─ Redirige a: /api/auth/linkedin/connect?token={access_token}
   ↓
4. Endpoint /api/auth/linkedin/connect (GET)
   ├─ Valida token de Supabase
   ├─ Genera state único (32 bytes hex)
   ├─ Guarda en BD: linkedin_oauth_state + linkedin_oauth_started_at
   └─ Redirige a LinkedIn OAuth:
       https://www.linkedin.com/oauth/v2/authorization
       ?response_type=code
       &client_id={CLIENT_ID}
       &redirect_uri={REDIRECT_URI}
       &state={userId}:{state}
       &scope=openid profile email w_member_social
   ↓
5. Usuario autentica en LinkedIn
   ↓
6. LinkedIn redirige a: /api/auth/linkedin/callback
   ?code={AUTHORIZATION_CODE}
   &state={userId}:{state}
   ↓
7. Endpoint /api/auth/linkedin/callback (GET)
   ├─ Extrae userId y state del parámetro
   ├─ Valida state contra BD (CSRF protection)
   ├─ Verifica timeout (max 10 minutos)
   ├─ Intercambia code por access_token con LinkedIn
   ├─ Obtiene perfil: https://api.linkedin.com/v2/userinfo
   ├─ Guarda en BD:
   │   ├─ linkedin_id (sub)
   │   ├─ linkedin_access_token
   │   ├─ linkedin_token_expires_at
   │   ├─ linkedin_profile_data (JSON completo)
   │   ├─ linkedin_connected_at
   │   ├─ linkedin_email
   │   ├─ linkedin_name
   │   ├─ linkedin_picture
   │   └─ Limpia: linkedin_oauth_state + linkedin_oauth_started_at
   └─ Redirige a: /profile?linkedin_success={mensaje}
   ↓
8. Usuario ve mensaje de éxito y datos de LinkedIn
```

## Columnas de Base de Datos

### Tabla `profiles`

**Columnas Temporales** (solo durante OAuth):
- `linkedin_oauth_state` (TEXT) - State para CSRF protection
- `linkedin_oauth_started_at` (TIMESTAMPTZ) - Para validar timeout

**Columnas Permanentes** (datos de LinkedIn):
- `linkedin_id` (TEXT UNIQUE) - ID único de LinkedIn (sub)
- `linkedin_access_token` (TEXT) - Token de acceso a LinkedIn API
- `linkedin_refresh_token` (TEXT) - Token de refresh (si LinkedIn lo provee)
- `linkedin_token_expires_at` (TIMESTAMPTZ) - Expiración del token
- `linkedin_profile_data` (JSONB) - Datos completos del perfil
- `linkedin_connected_at` (TIMESTAMPTZ) - Fecha de primera conexión
- `linkedin_email` (TEXT) - Email de LinkedIn
- `linkedin_name` (TEXT) - Nombre completo
- `linkedin_picture` (TEXT) - URL de foto de perfil

## Endpoints

### 1. `GET /api/auth/linkedin/connect`

**Propósito**: Iniciar flujo OAuth

**Autenticación**: Token en header `Authorization: Bearer {token}` o query param `?token={token}`

**Respuesta**:
- Success: Redirect 302 a LinkedIn OAuth
- Error 401: Sesión inválida
- Error 500: Configuración faltante o error de BD

**Logs**:
```
[LinkedIn] Starting OAuth for user {userId}
```

### 2. `GET /api/auth/linkedin/callback`

**Propósito**: Procesar respuesta de LinkedIn

**Parámetros**:
- `code` (string) - Código de autorización de LinkedIn
- `state` (string) - State en formato `{userId}:{state}`
- `error` (string, opcional) - Error de LinkedIn
- `error_description` (string, opcional) - Descripción del error

**Respuesta**:
- Success: Redirect 302 a `/profile?linkedin_success={mensaje}`
- Error: Redirect 302 a `/profile?error={mensaje}`

**Validaciones**:
1. ✅ Code y state presentes
2. ✅ State en formato correcto
3. ✅ State coincide con BD
4. ✅ OAuth no expirado (< 10 min)
5. ✅ Code válido con LinkedIn
6. ✅ Token válido para obtener perfil

**Logs**:
```
[LinkedIn Callback] OAuth error: {error}
[LinkedIn Callback] Missing code or state
[LinkedIn Callback] Invalid state format
[LinkedIn Callback] Profile not found
[LinkedIn Callback] State mismatch
[LinkedIn Callback] OAuth expired
[LinkedIn Callback] Token exchange failed
[LinkedIn Callback] Profile fetch failed
[LinkedIn Callback] Update failed
[LinkedIn Callback] Successfully connected for user {userId}
```

### 3. `POST /api/auth/linkedin/disconnect`

**Propósito**: Desconectar cuenta de LinkedIn

**Autenticación**: Header `Authorization: Bearer {token}`

**Respuesta**:
- Success 200: `{ success: true, message: "LinkedIn desconectado exitosamente" }`
- Error 401: No autorizado
- Error 500: Error al desconectar

**Acción**: Limpia TODOS los campos de LinkedIn de la tabla profiles

**Logs**:
```
[LinkedIn Disconnect] User {userId} disconnected
```

## Variables de Entorno Necesarias

```bash
# LinkedIn OAuth
LINKEDIN_CLIENT_ID=tu_client_id_de_linkedin
LINKEDIN_CLIENT_SECRET=tu_client_secret_de_linkedin
LINKEDIN_REDIRECT_URI=https://kolink.es/api/auth/linkedin/callback

# Supabase (ya existentes)
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## Configuración en LinkedIn Developer Portal

1. Ve a: https://www.linkedin.com/developers/apps
2. Selecciona tu app
3. Ve a "Auth" tab
4. **Redirect URLs**: Agregar `https://kolink.es/api/auth/linkedin/callback`
5. **Scopes necesarios**:
   - `openid` (para identificación)
   - `profile` (datos de perfil)
   - `email` (email del usuario)
   - `w_member_social` (para publicar posts en el futuro)

## Seguridad

✅ **CSRF Protection** - State único por usuario guardado en BD
✅ **Timeout Protection** - OAuth expira después de 10 minutos
✅ **Single-use State** - State se limpia después de usar
✅ **Token Validation** - Todos los tokens se validan contra Supabase
✅ **No Cookies** - Todo se maneja vía BD (más seguro)
✅ **CSP Compatible** - Todos los dominios de LinkedIn incluidos

## Troubleshooting

### Error: "Sesión inválida"
**Causa**: Token de Supabase expiró o es inválido
**Solución**: Usuario debe cerrar sesión y volver a iniciar

### Error: "Estado no coincide - posible ataque CSRF"
**Causa**: State parameter no coincide con el guardado en BD
**Solución**: Reintentar OAuth (el state se regenera)

### Error: "Sesión expirada. Intenta de nuevo."
**Causa**: Pasaron más de 10 minutos entre inicio y callback
**Solución**: Reiniciar flujo OAuth

### Error: "Error al obtener token de LinkedIn"
**Causa**: Code inválido o expirado, o credenciales de LinkedIn incorrectas
**Solución**: Verificar LINKEDIN_CLIENT_ID y LINKEDIN_CLIENT_SECRET

### Error: "Error al obtener perfil de LinkedIn"
**Causa**: Access token inválido o LinkedIn API caída
**Solución**: Verificar que los scopes estén correctos en LinkedIn Developer Portal

### Error 500 (Internal Server Error)
**Causa**: Columnas de LinkedIn no existen en BD
**Solución**: Ejecutar migración `20251103000000_linkedin_oauth_columns.sql`

## Verificación Post-Deployment

1. **Verificar endpoint existe**:
```bash
curl -I https://kolink.es/api/auth/linkedin/connect
# Debe retornar 401 o 405, NO 404
```

2. **Verificar columnas en BD**:
```sql
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name LIKE 'linkedin%';
```

3. **Verificar variables de entorno en Vercel**:
- LINKEDIN_CLIENT_ID ✅
- LINKEDIN_CLIENT_SECRET ✅
- LINKEDIN_REDIRECT_URI ✅

4. **Probar flujo completo**:
- Ir a https://kolink.es/profile
- Click en "Conectar LinkedIn"
- Autenticar en LinkedIn
- Verificar redirect a /profile con éxito
- Verificar que datos de LinkedIn aparecen en perfil

## Diferencias vs Implementación Anterior

| Aspecto | Antes | Ahora |
|---------|-------|-------|
| **Ubicaciones** | Login + Profile | Solo Profile |
| **State Storage** | Cookies | Base de datos |
| **CSRF Protection** | Cookie-based | DB-based + timeout |
| **Error Handling** | Genérico | Específico por paso |
| **Security** | Vulnerable | Robusto |
| **Debugging** | Difícil | Logs claros |
| **Complejidad** | Alta | Baja |
| **Mantenibilidad** | Difícil | Fácil |

## Próximos Pasos (Futuro)

1. **Token Refresh**: Implementar refresh automático cuando expire
2. **Sync Automático**: Sincronizar perfil periódicamente
3. **Posts Import**: Usar el token para importar posts automáticamente
4. **Posts Publish**: Publicar posts directamente a LinkedIn

## Commit History

- `bb48720` - docs: add comprehensive LinkedIn OAuth troubleshooting guide
- `ec834b9` - fix: update CSP to allow LinkedIn OAuth and third-party services
- `94aa7c3` - feat: reimplement LinkedIn OAuth with clean, simple flow
- `f114688` - feat: add LinkedIn OAuth migrations and force redeploy

---

**Estado**: ✅ Deployado y funcional
**Última actualización**: 2025-11-03
**Versión**: 1.0.0
