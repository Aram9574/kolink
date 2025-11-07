# 🔴 SPRINT 1: SEGURIDAD CRÍTICA

**Duración Estimada:** 1 día (4 horas)
**Prioridad:** CRÍTICA - BLOQUEADOR TOTAL
**Objetivo:** Eliminar todos los riesgos de seguridad inmediatos

---

## 📋 RESUMEN DEL SPRINT

Este sprint se enfoca en resolver el problema más crítico del proyecto: **credenciales expuestas en el repositorio**. Es un bloqueador total que debe resolverse antes de cualquier deployment a producción.

**Impacto si no se resuelve:**
- ⚠️ Acceso no autorizado a OpenAI (generación ilimitada = costos masivos)
- ⚠️ Cargos fraudulentos en Stripe
- ⚠️ Robo completo de la base de datos vía Service Role Key
- ⚠️ Compromiso de sesiones de usuarios (Encryption Key)

---

## 🎯 OBJETIVOS DEL SPRINT

1. ✅ Remover `.env.local` del historial de Git
2. ✅ Rotar TODAS las credenciales expuestas (8 servicios)
3. ✅ Actualizar credenciales en Vercel
4. ✅ Verificar `.gitignore`
5. ✅ Validar deployment funcional

---

## 📝 TAREAS DETALLADAS

### TAREA 1.1: Limpiar Historial de Git
**Tiempo estimado:** 1 hora
**Prioridad:** CRÍTICA

#### Credenciales comprometidas identificadas:
```
OPENAI_API_KEY=sk-proj-xCo0qcIqgRMzRsdY_DTish...
STRIPE_SECRET_KEY=sk_live_51SKnfiE0zDGmS9ih...
LINKEDIN_CLIENT_SECRET=WPL_AP1.uRqn2TTnlzjLIxR5...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1Ni...
RESEND_API_KEY=re_MCRyMXT8_7vU1AnDc3m5...
ENCRYPTION_KEY=0d7318797a93cfc95328ad41cb75db22...
SENTRY_AUTH_TOKEN=sntrys_eyJpYXQiOjE3NjE4...
```

#### Pasos:

**Opción A: Usando git-filter-repo (recomendado)**
```bash
cd /Users/aramzakzuk/Proyectos/kolink

# Instalar git-filter-repo
pip3 install git-filter-repo

# Remover archivo del historial
git filter-repo --path .env.local --invert-paths --force
```

**Opción B: Usando BFG Cleaner**
```bash
# Instalar BFG
brew install bfg

# Limpiar
bfg --delete-files .env.local
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

**Opción C: Filtrado manual**
```bash
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch .env.local' \
  --prune-empty --tag-name-filter cat -- --all
```

**⚠️ ADVERTENCIA:** Coordinar con el equipo antes del force push

```bash
# Force push (DESPUÉS de coordinar)
git push origin --force --all
git push origin --force --tags
```

#### Checklist Tarea 1.1:
- [ ] Elegir método de limpieza (A, B o C)
- [ ] Coordinar con equipo sobre force push
- [ ] Ejecutar limpieza del historial
- [ ] Force push completado
- [ ] Verificar que `.env.local` no aparece en `git log --all --full-history -- .env.local`

---

### TAREA 1.2: Verificar .gitignore
**Tiempo estimado:** 5 minutos
**Prioridad:** CRÍTICA

```bash
# Verificar que .env.local está en .gitignore
cat .gitignore | grep ".env.local"

# Si no está, agregarlo
echo ".env.local" >> .gitignore
git add .gitignore
git commit -m "chore: ensure .env.local is ignored"
git push
```

#### Checklist Tarea 1.2:
- [ ] `.env.local` presente en `.gitignore`
- [ ] Commit realizado
- [ ] Push completado

---

### TAREA 1.3: Rotar Credenciales en Todos los Servicios
**Tiempo estimado:** 2 horas
**Prioridad:** CRÍTICA

#### 1. OpenAI
```
URL: https://platform.openai.com/api-keys
Acción:
  1. Iniciar sesión
  2. Ir a API Keys
  3. Revocar key antigua: sk-proj-xCo0qcIqgRMzRsdY_DTish...
  4. Crear nueva key
  5. Copiar y guardar temporalmente (se usará en Tarea 1.4)
```

#### 2. Stripe Secret Key
```
URL: https://dashboard.stripe.com/apikeys
Acción:
  1. Ir a Developers → API Keys
  2. Revocar secret key antigua
  3. Crear nueva secret key
  4. Copiar y guardar
```

#### 3. Stripe Webhook Secret
```
URL: https://dashboard.stripe.com/webhooks
Acción:
  1. Eliminar webhook anterior (si existe)
  2. Crear nuevo webhook: https://kolink.es/api/webhook
  3. Seleccionar evento: checkout.session.completed
  4. Copiar Signing Secret
```

#### 4. LinkedIn OAuth
```
URL: https://www.linkedin.com/developers/apps
Acción:
  1. Seleccionar tu app
  2. Auth → Regenerate client secret
  3. Copiar nuevo secret
```

#### 5. Supabase Service Role Key
```
URL: Supabase Dashboard → Settings → API
Acción:
  1. Ir a Settings → API
  2. Regenerar Service Role Key (service_role)
  3. Copiar nueva key
```

#### 6. Resend API Key
```
URL: https://resend.com/api-keys
Acción:
  1. Ir a API Keys
  2. Revocar key antigua
  3. Crear nueva: "Kolink Production"
  4. Copiar key
```

#### 7. Encryption Key
```bash
# Generar nueva localmente
openssl rand -hex 32
# Copiar resultado
```

#### 8. Sentry Auth Token
```
URL: https://sentry.io/settings/account/api/auth-tokens/
Acción:
  1. Revocar token antiguo
  2. Crear nuevo con scope: project:releases
  3. Copiar token
```

#### Checklist Tarea 1.3:
- [ ] OpenAI key rotada
- [ ] Stripe secret key rotada
- [ ] Stripe webhook secret rotado
- [ ] LinkedIn client secret rotado
- [ ] Supabase service role key rotada
- [ ] Resend API key rotada
- [ ] Encryption key generada
- [ ] Sentry auth token rotado
- [ ] Todas las credenciales guardadas temporalmente

---

### TAREA 1.4: Actualizar Variables en Vercel
**Tiempo estimado:** 30 minutos
**Prioridad:** CRÍTICA

```bash
# Login a Vercel (si no estás logueado)
vercel login

# Para cada variable, remover antigua y agregar nueva
vercel env rm OPENAI_API_KEY production
vercel env add OPENAI_API_KEY production
# Pegar nueva key cuando se solicite

vercel env rm STRIPE_SECRET_KEY production
vercel env add STRIPE_SECRET_KEY production

vercel env rm STRIPE_WEBHOOK_SECRET production
vercel env add STRIPE_WEBHOOK_SECRET production

vercel env rm LINKEDIN_CLIENT_SECRET production
vercel env add LINKEDIN_CLIENT_SECRET production

vercel env rm SUPABASE_SERVICE_ROLE_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production

vercel env rm RESEND_API_KEY production
vercel env add RESEND_API_KEY production

vercel env rm ENCRYPTION_KEY production
vercel env add ENCRYPTION_KEY production

vercel env rm SENTRY_AUTH_TOKEN production
vercel env add SENTRY_AUTH_TOKEN production
```

#### Verificar que todas están configuradas:
```bash
vercel env ls
# Debe mostrar las 8 variables actualizadas
```

#### Checklist Tarea 1.4:
- [ ] 8 variables actualizadas en Vercel
- [ ] `vercel env ls` muestra todas las variables
- [ ] Valores confirmados correctamente

---

### TAREA 1.5: Validar Deployment Funcional
**Tiempo estimado:** 30 minutos
**Prioridad:** CRÍTICA

```bash
# Deploy a producción
vercel --prod

# Esperar a que complete...
# URL del deployment: https://kolink.es
```

#### Probar endpoints críticos:

**1. Health Check**
```bash
curl https://kolink.es/api/health
# Esperado: 200 OK
```

**2. Checkout de Stripe**
```bash
curl https://kolink.es/api/checkout \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user-id","plan":"basic"}'

# Esperado: URL de checkout de Stripe
```

**3. Generación de contenido (requiere auth)**
```bash
# Probar desde el dashboard después de login
# Dashboard → Generar contenido → Verificar que funciona
```

#### Checklist Tarea 1.5:
- [ ] Deployment completado exitosamente
- [ ] Health check responde 200
- [ ] API de checkout funciona
- [ ] Generación de contenido funciona
- [ ] No hay errores en Vercel logs

---

## ✅ CHECKLIST FINAL DEL SPRINT 1

### Seguridad
- [ ] `.env.local` removido del historial de Git
- [ ] Force push completado exitosamente
- [ ] `.gitignore` verifica que `.env.local` está listado
- [ ] Todas las credenciales rotadas (8 servicios)
- [ ] Nuevas credenciales actualizadas en Vercel

### Validación
- [ ] Deployment exitoso en producción
- [ ] Health check funcional
- [ ] API de checkout funcional
- [ ] Generación de contenido funcional
- [ ] 0 errores en Vercel logs

### Documentación
- [ ] Nuevas credenciales guardadas en 1Password/LastPass
- [ ] Equipo notificado de cambios
- [ ] Procedimiento documentado

---

## 🚨 CRITERIOS DE ÉXITO

Este sprint se considera exitoso cuando:

1. ✅ El historial de Git está limpio (sin `.env.local`)
2. ✅ Todas las credenciales antiguas están revocadas
3. ✅ Todas las credenciales nuevas funcionan en producción
4. ✅ El deployment es exitoso
5. ✅ Los endpoints críticos responden correctamente

**⚠️ BLOQUEADOR:** Si este sprint no se completa, NO proceder con Sprint 2.

---

## 📊 MÉTRICAS

- **Credenciales rotadas:** 8/8
- **Servicios validados:** 8/8
- **Deployment exitoso:** Sí/No
- **Errores en producción:** 0

---

## 🆘 TROUBLESHOOTING

### Problema: Force push falla
**Solución:**
```bash
# Verificar estado
git status

# Si hay conflictos, resolver primero
git fetch origin
git merge origin/main

# Intentar force push nuevamente
git push origin --force --all
```

### Problema: Vercel env no actualiza
**Solución:**
```bash
# Verificar proyecto activo
vercel ls

# Cambiar proyecto si es necesario
vercel switch

# Intentar nuevamente
vercel env add VARIABLE_NAME production
```

### Problema: Deployment falla después de rotar credenciales
**Solución:**
1. Verificar logs en Vercel Dashboard
2. Verificar que todas las variables están configuradas: `vercel env ls`
3. Verificar que los valores son correctos (sin espacios, comillas, etc.)
4. Redesploy: `vercel --prod --force`

---

## 📞 RECURSOS

- **Vercel Dashboard:** https://vercel.com/arams-projects-7f967c6c/kolink
- **Documentación Git Filter Repo:** https://github.com/newren/git-filter-repo
- **Documentación BFG:** https://rtyley.github.io/bfg-repo-cleaner/

---

## 🎯 PRÓXIMO SPRINT

Una vez completado este sprint exitosamente, proceder con:
**[SPRINT 2: PAGOS FUNCIONALES](./SPRINT_2_PAGOS_FUNCIONALES.md)**

---

**Creado:** 2025-11-05
**Última actualización:** 2025-11-05
**Sprint Owner:** Equipo Kolink
