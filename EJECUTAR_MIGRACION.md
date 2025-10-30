# ⚡ EJECUTAR MIGRACIÓN SPRINT 3 - INSTRUCCIONES RÁPIDAS

## 🎯 Resumen
El SQL ya está copiado en tu portapapeles. Solo necesitas pegarlo en Supabase.

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
Sprint 3 migration completed successfully!
```

### 5. Confirma las Columnas
Ejecuta en tu terminal:
```bash
npx ts-node scripts/check_profiles_columns.ts
```

Deberías ver:
```
✅ preferred_language
✅ tone_profile
✅ linkedin_access_token
✅ linkedin_refresh_token
✅ notification_preferences
✅ analytics_enabled
```

---

## 🔧 Si el SQL no está en el portapapeles:

Opción A - Copiar nuevamente:
```bash
cat scripts/apply_sprint3_only.sql | pbcopy
```

Opción B - Ver el archivo:
```bash
cat scripts/apply_sprint3_only.sql
```

---

## ✅ Después de la Migración

Una vez ejecutado, **todas estas funcionalidades estarán 100% operativas:**

1. ✅ **Language Selector** (`/profile`) - Guardar y cargar idioma preferido
2. ✅ **EditorAI** - Usar idioma del perfil para voice input y generación
3. ✅ **Workspace Name** - Guardar nombre del workspace
4. ✅ **LinkedIn OAuth** - Estructura lista para guardar tokens (Task futuro)
5. ✅ **Notificaciones** - Estructura lista para preferencias (Task futuro)

---

## 🚨 Si hay algún error:

1. **Policy already exists** - Es normal, ignóralo. Las columnas se crearán igual.
2. **Column already exists** - Perfecto, significa que ya se creó.
3. **Permission denied** - Verifica que estás usando un usuario con permisos de admin.

---

## 📊 Estado Actual

**ANTES de la migración:**
- Language Selector: 67% (falta BD)
- Workspace Name: 100% ✅
- Saved Posts: 100% ✅

**DESPUÉS de la migración:**
- Language Selector: 100% ✅
- Workspace Name: 100% ✅
- Saved Posts: 100% ✅
- LinkedIn OAuth: Estructura lista para implementación

---

**¿Listo?** El SQL ya está en tu portapapeles. Solo ábrelo en Supabase y dale Run! ⚡
