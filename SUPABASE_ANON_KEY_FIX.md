# 🔧 Guía Urgente: Obtener la Clave ANON correcta de Supabase

## ⚠️ PROBLEMA DETECTADO

Tu archivo `.env.local` tiene un error crítico:
```
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc... (Esta es la clave SERVICE_ROLE, NO la ANON)
```

Esto está causando los errores 406 y problemas de conexión.

---

## 📋 Pasos para Obtener la Clave ANON Correcta

### 1. Accede a tu Dashboard de Supabase
   - Ve a: https://supabase.com/dashboard
   - Inicia sesión con tu cuenta

### 2. Selecciona tu Proyecto
   - Busca el proyecto: **crdtxyfvosbjjiddirtzc**
   - O el proyecto que corresponda a la URL: `https://crdtxyfvosbjjiddirtzc.supabase.co`

### 3. Ve a Settings (Configuración)
   - En el menú lateral izquierdo, haz clic en el ícono de engranaje ⚙️ **Settings**
   - Luego haz clic en **API** en el submenú

### 4. Localiza las Claves de API

En la página de API verás varias secciones:

#### **Project URL**
```
https://crdtxyfvosbjjiddirtzc.supabase.co
```

#### **Project API keys**

Verás DOS claves principales:

**a) anon public** (Esta es la que necesitas) ✅
```
eyJhbGc... (empieza con eyJ y tiene "role":"anon" en el payload)
```
- **Etiqueta**: "anon" o "public"
- **Uso**: Cliente/Frontend (navegador)
- **Permisos**: Limitados por Row Level Security (RLS)

**b) service_role** (Esta NO la uses en NEXT_PUBLIC_*) ❌
```
eyJhbGc... (empieza con eyJ y tiene "role":"service_role" en el payload)
```
- **Etiqueta**: "service_role" o "secret"
- **Uso**: Solo servidor (API routes, backend)
- **Permisos**: Acceso total (bypasses RLS)

### 5. Copia la Clave ANON

- Haz clic en el botón de **copiar** junto a la clave **anon public**
- Asegúrate de copiar TODA la clave (es muy larga)

---

## 🔄 Actualizar tu .env.local

Una vez que tengas la clave ANON correcta, actualiza tu `.env.local`:

### ANTES (❌ Incorrecto):
```env
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNyZHR4eWZ2Ym9zamlkZGlydHpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDk3NjY4MywiZXhwIjoyMDc2NTUyNjgzfQ.K08Dd_BrBhegje7B4Fp-t70drz5w0bfAQs6zQD5wH3w
```

### DESPUÉS (✅ Correcto):
```env
NEXT_PUBLIC_SUPABASE_ANON_KEY=TU_CLAVE_ANON_AQUI_COPIADA_DE_SUPABASE
```

**NOTA IMPORTANTE**:
- La clave ANON será diferente a la clave service_role
- Ambas empiezan con `eyJ` pero tienen diferentes contenidos
- **Mantén la clave service_role** en `SUPABASE_SERVICE_ROLE_KEY` (esa está bien)

---

## ✅ Verificar que la Clave es Correcta

Para verificar que copiaste la clave ANON correcta, puedes decodificar el JWT:

1. Ve a: https://jwt.io/
2. Pega tu clave en el campo "Encoded"
3. En la sección "Payload", busca:
   ```json
   {
     "role": "anon"  // ✅ Debe decir "anon", NO "service_role"
   }
   ```

---

## 🚀 Próximos Pasos Después de Actualizar

1. **Guarda** el archivo `.env.local` con la clave ANON correcta
2. **Reinicia** el servidor de desarrollo:
   ```bash
   # Detén el servidor (Ctrl+C si está corriendo)
   # Luego reinicia:
   npm run dev
   ```
3. **Prueba** la conexión con la página de test que voy a crear
4. **Despliega** a Vercel con la variable de entorno actualizada

---

## 📝 Resumen de Variables de Entorno Correctas

Tu `.env.local` debe tener:

```env
# URL del proyecto (✅ Esta está bien)
NEXT_PUBLIC_SUPABASE_URL=https://crdtxyfvosbjjiddirtzc.supabase.co

# Clave ANON para el cliente (❌ Esta está MAL - actualízala)
NEXT_PUBLIC_SUPABASE_ANON_KEY=<COPIA_LA_CLAVE_ANON_DE_SUPABASE_AQUI>

# Clave SERVICE_ROLE para el servidor (✅ Esta está bien - déjala igual)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNyZHR4eWZ2Ym9zamlkZGlydHpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDk3NjY4MywiZXhwIjoyMDc2NTUyNjgzfQ.K08Dd_BrBhegje7B4Fp-t70drz5w0bfAQs6zQD5wH3w
```

---

## ❓ ¿Por Qué Este Error Causa Problemas?

1. **Error 406**: El servidor Supabase rechaza peticiones con credenciales incorrectas
2. **CSP Blocks**: La política de seguridad bloquea conexiones sospechosas
3. **Permisos**: El cliente no puede autenticarse correctamente
4. **RLS**: Las políticas de seguridad de fila no funcionan con la clave incorrecta

---

## 🆘 Si Sigues Teniendo Problemas

1. Verifica que la URL del proyecto sea correcta
2. Asegúrate de que el proyecto esté activo en Supabase
3. Comprueba que las tablas `profiles` y `posts` existan
4. Revisa los logs de Supabase en: Dashboard → Logs → API

---

Una vez que actualices la clave ANON en `.env.local`, avísame y continuaré con los siguientes pasos de la reparación.
