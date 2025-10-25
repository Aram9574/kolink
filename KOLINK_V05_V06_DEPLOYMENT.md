# 🚀 Kolink v0.5/v0.6 - Guía Completa de Despliegue

## 📋 Resumen de la Expansión

Esta actualización transforma Kolink de v0.4 a v0.5/v0.6, agregando funcionalidades empresariales completas:

### ✅ Nuevas Características Implementadas

1. **Panel de Administración Completo** (`/admin`)
   - Gestión de usuarios, créditos y planes
   - Logs de auditoría de acciones administrativas
   - Estadísticas globales con gráficos (Recharts)
   - Protección con roles (solo admins)

2. **Sistema de Logging Centralizado**
   - Helper `/lib/logger.ts` para registrar eventos
   - Tabla `logs` para eventos de usuarios
   - Tabla `admin_logs` para acciones administrativas
   - Logging automático en: generación de posts, pagos, errores

3. **Calendario y Programación** (ya existía, verificado)
   - Tabla `schedule` para contenido programado
   - Vista de calendario semanal
   - Estado de posts (pending, published, cancelled)

4. **Feed de Inspiración** (ya existía, mejorado)
   - Componente `InspirationFeed` con plantillas predefinidas
   - 6 categorías de plantillas profesionales
   - Integración directa con el dashboard

5. **Analíticas para Usuarios y Admins**
   - `/stats` - Analytics personales del usuario
   - `/admin/stats` - Estadísticas globales con gráficos
   - Vistas SQL optimizadas (`user_stats`, `global_stats`)

6. **Webhook de Stripe Mejorado**
   - Mapeo automático de planes por Price ID
   - Asignación correcta de créditos por plan
   - Logging de pagos y errores
   - Mejor manejo de errores

---

## 🗄️ PASO 1: Ejecutar Migración de Base de Datos

### A. Ejecutar Script SQL en Supabase

1. **Accede a Supabase Dashboard:**
   - Ve a: https://supabase.com/dashboard
   - Selecciona tu proyecto: `crdtxyfvbosjjiddirtzc`

2. **Abre el SQL Editor:**
   - En el menú lateral: SQL Editor
   - Clic en "New query"

3. **Copia y Pega el SQL:**
   - Abre el archivo: `/supabase/migrations/20250125000000_kolink_v05_expansion.sql`
   - Copia TODO el contenido
   - Pégalo en el editor SQL

4. **Ejecuta la Migración:**
   - Haz clic en "Run" (botón verde)
   - Espera a que termine (debería tardar 5-10 segundos)
   - Verifica que no haya errores en la consola

### B. Verificar Tablas Creadas

En el SQL Editor, ejecuta:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('admin_logs', 'logs', 'schedule');
```

**Resultado esperado:** Deberías ver 3 tablas.

### C. Verificar Vistas Creadas

```sql
SELECT table_name
FROM information_schema.views
WHERE table_schema = 'public'
AND table_name IN ('user_stats', 'global_stats');
```

**Resultado esperado:** Deberías ver 2 vistas.

### D. Crear tu Primer Usuario Admin

```sql
-- Reemplaza 'TU_EMAIL_AQUI' con tu email de Kolink
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'TU_EMAIL_AQUI';
```

**Importante:** Ejecuta esto solo para TU cuenta. Verifica con:

```sql
SELECT id, email, role FROM public.profiles WHERE role = 'admin';
```

---

## 📦 PASO 2: Instalar Dependencias (si es necesario)

Las dependencias ya deberían estar instaladas, pero verifica:

```bash
# En tu terminal local
cd /Users/aramzakzuk/Proyectos/kolink

# Verifica que Recharts esté instalado
npm list recharts

# Si no está instalado:
npm install recharts

# Verifica package.json
cat package.json | grep recharts
```

**Resultado esperado:**
```
recharts@^3.3.0
```

---

## 🔐 PASO 3: Configurar Variables de Entorno

### A. Variables Locales (`.env.local`)

**Verifica que existan:**

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://crdtxyfvbosjjiddirtzc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<TU_CLAVE_ANON>
SUPABASE_SERVICE_ROLE_KEY=<TU_CLAVE_SERVICE_ROLE>

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_BASIC=price_1SKxVUE0zDGmS9ihRNvHy9RI
STRIPE_PRICE_ID_STANDARD=price_1SKpTnE0zDGmS9ihMgcOnoft
STRIPE_PRICE_ID_PREMIUM=price_1SKxcBE0zDGmS9ihOtqDUIDL

# Site URL
NEXT_PUBLIC_SITE_URL=https://kolink.es
```

**⚠️ CRÍTICO:** Asegúrate de que `NEXT_PUBLIC_SUPABASE_ANON_KEY` sea la clave **anon**, NO la clave service_role. Consulta `SUPABASE_ANON_KEY_FIX.md` si es necesario.

### B. Variables en Vercel

1. **Accede a Vercel Dashboard:**
   - https://vercel.com/
   - Selecciona el proyecto "kolink"

2. **Ve a Settings → Environment Variables**

3. **Verifica que TODAS estas variables existan:**
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (⚠️ clave ANON, no service_role)
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `STRIPE_PRICE_ID_BASIC`
   - `STRIPE_PRICE_ID_STANDARD`
   - `STRIPE_PRICE_ID_PREMIUM`
   - `NEXT_PUBLIC_SITE_URL=https://kolink.es`
   - `OPENAI_API_KEY`
   - `RESEND_API_KEY`

4. **Asegúrate de que estén configuradas para:**
   - ✅ Production
   - ✅ Preview
   - ✅ Development

---

## 🧪 PASO 4: Probar Localmente

### A. Iniciar Servidor de Desarrollo

```bash
npm run dev
```

**Esperado:** El servidor debería iniciar en `http://localhost:3000`

### B. Probar Funcionalidades Nuevas

#### 1. Test de Conexión Supabase

```
http://localhost:3000/test-supabase
```

**Verificar:**
- ✅ Todas las pruebas en SUCCESS o WARNING
- ✅ No hay errores 406
- ✅ Conexión WebSocket establecida

#### 2. Test de Panel de Admin

```
http://localhost:3000/admin
```

**Verificar:**
- ✅ Solo accesible si tienes `role='admin'`
- ✅ Se muestra tabla de usuarios
- ✅ Puedes ver estadísticas
- ✅ Puedes hacer clic en "Ver Estadísticas" → `/admin/stats`

#### 3. Test de Estadísticas de Admin

```
http://localhost:3000/admin/stats
```

**Verificar:**
- ✅ Se muestran gráficos (BarChart, LineChart, PieChart)
- ✅ Estadísticas globales visibles
- ✅ Créditos totales calculados correctamente

#### 4. Test de Inspiración

```
http://localhost:3000/inspiration
```

**Verificar:**
- ✅ Se muestran 6 plantillas de inspiración
- ✅ Al hacer clic en "Usar Plantilla" → redirige a `/dashboard`
- ✅ El prompt se carga automáticamente en el editor

#### 5. Test de Dashboard con Logging

```
http://localhost:3000/dashboard
```

**Generar contenido y verificar logging:**

1. Escribe un prompt y genera contenido
2. Abre Supabase Dashboard → Table Editor → `logs`
3. Busca tu último registro con `type='generation'`
4. Verifica que el metadata incluya `post_id` y `credits_used`

#### 6. Test de Webhook de Stripe (Local)

**Nota:** Requiere Stripe CLI instalado.

```bash
# Terminal 1: Servidor Next.js
npm run dev

# Terminal 2: Stripe CLI (forward webhooks)
stripe listen --forward-to localhost:3000/api/webhook

# Terminal 3: Trigger test event
stripe trigger checkout.session.completed
```

**Verificar:**
- ✅ Webhook recibido en consola de Next.js
- ✅ Plan actualizado en Supabase
- ✅ Créditos añadidos correctamente
- ✅ Log de pago creado en tabla `logs`

---

## 🚀 PASO 5: Desplegar a Producción

### A. Commit de Cambios

```bash
git status

# Deberías ver archivos modificados/nuevos:
# - supabase/migrations/20250125000000_kolink_v05_expansion.sql
# - src/lib/logger.ts
# - src/middleware.ts
# - src/pages/admin/stats.tsx
# - src/components/InspirationFeed.tsx
# - src/pages/api/webhook.ts
# - src/pages/api/post/generate.ts

git add .

git commit -m "feat: Kolink v0.5/v0.6 - admin panel, logging, improved webhooks

- Add admin panel with user management (/admin)
- Add admin statistics with charts (/admin/stats)
- Implement centralized logging system (logs, admin_logs tables)
- Improve Stripe webhook with plan mapping and logging
- Add InspirationFeed component with templates
- Add event logging to content generation
- Create database schema expansion migration
- Update documentation"

git push origin main
```

### B. Vercel Desplegará Automáticamente

1. **Ve a Vercel Dashboard:**
   - https://vercel.com/tu-proyecto
   - Espera a que el despliegue termine (2-5 minutos)

2. **Monitorea el Despliegue:**
   - Haz clic en el despliegue en progreso
   - Revisa los logs de build
   - Espera el estado "Ready" ✅

---

## ✅ PASO 6: Verificar en Producción

### A. Test de Conexión

```
https://kolink.es/test-supabase
```

**Verificar:**
- ✅ Todos los tests pasan
- ✅ No hay errores en consola del navegador (F12)

### B. Test de Panel de Admin

```
https://kolink.es/admin
```

**Verificar:**
- ✅ Acceso solo para admins
- ✅ Tabla de usuarios visible
- ✅ Estadísticas cargando correctamente

### C. Test de Webhook de Stripe (Producción)

1. **Configura el Webhook en Stripe:**
   - Ve a: https://dashboard.stripe.com/webhooks
   - Clic en "Add endpoint"
   - URL: `https://kolink.es/api/webhook`
   - Eventos: `checkout.session.completed`
   - Clic en "Add endpoint"

2. **Copia el Webhook Secret:**
   - En el webhook recién creado, clic en "Reveal" en "Signing secret"
   - Copia la clave `whsec_...`

3. **Actualiza Variable de Entorno en Vercel:**
   - Ve a: Vercel → Settings → Environment Variables
   - Edita `STRIPE_WEBHOOK_SECRET`
   - Pega la nueva clave
   - Guarda

4. **Redespliega:**
   - Vercel → Deployments → Latest → ... → Redeploy

5. **Prueba el Webhook:**
   - Haz una compra de prueba en `https://kolink.es/dashboard`
   - Verifica que:
     - ✅ Plan se actualiza en Supabase
     - ✅ Créditos se añaden correctamente
     - ✅ Se crea registro en tabla `logs` (type='payment')
     - ✅ Usuario redirigido a `/dashboard?status=success`
     - ✅ Modal de agradecimiento se muestra

### D. Test de Logging

1. **Genera contenido:**
   - Ve a `https://kolink.es/dashboard`
   - Genera un post con IA

2. **Verifica logs en Supabase:**
   - Supabase Dashboard → Table Editor → `logs`
   - Busca registros con tu `user_id`
   - Deberías ver:
     - `type='generation'` para posts generados
     - `type='payment'` si hiciste una compra
     - `type='error'` si hubo algún error

3. **Verifica logs de admin (si eres admin):**
   - Tabla `admin_logs`
   - Busca acciones como `add_credits`, `change_plan`, `delete_user`

---

## 📊 Nuevas Tablas y Estructura

### Tabla: `admin_logs`

```sql
Column          Type        Description
--------        ------      -----------
id              uuid        Primary key
admin_id        uuid        FK a profiles (quien hizo la acción)
action          text        Tipo de acción (add_credits, change_plan, etc.)
target_user     uuid        FK a profiles (usuario afectado)
metadata        jsonb       Datos adicionales
created_at      timestamptz Timestamp
```

### Tabla: `logs`

```sql
Column          Type        Description
--------        ------      -----------
id              uuid        Primary key
user_id         uuid        FK a profiles
type            text        login, generation, payment, error, other
message         text        Mensaje descriptivo
metadata        jsonb       Datos adicionales
created_at      timestamptz Timestamp
```

### Tabla: `schedule`

```sql
Column          Type        Description
--------        ------      -----------
id              uuid        Primary key
user_id         uuid        FK a profiles
content         text        Contenido programado
scheduled_for   timestamptz Fecha/hora de publicación
status          text        pending, published, cancelled
post_id         uuid        FK a posts (opcional)
created_at      timestamptz Timestamp
updated_at      timestamptz Auto-actualizado
```

### Vista: `user_stats`

Agregación de estadísticas por usuario:
- Total de posts generados
- Posts programados
- Último post generado
- Fecha de registro

### Vista: `global_stats`

Estadísticas globales de la plataforma:
- Total de usuarios
- Usuarios de pago
- Posts totales
- Posts programados
- Créditos restantes
- Usuarios y posts últimos 30 días

---

## 🔧 Mapeo de Planes y Créditos

### Configuración en `/pages/api/webhook.ts`

```typescript
const PLAN_MAPPING = {
  [STRIPE_PRICE_ID_BASIC]: {
    plan: "basic",
    credits: 50,
    displayName: "Basic",
  },
  [STRIPE_PRICE_ID_STANDARD]: {
    plan: "standard",
    credits: 150,
    displayName: "Standard",
  },
  [STRIPE_PRICE_ID_PREMIUM]: {
    plan: "premium",
    credits: 500,
    displayName: "Premium",
  },
};
```

**Actualiza los créditos según tus planes en Stripe.**

---

## 🧪 Casos de Prueba Completos

### 1. Flujo de Usuario Nuevo

1. ✅ Registro → Crea perfil en `profiles`
2. ✅ Login → Se registra en `logs` (type='login')
3. ✅ Genera contenido → Se registra en `logs` (type='generation')
4. ✅ Compra plan → Webhook actualiza plan y créditos
5. ✅ Pago registrado → Se registra en `logs` (type='payment')

### 2. Flujo de Administrador

1. ✅ Login como admin → Acceso a `/admin`
2. ✅ Añadir créditos → Se registra en `admin_logs`
3. ✅ Cambiar plan → Se registra en `admin_logs`
4. ✅ Ver estadísticas → `/admin/stats` muestra gráficos

### 3. Flujo de Contenido

1. ✅ Generar desde dashboard → Post guardado, créditos deducidos
2. ✅ Usar plantilla de inspiración → Prompt precargado
3. ✅ Programar en calendario → Se guarda en `schedule`
4. ✅ Ver analytics → `/stats` muestra uso personal

---

## 🚨 Solución de Problemas

### Error: "Cannot read property 'role' of undefined" en /admin

**Causa:** El usuario no tiene el campo `role` en `profiles`.

**Solución:**
```sql
UPDATE public.profiles
SET role = 'user'
WHERE role IS NULL;
```

### Error: "Function log_event does not exist"

**Causa:** La migración SQL no se ejecutó correctamente.

**Solución:**
1. Revisa Supabase Dashboard → SQL Editor → Query history
2. Ejecuta nuevamente la migración completa
3. Verifica que las funciones existan:
   ```sql
   SELECT routine_name
   FROM information_schema.routines
   WHERE routine_schema = 'public'
   AND routine_name IN ('log_event', 'log_admin_action');
   ```

### Error: Gráficos no se muestran en /admin/stats

**Causa:** Recharts no está instalado o falta importar.

**Solución:**
```bash
npm install recharts
npm run build
```

### Error: Webhook de Stripe no actualiza créditos

**Causa:** `STRIPE_WEBHOOK_SECRET` incorrecto o no configurado.

**Solución:**
1. Revisa logs de Vercel → Functions → Runtime Logs
2. Busca errores relacionados con "Webhook signature verification failed"
3. Actualiza `STRIPE_WEBHOOK_SECRET` en Vercel
4. Redespliega

---

## 📝 Checklist Final de Despliegue

### Pre-Despliegue

- [ ] Migración SQL ejecutada en Supabase
- [ ] Tablas verificadas (`admin_logs`, `logs`, `schedule`)
- [ ] Vistas verificadas (`user_stats`, `global_stats`)
- [ ] Al menos un usuario con `role='admin'`
- [ ] Variables de entorno configuradas en Vercel
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` es la clave ANON (no service_role)

### Post-Despliegue

- [ ] `/test-supabase` pasa todos los tests
- [ ] `/admin` accesible solo para admins
- [ ] `/admin/stats` muestra gráficos correctamente
- [ ] `/inspiration` muestra plantillas
- [ ] Webhook de Stripe funciona (payment test)
- [ ] Logs se crean en tabla `logs`
- [ ] Admin logs se crean en tabla `admin_logs`
- [ ] Redirección de Stripe a `/dashboard?status=success` funciona
- [ ] Modal de agradecimiento se muestra después de pago

---

## 🎯 Próximos Pasos (v0.7+)

Funcionalidades sugeridas para futuras versiones:

1. **LinkedIn Integration**
   - OAuth real con LinkedIn
   - Publicación automática de posts programados
   - Importar métricas de LinkedIn

2. **Advanced Analytics**
   - Comparación de rendimiento de posts
   - A/B testing de contenido
   - Predicción de engagement con ML

3. **Team Management**
   - Múltiples usuarios por cuenta
   - Roles personalizados
   - Colaboración en tiempo real

4. **Content Library**
   - Biblioteca de contenido reutilizable
   - Tags y categorías
   - Búsqueda avanzada

5. **Automation**
   - Publicación automática programada
   - Generación de reportes semanales
   - Email notifications

---

## 📞 Soporte y Documentación

- **Documentación completa:** Ver `README.md`, `CLAUDE.md`
- **Migración Supabase:** Ver `supabase/migrations/`
- **Fix de Supabase ANON KEY:** Ver `SUPABASE_ANON_KEY_FIX.md`
- **Fix de Stripe Redirect:** Ver `STRIPE_REDIRECT_FIX.md`
- **Deployment general:** Ver `DEPLOYMENT_GUIDE.md`

---

**Versión:** v0.5/v0.6
**Fecha:** 2025-01-25
**Estado:** ✅ Listo para Producción
**Desarrollado por:** Kolink Team + Claude Code

¡Felicidades! Kolink ahora es una plataforma completa y lista para escalar. 🚀
