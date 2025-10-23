# Kolink Supabase Setup

Esta carpeta contiene toda la configuración de Supabase para Kolink.

## 📁 Estructura

```
supabase/
├── migrations/          # Migraciones de base de datos (ordenadas por timestamp)
│   ├── 20250101000000_enable_extensions.sql
│   ├── 20250101000100_create_profiles.sql
│   ├── 20250101000200_create_posts.sql
│   ├── 20250101000300_create_usage_stats.sql
│   ├── 20250101000400_create_admin_tables.sql
│   ├── 20250101000500_create_inspiration.sql
│   ├── 20250101000600_create_calendar.sql
│   ├── 20250101000700_create_analytics.sql
│   ├── 20250101000800_create_inbox.sql
│   ├── 20250101000900_create_functions.sql
│   ├── 20250101001000_create_views.sql
│   └── 20250101001100_create_triggers.sql
├── config.toml          # Configuración de Supabase CLI
├── seed.sql             # Datos iniciales (opcional)
└── .gitignore           # Archivos a ignorar

```

## 🚀 Quick Start

### 1. Instalar Supabase CLI

```bash
# macOS
brew install supabase/tap/supabase

# npm (alternativa)
npm install -g supabase
```

### 2. Login y vincular proyecto

```bash
# Login (abre navegador)
supabase login

# Vincular con proyecto remoto
supabase link --project-ref TU_PROJECT_ID
```

**¿Dónde encuentro el PROJECT_ID?**
- Ve a https://supabase.com/dashboard
- URL del proyecto: `https://supabase.com/dashboard/project/[TU_PROJECT_ID]`

### 3. Aplicar migraciones

```bash
# Ver migraciones pendientes
supabase migration list

# Aplicar todas las migraciones
supabase db push
```

### 4. Verificar instalación

```bash
# Ver tablas creadas
supabase db remote list

# Debería mostrar 13 tablas:
# - profiles
# - posts
# - usage_stats
# - admin_notifications
# - admin_audit_logs
# - inspiration_posts
# - saved_posts
# - saved_searches
# - calendar_events
# - analytics_events
# - lead_insights
# - inbox_messages
# - user_achievements
```

## 🔧 Comandos Útiles

### Desarrollo Local

```bash
# Iniciar Supabase localmente (requiere Docker)
supabase start

# Detener
supabase stop

# Resetear base de datos local
supabase db reset
```

### Migraciones

```bash
# Crear nueva migración
supabase migration new nombre_migracion

# Ver diferencias local vs remoto
supabase db diff

# Aplicar a remoto
supabase db push

# Descargar estado remoto
supabase db pull
```

### Sincronización

```bash
# Descargar cambios de remoto
supabase db pull

# Subir cambios a remoto
supabase db push
```

## 📚 Documentación

- **Guía completa:** Ver `INSTRUCCIONES_SUPABASE_CLI.md` en la raíz del proyecto
- **Documentación oficial:** https://supabase.com/docs/guides/cli
- **Migraciones:** https://supabase.com/docs/guides/cli/local-development#database-migrations

## ⚠️ Importante

- **NUNCA** hacer cambios manuales en producción sin migración
- **SIEMPRE** crear migraciones para cambios de schema
- **NUNCA** commitear secretos (`.env`, `signing_keys.json`)
- **SIEMPRE** usar `env(VARIABLE)` en config.toml para secretos

## 🆘 Troubleshooting

### Error: "Extension 'vector' not available"
- Plan gratuito no incluye vector extension
- Comenta la línea en `20250101000000_enable_extensions.sql`
- La búsqueda semántica no funcionará pero el resto sí

### Error: "Migration already applied"
```bash
supabase migration list  # Ver historial
```

### Error: "Permission denied"
```bash
supabase login  # Re-autenticar
```

## ✅ Checklist

- [ ] Supabase CLI instalada
- [ ] Proyecto vinculado (`supabase link`)
- [ ] Migraciones aplicadas (`supabase db push`)
- [ ] 13 tablas verificadas (`supabase db remote list`)
- [ ] App funciona correctamente

---

**Última actualización:** 2025-01-01
**Versión Kolink:** v0.6
