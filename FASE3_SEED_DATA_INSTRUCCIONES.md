# FASE 3 - Instrucciones para Seed Data

## Problema Encontrado

El service role key no tiene permisos para insertar directamente en `inspiration_posts` debido a las políticas RLS.

## Solución: Ejecutar SQL Manualmente

### Paso 1: Ir al SQL Editor de Supabase

1. Ve a [Supabase Dashboard](https://app.supabase.com)
2. Selecciona tu proyecto Kolink
3. Menú lateral → **SQL Editor**
4. Clic en **"New Query"**

### Paso 2: Ejecutar el Script SQL

1. Abre el archivo: `scripts/seed_inspiration_posts.sql`
2. Copia TODO el contenido
3. Pega en el SQL Editor
4. Clic en **"Run"** ▶️ (esquina inferior derecha)
5. Verifica que dice "Success" ✅

Este script insertará 15 posts de ejemplo.

### Paso 3: Verificar la Inserción

En el mismo SQL Editor, ejecuta:

```sql
-- Ver total de posts
SELECT COUNT(*) as total_posts FROM inspiration_posts;

-- Ver por plataforma
SELECT platform, COUNT(*) as count
FROM inspiration_posts
GROUP BY platform;

-- Ver top posts por viral score
SELECT author, title, (metrics->>'viralScore')::int as viral_score
FROM inspiration_posts
ORDER BY (metrics->>'viralScore')::int DESC
LIMIT 10;
```

Deberías ver:
```
total_posts: 15
platform: linkedin, count: 15
```

---

## Alternativa: Insertar los 50 Posts Completos

Si quieres los 50 posts, tienes 3 opciones:

### Opción A: SQL Editor (Manual - 10 min)

1. Abre el SQL Editor
2. Para cada batch de posts, ejecuta:

```sql
-- Copia los valores INSERT INTO de data/inspiration_posts.json
-- Convertidos a formato SQL (escapar comillas, etc.)
```

### Opción B: Deshabilitar RLS Temporalmente (SOLO SI NECESARIO)

⚠️ **ADVERTENCIA:** Esto permite acceso público temporalmente. Usa con precaución.

```sql
-- 1. Deshabilitar RLS
ALTER TABLE inspiration_posts DISABLE ROW LEVEL SECURITY;

-- 2. Ejecutar: npx ts-node scripts/seed_inspiration_posts.ts

-- 3. Re-habilitar RLS
ALTER TABLE inspiration_posts ENABLE ROW LEVEL SECURITY;
```

### Opción C: Crear Función Privilegiada (Recomendado)

```sql
-- Crear función que bypasea RLS
CREATE OR REPLACE FUNCTION seed_inspiration_posts_batch(posts_data jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO inspiration_posts (platform, author, title, content, summary, metrics, tags, source_url)
  SELECT
    (post->>'platform')::text,
    (post->>'author')::text,
    (post->>'title')::text,
    (post->>'content')::text,
    (post->>'summary')::text,
    (post->'metrics')::jsonb,
    ARRAY(SELECT jsonb_array_elements_text(post->'tags')),
    (post->>'source_url')::text
  FROM jsonb_array_elements(posts_data) as post;
END;
$$;

-- Dar permisos
GRANT EXECUTE ON FUNCTION seed_inspiration_posts_batch TO service_role;
```

Luego ejecutar: `npx ts-node scripts/seed_via_function.ts`

---

## Estado Actual

✅ **Archivos creados:**
- `data/inspiration_posts.json` - 50 posts curados
- `scripts/seed_inspiration_posts.ts` - Script TypeScript (tiene problemas de permisos)
- `scripts/seed_inspiration_posts.sql` - Script SQL con 15 posts (USAR ESTE)

⏳ **Próximo paso:**
Una vez insertados los posts, ejecutar:
```bash
npx ts-node scripts/generate_embeddings.ts
```

---

## Recomendación

Para ahorrar tiempo:

1. ✅ Ejecuta `scripts/seed_inspiration_posts.sql` en SQL Editor (15 posts, 2 min)
2. ✅ Continúa con generar embeddings
3. ⏸️ Puedes agregar los otros 35 posts después si lo necesitas

**15 posts son suficientes para demostrar la funcionalidad completa del Inspiration Hub.**

---

## ¿Listo para continuar?

Una vez hayas ejecutado el SQL y verificado que hay posts en la tabla, confirma con:

```bash
# Verificar desde terminal (debería funcionar la lectura)
npx ts-node -e "
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
supabase.from('inspiration_posts')
  .select('count')
  .then(({count}) => console.log('Posts:', count));
"
```

Si ves `Posts: 15`, ¡estás listo para el siguiente paso!
