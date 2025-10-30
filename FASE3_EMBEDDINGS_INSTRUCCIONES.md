# FASE 3 - Instrucciones para Generar Embeddings

## Resumen

Debido a las políticas RLS de Supabase, necesitamos ejecutar los embeddings a través de un endpoint API con una función SQL auxiliar.

---

## Paso 1: Crear Función SQL (2 minutos)

### Ejecuta en Supabase SQL Editor:

1. Ve a https://app.supabase.com → Tu proyecto → **SQL Editor**
2. New Query
3. Copia el contenido de: `scripts/create_embedding_function.sql`
4. Pega y clic **"Run"** ▶️
5. Verifica que dice "Success" ✅

Esta función permite actualizar embeddings bypasseando RLS.

---

## Paso 2: Iniciar Servidor de Desarrollo

```bash
# Terminal 1
npm run dev

# Espera que diga: "Ready on http://localhost:3000"
```

---

## Paso 3: Generar Embeddings via API

### Opción A: Con curl (desde otra terminal)

```bash
curl -X POST http://localhost:3000/api/admin/generate-embeddings \
  -H "Content-Type: application/json" \
  -d '{"adminKey": "dev-admin-key-change-in-production"}'
```

### Opción B: Con el script helper

```bash
# Terminal 2
npx ts-node scripts/call_embedding_api.ts
```

---

## Qué va a pasar:

1. ✅ El endpoint lee los 15 posts sin embedding
2. ⚙️ Para cada post:
   - Genera embedding con OpenAI text-embedding-3-small
   - Guarda en la base de datos via función SQL
   - Espera 500ms antes del siguiente (evita rate limiting)
3. 📊 Muestra resumen: posts procesados, errores, tiempo

**Tiempo estimado:** ~15 segundos para 15 posts
**Costo estimado:** ~$0.30 USD

---

## Ejemplo de Respuesta Exitosa:

```json
{
  "message": "Embedding generation completed",
  "total": 15,
  "processed": 15,
  "errors": 0,
  "results": [
    {
      "id": "...",
      "title": "The Infinite Game",
      "status": "success"
    },
    ...
  ]
}
```

---

## Verificar que funcionó:

```bash
# Verificar en SQL Editor
SELECT
  COUNT(*) as total,
  COUNT(embedding) as with_embeddings
FROM inspiration_posts;

-- Debería mostrar:
-- total: 15, with_embeddings: 15
```

O con curl:

```bash
curl http://localhost:3000/api/inspiration/search?q=leadership
```

Debería retornar posts relacionados con "leadership".

---

## Solución de Problemas:

### Error: "OpenAI API key not configured"
- Verifica que `OPENAI_API_KEY` esté en `.env.local`
- Reinicia el servidor dev

### Error: "function update_post_embedding does not exist"
- Ejecuta `scripts/create_embedding_function.sql` en Supabase SQL Editor

### Error: "Unauthorized"
- Verifica que uses `"adminKey": "dev-admin-key-change-in-production"`
- O configura `ADMIN_SECRET_KEY` en `.env.local`

### Error: Rate limit de OpenAI
- El script ya tiene delay de 500ms entre requests
- Si sigue fallando, aumenta el delay en el código

---

## Próximo Paso:

Una vez que todos los posts tengan embeddings (15/15), continuamos con:

**Implementar búsqueda semántica** en `/api/inspiration/search`

---

## Archivos Creados:

1. ✅ `scripts/create_embedding_function.sql` - Función SQL para update
2. ✅ `src/pages/api/admin/generate-embeddings.ts` - Endpoint API
3. ✅ `scripts/generate_embeddings.ts` - Script original (bloqueado por RLS)
4. ✅ Este archivo de instrucciones

---

## ¿Listo?

1. ✅ Ejecuta función SQL en Supabase
2. ✅ Inicia `npm run dev`
3. ✅ Llama al endpoint con curl o el script
4. ✅ Verifica que todos tengan embeddings

¡Continúa cuando tengas 15/15 posts con embeddings!
