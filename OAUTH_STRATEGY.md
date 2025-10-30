# 🔐 OAuth Strategy - Kolink

**Fecha:** 29 de Octubre, 2025
**Decisión:** Supabase Auth maneja toda la autenticación OAuth

---

## 📋 Decisión Estratégica

**LinkedIn OAuth (y otros proveedores) será manejado exclusivamente por Supabase Auth.**

### ✅ Ventajas de esta Estrategia

1. **Seguridad mejorada** - Supabase maneja tokens, refresh tokens y expiración
2. **Menos código custom** - No necesitamos implementar OAuth flow manualmente
3. **Mantenimiento simplificado** - Supabase actualiza sus librerías automáticamente
4. **Soporte multi-provider** - Fácil agregar Google, GitHub, Twitter, etc.
5. **Session management** - Supabase maneja sesiones de forma segura

---

## 🚀 Proveedores de OAuth Disponibles (vía Supabase)

### Inmediatos (Sin aprobación requerida):
- ✅ **Email/Password** (ya implementado)
- ✅ **Google** (fácil configuración)
- ✅ **GitHub** (fácil configuración)

### Con Aprobación/Setup:
- 🔄 **LinkedIn** (requiere LinkedIn Developer App)
- 🔄 **Twitter/X** (requiere developer account)
- 🔄 **Facebook** (requiere app review)

---

## 📖 Implementación con Supabase Auth

### Paso 1: Configurar Provider en Supabase Dashboard

1. Ve a Supabase Dashboard → Authentication → Providers
2. Selecciona el provider (ej: Google)
3. Habilita el provider
4. Agrega Client ID y Client Secret del provider
5. Configura Redirect URL (provista por Supabase)

### Paso 2: Implementar en Frontend

```typescript
import { supabaseClient } from "@/lib/supabaseClient";

// Sign in with OAuth provider
async function signInWithProvider(provider: "google" | "github" | "linkedin") {
  const { data, error } = await supabaseClient.auth.signInWithOAuth({
    provider: provider,
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) {
    console.error("OAuth error:", error);
    return;
  }

  // Supabase handles redirect
}
```

### Paso 3: Callback Handler

Ya existe en `src/pages/_app.tsx` con:

```typescript
useEffect(() => {
  supabaseClient.auth.onAuthStateChange((event, newSession) => {
    setSession(newSession);
    setUser(newSession?.user || null);
    setLoading(false);

    if (newSession?.user) {
      // User authenticated via OAuth or email
      identifyUser(newSession.user.id, {
        email: newSession.user.email,
        created_at: newSession.user.created_at,
      });
    }
  });
}, []);
```

---

## 🗑️ Código Eliminado

### Archivos Removidos:
- ❌ `src/pages/api/export/linkedin.ts` - Endpoint dummy de LinkedIn
- ❌ `src/lib/posthog.ts` - Referencias a `linkedinConnected` event

### Código Actualizado:
- ✅ `src/lib/posthog.ts` - Auth methods ahora son: `email | google | github`

---

## 🔑 Columnas de Base de Datos para OAuth

Las columnas `linkedin_access_token` y `linkedin_refresh_token` en la tabla `profiles` **SE MANTIENEN** para futuro uso cuando se integre LinkedIn OAuth vía Supabase.

**Propósito:**
- Guardar tokens adicionales de LinkedIn para API calls directos (ej: post publishing)
- Supabase maneja autenticación, pero podemos necesitar tokens para APIs específicas

**Nota:** Estos tokens serán encriptados con las funciones `encrypt_token()` y `decrypt_token()` ya implementadas.

---

## 📝 Próximos Pasos para OAuth

### 1. Configurar Google OAuth (Prioritario)
**Tiempo:** 30 minutos

1. Crear Google Cloud Project
2. Habilitar Google OAuth en Supabase
3. Agregar botón "Continue with Google" en signin/signup
4. Probar flujo completo

### 2. Configurar GitHub OAuth (Opcional)
**Tiempo:** 20 minutos

1. Crear GitHub OAuth App
2. Habilitar GitHub en Supabase
3. Agregar botón "Continue with GitHub"
4. Probar flujo completo

### 3. LinkedIn OAuth (Futuro)
**Tiempo:** 2-3 horas (incluye aprobación de LinkedIn)

1. Crear LinkedIn Developer App
2. Solicitar permisos necesarios (puede tomar días)
3. Habilitar LinkedIn en Supabase
4. Implementar UI
5. Implementar guardado de tokens para posting

---

## 🎯 Recomendación

**Para V1.0:**
- ✅ Implementar Google OAuth (alta prioridad - mejora conversión)
- ✅ Implementar GitHub OAuth (opcional - audiencia técnica)
- ❌ LinkedIn OAuth puede esperar a V1.1 (requiere más tiempo de setup)

**Email/Password ya es suficiente para lanzamiento.**

---

## 📚 Referencias

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Supabase OAuth Providers](https://supabase.com/docs/guides/auth/social-login)
- [LinkedIn OAuth 2.0](https://learn.microsoft.com/en-us/linkedin/shared/authentication/authentication)
- [Google OAuth Setup](https://console.cloud.google.com/apis/credentials)
- [GitHub OAuth Apps](https://github.com/settings/developers)

---

**Decisión Final:** OAuth custom eliminado. Supabase Auth es la única fuente de autenticación. ✅
