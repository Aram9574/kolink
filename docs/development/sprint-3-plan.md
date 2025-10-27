# Sprint 3 - Plan de Implementación

**Fecha de Inicio:** 27 de Octubre, 2025
**Versión Objetivo:** Kolink v0.7.0 → v0.8.0
**Duración Estimada:** 10-12 días
**Estado:** 🚀 EN PROGRESO

---

## 🎯 Objetivos del Sprint 3

Con Sprint 1 y 2 completos al 100%, Sprint 3 se enfoca en **analytics, personalización y features avanzadas**.

### Objetivos Principales

#### 🔴 Alta Prioridad (Crítico)
1. **Language Selector** - Selector de idioma para EditorAI y generación
2. **Saved Posts Viewing** - Página `/inspiration/saved` para ver posts guardados
3. **PostHog Analytics** - Event tracking y métricas de uso

#### 🟡 Media Prioridad (Importante)
4. **Enhanced Profile Settings** - Mejoras en página de perfil
5. **Token Encryption** - Encriptación de tokens OAuth con `pgp_sym_encrypt`
6. **CRUD Saved Searches** - Gestión completa de búsquedas guardadas

#### 🟢 Baja Prioridad (Nice to Have)
7. **Bulk Embedding Tool** - Admin endpoint para generar embeddings en masa
8. **Advanced Analytics Dashboard** - Vista de métricas detalladas

---

## 📋 Tareas Detalladas

### Tarea 1: Language Selector ✨

**Objetivo:** Permitir a usuarios elegir idioma para voice input y generación de contenido

**Implementación:**

#### 1.1 Backend - Profiles Schema
- Agregar columna `preferred_language` a tabla `profiles`
  ```sql
  ALTER TABLE profiles
  ADD COLUMN preferred_language TEXT DEFAULT 'es-ES'
  CHECK (preferred_language IN ('es-ES', 'en-US', 'pt-BR'));
  ```

#### 1.2 Profile Page - Language Settings
- **Ubicación:** `src/pages/profile.tsx` → Sección "IA y Lenguaje"
- **Componentes:**
  - Dropdown selector con 3 opciones:
    - 🇪🇸 Español (es-ES)
    - 🇺🇸 English (en-US)
    - 🇧🇷 Português (pt-BR)
  - Preview del idioma seleccionado
  - Botón "Guardar Cambios"

- **Estado:**
  ```typescript
  const [preferredLanguage, setPreferredLanguage] = useState<string>('es-ES');
  ```

- **API Call:**
  ```typescript
  await supabaseClient
    .from('profiles')
    .update({ preferred_language: preferredLanguage })
    .eq('id', userId);
  ```

#### 1.3 EditorAI Component Updates
- **Archivo:** `src/components/EditorAI.tsx`
- **Props nuevos:**
  ```typescript
  language?: 'es-ES' | 'en-US' | 'pt-BR';
  ```

- **Web Speech API Update:**
  ```typescript
  recognition.lang = props.language || "es-ES";
  ```

- **Placeholders dinámicos:**
  ```typescript
  const placeholders = {
    'es-ES': 'Escribe tu prompt o usa el micrófono...',
    'en-US': 'Write your prompt or use the microphone...',
    'pt-BR': 'Escreva seu prompt ou use o microfone...'
  };
  ```

#### 1.4 Dashboard Integration
- **Archivo:** `src/pages/dashboard/index.tsx`
- Cargar `preferred_language` de profiles
- Pasar a EditorAI como prop
- Enviar a `/api/post/generate` para personalización

#### 1.5 API Generation Update
- **Archivo:** `src/pages/api/post/generate.ts`
- Recibir `language` en body
- Pasar a OpenAI como contexto:
  ```typescript
  messages: [
    {
      role: "system",
      content: `Generate content in ${languageMap[language]}...`
    }
  ]
  ```

**Estimación:** 4-6 horas

---

### Tarea 2: Saved Posts Viewing Page 📑

**Objetivo:** Página dedicada para ver y gestionar posts guardados

**Implementación:**

#### 2.1 New Route
- **Archivo:** `src/pages/inspiration/saved.tsx`
- **URL:** `/inspiration/saved`

#### 2.2 Database Query
```typescript
const { data: savedPosts } = await supabaseClient
  .from('saved_posts')
  .select(`
    id,
    created_at,
    inspiration_posts (
      id,
      platform,
      author,
      content,
      viral_score,
      tags,
      url
    )
  `)
  .eq('user_id', userId)
  .order('created_at', { ascending: false });
```

#### 2.3 UI Components
- **Header:**
  - Title: "Posts Guardados"
  - Stats: Total saved, Platform breakdown
  - Filters: Platform, Tags, Date range

- **Posts Grid:**
  - Card per saved post
  - Preview de contenido (primeras 3 líneas)
  - Viral score badge
  - Platform icon
  - Tags chips
  - Actions:
    - "Ver completo"
    - "Usar como template" → redirect to dashboard with preset
    - "Eliminar de guardados"

- **Empty State:**
  - Illustration
  - "No has guardado posts aún"
  - CTA: "Explorar Inspiración"

#### 2.4 Features
- ✅ Infinite scroll o paginación
- ✅ Search dentro de saved posts
- ✅ Filter por platform y tags
- ✅ Sort por fecha o viral score
- ✅ Bulk actions (delete multiple)

**Estimación:** 8-10 horas

---

### Tarea 3: PostHog Analytics Integration 📊

**Objetivo:** Track eventos clave para entender comportamiento de usuarios

**Implementación:**

#### 3.1 PostHog Setup
- **Install:**
  ```bash
  npm install posthog-js
  ```

- **Provider:**
  ```typescript
  // src/lib/posthog.ts
  import posthog from 'posthog-js';

  if (typeof window !== 'undefined') {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_API_KEY!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
      loaded: (posthog) => {
        if (process.env.NODE_ENV === 'development') posthog.debug();
      }
    });
  }

  export default posthog;
  ```

#### 3.2 Events to Track

**Authentication:**
- `user_signed_up` - { method: 'email' | 'linkedin' }
- `user_signed_in` - { method: 'email' | 'linkedin' }
- `user_signed_out`

**Content Generation:**
- `post_generated` - { preset, language, credits_used, viral_score }
- `voice_input_used` - { duration_seconds, language }
- `post_regenerated` - { original_score, new_score }

**Inspiration:**
- `inspiration_searched` - { query, results_count, search_type: 'semantic' | 'text' }
- `inspiration_post_viewed` - { post_id, platform, viral_score }
- `inspiration_post_saved` - { post_id, platform }
- `saved_post_used_as_template` - { post_id }

**Profile & Settings:**
- `language_changed` - { from, to }
- `tone_profile_updated`
- `plan_viewed` - { current_plan }
- `checkout_started` - { plan, price }

**EditorAI Usage:**
- `viral_score_viewed` - { score, recommendations_count }
- `recommendation_implemented` - { recommendation_type }

#### 3.3 Integration Points

**Dashboard** (`src/pages/dashboard/index.tsx`):
```typescript
import posthog from '@/lib/posthog';

// After successful generation
posthog.capture('post_generated', {
  preset: activePreset,
  language: preferredLanguage,
  viral_score: viralScore,
  credits_remaining: credits
});
```

**EditorAI** (`src/components/EditorAI.tsx`):
```typescript
// Voice input started
posthog.capture('voice_input_used', {
  language: recognition.lang
});

// Viral score shown
if (viralScore) {
  posthog.capture('viral_score_viewed', {
    score: viralScore,
    recommendations_count: recommendations.length
  });
}
```

**Inspiration** (`src/pages/api/inspiration/search.ts`):
```typescript
// Log search
posthog.capture('inspiration_searched', {
  query: searchQuery,
  results_count: results.length,
  search_type: usedSemanticSearch ? 'semantic' : 'text'
});
```

#### 3.4 User Identification
```typescript
// After successful auth
posthog.identify(user.id, {
  email: user.email,
  plan: profile.plan,
  created_at: profile.created_at,
  preferred_language: profile.preferred_language
});
```

**Estimación:** 6-8 horas

---

### Tarea 4: Enhanced Profile Settings 🎨

**Objetivo:** Mejorar página de perfil con más opciones

**Implementación:**

#### 4.1 Tone Profile Editor
- **Ubicación:** Sección "Estilo de Escritura"
- **Features:**
  - Textarea con ejemplos de tono
  - Presets: "Profesional", "Casual", "Inspirador", "Educativo"
  - Preview en tiempo real
  - Guardar en `profiles.tone_profile`

#### 4.2 Analytics Preferences
- **Ubicación:** Nueva sección "Analytics"
- **Opciones:**
  - Habilitar/deshabilitar tracking
  - Opt-out de analytics
  - Ver datos recolectados (link a PostHog)

#### 4.3 Notification Preferences
- **Ubicación:** Nueva sección "Notificaciones"
- **Opciones:**
  - Email notifications toggle
  - Credit reminder frequency
  - Weekly summary email toggle
  - Admin notifications toggle

#### 4.4 Export Data (GDPR Compliance)
- **Botón:** "Exportar mis datos"
- **Functionality:**
  - Genera ZIP con:
    - Profile data (JSON)
    - All posts (JSON)
    - Saved posts (JSON)
    - Usage stats (JSON)
  - Send download link via email

**Estimación:** 6-8 horas

---

### Tarea 5: Token Encryption 🔒

**Objetivo:** Encriptar OAuth tokens en base de datos

**Implementación:**

#### 5.1 Supabase Function
```sql
-- Create encryption key
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Function to encrypt
CREATE OR REPLACE FUNCTION encrypt_token(token TEXT, key TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN encode(pgp_sym_encrypt(token, key), 'base64');
END;
$$ LANGUAGE plpgsql;

-- Function to decrypt
CREATE OR REPLACE FUNCTION decrypt_token(encrypted TEXT, key TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN pgp_sym_decrypt(decode(encrypted, 'base64'), key);
END;
$$ LANGUAGE plpgsql;
```

#### 5.2 Migration
```sql
-- Add encrypted columns
ALTER TABLE profiles
ADD COLUMN linkedin_access_token_encrypted TEXT,
ADD COLUMN linkedin_refresh_token_encrypted TEXT;

-- Migrate existing tokens (if any)
-- Then drop old columns
ALTER TABLE profiles
DROP COLUMN IF EXISTS linkedin_access_token,
DROP COLUMN IF EXISTS linkedin_refresh_token;
```

#### 5.3 Environment Variable
```bash
# Add to .env.local
ENCRYPTION_KEY=your-super-secure-key-min-32-chars
```

#### 5.4 API Updates
- **LinkedIn Callback:** Encrypt before storing
- **Profile Service:** Decrypt when retrieving
- **Export API:** Use decrypted tokens

**Estimación:** 4-6 horas

---

## 📊 Progress Tracking

### Sprint 3 Checklist

#### Language Selector
- [ ] Database migration (preferred_language column)
- [ ] Profile page UI (dropdown selector)
- [ ] EditorAI language prop
- [ ] Dashboard integration
- [ ] API generation language handling
- [ ] Testing (3 languages)

#### Saved Posts Page
- [ ] Create /inspiration/saved route
- [ ] Database queries
- [ ] UI components (header, filters, grid)
- [ ] Empty state
- [ ] Actions (view, use template, delete)
- [ ] Pagination/infinite scroll
- [ ] Testing

#### PostHog Analytics
- [ ] Install posthog-js
- [ ] Setup provider
- [ ] Identify users
- [ ] Track authentication events
- [ ] Track generation events
- [ ] Track inspiration events
- [ ] Track profile events
- [ ] Testing & verification

#### Enhanced Profile
- [ ] Tone profile editor
- [ ] Analytics preferences
- [ ] Notification preferences
- [ ] Export data functionality
- [ ] Testing

#### Token Encryption
- [ ] Supabase encryption functions
- [ ] Database migration
- [ ] Environment variable setup
- [ ] API updates (encrypt/decrypt)
- [ ] Testing

---

## 🧪 Testing Plan

### Manual Testing
- [ ] Language selector en profile → cambia idioma en EditorAI
- [ ] Voice input funciona en 3 idiomas
- [ ] Generación respeta idioma seleccionado
- [ ] Saved posts page muestra posts correctamente
- [ ] Filters y search funcionan
- [ ] PostHog events se registran correctamente
- [ ] Token encryption/decryption funciona
- [ ] Export data genera ZIP completo

### E2E Tests (Playwright)
```typescript
// test: language-selector.spec.ts
test('change language updates voice input', async ({ page }) => {
  // Navigate to profile
  // Change language to English
  // Go to dashboard
  // Verify EditorAI placeholder is in English
  // Start voice input
  // Verify recognition.lang === 'en-US'
});

// test: saved-posts.spec.ts
test('save and view inspiration post', async ({ page }) => {
  // Navigate to inspiration
  // Click "Save" on a post
  // Navigate to /inspiration/saved
  // Verify post appears
  // Click "Use as template"
  // Verify redirected to dashboard with content
});
```

---

## 📈 Success Criteria

Sprint 3 será considerado completo cuando:

### Funcionalidad
- [ ] Usuario puede cambiar idioma y afecta voice input + generación
- [ ] Usuario puede ver todos sus posts guardados en una página dedicada
- [ ] PostHog registra al menos 10 tipos de eventos diferentes
- [ ] Tokens OAuth están encriptados en BD

### Calidad
- [ ] 0 errores de linting
- [ ] All E2E tests passing
- [ ] Performance: < 2s para cargar saved posts page
- [ ] Dark mode consistente en nuevas páginas

### UX
- [ ] Language selector es intuitivo
- [ ] Saved posts page es responsive
- [ ] Analytics no afectan performance perceptible
- [ ] Profile settings son claros y organizados

---

## 🚀 Deployment

### Environment Variables Nuevas
```bash
# PostHog
NEXT_PUBLIC_POSTHOG_API_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# Encryption
ENCRYPTION_KEY=your-32-char-minimum-key
```

### Database Migrations
```bash
# Apply in order:
1. 20251027000001_add_preferred_language.sql
2. 20251027000002_add_encrypted_token_columns.sql
3. 20251027000003_create_encryption_functions.sql
```

### Vercel Deployment
```bash
git add .
git commit -m "feat: Sprint 3 - Language selector, saved posts, analytics"
git push origin main
```

---

## 📝 Documentation Updates

Crear/actualizar:
- [ ] `docs/Sprint_3_Cierre.md`
- [ ] `docs/features/language-selector.md`
- [ ] `docs/features/saved-posts.md`
- [ ] `docs/analytics/posthog-events.md`
- [ ] `README.md` - Agregar PostHog setup

---

## 🎯 Próximo Sprint (Sprint 4)

Después de completar Sprint 3:

### Sprint 4: Polish & Launch Prep
1. Comprehensive E2E test suite
2. Performance optimization
3. Security audit
4. Mobile responsiveness fixes
5. Documentation completa
6. Beta testing con usuarios reales
7. Bug fixes y refinamiento
8. Preparación para V1.0 launch

---

**Preparado por:** Claude Code
**Fecha:** 27 de Octubre, 2025
**Estado:** 🚀 Sprint 3 iniciado

**Progreso hacia V1.0:** 80% → 95% (al completar Sprint 3)
