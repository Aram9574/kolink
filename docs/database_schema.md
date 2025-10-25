# 🧠 Kolink — Database Schema (v0.6.2)

_Estructura actualizada a Octubre 2025_  
_Base de datos alojada en Supabase (PostgreSQL + RLS activado)._

---

## 📁 Esquema principal: `public`

Este esquema contiene todas las tablas, vistas y funciones que utiliza Kolink tanto para el frontend (usuarios autenticados) como para el backend (administración, IA y métricas).

---

## 🧩 Tabla: `profiles`

Guarda la información completa de cada usuario autenticado.  
Evoluciona progresivamente con el producto para soportar personalización IA, branding y perfil profesional.

| Columna | Tipo | Descripción |
|----------|------|-------------|
| **id** | `uuid` | ID único del usuario (vinculado a `auth.uid()`). |
| **email** | `text` | Correo electrónico del usuario. |
| **plan** | `text` | Plan actual del usuario (`free`, `basic`, `pro`, `premium`). |
| **credits** | `integer` | Créditos disponibles para generación de contenido. |
| **role** | `text` | Rol del usuario (`user` o `admin`). Controla acceso a vistas y panel admin. |
| **bio** | `text` | Descripción profesional corta del usuario. |
| **headline** | `text` | Frase o titular breve, usada para IA y perfil público. |
| **expertise** | `text` | Área de especialización principal (ej: IA médica, salud digital, marketing). |
| **location** | `text` | Ciudad o país del usuario. |
| **website** | `text` | Sitio web o portafolio personal. |
| **photo_url** | `text` | URL del avatar o foto de perfil. |
| **company** | `text` | Empresa o institución donde trabaja actualmente. |
| **position** | `text` | Cargo o puesto actual. |
| **created_at** | `timestamptz` | Fecha de creación del registro. |

**RLS activado:**  
- Los usuarios solo pueden acceder a su propio perfil.  
- Los administradores (`role = 'admin'`) pueden acceder a todos.

**Notas:**
- Estos campos adicionales (`bio`, `headline`, `expertise`, etc.) son opcionales y no afectan la funcionalidad del MVP.  
- Permiten futuras expansiones para personalización de IA y perfiles públicos de creador.

---

## 🧠 Tabla: `posts`

Registra todo el contenido generado por el usuario con IA.

| Columna | Tipo | Descripción |
|----------|------|-------------|
| **id** | `uuid` | Identificador único del post. |
| **user_id** | `uuid` | ID del usuario (FK a `profiles.id`). |
| **prompt** | `text` | Texto base o idea inicial. |
| **generated_text** | `text` | Contenido generado por la IA. |
| **created_at** | `timestamptz` | Fecha de creación. |

**RLS:**  
- Los usuarios solo pueden ver/editar/eliminar sus propios posts.  

---

## 💳 Tabla: `admin_logs`

Registra todas las acciones administrativas realizadas por un administrador.

| Columna | Tipo | Descripción |
|----------|------|-------------|
| **id** | `uuid` | Identificador del log. |
| **admin_id** | `uuid` | ID del administrador (FK a `profiles.id`). |
| **action** | `text` | Descripción de la acción (ej: “add_credits”, “change_plan”). |
| **target_user** | `uuid` | Usuario afectado (FK a `profiles.id`). |
| **metadata** | `jsonb` | Detalles adicionales del evento. |
| **created_at** | `timestamptz` | Fecha del evento. |

**RLS:**  
- Solo accesible por usuarios con `role = 'admin'`.

---

## 📜 Tabla: `logs`

Registro general de eventos de usuario y del sistema.

| Columna | Tipo | Descripción |
|----------|------|-------------|
| **id** | `uuid` | Identificador del log. |
| **user_id** | `uuid` | Usuario relacionado (FK a `profiles.id`). |
| **type** | `text` | Tipo de evento (`login`, `generation`, `payment`, `error`, etc.). |
| **message** | `text` | Descripción del evento. |
| **metadata** | `jsonb` | Información adicional (opcional). |
| **created_at** | `timestamptz` | Fecha del evento. |

**RLS:**  
- Los usuarios solo pueden ver sus propios logs.  
- Los admins pueden ver todos.

---

## 🗓️ Tabla: `schedule`

Gestor de contenido programado (para el calendario o publicaciones futuras).

| Columna | Tipo | Descripción |
|----------|------|-------------|
| **id** | `uuid` | Identificador único. |
| **user_id** | `uuid` | Usuario propietario (FK a `profiles.id`). |
| **content** | `text` | Contenido del post programado. |
| **scheduled_for** | `timestamptz` | Fecha/hora programada para publicar. |
| **status** | `text` | Estado del contenido (`pending`, `published`, `cancelled`). |
| **post_id** | `uuid` | Referencia al post original (opcional). |
| **created_at** | `timestamptz` | Fecha de creación. |
| **updated_at** | `timestamptz` | Fecha de última actualización. |

**Trigger:**  
`update_schedule_updated_at` → actualiza automáticamente `updated_at` en cada cambio.

---

## 📊 Vistas: `user_stats` y `global_stats`

### `user_stats`
Muestra métricas individuales por usuario:

| Campo | Descripción |
|--------|--------------|
| id | ID del usuario |
| email | Correo |
| plan | Plan actual |
| credits | Créditos disponibles |
| total_posts | Total de posts generados |
| scheduled_posts | Total de publicaciones programadas |
| last_post_date | Último post creado |
| user_since | Fecha de registro |

### `global_stats`
Muestra métricas generales para el panel admin:

| Campo | Descripción |
|--------|--------------|
| total_users | Total de usuarios |
| paying_users | Usuarios con plan de pago |
| total_posts | Total de posts generados |
| total_scheduled | Total de posts programados |
| total_credits_remaining | Créditos activos en la plataforma |
| users_last_30_days | Nuevos usuarios últimos 30 días |
| posts_last_30_days | Posts creados últimos 30 días |

---

## ⚙️ Funciones internas (SQL Functions)

| Nombre | Descripción |
|---------|--------------|
| `update_updated_at_column()` | Actualiza automáticamente `updated_at` en la tabla `schedule`. |
| `log_event(user_id, type, message, metadata)` | Crea un log de acción de usuario. |
| `log_admin_action(action, target_user, metadata)` | Crea un log de acción administrativa. |

---

## 🔒 Seguridad (RLS y roles)

| Rol | Permisos principales |
|------|----------------------|
| `authenticated` | CRUD limitado sobre sus propios datos en `profiles`, `posts`, `schedule`. |
| `admin` | Acceso total a `admin_logs`, `logs`, `global_stats`, y gestión de usuarios. |
| `service_role` | Permite inserciones automáticas desde el backend. |

---

## 🧭 Notas para futuras versiones

| Feature futura | Requiere | Estado |
|----------------|-----------|---------|
| Perfil público de usuario (`/u/username`) | `bio`, `headline`, `photo_url`, `website` | 🟢 Preparado |
| Personalización IA (tono / estilo) | `bio`, `headline`, `expertise` | 🟢 Preparado |
| Equipos o “workspaces” | Nueva tabla `teams` | ⚪ Pendiente |
| Métricas financieras en admin panel | Integración Stripe API | 🟡 Parcial |
| CRM interno / retención usuarios | Extensión `pgvector` o `pgml` | ⚪ Pendiente |

---

## 🧾 Última migración aplicada
**Kolink v0.6.2 — “Profile Fields Consolidation & Analytics Expansion”**  
Fecha: Octubre 2025  
Incluye: nuevas columnas de perfil (`bio`, `headline`, `expertise`, `location`, `photo_url`, `company`, `position`, `website`), vistas limpias y esquema documentado.

---

## 🧑‍💻 Autor
**Alejandro Zakzuk** — Médico & AI Developer  
Proyecto: **Kolink** — *IA aplicada a estrategia y branding profesional en LinkedIn.*

