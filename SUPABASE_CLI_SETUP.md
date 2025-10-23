# 🚀 Configuración de Supabase con CLI - Kolink

## ✅ ¿Qué se ha configurado?

He preparado una configuración profesional de Supabase usando la CLI. **Esto es mucho mejor que copiar y pegar SQL manualmente** porque:

1. ✅ **Control de versiones**: Cada cambio queda registrado
2. ✅ **Migraciones ordenadas**: Se aplican en el orden correcto automáticamente
3. ✅ **Sincronización**: Trabaja local → despliega a producción
4. ✅ **Rollback**: Si algo falla, puedes volver atrás
5. ✅ **Trabajo en equipo**: Todos comparten las mismas migraciones

---

## 📂 Estructura Creada

```
kolink/
├── supabase/
│   ├── migrations/          # ✨ 12 archivos de migración
│   │   ├── 20250101000000_enable_extensions.sql
│   │   ├── 20250101000100_create_profiles.sql
│   │   ├── 20250101000200_create_posts.sql
│   │   ├── 20250101000300_create_usage_stats.sql
│   │   ├── 20250101000400_create_admin_tables.sql
│   │   ├── 20250101000500_create_inspiration.sql
│   │   ├── 20250101000600_create_calendar.sql
│   │   ├── 20250101000700_create_analytics.sql
│   │   ├── 20250101000800_create_inbox.sql
│   │   ├── 20250101000900_create_functions.sql
│   │   ├── 20250101001000_create_views.sql
│   │   └── 20250101001100_create_triggers.sql
│   ├── config.toml          # Configuración CLI
│   ├── seed.sql             # Datos iniciales
│   ├── .gitignore           # Ignorar archivos locales
│   └── README.md            # Guía rápida
├── INSTRUCCIONES_SUPABASE_CLI.md  # 📖 Guía completa paso a paso
└── SUPABASE_CLI_SETUP.md          # 📄 Este archivo (resumen)
```

---

## 🎯 Próximos Pasos (3 comandos)

### 1️⃣ Instalar Supabase CLI

**macOS (Homebrew):**
```bash
brew install supabase/tap/supabase
```

**Verificar:**
```bash
supabase --version
# Debe mostrar: supabase version 1.x.x
```

---

### 2️⃣ Conectar con tu proyecto

```bash
# Login (abre navegador)
supabase login

# Vincular con tu proyecto
supabase link --project-ref TU_PROJECT_ID
```

**¿Dónde encuentro mi PROJECT_ID?**
1. Ve a https://supabase.com/dashboard
2. Abre tu proyecto Kolink
3. En la URL verás: `https://supabase.com/dashboard/project/[AQUI_ESTA]`

---

### 3️⃣ Aplicar todas las migraciones

```bash
# Ver qué se va a aplicar
supabase migration list

# Aplicar TODAS las migraciones a producción
supabase db push
```

**Esto creará:**
- ✅ 13 tablas
- ✅ 9 funciones útiles
- ✅ 4 vistas
- ✅ Triggers automáticos
- ✅ RLS habilitado en todo

---

## ✅ Verificar que funcionó

```bash
# Ver tablas creadas
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

---

## 🔧 Comandos que usarás frecuentemente

### Ver estado:
```bash
supabase migration list          # Migraciones aplicadas
supabase db remote list          # Tablas en producción
```

### Crear cambios:
```bash
supabase migration new nombre_cambio   # Nueva migración
supabase db diff                        # Ver diferencias
supabase db push                        # Aplicar a producción
```

### Desarrollo local (opcional):
```bash
supabase start      # Iniciar DB local (requiere Docker)
supabase stop       # Detener
supabase db reset   # Resetear local y re-aplicar migraciones
```

---

## 📚 Documentación Completa

Para una guía detallada con troubleshooting y ejemplos, consulta:

- **Guía completa:** `INSTRUCCIONES_SUPABASE_CLI.md`
- **Quick start:** `supabase/README.md`
- **Docs oficiales:** https://supabase.com/docs/guides/cli

---

## 🆘 Problemas Comunes

### ❌ "Extension 'vector' not available"
**Causa:** Plan gratuito no incluye vector extension

**Solución:**
1. Edita `supabase/migrations/20250101000000_enable_extensions.sql`
2. Comenta la línea:
   ```sql
   -- CREATE EXTENSION IF NOT EXISTS "vector";
   ```
3. Re-ejecuta: `supabase db push`

**Impacto:** La búsqueda semántica no funcionará, pero todo lo demás sí.

---

### ❌ "Migration already applied"
**Causa:** Ya ejecutaste migraciones manualmente

**Solución:**
```bash
# Ver historial
supabase migration list

# Si necesitas sincronizar, descarga el estado actual
supabase db pull
```

---

### ❌ "Project not linked"
**Solución:**
```bash
supabase link --project-ref TU_PROJECT_ID
```

---

## 🎉 Ventajas de esta Configuración

### ✅ Antes (SQL manual):
- ❌ Sin historial de cambios
- ❌ Difícil de revertir errores
- ❌ No se puede trabajar en equipo
- ❌ Sin control de versiones
- ❌ Riesgo de aplicar cambios fuera de orden

### ✅ Ahora (Supabase CLI):
- ✅ Historial completo de cambios
- ✅ Rollback fácil
- ✅ Trabajo en equipo sin conflictos
- ✅ Control de versiones en Git
- ✅ Migraciones ordenadas automáticamente
- ✅ Testing local con Docker
- ✅ Sincronización local ↔ producción

---

## 📝 Notas Importantes

1. **NUNCA** modifiques las migraciones ya aplicadas
2. **SIEMPRE** crea nuevas migraciones para cambios
3. **NUNCA** commitees archivos con secretos (`.env`, `signing_keys.json`)
4. **SIEMPRE** usa `env(VARIABLE)` en `config.toml` para secretos

---

## 🚀 Resumen de 30 Segundos

```bash
# 1. Instalar
brew install supabase/tap/supabase

# 2. Conectar
supabase login
supabase link --project-ref TU_PROJECT_ID

# 3. Aplicar
supabase db push

# 4. Verificar
supabase db remote list

# ✅ ¡Listo! Base de datos configurada
```

---

**Última actualización:** 2025-01-01
**Versión Kolink:** v0.6
**Autor:** Claude Code

---

## 📧 Soporte

Si tienes problemas:
1. Revisa `INSTRUCCIONES_SUPABASE_CLI.md` (guía completa)
2. Consulta `supabase/README.md` (quick reference)
3. Revisa docs oficiales: https://supabase.com/docs/guides/cli
4. Troubleshooting: https://supabase.com/docs/guides/cli/troubleshooting

---

**¡Feliz desarrollo! 🎉**
