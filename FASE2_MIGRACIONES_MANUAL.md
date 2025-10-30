# FASE 2 - Instrucciones para Completar Migraciones Manualmente

## Estado Actual

✅ **9/10 tablas existen y funcionan correctamente**

❌ **1 tabla faltante:** `inspiration_posts` (requiere pgvector)

⚠️ **Extensiones requeridas:** pgvector

---

## Paso 1: Habilitar pgvector en Supabase

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Navega a **Database → Extensions** en el menú lateral
3. Busca **"vector"** en la lista de extensiones
4. Haz clic en **"Enable"** junto a la extensión `vector`
5. Espera a que se complete la instalación (puede tardar unos segundos)

---

## Paso 2: Crear tabla inspiration_posts

### Opción A: Desde SQL Editor en Supabase Dashboard

1. Ve a **SQL Editor** en el menú lateral de Supabase
2. Crea una nueva query
3. Copia y pega el contenido del archivo:
   ```
   supabase/migrations/20250101000500_create_inspiration.sql
   ```
4. Haz clic en **"Run"**
5. Verifica que no hay errores

### Opción B: Desde la línea de comandos (si tienes acceso directo a PostgreSQL)

```bash
# Si tienes la DATABASE_URL configurada
cat supabase/migrations/20250101000500_create_inspiration.sql | psql $DATABASE_URL

# O con supabase CLI (si está conectado)
supabase db push
```

---

## Paso 3: Verificar que todo funciona

Ejecuta el script de verificación:

```bash
npx ts-node scripts/verify_migrations.ts
```

Deberías ver:

```
✅ Tablas existentes: 10/10
```

---

## ¿Por qué no se aplicó automáticamente?

Supabase protege ciertas operaciones sensibles (como habilitar extensiones y ejecutar SQL arbitrario) y requiere que se hagan manualmente desde el Dashboard o con acceso directo a PostgreSQL por seguridad.

---

## Tablas que se crearán

1. **inspiration_posts** - Hub de inspiración con posts curados
   - Almacena contenido viral de LinkedIn, Twitter, etc.
   - Incluye embeddings vectoriales para búsqueda semántica
   - Métricas de engagement

2. **saved_posts** - Posts guardados por usuarios
   - Referencias a inspiration_posts
   - Notas personales del usuario

3. **saved_searches** - Búsquedas guardadas
   - Filtros y criterios de búsqueda
   - Para repetir búsquedas rápidamente

---

## Siguiente paso

Una vez completados estos pasos manualmente, FASE 2 continuará con:
- ✅ Migraciones completadas
- 🔄 Rate limiting
- 🔄 Tests E2E
