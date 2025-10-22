# Módulos 3 y 4 - Implementación Completa

## 📋 Resumen

Este documento describe la implementación de los Módulos 3 y 4 del proyecto Kolink:

- **Módulo 3:** Notificaciones y Recordatorios
- **Módulo 4:** Emails Transaccionales

---

## 🔔 Módulo 3 — Notificaciones y Recordatorios

### Objetivos Completados ✅

1. ✅ Integración de `NotificationContext.tsx` para gestión global de notificaciones
2. ✅ Sistema de toasts para guardado y autosave en dashboard
3. ✅ Recordatorio de créditos bajos cada 24h con localStorage
4. ✅ Sistema opcional de notificaciones en tiempo real con Supabase

### Archivos Creados

#### 1. NotificationContext (`src/contexts/NotificationContext.tsx`)

**Características:**
- Gestión centralizada de notificaciones en toda la app
- 4 tipos de notificaciones: success, error, info, warning
- Sistema de recordatorios de créditos con persistencia en localStorage
- Integración con Supabase Realtime para mensajes admin→usuario
- Prevención de fugas de memoria con cleanup apropiado

**API del Context:**
```typescript
interface NotificationContextType {
  notifySuccess: (message: string) => void;
  notifyError: (message: string) => void;
  notifyInfo: (message: string) => void;
  notifyWarning: (message: string) => void;
  checkCreditReminder: (credits: number) => void;
  setupRealtimeNotifications: (userId: string) => void;
  cleanupRealtimeNotifications: () => void;
}
```

**Uso:**
```typescript
import { useNotifications } from "@/contexts/NotificationContext";

const { notifySuccess, checkCreditReminder } = useNotifications();

// Mostrar notificación
notifySuccess("Contenido guardado");

// Verificar recordatorio de créditos
checkCreditReminder(5); // Muestra warning si < 10 créditos
```

#### 2. Integración en Dashboard (`src/pages/dashboard.tsx`)

**Mejoras implementadas:**
- Toast notifications reemplazando llamadas directas a `toast.*`
- Autosave con debounce (1 segundo) sin notificaciones molestas
- Recuperación de borradores con notificación informativa
- Recordatorio automático de créditos bajos al cargar perfil
- Setup/cleanup de notificaciones en tiempo real

**Características del autosave:**
- Debounce de 1 segundo para evitar guardados excesivos
- Cleanup apropiado del timeout al desmontar componente
- Indicador visual "Guardado automáticamente" en la UI
- Notificación solo al recuperar borrador

#### 3. Base de Datos - Admin Notifications

**Tabla:** `admin_notifications`
```sql
CREATE TABLE admin_notifications (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  message TEXT NOT NULL,
  type TEXT NOT NULL, -- 'info', 'warning', 'success', 'error'
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP,
  expires_at TIMESTAMP DEFAULT (now() + interval '7 days')
);
```

**SQL Migration:** `docs/database/admin_notifications_migration.sql`

**Funcionalidades:**
- RLS (Row Level Security) habilitado
- Usuarios solo leen sus propias notificaciones
- Auto-limpieza de notificaciones expiradas
- Realtime habilitado para notificaciones instantáneas
- Vista para contar notificaciones no leídas

### Sistema de Recordatorios

**Configuración:**
- `LOW_CREDIT_THRESHOLD`: 10 créditos
- `REMINDER_INTERVAL`: 24 horas (86400000 ms)
- `CREDIT_REMINDER_KEY`: 'kolink-credit-reminder' (localStorage)

**Lógica:**
1. Se verifica al cargar créditos en dashboard
2. Solo muestra si créditos < 10
3. Guarda timestamp en localStorage
4. No vuelve a mostrar hasta pasar 24 horas
5. Mensaje personalizado con cantidad exacta de créditos

### Notificaciones en Tiempo Real

**Cómo funciona:**
1. Usuario se autentica → `setupRealtimeNotifications(userId)`
2. Suscripción a canal de Supabase para tabla `admin_notifications`
3. Al insertar nueva notificación → toast automático según tipo
4. Marca como leída automáticamente
5. Cleanup al cerrar sesión o desmontar componente

**Uso para admins (desde Supabase SQL Editor):**
```sql
-- Enviar notificación a usuario específico
INSERT INTO admin_notifications (user_id, message, type)
VALUES (
  'user-uuid-here',
  '¡Hemos lanzado nuevas funcionalidades! Revisa el dashboard.',
  'info'
);
```

---

## 📧 Módulo 4 — Emails Transaccionales

### Objetivos Completados ✅

1. ✅ Integración de Resend API para envío de emails
2. ✅ Templates HTML profesionales (welcome + weekly)
3. ✅ Endpoint `/api/emails/send.ts` con autenticación
4. ✅ Webhook `/api/emails/welcome-webhook.ts` para triggers
5. ✅ Configuración de trigger Supabase para nuevos usuarios

### Archivos Creados

#### 1. Resend Client (`src/lib/resend.ts`)

```typescript
import { Resend } from 'resend';

export const resend = new Resend(process.env.RESEND_API_KEY);
export const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev';
```

#### 2. Templates HTML

**Welcome Email** (`src/emails/welcome.html`)
- Diseño profesional con gradientes y branding Kolink
- Badge de créditos iniciales
- Lista de características principales
- CTAs para ir al dashboard
- Pasos sugeridos para comenzar
- Responsive y compatible con clientes de email

**Variables soportadas:**
- `{{userName}}` - Nombre del usuario
- `{{credits}}` - Créditos iniciales
- `{{dashboardUrl}}` - URL del dashboard
- `{{siteUrl}}` - URL del sitio

**Weekly Email** (`src/emails/weekly.html`)
- Resumen estadístico semanal
- Grid de 4 stats: posts generados, créditos usados, disponibles, plan
- Condicionales para mensajes personalizados
- Tips de la semana
- Diseño consistente con branding

**Variables soportadas:**
- `{{userName}}` - Nombre del usuario
- `{{postsGenerated}}` - Posts esta semana
- `{{creditsUsed}}` - Créditos consumidos
- `{{creditsRemaining}}` - Créditos disponibles
- `{{currentPlan}}` - Plan actual
- `{{#if hasLowCredits}}...{{/if}}` - Condicional
- `{{#if hasHighActivity}}...{{/if}}` - Condicional

#### 3. API Endpoints

**A. `/api/emails/send.ts`** - Endpoint principal con autenticación

**Método:** POST
**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "to": "user@example.com",
  "type": "welcome" | "weekly",
  "data": {
    "userName": "John",
    "credits": 10,
    ...
  }
}
```

**Respuesta:**
```json
{
  "success": true,
  "messageId": "resend-id",
  "message": "welcome email sent successfully"
}
```

**Uso:**
```typescript
const response = await fetch('/api/emails/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({
    to: user.email,
    type: 'welcome',
    data: { userName: 'John', credits: 10 }
  })
});
```

**B. `/api/emails/welcome-webhook.ts`** - Webhook para Supabase

**Método:** POST
**Headers:** `x-webhook-secret: <SUPABASE_SERVICE_ROLE_KEY>`

**Body:**
```json
{
  "userId": "user-uuid"
}
```

**Seguridad:**
- Valida webhook secret (service role key)
- No requiere autenticación de usuario (server-to-server)
- Busca perfil automáticamente en Supabase

**Flujo:**
1. Supabase trigger detecta nuevo perfil
2. Llama al webhook con userId
3. Webhook busca datos del perfil
4. Carga y procesa template
5. Envía email via Resend

#### 4. Trigger de Supabase

**Archivo:** `docs/database/welcome_email_trigger.sql`

**3 Opciones de Implementación:**

**Opción 1: Edge Function (Recomendada)**
- Crear Edge Function en Supabase Dashboard
- Configurar webhook en Database > Webhooks
- Más confiable y fácil de debugear

**Opción 2: Database Trigger con pg_net**
```sql
CREATE FUNCTION trigger_welcome_email()
RETURNS TRIGGER AS $$
BEGIN
  SELECT net.http_post(
    url := 'https://kolink-gamma.vercel.app/api/emails/welcome-webhook',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', current_setting('app.supabase_service_role_key')
    ),
    body := jsonb_build_object('userId', NEW.id::text)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_profile_created_send_welcome
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION trigger_welcome_email();
```

**Opción 3: Manual Testing**
- Para desarrollo/testing
- Ejecutar directamente desde SQL Editor

### Variables de Entorno Requeridas

```bash
# Resend API
RESEND_API_KEY=re_xxxxx    # Obtener de https://resend.com/api-keys
FROM_EMAIL=noreply@yourdomain.com  # Debe estar verificado en Resend

# Ya existentes (necesarias para webhooks)
SUPABASE_SERVICE_ROLE_KEY=xxx
NEXT_PUBLIC_SITE_URL=https://kolink-gamma.vercel.app
```

### Configuración en Resend

1. Crear cuenta en [resend.com](https://resend.com)
2. Verificar dominio o usar dominio de prueba
3. Generar API Key en Dashboard > API Keys
4. Agregar `RESEND_API_KEY` a `.env.local` y Vercel
5. Configurar `FROM_EMAIL` con email verificado

### Testing

**Test Welcome Email (via API):**
```bash
curl -X POST https://kolink-gamma.vercel.app/api/emails/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "to": "test@example.com",
    "type": "welcome",
    "data": {
      "userName": "Test User",
      "credits": 10
    }
  }'
```

**Test Welcome Webhook (simular trigger):**
```bash
curl -X POST https://kolink-gamma.vercel.app/api/emails/welcome-webhook \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: YOUR_SERVICE_ROLE_KEY" \
  -d '{"userId": "user-uuid-here"}'
```

**Test Weekly Email:**
```bash
curl -X POST https://kolink-gamma.vercel.app/api/emails/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "to": "test@example.com",
    "type": "weekly",
    "data": {
      "userName": "Test User",
      "postsGenerated": 15,
      "creditsUsed": 15,
      "creditsRemaining": 35,
      "currentPlan": "Standard"
    }
  }'
```

---

## 🚀 Deployment

### Vercel Environment Variables

Agregar en Vercel Dashboard > Settings > Environment Variables:

```
RESEND_API_KEY=re_xxxxx
FROM_EMAIL=noreply@yourdomain.com
```

### Supabase Setup

1. **Ejecutar migrations:**
   ```bash
   # Admin notifications table
   psql -f docs/database/admin_notifications_migration.sql

   # Welcome email trigger (elegir opción)
   psql -f docs/database/welcome_email_trigger.sql
   ```

2. **Habilitar Realtime:**
   - Ir a Database > Replication
   - Habilitar realtime para tabla `admin_notifications`

3. **Configurar Webhook (si usas Edge Function):**
   - Database > Webhooks > Create Webhook
   - Tabla: profiles
   - Event: INSERT
   - Apuntar a Edge Function o HTTP endpoint

---

## 📊 Validación

### Módulo 3 - Checklist

- [x] Context de notificaciones integrado en `_app.tsx`
- [x] Toasts funcionando en todas las acciones del dashboard
- [x] Autosave con debounce sin memory leaks
- [x] Recordatorio de créditos respeta intervalo de 24h
- [x] Realtime notifications setup/cleanup correcto
- [x] Tabla `admin_notifications` creada con RLS
- [x] Policies de seguridad configuradas

### Módulo 4 - Checklist

- [x] Paquete `resend` instalado
- [x] Templates HTML creados y con variables
- [x] Endpoint `/api/emails/send.ts` con auth
- [x] Webhook `/api/emails/welcome-webhook.ts` funcional
- [x] Variables de entorno documentadas
- [x] SQL trigger creado (3 opciones)
- [x] Templates probados y responsive

---

## 🎯 Próximos Pasos Sugeridos

1. **Configurar Resend:**
   - Crear cuenta y verificar dominio
   - Generar API key
   - Actualizar env vars en Vercel

2. **Deployment de Triggers:**
   - Ejecutar migrations en Supabase
   - Configurar Edge Function o pg_net trigger
   - Testear con usuario de prueba

3. **Implementar Weekly Emails:**
   - Crear cron job (Vercel Cron o GitHub Actions)
   - Endpoint `/api/emails/send-weekly-batch.ts`
   - Query usuarios activos última semana
   - Enviar resúmenes en lote

4. **Monitoreo:**
   - Dashboard de Resend para ver deliverability
   - Logs de Supabase para debug de triggers
   - Sentry/logging para errores de email

5. **Mejoras Futuras:**
   - Preferencias de email en perfil de usuario
   - Unsubscribe links en templates
   - Más tipos de emails (password reset, etc.)
   - A/B testing de templates
   - Analytics de apertura/clicks

---

## 📝 Notas Técnicas

### Memory Leaks Prevention

- Todos los useEffect tienen cleanup functions
- Timeouts se limpian al desmontar
- Realtime channels se desuscriben correctamente
- No hay referencias circulares en contexts

### Performance

- Autosave con debounce reduce escrituras a localStorage
- Recordatorios usan localStorage en vez de API calls
- Templates se cargan desde filesystem (rápido)
- Realtime solo para usuarios autenticados

### Security

- Emails endpoints requieren autenticación
- Webhook usa service role key validation
- RLS habilitado en admin_notifications
- Templates no ejecutan código del usuario
- Variables escapadas en HTML

---

## 🐛 Troubleshooting

### Notificaciones no aparecen
- Verificar que `NotificationProvider` envuelva la app
- Revisar console para errores de hooks
- Confirmar que react-hot-toast esté configurado

### Emails no se envían
- Validar `RESEND_API_KEY` en env vars
- Confirmar que `FROM_EMAIL` esté verificado
- Revisar logs de Vercel Functions
- Testear con endpoint directo primero

### Trigger no funciona
- Verificar que trigger existe: `SELECT * FROM pg_trigger`
- Confirmar pg_net habilitado: `SELECT * FROM pg_extension`
- Revisar service role key configurado
- Testear webhook manualmente primero

### Realtime no conecta
- Verificar realtime habilitado para tabla
- Confirmar policies RLS permiten SELECT
- Revisar console del navegador para errores
- Testear inserción manual en Supabase

---

**Autor:** Claude Code
**Fecha:** 2025-01-22
**Versión Kolink:** v0.5 Beta
