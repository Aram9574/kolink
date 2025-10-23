# 🗄️ INSTRUCCIONES COMPLETAS: Configuración de Base de Datos Supabase para Kolink

## 📋 Resumen

Este documento te guía **paso a paso** para configurar TODA la base de datos de Kolink en Supabase, incluso si no sabes SQL.

**Tiempo estimado:** 10-15 minutos
**Nivel de dificultad:** Fácil (solo copiar y pegar)
**Resultado:** Base de datos 100% funcional y lista para producción

---

## 🎯 Lo Que Vas a Crear

Al terminar este proceso, tendrás en Supabase:

### 📊 Tablas (13 totales):
1. **profiles** - Información de usuarios
2. **posts** - Contenido generado con IA
3. **usage_stats** - Estadísticas de uso
4. **admin_notifications** - Notificaciones de admin a usuarios
5. **admin_audit_logs** - Registro de acciones de administrador
6. **inspiration_posts** - Hub de inspiración
7. **saved_posts** - Posts guardados por usuarios
8. **saved_searches** - Búsquedas guardadas
9. **calendar_events** - Eventos programados
10. **analytics_events** - Eventos de analytics
11. **lead_insights** - Insights de leads
12. **inbox_messages** - Mensajes de LinkedIn
13. **user_achievements** - Logros y gamificación

### 🔧 Funciones (9 totales):
- Actualización automática de timestamps
- Sistema de gamificación (XP, niveles, streaks)
- Búsqueda semántica con IA
- Funciones de administración
- Y más...

### 👁️ Vistas (4 totales):
- Contador de notificaciones no leídas
- Contador de mensajes no leídos
- Próximos eventos
- Resumen de logros

### 🔐 Seguridad:
- Row Level Security (RLS) habilitado en todas las tablas
- Políticas de acceso por usuario
- Permisos de administrador
- Encriptación de datos sensibles

---

## ⚠️ IMPORTANTE: Antes de Empezar

### ✅ Requisitos Previos:
1. **Tener una cuenta en Supabase** (https://supabase.com)
2. **Tener un proyecto creado en Supabase**
3. **Tener acceso al SQL Editor** (incluido en todos los planes, incluso el gratuito)

### 🚨 Advertencias:
- **Este script creará TODAS las tablas desde cero**
- Si ya tienes datos, haz un backup primero
- El script usa `IF NOT EXISTS`, así que es seguro ejecutarlo varias veces
- Si encuentras errores, lee la sección de "Solución de Problemas" al final

---

## 📝 PASO 1: Acceder a Supabase SQL Editor

### 1.1 Ir al Dashboard de Supabase
1. Abre tu navegador
2. Ve a: https://supabase.com/dashboard
3. Haz login con tu cuenta
4. Verás la lista de tus proyectos

### 1.2 Seleccionar tu Proyecto
1. Click en el proyecto "Kolink" (o como lo hayas llamado)
2. Espera a que cargue el dashboard

### 1.3 Abrir SQL Editor
1. En el menú de la izquierda, busca **"SQL Editor"**
2. Click en "SQL Editor"
3. Click en el botón **"New Query"** (esquina superior derecha)
4. Se abrirá un editor de texto vacío

---

## 📝 PASO 2: Copiar el Script SQL

### 2.1 Abrir el Archivo SQL
1. En tu computadora, abre el archivo: `SUPABASE_SETUP_COMPLETO.sql`
2. Está en la carpeta raíz de tu proyecto Kolink
3. Ábrelo con cualquier editor de texto (Notepad, VS Code, etc.)

### 2.2 Copiar TODO el Contenido
1. Presiona `Ctrl+A` (Windows/Linux) o `Cmd+A` (Mac) para seleccionar todo
2. Presiona `Ctrl+C` (Windows/Linux) o `Cmd+C` (Mac) para copiar
3. **Debes copiar desde la primera línea hasta la última**
4. El archivo tiene aproximadamente 1200 líneas

---

## 📝 PASO 3: Pegar y Ejecutar el Script

### 3.1 Pegar en SQL Editor
1. Vuelve a la pestaña de Supabase (SQL Editor)
2. Click dentro del editor de texto (área grande y vacía)
3. Presiona `Ctrl+V` (Windows/Linux) o `Cmd+V` (Mac) para pegar
4. Deberías ver TODO el contenido del archivo pegado

### 3.2 Verificar que se Pegó Completo
1. Scroll hasta el final del editor
2. La última línea debe decir algo como:
   ```sql
   -- FIN DEL SETUP
   ```
3. Si no ves esa línea, el script está incompleto. Vuelve a copiar y pegar.

### 3.3 Ejecutar el Script
1. **¡IMPORTANTE!** Verifica que todo el contenido esté pegado
2. Click en el botón **"Run"** (esquina inferior derecha, botón verde)
3. Aparecerá un spinner/loader indicando que está ejecutando
4. **Espera pacientemente** (puede tardar 1-2 minutos)

### 3.4 Verificar que Funcionó
1. Después de ejecutar, verás la consola de resultados en la parte inferior
2. Busca mensajes que digan:
   ```
   ✅ Tablas creadas: 13/13
   ✅ Extensiones habilitadas: 3/3
   🎉 ¡Setup de base de datos completado!
   ```
3. Si ves estos mensajes, **¡todo funcionó correctamente!**

---

## 📝 PASO 4: Verificar la Instalación

### 4.1 Verificar Tablas Creadas

1. En Supabase, ve a **"Table Editor"** (menú izquierdo)
2. Deberías ver una lista de tablas en el lado izquierdo
3. Verifica que existan estas 13 tablas:
   - ✅ profiles
   - ✅ posts
   - ✅ usage_stats
   - ✅ admin_notifications
   - ✅ admin_audit_logs
   - ✅ inspiration_posts
   - ✅ saved_posts
   - ✅ saved_searches
   - ✅ calendar_events
   - ✅ analytics_events
   - ✅ lead_insights
   - ✅ inbox_messages
   - ✅ user_achievements

### 4.2 Verificar Extensiones Habilitadas

1. Ve a **"Database"** en el menú izquierdo
2. Click en **"Extensions"**
3. Busca estas 3 extensiones y verifica que estén **Enabled**:
   - ✅ pgcrypto
   - ✅ uuid-ossp
   - ✅ vector

---

## 📝 PASO 5: Crear tu Primer Usuario Admin

### 5.1 ¿Por Qué Necesito un Admin?

El panel de administración (`/admin`) requiere que tu usuario tenga rol de `admin`. Por defecto, todos los usuarios son `user`.

### 5.2 Obtener tu User ID

**Opción A: Desde tu aplicación**
1. Ve a tu aplicación Kolink en el navegador
2. Haz login (si ya tienes cuenta) o registrate
3. Ve a tu perfil o dashboard
4. Abre las DevTools del navegador (F12)
5. En la consola, escribe: `localStorage.getItem('supabase.auth.token')`
6. Verás un JSON con tu información, busca el campo `user_id`

**Opción B: Desde Supabase Dashboard**
1. Ve a **"Authentication"** → **"Users"**
2. Verás la lista de usuarios registrados
3. Copia el **UUID** del usuario que quieres hacer admin

### 5.3 Actualizar Rol a Admin

1. Ve a **"SQL Editor"** → **"New Query"**
2. Pega este código (reemplaza `TU-EMAIL-AQUI` con tu email real):
   ```sql
   UPDATE profiles
   SET role = 'admin'
   WHERE email = 'tu-email@example.com';
   ```
3. Click en **"Run"**
4. Deberías ver: `UPDATE 1` (1 fila actualizada)

### 5.4 Verificar que Eres Admin

```sql
SELECT email, role, plan, credits
FROM profiles
WHERE role = 'admin';
```

Si ves tu email en los resultados, **¡felicidades, eres admin!**

---

## 📝 PASO 6: Configurar Variables de Entorno

### 6.1 Obtener Credenciales de Supabase

1. Ve a **"Project Settings"** (icono de engranaje, menú izquierdo)
2. Click en **"API"**
3. Verás tres valores importantes:
   - **Project URL** (ejemplo: `https://abcdefg.supabase.co`)
   - **anon/public key** (clave pública, inicia con `eyJ...`)
   - **service_role key** (clave secreta, también inicia con `eyJ...`)

### 6.2 Actualizar .env.local

1. En tu proyecto Kolink, abre el archivo `.env.local`
2. Actualiza estas líneas:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://TU-PROJECT-ID.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...tu-anon-key...
   SUPABASE_SERVICE_ROLE_KEY=eyJ...tu-service-role-key...
   ```
3. Guarda el archivo

### 6.3 Actualizar Variables en Vercel (si aplica)

Si tu app está desplegada en Vercel:
1. Ve a tu proyecto en Vercel Dashboard
2. **Settings** → **Environment Variables**
3. Actualiza las mismas 3 variables de arriba
4. Guarda y redespliega

---

## ✅ ¡Listo! Tu Base de Datos Está Configurada

### 🎉 ¿Qué Puedes Hacer Ahora?

1. **Registrarte en tu aplicación** → Se creará automáticamente un perfil en `profiles`
2. **Generar contenido con IA** → Se guardará en `posts`
3. **Ver tus estadísticas** → Se rastreará en `usage_stats`
4. **Programar publicaciones** → Se guardarán en `calendar_events`
5. **Recibir notificaciones** → Se mostrarán desde `admin_notifications`

### 📊 Cómo Ver tus Datos

**Desde Supabase Dashboard:**
1. Ve a **"Table Editor"**
2. Click en cualquier tabla (ejemplo: `profiles`)
3. Verás los datos en formato de tabla
4. Puedes editar, agregar o eliminar filas manualmente

**Desde tu Aplicación:**
- Dashboard: `/dashboard`
- Admin Panel: `/admin` (solo si eres admin)
- Analytics: `/stats`
- Calendar: `/calendar`

---

## 🐛 Solución de Problemas

### ❌ Error: "extension does not exist"

**Mensaje:**
```
ERROR: extension "vector" does not exist
```

**Solución:**
1. Ve a **"Database"** → **"Extensions"**
2. Busca la extensión mencionada (ejemplo: `vector`)
3. Click en **"Enable"** al lado de la extensión
4. Espera 30 segundos
5. Vuelve a ejecutar el script

---

### ❌ Error: "relation already exists"

**Mensaje:**
```
ERROR: relation "profiles" already exists
```

**Solución:**
Esto significa que ya ejecutaste el script antes. Tienes 2 opciones:

**Opción A: Ignorar (recomendado)**
- Este error es normal si ya tienes datos
- El script usa `IF NOT EXISTS`, así que es seguro
- Scroll hacia abajo en la consola para ver si hay otros errores más importantes

**Opción B: Empezar de cero**
```sql
-- ⚠️ PELIGRO: Esto borrará TODOS tus datos
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- Ahora vuelve a ejecutar el script completo
```

---

### ❌ Error: "permission denied"

**Mensaje:**
```
ERROR: permission denied for table profiles
```

**Solución:**
1. Verifica que estás usando el SQL Editor de Supabase Dashboard
2. NO estés usando una conexión externa con credenciales limitadas
3. El SQL Editor del dashboard tiene permisos completos por defecto

---

### ❌ Error: "syntax error"

**Mensaje:**
```
ERROR: syntax error at or near "..."
```

**Solución:**
1. Es posible que no se copió completo el script
2. Verifica que copiaste DESDE la primera línea HASTA la última
3. No edites el script manualmente
4. Vuelve a copiar y pegar todo el contenido

---

### ❌ El script se quedó "colgado"

**Síntomas:**
- El spinner/loader no termina después de 5 minutos
- No ves mensajes de éxito ni error

**Solución:**
1. Refresca la página del navegador (F5)
2. Ve a **"Table Editor"** para ver si las tablas se crearon
3. Si no hay tablas, vuelve a ejecutar el script
4. Si hay algunas tablas pero no todas, ejecuta el script nuevamente (usará `IF NOT EXISTS`)

---

### ❌ No veo las extensiones "vector"

**Síntomas:**
- La extensión `vector` no aparece en la lista

**Solución:**
Esta extensión es para embeddings de IA (búsqueda semántica). Si no está disponible:

1. Verifica que tu proyecto Supabase esté actualizado
2. La extensión `vector` (pgvector) está disponible en todos los planes
3. Si no la ves, contacta a soporte de Supabase
4. **Alternativa temporal:** Puedes comentar las líneas que usan `VECTOR(1536)` en el script

---

### ❌ Los usuarios no se pueden registrar

**Síntomas:**
- Error al crear cuenta nueva
- "Error al crear perfil"

**Solución:**

**Verificar que la tabla profiles existe:**
```sql
SELECT * FROM profiles LIMIT 1;
```

**Verificar RLS policies:**
```sql
SELECT * FROM pg_policies WHERE tablename = 'profiles';
```

**Debe haber al menos 5 policies. Si no hay, ejecuta esto:**
```sql
-- Vuelve a ejecutar solo la sección de policies de profiles
-- (líneas 200-300 del script original)
```

---

### ❌ No puedo acceder al panel de admin

**Síntomas:**
- La ruta `/admin` me redirige o no funciona
- "No tienes permisos de administrador"

**Solución:**

1. **Verificar tu rol:**
   ```sql
   SELECT email, role FROM profiles WHERE email = 'tu-email@example.com';
   ```

2. **Si tu rol es 'user', cámbialo a 'admin':**
   ```sql
   UPDATE profiles SET role = 'admin' WHERE email = 'tu-email@example.com';
   ```

3. **Cierra sesión y vuelve a iniciar sesión** en la aplicación

---

### ❌ Las notificaciones no funcionan en tiempo real

**Síntomas:**
- No recibo notificaciones instantáneas
- Tengo que recargar la página para ver nuevas notificaciones

**Solución:**

1. **Verificar Realtime habilitado:**
   ```sql
   -- Esto debería estar en el script, pero por si acaso:
   ALTER PUBLICATION supabase_realtime ADD TABLE admin_notifications;
   ```

2. **Verificar en Supabase Dashboard:**
   - Ve a **"Database"** → **"Replication"**
   - Verifica que `admin_notifications` esté en la lista
   - Si no está, agrégala manualmente

---

## 📚 Estructura de la Base de Datos

### Diagrama de Relaciones

```
┌─────────────────────────────────────────────────────┐
│                    auth.users                       │
│                   (Supabase Auth)                   │
└──────────────────────┬──────────────────────────────┘
                       │
                       │ (1:1)
                       ▼
┌─────────────────────────────────────────────────────┐
│                    profiles                         │
│  ┌────────────────────────────────────────────────┐ │
│  │ id, email, plan, credits, role, xp, level     │ │
│  │ linkedin_*, stripe_customer_id, gamification  │ │
│  └────────────────────────────────────────────────┘ │
└───┬──────────┬──────────┬───────────┬───────────┬───┘
    │          │          │           │           │
    │ (1:N)    │ (1:N)    │ (1:N)     │ (1:1)     │ (1:N)
    ▼          ▼          ▼           ▼           ▼
 ┌──────┐  ┌──────┐  ┌─────────┐ ┌────────┐ ┌──────────┐
 │posts │  │saved_│  │calendar_│ │usage_  │ │inbox_    │
 │      │  │posts │  │events   │ │stats   │ │messages  │
 └──────┘  └──────┘  └─────────┘ └────────┘ └──────────┘

 ┌─────────────┐  ┌──────────┐  ┌─────────────┐
 │user_        │  │saved_    │  │lead_        │
 │achievements │  │searches  │  │insights     │
 └─────────────┘  └──────────┘  └─────────────┘

 ┌──────────────────┐  ┌────────────────┐
 │admin_            │  │analytics_      │
 │notifications     │  │events          │
 └──────────────────┘  └────────────────┘

        (Global - sin user_id)
┌─────────────────────────────────┐
│     inspiration_posts           │
│  (compartido entre todos)       │
└─────────────────────────────────┘
```

### Tipos de Relaciones

**1:1 (Uno a Uno)**
- `auth.users` ↔ `profiles` (cada usuario tiene un perfil)
- `profiles` ↔ `usage_stats` (cada perfil tiene sus stats)

**1:N (Uno a Muchos)**
- `profiles` → `posts` (un usuario tiene muchos posts)
- `profiles` → `calendar_events` (un usuario tiene muchos eventos)
- `profiles` → `inbox_messages` (un usuario tiene muchos mensajes)
- `profiles` → `user_achievements` (un usuario tiene muchos logros)
- etc.

**N:M (Muchos a Muchos)**
- `profiles` ↔ `inspiration_posts` (a través de `saved_posts`)
  - Muchos usuarios pueden guardar el mismo post de inspiración
  - Un usuario puede guardar muchos posts

---

## 🔐 Seguridad y Row Level Security (RLS)

### ¿Qué es RLS?

**Row Level Security** es un sistema de seguridad que controla qué filas puede ver/editar cada usuario.

**Ejemplo:**
- Usuario A solo puede ver sus propios posts
- Usuario B no puede ver los posts de Usuario A
- Admins pueden ver los posts de todos

### Cómo Funciona

```sql
-- Política típica para una tabla
CREATE POLICY "Users can view own posts"
ON posts FOR SELECT
USING (auth.uid() = user_id);
```

**Explicación:**
- `auth.uid()` → ID del usuario actual (autenticado)
- `user_id` → Columna en la tabla `posts`
- Solo se retornan filas donde `auth.uid() = user_id` sea verdadero

### Políticas Implementadas

Todas las tablas tienen RLS habilitado con estas políticas:

**Para usuarios normales:**
- ✅ SELECT: Leen solo sus propios datos
- ✅ INSERT: Crean solo con su propio user_id
- ✅ UPDATE: Actualizan solo sus propios datos
- ✅ DELETE: Borran solo sus propios datos

**Para admins:**
- ✅ Pueden ver/editar TODOS los datos de TODAS las tablas
- ✅ Tienen acceso a `admin_audit_logs`
- ✅ Pueden enviar notificaciones

**Para tablas públicas:**
- `inspiration_posts` → Todos pueden leer, nadie puede escribir (excepto backend)

---

## 📖 Guía Rápida de SQL para No Programadores

### Ver Datos de una Tabla

```sql
-- Ver todos los usuarios
SELECT * FROM profiles;

-- Ver solo algunos campos
SELECT email, plan, credits FROM profiles;

-- Ver solo tu usuario (reemplaza el email)
SELECT * FROM profiles WHERE email = 'tu-email@example.com';

-- Ver los últimos 10 posts
SELECT * FROM posts ORDER BY created_at DESC LIMIT 10;
```

### Actualizar Datos

```sql
-- Cambiar tu plan
UPDATE profiles
SET plan = 'premium', credits = 1000
WHERE email = 'tu-email@example.com';

-- Hacer a alguien admin
UPDATE profiles
SET role = 'admin'
WHERE email = 'otro-email@example.com';
```

### Borrar Datos

```sql
-- Borrar un post específico (usa el ID real)
DELETE FROM posts
WHERE id = '123e4567-e89b-12d3-a456-426614174000';

-- Borrar todos tus posts (¡cuidado!)
DELETE FROM posts
WHERE user_id = (
  SELECT id FROM profiles WHERE email = 'tu-email@example.com'
);
```

### Contar Datos

```sql
-- Cuántos usuarios hay
SELECT COUNT(*) FROM profiles;

-- Cuántos posts has generado
SELECT COUNT(*) FROM posts
WHERE user_id = (
  SELECT id FROM profiles WHERE email = 'tu-email@example.com'
);

-- Cuántos admins hay
SELECT COUNT(*) FROM profiles WHERE role = 'admin';
```

---

## 🎓 Recursos Adicionales

### Documentación Oficial

- **Supabase Docs:** https://supabase.com/docs
- **PostgreSQL Docs:** https://www.postgresql.org/docs/
- **Supabase SQL Editor:** https://supabase.com/docs/guides/database/sql-editor

### Tutoriales Recomendados

- **Supabase Quickstart:** https://supabase.com/docs/guides/getting-started
- **Row Level Security:** https://supabase.com/docs/guides/database/postgres/row-level-security
- **Realtime:** https://supabase.com/docs/guides/realtime

### Comunidad

- **Discord de Supabase:** https://discord.supabase.com
- **GitHub de Supabase:** https://github.com/supabase/supabase
- **Stack Overflow:** Tag `supabase`

---

## ✅ Checklist Final

Marca cada item cuando lo completes:

- [ ] Ejecuté el script `SUPABASE_SETUP_COMPLETO.sql` completo
- [ ] Vi el mensaje de éxito: "🎉 ¡Setup de base de datos completado!"
- [ ] Verifiqué que las 13 tablas existen en Table Editor
- [ ] Verifiqué que las 3 extensiones están habilitadas
- [ ] Creé mi primer usuario admin
- [ ] Verifiqué mi rol admin con SELECT
- [ ] Actualicé las variables de entorno (.env.local)
- [ ] Probé registrarme en la aplicación
- [ ] Probé generar contenido con IA
- [ ] Probé acceder al panel de admin (/admin)
- [ ] Todo funciona correctamente ✅

---

## 📞 ¿Necesitas Ayuda?

Si después de seguir esta guía sigues teniendo problemas:

1. **Revisa la sección "Solución de Problemas"** arriba
2. **Verifica los logs de error** en la consola de Supabase
3. **Comparte el mensaje de error exacto** (screenshot)
4. **Indica qué paso estabas haciendo** cuando ocurrió el error

---

## 🎉 ¡Felicidades!

Si llegaste hasta aquí y todo funciona, **¡tu base de datos está completamente configurada y lista para producción!**

Ahora puedes:
- ✅ Registrar usuarios
- ✅ Generar contenido con IA
- ✅ Gestionar suscripciones
- ✅ Programar publicaciones
- ✅ Ver analytics
- ✅ Administrar usuarios
- ✅ Y mucho más...

**¡A disfrutar de Kolink! 🚀**

---

**Última actualización:** 2025-10-23
**Versión Kolink:** v0.6
**Autor:** Claude Code
