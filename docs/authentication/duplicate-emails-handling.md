# Manejo de Emails Duplicados en Autenticación

## Overview

Kolink soporta múltiples métodos de autenticación:
- Email/contraseña (Supabase Auth)
- LinkedIn OAuth (vía Supabase Auth)

Este documento explica cómo se manejan los casos donde un usuario intenta registrarse con el mismo email usando diferentes métodos.

## Comportamiento de Supabase Auth

### Escenario 1: Mismo Proveedor (Duplicado Exacto)

**Ejemplo:** Usuario se registra con email, luego intenta registrarse nuevamente con el mismo email.

**Comportamiento:**
- Supabase Auth retorna error: "User already registered"
- No se crea cuenta duplicada
- Frontend muestra mensaje: "Este email ya está registrado"

**Código:**
```typescript
// signup.tsx
const { data, error } = await supabaseClient.auth.signUp({
  email,
  password,
});

if (error) {
  toast.error(error.message); // Muestra: "User already registered"
}
```

### Escenario 2: Diferentes Proveedores (Email + OAuth)

**Ejemplo:** Usuario se registra con email, luego intenta con LinkedIn usando el mismo email.

**Comportamiento (depende de configuración):**

#### Opción A: Account Linking Deshabilitado (Default)
- Supabase Auth retorna error
- No se vinculan las cuentas automáticamente
- Usuario debe usar método original de autenticación

#### Opción B: Account Linking Habilitado
- Supabase Auth vincula automáticamente las cuentas
- Usuario puede usar cualquier método para iniciar sesión
- Se mantiene un solo perfil en la base de datos

## Configuración Recomendada

### En Supabase Dashboard

1. Ir a **Authentication** > **Settings** > **Email Auth**
2. Configurar:
   - ✅ **Confirm email**: Habilitado (opcional, mejora seguridad)
   - ⚠️ **Allow Multiple Accounts per Email**: **DESHABILITADO** (recomendado)

3. Ir a **Authentication** > **Providers** > **LinkedIn**
4. Configurar:
   - ✅ **Skip email confirmation**: Habilitado (LinkedIn ya verifica emails)
   - ⚠️ **Link accounts automatically**: **HABILITADO** (vincular cuentas con mismo email)

### Ventajas de Account Linking

1. **Mejor UX**: Usuario puede cambiar de método sin crear cuenta nueva
2. **Datos únicos**: Un solo perfil por persona
3. **Flexibilidad**: Usuario elige su método preferido de login

### Desventajas

1. **Seguridad**: Si alguien tiene acceso a un email, puede vincular cuenta OAuth
2. **Complejidad**: Más difícil de debuggear

## Implementación en Kolink

### Manejo de Errores en Frontend

**signin.tsx:**
```typescript
const handleLinkedInLogin = async () => {
  const { error } = await supabaseClient.auth.signInWithOAuth({
    provider: "linkedin_oidc",
    options: {
      redirectTo: `${window.location.origin}/dashboard`,
    },
  });

  if (error) {
    // Error genérico - Supabase maneja duplicados internamente
    setError("No se pudo iniciar sesión con LinkedIn. Inténtalo de nuevo.");
  }
};
```

**signup.tsx:**
```typescript
const handleSignUpLinkedIn = async () => {
  const { error } = await supabaseClient.auth.signInWithOAuth({
    provider: "linkedin_oidc",
    options: {
      redirectTo: `${window.location.origin}/account-setup`,
    },
  });

  if (error) {
    // Si el email ya existe, Supabase decide qué hacer según configuración
    toast.error("No se pudo completar el inicio de sesión con LinkedIn. Inténtalo de nuevo.");
  }
};
```

### Creación Automática de Perfiles

Con el trigger `handle_new_user()`:
```sql
-- Si el usuario viene de LinkedIn OAuth, actualizar datos adicionales
IF NEW.raw_user_meta_data ? 'provider' AND
   NEW.raw_user_meta_data->>'provider' = 'linkedin_oidc' THEN

  UPDATE public.profiles
  SET
    linkedin_id = NEW.raw_user_meta_data->>'sub',
    headline = NEW.raw_user_meta_data->>'headline',
    bio = NEW.raw_user_meta_data->>'summary',
    linkedin_profile_url = NEW.raw_user_meta_data->>'profile_url',
    updated_at = NOW()
  WHERE id = NEW.id;
END IF;
```

## Testing del Flujo

### Test Case 1: Email Primero, LinkedIn Después

1. Registrarse con email: test@example.com
2. Verificar email (si está habilitado)
3. Cerrar sesión
4. Intentar registrarse con LinkedIn usando test@example.com

**Resultado esperado:**
- Con linking: Sesión iniciada, mismo perfil
- Sin linking: Error "Email already in use"

### Test Case 2: LinkedIn Primero, Email Después

1. Registrarse con LinkedIn usando work@company.com
2. Cerrar sesión
3. Intentar registrarse con email work@company.com

**Resultado esperado:**
- Error: "User already registered"
- Usuario debe usar LinkedIn para iniciar sesión

### Test Case 3: Mismo Método Dos Veces

1. Registrarse con email
2. Intentar registrarse nuevamente con mismo email

**Resultado esperado:**
- Error: "User already registered"

## Monitoreo y Logs

### PostHog Analytics

Tracking de eventos:
```typescript
analytics.trackEvent('auth_method_used', {
  method: 'linkedin_oidc',
  is_signup: true
});

analytics.trackEvent('auth_error', {
  method: 'linkedin_oidc',
  error_type: 'duplicate_email'
});
```

### Sentry Error Tracking

Los errores de autenticación se capturan automáticamente en Sentry.

## Recomendaciones

1. ✅ **Habilitar Account Linking** para mejor UX
2. ✅ **Usar trigger automático** para crear perfiles (ya implementado)
3. ✅ **Mostrar mensajes claros** cuando hay conflicto de email
4. ✅ **Logear eventos** para análisis de conversión
5. ⚠️ **Educar usuarios** sobre métodos de login disponibles

## Futuras Mejoras

- [ ] Mostrar en UI qué métodos de auth tiene vinculados un usuario
- [ ] Permitir desvincular cuentas OAuth desde perfil
- [ ] Enviar email cuando se vincula nueva cuenta
- [ ] Implementar "Sign in with LinkedIn" en signin (además de signup)
- [ ] Mostrar error específico si email ya existe con otro método

## Referencias

- [Supabase Auth Docs - Account Linking](https://supabase.com/docs/guides/auth/account-linking)
- [Supabase Auth Docs - OAuth](https://supabase.com/docs/guides/auth/social-login)
- LinkedIn OAuth: `docs/linkedin-oauth-migration.md`
