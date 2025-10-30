# ⚡ EJECUTAR MIGRACIÓN TOKEN ENCRYPTION - INSTRUCCIONES RÁPIDAS

## 🎯 Resumen
El SQL de encriptación ya está copiado en tu portapapeles. Solo necesitas pegarlo en Supabase.

## 📝 Pasos (2 minutos):

### 1. Abre Supabase Dashboard
Visita: https://app.supabase.com/project/crdtxyfvbosjiddirtzc

### 2. Ve al SQL Editor
- Click en "SQL Editor" en el menú lateral izquierdo
- Click en "+ New Query"

### 3. Pega y Ejecuta
- Pega el SQL (Cmd+V / Ctrl+V) - **Ya está en tu portapapeles**
- Click en "Run" o presiona `Cmd+Enter` / `Ctrl+Enter`

### 4. Verifica
Deberías ver:
```
status
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Token encryption setup completed!
```

---

## 🔧 Si el SQL no está en el portapapeles:

Opción A - Copiar nuevamente:
```bash
cat scripts/apply_token_encryption.sql | pbcopy
```

Opción B - Ver el archivo:
```bash
cat scripts/apply_token_encryption.sql
```

---

## ✅ ¿Qué hace esta migración?

1. ✅ **Habilita pgcrypto** - Extensión para encriptación AES-256
2. ✅ **Función encrypt_token** - Encripta tokens antes de guardar en BD
3. ✅ **Función decrypt_token** - Desencripta tokens al leer de BD
4. ✅ **Columnas encriptadas** - Agrega:
   - `linkedin_access_token_encrypted`
   - `linkedin_refresh_token_encrypted`
5. ✅ **Índices** - Para búsquedas rápidas
6. ✅ **Documentación** - Comentarios en las columnas

---

## 🔐 Variable de Entorno

La clave de encriptación ya está configurada en `.env.local`:

```bash
ENCRYPTION_KEY=0d7318797a93cfc95328ad41cb75db227bd1bc77964468cdf368fc51438b7e0b
```

**⚠️ IMPORTANTE:** Cuando despliegues a producción (Vercel), agrega esta variable:

1. Ve a Vercel Dashboard → Settings → Environment Variables
2. Agrega `ENCRYPTION_KEY` con el mismo valor
3. Redeploy la aplicación

---

## 🧪 Probar la Encriptación

Una vez ejecutada la migración, puedes probar:

```bash
npx ts-node scripts/test_encryption.ts
```

Deberías ver:
```
🎉 All Tests Passed!
✅ Encryption configured correctly
✅ Basic encryption/decryption works
✅ LinkedIn tokens encryption works
✅ Null/undefined handling works
✅ Randomized IV works
✅ Invalid data handling works

Ready for production! 🚀
```

---

## 📊 Estado del Sprint 3

**Completados:**
- ✅ Task 1: Language Selector (100%)
- ✅ Task 2: Saved Posts Viewing Page (100%)
- ✅ Task 4: Enhanced Profile Settings (100%)
- ✅ Task 5: Token Encryption (100%)

**Pendientes:**
- ⏳ Task 3: PostHog Analytics Integration (dejado para el final)
- ⏳ Task 6: CRUD Saved Searches (opcional)
- ⏳ Task 7: Bulk Embedding Tool (opcional)
- ⏳ Task 8: Advanced Analytics Dashboard (opcional)

---

## 🚨 Si hay algún error:

1. **Extension already exists** - Es normal, ignóralo
2. **Function already exists** - Perfecto, ya está creada
3. **Column already exists** - Significa que ya se ejecutó antes
4. **Permission denied** - Verifica permisos de admin en Supabase

---

## 📖 Documentación Completa

Para más detalles sobre cómo usar la encriptación:
```bash
cat docs/development/token-encryption-guide.md
```

---

## 🔄 Uso en Código

Cuando implementes LinkedIn OAuth:

```typescript
import { encryptLinkedInTokens, decryptLinkedInTokens } from "@/lib/encryption";

// Encriptar al guardar
const encrypted = encryptLinkedInTokens({
  accessToken: "token_from_linkedin",
  refreshToken: "refresh_from_linkedin",
  expiresAt: expiresAt.toISOString(),
});

await supabaseClient.from("profiles").update({
  linkedin_access_token_encrypted: encrypted.accessTokenEncrypted,
  linkedin_refresh_token_encrypted: encrypted.refreshTokenEncrypted,
  linkedin_token_expires_at: encrypted.expiresAt,
});

// Desencriptar al usar
const tokens = decryptLinkedInTokens(profile);
if (tokens) {
  // Usar tokens.accessToken para llamadas a LinkedIn API
}
```

---

**¿Listo?** El SQL ya está en tu portapapeles. Solo ábrelo en Supabase y dale Run! ⚡
