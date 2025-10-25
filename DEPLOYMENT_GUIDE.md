# 🚀 Guía de Despliegue - Reparación Conexión Supabase

## ✅ Cambios Realizados

### 1. Actualización de `vercel.json`
**Archivo modificado:** `/vercel.json`

Se actualizó la política CSP (Content Security Policy) para permitir correctamente las conexiones con Supabase:

**Cambios en CSP:**
- ✅ Mantenido: `connect-src` incluye `https://*.supabase.co` y `wss://*.supabase.co`
- ✅ Mantenido: `img-src` incluye `https://*.supabase.co`
- ✅ Limpiado: Removidas referencias a `https://*.vercel.app` del CSP (solo para staging)
- ✅ Optimizado: CSP más limpio y enfocado en producción

### 2. Identificación de Problema Crítico
**Archivo afectado:** `/.env.local`

Se identificó que `NEXT_PUBLIC_SUPABASE_ANON_KEY` está usando la clave `service_role` en lugar de la clave `anon`.

**Impacto:**
- ❌ Causa errores 406 en peticiones HTTP
- ❌ Bloquea la carga de créditos y plan de usuario
- ❌ Impide la autenticación correcta

### 3. Página de Prueba Creada
**Archivo nuevo:** `/src/pages/test-supabase.tsx`

Página de diagnóstico completa que verifica:
- ✅ Variables de entorno
- ✅ Inicialización del cliente Supabase
- ✅ Conexión a base de datos
- ✅ Sistema de autenticación
- ✅ Perfil de usuario (si está autenticado)
- ✅ Conexión WebSocket (Realtime)

### 4. Documentación Creada
**Archivos nuevos:**
- `SUPABASE_ANON_KEY_FIX.md` - Guía para obtener la clave ANON correcta
- `DEPLOYMENT_GUIDE.md` - Esta guía de despliegue

---

## 📋 PASOS CRÍTICOS ANTES DE DESPLEGAR

### PASO 1: Obtener la Clave ANON Correcta de Supabase

**IMPORTANTE:** Este es el paso más crítico. Sin esto, nada funcionará.

1. **Accede a Supabase Dashboard:**
   - Ve a: https://supabase.com/dashboard
   - Inicia sesión con tu cuenta

2. **Selecciona tu proyecto:**
   - Proyecto: `crdtxyfvosbjjiddirtzc`
   - URL: `https://crdtxyfvosbjjiddirtzc.supabase.co`

3. **Ve a Settings → API:**
   - Menú lateral: Settings (⚙️)
   - Submenu: API

4. **Copia la clave ANON:**
   - Busca la sección "Project API keys"
   - Localiza la clave etiquetada como **"anon public"** o **"anon"**
   - Haz clic en el botón de copiar
   - **NO copies la clave "service_role"**

5. **Verifica que es la clave correcta:**
   - Ve a: https://jwt.io/
   - Pega la clave copiada
   - En el "Payload", busca: `"role": "anon"` ✅
   - Si dice `"role": "service_role"` ❌ copiaste la incorrecta

---

### PASO 2: Actualizar Variables de Entorno Localmente

**Archivo:** `/.env.local`

1. **Abre el archivo `.env.local`**

2. **Localiza la línea:**
   ```env
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
   ```

3. **Reemplaza el valor** con la clave ANON correcta que copiaste:
   ```env
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<PEGA_AQUI_LA_CLAVE_ANON_CORRECTA>
   ```

4. **NO modifiques estas líneas** (están correctas):
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://crdtxyfvosbjjiddirtzc.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... (mantén esta como está)
   ```

5. **Guarda el archivo**

---

### PASO 3: Probar Localmente

1. **Detén el servidor de desarrollo** (si está corriendo):
   ```bash
   # Presiona Ctrl+C en la terminal donde está npm run dev
   ```

2. **Reinicia el servidor:**
   ```bash
   npm run dev
   ```

3. **Abre la página de prueba:**
   ```
   http://localhost:3000/test-supabase
   ```

4. **Verifica que todos los tests pasen:**
   - ✅ Variables de Entorno: SUCCESS
   - ✅ Cliente Supabase: SUCCESS
   - ✅ Conexión a Base de Datos: SUCCESS
   - ✅ Sistema de Autenticación: SUCCESS o WARNING (normal si no estás autenticado)
   - ✅ Conexión WebSocket: SUCCESS

5. **Si hay errores:**
   - Revisa el archivo `SUPABASE_ANON_KEY_FIX.md`
   - Verifica que la clave ANON sea la correcta
   - Asegúrate de haber reiniciado el servidor después de cambiar `.env.local`

6. **Prueba el dashboard:**
   ```
   http://localhost:3000/dashboard
   ```
   - Inicia sesión si no lo has hecho
   - Verifica que se muestren tus créditos y plan
   - Si no aparecen, revisa la consola del navegador (F12 → Console)

---

### PASO 4: Actualizar Variables de Entorno en Vercel

**IMPORTANTE:** Vercel necesita las variables de entorno actualizadas también.

1. **Accede a Vercel Dashboard:**
   - Ve a: https://vercel.com/
   - Busca tu proyecto "kolink"

2. **Ve a Settings:**
   - En el menú del proyecto, haz clic en "Settings"
   - En el menú lateral, haz clic en "Environment Variables"

3. **Localiza `NEXT_PUBLIC_SUPABASE_ANON_KEY`:**
   - Busca en la lista de variables
   - Haz clic en los tres puntos (⋯) al lado de la variable
   - Selecciona "Edit"

4. **Actualiza el valor:**
   - Pega la clave ANON correcta (la misma que pusiste en `.env.local`)
   - Asegúrate de que esté configurada para:
     - ✅ Production
     - ✅ Preview
     - ✅ Development

5. **Guarda los cambios:**
   - Haz clic en "Save"

6. **Verifica las otras variables:**
   - `NEXT_PUBLIC_SUPABASE_URL` debe ser: `https://crdtxyfvosbjjiddirtzc.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY` debe mantenerse sin cambios

---

### PASO 5: Desplegar a Producción

Tienes dos opciones:

#### Opción A: Despliegue Automático (Recomendado)

1. **Haz commit de los cambios:**
   ```bash
   git add vercel.json src/pages/test-supabase.tsx SUPABASE_ANON_KEY_FIX.md DEPLOYMENT_GUIDE.md
   git commit -m "fix: update CSP policy and add Supabase connection test page"
   ```

2. **Push a la rama principal:**
   ```bash
   git push origin main
   ```

3. **Vercel desplegará automáticamente:**
   - Ve a https://vercel.com/tu-proyecto
   - Espera a que el despliegue termine (1-3 minutos)
   - Verás el estado "Ready" cuando termine

#### Opción B: Despliegue Manual desde Vercel

1. **Ve a Vercel Dashboard:**
   - https://vercel.com/tu-proyecto

2. **Haz clic en "Deployments"**

3. **Haz clic en "Redeploy":**
   - Selecciona el último despliegue
   - Haz clic en los tres puntos (⋯)
   - Selecciona "Redeploy"
   - Asegúrate de marcar "Use existing Build Cache" como NO

---

### PASO 6: Verificar el Despliegue

1. **Espera a que el despliegue termine**

2. **Abre la página de prueba en producción:**
   ```
   https://kolink.es/test-supabase
   ```

3. **Verifica los resultados:**
   - Todos los tests deben pasar (SUCCESS o WARNING)
   - Si hay errores:
     - ✅ Verifica que las variables de entorno en Vercel estén correctas
     - ✅ Verifica que el despliegue haya terminado completamente
     - ✅ Espera 1-2 minutos y recarga la página (a veces Vercel tarda en propagar los cambios)

4. **Prueba el dashboard:**
   ```
   https://kolink.es/dashboard
   ```
   - Inicia sesión
   - Verifica que se muestren tus créditos y plan
   - Genera contenido para probar que todo funciona

5. **Abre la consola del navegador:**
   - Presiona F12 → Console
   - NO deberías ver errores 406
   - NO deberías ver mensajes de "supabase is not defined"
   - NO deberías ver errores de CSP

---

## 🔍 Solución de Problemas

### Error: "Failed to load resource: 406"

**Causa:** La clave ANON es incorrecta o no está configurada.

**Solución:**
1. Verifica que `NEXT_PUBLIC_SUPABASE_ANON_KEY` sea la clave "anon", no "service_role"
2. Usa https://jwt.io/ para decodificar y verificar: `"role": "anon"`
3. Actualiza la variable en `.env.local` y en Vercel
4. Redespliega

### Error: "supabase is not defined"

**Causa:** El cliente Supabase no se inicializó correctamente.

**Solución:**
1. Verifica que `NEXT_PUBLIC_SUPABASE_URL` esté configurada
2. Verifica que `NEXT_PUBLIC_SUPABASE_ANON_KEY` esté configurada
3. Reinicia el servidor de desarrollo
4. Verifica que las variables estén en Vercel también

### Error: CSP blocks connection

**Causa:** La política CSP no permite conexiones con Supabase.

**Solución:**
1. ✅ Ya actualizado en `vercel.json`
2. Despliega la nueva versión de `vercel.json`
3. Espera a que el despliegue termine
4. Recarga la página con Ctrl+Shift+R (hard reload)

### Error: "No profile found"

**Causa:** El perfil del usuario no existe en la tabla `profiles`.

**Solución:**
1. Verifica que la tabla `profiles` exista en Supabase
2. Ejecuta las migraciones SQL si no están aplicadas
3. Crea el perfil manualmente:
   ```sql
   INSERT INTO profiles (id, email, plan, credits)
   VALUES (
     'tu-user-id-aqui',
     'tu-email@ejemplo.com',
     'free',
     5
   );
   ```

### Error: "Table 'profiles' does not exist"

**Causa:** La base de datos no está configurada.

**Solución:**
1. Ve al archivo `INSTRUCCIONES_SUPABASE.md`
2. Ejecuta todos los scripts SQL en Supabase
3. Verifica que las tablas se hayan creado correctamente
4. Prueba nuevamente

---

## 📊 Checklist Final

Antes de considerar el despliegue exitoso, verifica:

### Local (http://localhost:3000)
- [ ] `npm run dev` corre sin errores
- [ ] `/test-supabase` muestra todos los tests en SUCCESS
- [ ] `/dashboard` muestra créditos y plan correctamente
- [ ] Puedes generar contenido con IA
- [ ] No hay errores en la consola del navegador (F12)

### Producción (https://kolink.es)
- [ ] Variable `NEXT_PUBLIC_SUPABASE_ANON_KEY` actualizada en Vercel
- [ ] Despliegue completado exitosamente
- [ ] `/test-supabase` muestra todos los tests en SUCCESS
- [ ] `/dashboard` muestra créditos y plan correctamente
- [ ] Puedes generar contenido con IA
- [ ] No hay errores 406 en Network tab (F12 → Network)
- [ ] No hay errores de CSP en Console (F12 → Console)

---

## 🎯 Resumen de Archivos Modificados/Creados

### Modificados:
1. `/vercel.json` - CSP actualizado para Supabase

### Creados:
1. `/src/pages/test-supabase.tsx` - Página de prueba de conexión
2. `/SUPABASE_ANON_KEY_FIX.md` - Guía para obtener clave ANON
3. `/DEPLOYMENT_GUIDE.md` - Esta guía

### Por Actualizar Manualmente:
1. `/.env.local` - Variable `NEXT_PUBLIC_SUPABASE_ANON_KEY`
2. Vercel Environment Variables - Variable `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## 📞 Soporte Adicional

Si después de seguir todos estos pasos sigues teniendo problemas:

1. **Revisa los logs de Supabase:**
   - Dashboard Supabase → Logs → API
   - Busca errores relacionados con autenticación

2. **Revisa los logs de Vercel:**
   - Dashboard Vercel → Deployments → Selecciona el último → Functions
   - Busca errores en las API routes

3. **Verifica el estado de Supabase:**
   - https://status.supabase.com/
   - Asegúrate de que no haya interrupciones de servicio

4. **Contacta con el equipo:**
   - Proporciona capturas de pantalla de `/test-supabase`
   - Proporciona logs de la consola del navegador
   - Indica qué pasos de esta guía ya completaste

---

## ✅ Próximos Pasos Después de la Reparación

Una vez que todo funcione correctamente:

1. **Prueba todas las funcionalidades:**
   - Registro de nuevos usuarios
   - Inicio de sesión
   - Generación de contenido con IA
   - Compra de planes con Stripe
   - Sistema de créditos

2. **Monitorea los errores:**
   - Configura Sentry (ya instalado)
   - Revisa Vercel Analytics
   - Configura PostHog (ya instalado)

3. **Optimiza:**
   - Considera implementar caché para consultas frecuentes
   - Revisa el rendimiento de las API routes
   - Optimiza las políticas RLS en Supabase

---

¡Buena suerte con el despliegue! 🚀
