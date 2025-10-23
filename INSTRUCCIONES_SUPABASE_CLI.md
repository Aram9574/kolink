# 🚀 Configuración de Supabase con CLI

Esta guía te ayudará a configurar Kolink con Supabase CLI de forma profesional.

---

## 📋 Tabla de Contenidos

1. [¿Por qué usar Supabase CLI?](#por-qué-usar-supabase-cli)
2. [Instalación de la CLI](#instalación-de-la-cli)
3. [Configuración Inicial](#configuración-inicial)
4. [Aplicar Migraciones](#aplicar-migraciones)
5. [Comandos Útiles](#comandos-útiles)
6. [Troubleshooting](#troubleshooting)

---

## 🎯 ¿Por qué usar Supabase CLI?

### ✅ Ventajas:
- **Control de versiones**: Cada cambio en la base de datos queda registrado
- **Sincronización**: Trabaja local y luego despliega a producción
- **Rollback**: Si algo falla, puedes volver atrás
- **Trabajo en equipo**: Todos los devs tienen las mismas migraciones
- **Testing local**: Prueba cambios sin afectar producción

### ❌ Desventajas del SQL Editor manual:
- Sin historial de cambios
- Sin control de versiones
- Difícil de revertir errores
- No se puede trabajar en equipo fácilmente

---

## 📦 Instalación de la CLI

### macOS (Homebrew):
```bash
brew install supabase/tap/supabase
```

### macOS/Linux (npm - alternativa):
```bash
npm install -g supabase
```

### Windows (Scoop):
```bash
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### Verificar instalación:
```bash
supabase --version
# Debería mostrar: supabase version 1.x.x
```

---

## 🔧 Configuración Inicial

### Paso 1: Inicializar Supabase en el proyecto

Desde la raíz de tu proyecto (`/Users/aramzakzuk/Proyectos/kolink`):

```bash
# Inicializar Supabase (crea carpeta supabase/ con estructura)
supabase init
```

Esto creará:
```
kolink/
├── supabase/
│   ├── config.toml          # Configuración del proyecto
│   ├── seed.sql             # Datos iniciales (opcional)
│   └── migrations/          # Carpeta de migraciones (vacía por ahora)
```

### Paso 2: Conectar con tu proyecto remoto

```bash
# Login en Supabase (abrirá navegador para autenticar)
supabase login

# Vincular con tu proyecto remoto
supabase link --project-ref TU_PROJECT_ID
```

**¿Dónde encuentro mi PROJECT_ID?**
1. Ve a https://supabase.com/dashboard
2. Abre tu proyecto Kolink
3. En la URL verás: `https://supabase.com/dashboard/project/TU_PROJECT_ID`
4. Copia ese ID

**Ejemplo:**
```bash
supabase link --project-ref abcdefghijklmnop
```

### Paso 3: Configurar credenciales

Crea un archivo `.env.local` (si no existe) o actualiza el existente:

```bash
# Añadir al final del archivo:
SUPABASE_ACCESS_TOKEN=tu_token_aqui
```

**¿Dónde obtengo el token?**
1. Ve a https://supabase.com/dashboard/account/tokens
2. Click en "Generate new token"
3. Nómbralo "kolink-cli"
4. Copia el token

---

## 🗃️ Aplicar Migraciones

### Opción A: Generar migración desde estado actual (si ya tienes tablas)

Si ya ejecutaste el SQL manualmente:

```bash
# Esto generará una migración con el estado actual de tu DB
supabase db pull
```

Esto creará un archivo en `supabase/migrations/TIMESTAMP_remote_schema.sql` con todas las tablas actuales.

### Opción B: Crear migraciones desde cero (recomendado)

Ya he preparado las migraciones organizadas. Solo tienes que aplicarlas:

```bash
# Ver migraciones pendientes
supabase db diff

# Aplicar todas las migraciones a la base de datos remota
supabase db push
```

### Ver estado de migraciones:
```bash
# Lista de migraciones aplicadas
supabase migration list
```

---

## 📂 Estructura de Migraciones Creadas

He dividido el SQL grande en migraciones lógicas y ordenadas:

```
supabase/migrations/
├── 20250101000000_enable_extensions.sql        # Extensiones (pgcrypto, vector, uuid)
├── 20250101000100_create_profiles.sql          # Tabla profiles
├── 20250101000200_create_posts.sql             # Tabla posts
├── 20250101000300_create_usage_stats.sql       # Tabla usage_stats
├── 20250101000400_create_admin_tables.sql      # admin_notifications, admin_audit_logs
├── 20250101000500_create_inspiration.sql       # inspiration_posts, saved_posts, saved_searches
├── 20250101000600_create_calendar.sql          # calendar_events
├── 20250101000700_create_analytics.sql         # analytics_events, lead_insights
├── 20250101000800_create_inbox.sql             # inbox_messages, user_achievements
├── 20250101000900_create_functions.sql         # Funciones útiles (grant_xp, update_streak, etc.)
├── 20250101001000_create_views.sql             # Vistas útiles
└── 20250101001100_create_triggers.sql          # Triggers automáticos
```

**Ventajas de esta estructura:**
- ✅ Cada archivo es independiente y pequeño
- ✅ Fácil de revisar y debugear
- ✅ Se aplican en orden automáticamente
- ✅ Si una falla, sabes exactamente cuál

---

## 🛠️ Comandos Útiles

### Desarrollo Local:

```bash
# Iniciar Supabase local con Docker (opcional pero recomendado)
supabase start

# Detener Supabase local
supabase stop

# Resetear base de datos local (útil para testing)
supabase db reset
```

### Migraciones:

```bash
# Crear nueva migración vacía
supabase migration new nombre_de_migracion

# Ver diferencias entre local y remoto
supabase db diff

# Aplicar migraciones a remoto
supabase db push

# Descargar estado actual de remoto
supabase db pull
```

### Inspección:

```bash
# Ver tablas en la base de datos remota
supabase db remote list

# Ver funciones
supabase db remote functions

# Ver tipos
supabase db remote types
```

### Sincronización:

```bash
# Pull: Descargar cambios de remoto a local
supabase db pull

# Push: Subir cambios de local a remoto
supabase db push
```

---

## 🔍 Comandos de Verificación

Después de aplicar las migraciones, verifica que todo esté correcto:

### 1. Ver todas las tablas:
```bash
supabase db remote list
```

**Deberías ver:**
```
profiles
posts
usage_stats
admin_notifications
admin_audit_logs
inspiration_posts
saved_posts
saved_searches
calendar_events
analytics_events
lead_insights
inbox_messages
user_achievements
```

### 2. Probar conexión desde tu app:

```bash
# Desde la raíz del proyecto
npm run dev
```

Luego visita `http://localhost:3000` y prueba:
- Crear cuenta
- Login
- Generar un post
- Ver dashboard

---

## 🚨 Troubleshooting

### Error: "supabase: command not found"
**Solución:**
```bash
# Reinstalar con npm
npm install -g supabase

# O con Homebrew
brew install supabase/tap/supabase
```

### Error: "Project not linked"
**Solución:**
```bash
# Re-vincular con proyecto
supabase link --project-ref TU_PROJECT_ID
```

### Error: "Permission denied"
**Solución:**
```bash
# Hacer login de nuevo
supabase login

# O usar token directamente
export SUPABASE_ACCESS_TOKEN=tu_token_aqui
```

### Error: "Migration already applied"
**Solución:**
```bash
# Ver historial
supabase migration list

# Si necesitas revertir, crea una nueva migración con el cambio inverso
supabase migration new revert_cambio
```

### Error: "Extension 'vector' not available"
**Causa:** Plan gratuito de Supabase no incluye vector extension.

**Solución:**
1. Comenta la línea en la migración:
```sql
-- CREATE EXTENSION IF NOT EXISTS "vector";
```
2. Re-ejecuta: `supabase db push`

**Nota:** La búsqueda semántica no funcionará, pero el resto sí.

### Error: "Relation already exists"
**Causa:** Ya ejecutaste el SQL manualmente antes.

**Solución:**
```bash
# Opción 1: Generar migración desde estado actual
supabase db pull

# Opción 2: Resetear y aplicar desde cero (CUIDADO: borra datos)
# Solo en desarrollo, NUNCA en producción
supabase db reset --linked  # Para remoto
```

---

## 📊 Workflow Recomendado

### Para desarrollo:

1. **Trabajar local con Docker:**
```bash
supabase start
npm run dev
```

2. **Hacer cambios en migraciones:**
```bash
supabase migration new agregar_columna_x
# Edita el archivo generado
```

3. **Aplicar en local:**
```bash
supabase db reset  # Resetea local y aplica todas las migraciones
```

4. **Cuando esté listo, aplicar en remoto:**
```bash
supabase db push
```

### Para producción:

```bash
# 1. Ver qué migraciones están pendientes
supabase migration list

# 2. Aplicar migraciones
supabase db push

# 3. Verificar
supabase db remote list
```

---

## 📚 Recursos Adicionales

- **Documentación oficial:** https://supabase.com/docs/guides/cli
- **CLI Reference:** https://supabase.com/docs/reference/cli/introduction
- **Migraciones:** https://supabase.com/docs/guides/cli/local-development#database-migrations
- **YouTube Tutorial:** https://www.youtube.com/watch?v=j9jUqRkhWqY

---

## ✅ Checklist Final

Después de completar esta guía, deberías tener:

- [ ] Supabase CLI instalada
- [ ] Proyecto vinculado (`supabase link`)
- [ ] Migraciones aplicadas (`supabase db push`)
- [ ] 13 tablas creadas
- [ ] 9 funciones creadas
- [ ] 4 vistas creadas
- [ ] RLS habilitado en todas las tablas
- [ ] App corriendo correctamente (`npm run dev`)

---

## 🎉 ¡Listo!

Tu base de datos de Kolink está configurada de forma profesional con control de versiones. Ahora puedes:

- ✅ Trabajar en local con Docker
- ✅ Versionar cambios en Git
- ✅ Desplegar a producción de forma controlada
- ✅ Hacer rollback si algo falla
- ✅ Trabajar en equipo sin conflictos

**Próximo paso:** Ejecutar `supabase db push` y empezar a usar Kolink 🚀
