# KOLINK - Production Deployment Checklist

## Pre-Deployment Steps

### 1. Database Migration
```bash
# Conectarse a Supabase y aplicar migración
supabase db push

# Verificar que se crearon todas las tablas:
# - user_behaviors
# - writing_samples
# - user_preferences
# - content_feedback
# - viral_content_library
# - generation_history
# - post_queue
# - optimal_posting_times
```

### 2. Environment Variables

Verificar que todas estén configuradas en Vercel:

#### LinkedIn OAuth
```
LINKEDIN_CLIENT_ID=78s77xwy9xh8ib
LINKEDIN_CLIENT_SECRET=<your_linkedin_client_secret>
LINKEDIN_REDIRECT_URI=https://kolink.es/api/auth/linkedin/callback
```

#### OpenAI
```
OPENAI_API_KEY=sk-proj-...
```

#### Supabase
```
NEXT_PUBLIC_SUPABASE_URL=https://crdtxyfvbosjiddirtzc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJI...
```

### 3. LinkedIn App Configuration

En https://www.linkedin.com/developers/apps:

1. ✅ Añadir redirect URL: `https://kolink.es/api/auth/linkedin/callback`
2. ✅ Verificar scopes:
   - `openid`
   - `profile`
   - `email`
   - `w_member_social` (publicar contenido)
3. ✅ Cambiar app a modo "Published" (no Development)
4. ✅ Verificar que la app esté verificada por LinkedIn

### 4. Build Test

```bash
# Probar build local
npm run build

# Verificar que no haya errores de TypeScript
npm run lint

# Probar en modo producción
npm start
```

## Deployment to Vercel

### 1. Push Code

```bash
git add .
git commit -m "feat: AI Learning System with LinkedIn integration"
git push origin main
```

### 2. Vercel Auto-Deploy

Vercel detectará el push y desplegará automáticamente.

### 3. Verify Deployment

1. ✅ Check build logs en Vercel dashboard
2. ✅ Verificar que todas las variables de entorno estén presentes
3. ✅ Probar endpoints críticos:
   - `/api/auth/linkedin/authorize`
   - `/api/auth/linkedin/callback`
   - `/api/generate-smart`
   - `/api/linkedin/fetch-posts`
   - `/api/linkedin/publish`

## Post-Deployment Testing

### 1. LinkedIn OAuth Flow

```
1. Ir a https://kolink.es/profile
2. Click en "Conectar LinkedIn"
3. Autorizar en LinkedIn
4. Verificar redirect correcto
5. Comprobar que datos se guardaron en database
```

### 2. Importar Posts de LinkedIn

```
1. Después de conectar LinkedIn
2. Click en "Importar mis posts"
3. Verificar que se guardan en writing_samples
4. Comprobar que writing_style_profile se actualiza
```

### 3. Generación Inteligente

```
1. Ir a /dashboard
2. Generar post con prompt
3. Verificar que usa personalización:
   - Estilo de escritura del usuario
   - Temas preferidos
   - Patrones virales
4. Comprobar que se muestra metadata de personalización
```

### 4. Publicar en LinkedIn

```
1. Generar un post
2. Click en "Publicar en LinkedIn"
3. Verificar que aparece en LinkedIn
4. Comprobar que linkedin_post_id se guarda
```

### 5. Sync de Métricas

```
1. Esperar ~1 hora después de publicar
2. Click en "Sincronizar métricas"
3. Verificar que se actualizan:
   - Likes
   - Comments
   - Shares
   - Engagement rate
   - Viral score
```

## Monitoring

### 1. Error Tracking

Verificar logs en:
- Vercel Dashboard > Functions > Logs
- Supabase Dashboard > Logs > API Logs

### 2. Database Health

Verificar en Supabase:
- Row counts en nuevas tablas
- RLS policies funcionando
- Indexes creados correctamente

### 3. API Performance

Monitorear:
- Tiempo de respuesta de `/api/generate-smart`
- Rate limits de LinkedIn API
- Uso de créditos de OpenAI

## Rollback Plan

Si algo falla:

### 1. Revertir Code
```bash
git revert HEAD
git push origin main
```

### 2. Revertir Database Migration
```bash
# Conectarse a Supabase
supabase db remote commit
supabase migration repair --status reverted 20251031120000
```

### 3. Disable Features

Temporalmente deshabilitar:
- Botones de "Conectar LinkedIn"
- Endpoint `/api/generate-smart`
- Volver a usar `/api/generate` (antiguo)

## Known Issues

### 1. LinkedIn Token Expiry

**Issue:** Tokens expiran después de 60 días
**Solution:** Implementar refresh token flow (pendiente)
**Workaround:** Usuario debe reconectar LinkedIn manualmente

### 2. Rate Limiting

**Issue:** LinkedIn limita a ~100 requests/día
**Solution:** Implementar caching y rate limiting interno
**Workaround:** Mostrar mensaje al usuario si excede límite

### 3. First Time Users

**Issue:** Sin writing samples, baja personalización
**Solution:** Ofrecer importar posts al conectar
**Expected:** Mejora progresiva con uso

## Success Metrics

Después del deployment, monitorear:

1. **LinkedIn Connections:**
   - Objetivo: 30% de usuarios activos conectan LinkedIn en primera semana

2. **Posts Published:**
   - Objetivo: 50% de posts generados se publican en LinkedIn

3. **Engagement Improvement:**
   - Objetivo: 20% más engagement vs posts sin personalización

4. **User Satisfaction:**
   - Objetivo: 80% de usuarios reportan mejora en calidad de posts

## Support Escalation

Si hay problemas críticos:

1. **Check Status Pages:**
   - LinkedIn API: https://www.linkedin-apistatus.com/
   - Supabase: https://status.supabase.com/
   - OpenAI: https://status.openai.com/
   - Vercel: https://www.vercel-status.com/

2. **Contact Support:**
   - LinkedIn Developer Support (si problema con OAuth)
   - Supabase Support (si problema con database)
   - OpenAI Support (si problema con API)

3. **Emergency Hotfix:**
   ```bash
   # Crear branch de hotfix
   git checkout -b hotfix/critical-issue
   # Hacer fix
   git commit -m "hotfix: ..."
   git push origin hotfix/critical-issue
   # Deploy desde Vercel dashboard
   ```

---

## Timeline Estimado

- ⏱️ **Database Migration:** 5-10 minutos
- ⏱️ **LinkedIn App Setup:** 15-20 minutos
- ⏱️ **Code Deployment:** 5-10 minutos (auto)
- ⏱️ **Testing:** 30-45 minutos
- ⏱️ **Total:** ~1.5 horas

---

**Preparado por:** Claude AI
**Fecha:** 2025-10-31
**Versión:** 1.0
