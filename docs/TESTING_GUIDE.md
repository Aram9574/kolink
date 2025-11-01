# Guía de Pruebas - Sistema KOLINK

## 1. Pruebas de LinkedIn OAuth

### Flujo Completo de Conexión

1. **Iniciar Sesión**
   - Ve a `https://kolink.es/signin`
   - Inicia sesión con tu cuenta

2. **Conectar LinkedIn**
   - Ve a `https://kolink.es/profile`
   - Busca la sección "LinkedIn"
   - Haz clic en el botón "Conectar LinkedIn"

   **✅ Verificación Esperada:**
   - Deberías ser redirigido a LinkedIn OAuth
   - LinkedIn te pedirá autorizar la aplicación
   - Verás los permisos solicitados (perfil, email, publicar posts)

3. **Autorizar en LinkedIn**
   - Haz clic en "Permitir" o "Allow"

   **✅ Verificación Esperada:**
   - Serás redirigido de vuelta a `kolink.es/profile?success=...`
   - Deberías ver tu información de LinkedIn en la sección:
     - Tu headline de LinkedIn
     - Tu bio
     - Estado "Conectado" (badge verde)
     - Botones "Importar Posts" y "Desconectar"

4. **Importar Posts de LinkedIn**
   - Haz clic en el botón "Importar Posts"

   **✅ Verificación Esperada:**
   - Toast de loading: "Importando tus posts de LinkedIn..."
   - Toast de éxito: "¡Importados X posts para personalización!"
   - Los posts se guardan en `writing_samples` para entrenar la IA

### Posibles Errores y Soluciones

#### Error: "Debes iniciar sesión primero"
**Causa**: La sesión no se detectó correctamente
**Solución**:
1. Cierra sesión y vuelve a iniciar
2. Intenta en una pestaña de incógnito
3. Verifica que las cookies estén habilitadas

#### Error: "LinkedIn not connected"
**Causa**: La autorización no se completó
**Solución**:
1. Revisa que autorizaste correctamente en LinkedIn
2. Verifica los logs en Vercel: `vercel logs kolink.es`
3. Intenta desconectar y volver a conectar

#### Error: "LinkedIn token expired"
**Causa**: El token de acceso ha caducado
**Solución**:
1. Desconecta LinkedIn desde el perfil
2. Vuelve a conectar

---

## 2. Pruebas del Sistema de IA Viral

### Generar Contenido Viral

1. **Acceder al Dashboard**
   - Ve a `https://kolink.es/dashboard`

2. **Generar un Post**
   - Ingresa un tema, por ejemplo: "Cómo la IA está transformando el marketing digital"
   - Selecciona longitud: Medium
   - Haz clic en "Generar"

   **✅ Verificación Esperada:**
   - Loading con mensaje: "Generando contenido con IA..."
   - Se genera un post completo optimizado
   - Aparece el **Viral Score** (0-100)
   - Se muestran **Sugerencias** de mejora
   - El post tiene:
     - Hook impactante (primeras 2 líneas)
     - Desarrollo con valor
     - Párrafos cortos
     - CTA claro

3. **Revisar Análisis**
   - Observa el Viral Score
   - Lee las sugerencias proporcionadas

   **✅ Métricas Incluidas:**
   - Hook Strength
   - Readability Score
   - Emotional Triggers
   - Structure Quality
   - CTA Presence
   - Estimated Viral Score

### Probar Modos de Generación

#### Modo 1: Generar Hooks
```bash
# Usando la API directamente
curl -X POST https://kolink.es/api/ai/generate-viral \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "Productividad en equipos remotos",
    "mode": "hooks"
  }'
```

**✅ Verificación Esperada:**
- Retorna 3 hooks alternativos
- Cada hook es de máximo 2 líneas
- Diferentes técnicas (pregunta, dato, declaración audaz)

#### Modo 2: Analizar Contenido
```bash
curl -X POST https://kolink.es/api/ai/generate-viral \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "analyze",
    "existing_content": "Tu post aquí..."
  }'
```

**✅ Verificación Esperada:**
- Retorna análisis completo con métricas
- Sugerencias específicas de mejora

#### Modo 3: Mejorar Borrador
```bash
curl -X POST https://kolink.es/api/ai/generate-viral \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "improve",
    "existing_content": "Tu borrador...",
    "feedback": "Hazlo más inspirador y añade datos"
  }'
```

**✅ Verificación Esperada:**
- Retorna versión mejorada
- Análisis comparativo (original vs mejorado)

### Analizar Audiencia

```bash
curl -X GET https://kolink.es/api/ai/analyze-audience \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**✅ Verificación Esperada:**
- Mejores horarios de publicación
- Tipos de contenido preferidos
- Demografía probable de audiencia
- Recomendaciones de contenido
- Oportunidades de crecimiento

---

## 3. Pruebas de Integración Completa

### Flujo Completo: Usuario Nuevo

1. **Registro**
   - `https://kolink.es/signup`
   - Crear cuenta nueva

2. **Account Setup**
   - Completar perfil básico
   - Ir al dashboard

3. **Conectar LinkedIn**
   - Ir a perfil
   - Conectar LinkedIn
   - Importar posts

4. **Generar Contenido Personalizado**
   - Volver al dashboard
   - Generar un post

   **✅ Verificación:**
   - El post debería reflejar tu estilo (aprendido de posts importados)
   - Viral score debería ser > 70

5. **Analizar Audiencia**
   - Generar varios posts
   - Llamar a `/api/ai/analyze-audience`

   **✅ Verificación:**
   - Insights sobre tu audiencia
   - Recomendaciones personalizadas

---

## 4. Verificación de Base de Datos

### Tablas a Verificar

#### `writing_samples`
```sql
SELECT * FROM writing_samples
WHERE user_id = 'tu_user_id'
ORDER BY created_at DESC
LIMIT 5;
```

**✅ Debería contener:**
- Posts importados de LinkedIn
- Source: 'linkedin'
- Contenido real de tus posts

#### `posts`
```sql
SELECT
  prompt,
  generated_text,
  metadata->'analysis'->>'estimated_viral_score' as viral_score,
  created_at
FROM posts
WHERE user_id = 'tu_user_id'
ORDER BY created_at DESC
LIMIT 5;
```

**✅ Debería contener:**
- Posts generados
- Viral score en metadata
- Análisis completo

#### `user_behaviors`
```sql
SELECT
  behavior_type,
  context,
  created_at
FROM user_behaviors
WHERE user_id = 'tu_user_id'
ORDER BY created_at DESC
LIMIT 10;
```

**✅ Debería contener:**
- `post_generated_viral`
- `audience_analyzed`
- Metadata con detalles

#### `profiles`
```sql
SELECT
  linkedin_id,
  linkedin_connected_at,
  headline,
  bio,
  writing_style_profile
FROM profiles
WHERE id = 'tu_user_id';
```

**✅ Debería contener:**
- `linkedin_id` poblado
- `linkedin_connected_at` con timestamp
- `headline` y `bio` de LinkedIn
- `writing_style_profile` con insights

---

## 5. Pruebas de Rendimiento

### Tiempos Esperados

| Operación | Tiempo Esperado |
|-----------|-----------------|
| Conectar LinkedIn | < 5 segundos |
| Importar posts | 5-10 segundos |
| Generar contenido | 8-15 segundos |
| Analizar contenido | 3-5 segundos |
| Generar hooks | 5-8 segundos |
| Mejorar borrador | 8-12 segundos |
| Analizar audiencia | 10-15 segundos |

### Monitoreo

```bash
# Ver logs en tiempo real
vercel logs kolink.es --follow

# Buscar errores específicos
vercel logs kolink.es | grep -i "error\|failed"

# Ver logs de LinkedIn OAuth
vercel logs kolink.es | grep -i "linkedin"

# Ver logs de generación AI
vercel logs kolink.es | grep -i "generate-viral\|audience"
```

---

## 6. Checklist de Funcionalidades

### LinkedIn Integration ✅
- [ ] Botón "Conectar LinkedIn" funciona
- [ ] Redirección a LinkedIn OAuth
- [ ] Autorización y callback exitoso
- [ ] Datos de perfil se guardan correctamente
- [ ] Botón "Importar Posts" funciona
- [ ] Posts se guardan en `writing_samples`
- [ ] Botón "Desconectar" funciona

### Sistema de IA Viral ✅
- [ ] Generación de contenido completo
- [ ] Viral score se muestra correctamente
- [ ] Sugerencias de mejora aparecen
- [ ] Modo hooks funciona
- [ ] Modo analyze funciona
- [ ] Modo improve funciona
- [ ] Análisis de audiencia funciona

### Personalización ✅
- [ ] Posts generados reflejan estilo del usuario
- [ ] Writing samples se usan en generación
- [ ] Análisis aprende de comportamientos
- [ ] Recomendaciones son personalizadas

### Créditos ✅
- [ ] Créditos se deducen correctamente
- [ ] Balance se actualiza en UI
- [ ] Modal de planes aparece sin créditos

---

## 7. Casos de Prueba Específicos

### Test Case 1: Usuario Sin Posts Previos
**Objetivo**: Verificar que funciona sin historial

1. Crear cuenta nueva
2. NO importar posts de LinkedIn
3. Generar contenido

**Resultado Esperado:**
- Contenido se genera correctamente
- Usa estilo por defecto "profesional y auténtico"
- Viral score entre 60-80

### Test Case 2: Usuario Con Posts Importados
**Objetivo**: Verificar personalización

1. Conectar LinkedIn
2. Importar 10+ posts
3. Generar contenido

**Resultado Esperado:**
- Contenido refleja tu estilo personal
- Viral score entre 75-95
- Más coherencia con tus posts anteriores

### Test Case 3: Mejora Iterativa
**Objetivo**: Verificar que mejora funciona

1. Generar post (modo: generate)
2. Anotar viral score inicial
3. Mejorar post (modo: improve)
4. Comparar viral scores

**Resultado Esperado:**
- Viral score del post mejorado > original
- Sugerencias se aplican correctamente

### Test Case 4: Análisis de Audiencia
**Objetivo**: Verificar insights

1. Generar 5-10 posts
2. Llamar a `/api/ai/analyze-audience`

**Resultado Esperado:**
- Insights sobre horarios
- Recomendaciones de contenido
- Demografía de audiencia

---

## 8. Resolución de Problemas

### LinkedIn OAuth No Funciona

**Síntomas:**
- No redirige a LinkedIn
- Error "Debes iniciar sesión primero"

**Diagnóstico:**
```bash
# 1. Verificar variables de entorno en Vercel
vercel env ls production | grep LINKEDIN

# 2. Ver logs del endpoint
vercel logs kolink.es | grep "/api/auth/linkedin/authorize"

# 3. Verificar cookie de sesión
# En DevTools > Application > Cookies
# Buscar: sb-*-auth-token
```

**Soluciones:**
1. Verificar que `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `LINKEDIN_REDIRECT_URI` estén configurados
2. Verificar que `LINKEDIN_REDIRECT_URI` sea exactamente: `https://kolink.es/api/auth/linkedin/callback`
3. Verificar en LinkedIn Developer Portal que la app esté configurada correctamente

### Generación de Contenido Falla

**Síntomas:**
- Error al generar
- Timeout
- Sin respuesta

**Diagnóstico:**
```bash
# Ver logs de generación
vercel logs kolink.es | grep "generate-viral"

# Verificar OpenAI
vercel env ls production | grep OPENAI
```

**Soluciones:**
1. Verificar `OPENAI_API_KEY` esté configurado
2. Verificar saldo en cuenta de OpenAI
3. Revisar rate limits de OpenAI

---

## Conclusión

Este sistema integra:
- ✅ LinkedIn OAuth completo
- ✅ Importación de posts
- ✅ IA especializada en viralidad
- ✅ Personalización por usuario
- ✅ Análisis de audiencia
- ✅ Aprendizaje continuo

**Próximos pasos sugeridos:**
1. Probar todos los flujos manualmente
2. Verificar que los datos se guarden correctamente
3. Monitorear logs por 24-48 horas
4. Recopilar feedback de usuarios beta
5. Iterar sobre insights y métricas
