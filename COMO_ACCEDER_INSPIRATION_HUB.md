# Cómo Acceder al Inspiration Hub

## 🎯 Ubicación en la UI

El Inspiration Hub está **completamente integrado** en la aplicación y es accesible desde el **Sidebar izquierdo**.

---

## 📍 Pasos para Acceder

### 1. Iniciar Sesión

```
http://localhost:3000/signin
```

Si no tienes cuenta:
```
http://localhost:3000/signup
```

### 2. Ir al Dashboard

Después de iniciar sesión, llegarás automáticamente a:
```
http://localhost:3000/dashboard
```

### 3. Ver el Sidebar

En **desktop**, el sidebar es visible automáticamente en el lado izquierdo.

En **mobile**, presiona el botón de menú (☰) en la esquina superior izquierda.

### 4. Navegar a Inspiración

En el sidebar, busca la sección:

```
┌─────────────────────────────┐
│ INSPIRACIÓN DE CONTENIDO    │ ← Título de la sección
├─────────────────────────────┤
│ 💡 Inspiración              │ ← Click aquí
└─────────────────────────────┘
```

O accede directamente:
```
http://localhost:3000/inspiration
```

---

## 🗺️ Estructura de Navegación

```
Sidebar
├── Panel de Control
│   ├── Panel
│   ├── Ajustes
│   └── Estadísticas
│
├── Creación de Contenido
│   └── Generador de Posts
│
├── Borradores y Programación
│   └── Calendario
│
└── Inspiración de Contenido
    └── Inspiración ← AQUÍ ESTÁ
```

---

## 🖼️ Ubicación Visual

### Desktop:
```
┌──────────────┬────────────────────────────┐
│              │                            │
│   SIDEBAR    │     CONTENIDO PRINCIPAL    │
│              │                            │
│  ┌────────┐  │                            │
│  │ Panel  │  │                            │
│  │ Ajustes│  │                            │
│  │ Stats  │  │                            │
│  └────────┘  │                            │
│              │                            │
│  Creación    │                            │
│  ┌────────┐  │                            │
│  │ Posts  │  │                            │
│  └────────┘  │                            │
│              │                            │
│  Programación│                            │
│  ┌────────┐  │                            │
│  │Calendar│  │                            │
│  └────────┘  │                            │
│              │                            │
│  Inspiración │                            │
│  ┌────────┐  │                            │
│  │ 💡 Ins │ ←── Click aquí               │
│  └────────┘  │                            │
│              │                            │
└──────────────┴────────────────────────────┘
```

### Mobile:
```
┌────────────────────────┐
│ ☰  KOLINK              │ ← Menu button
└────────────────────────┘
          ↓ (al presionar)
┌────────────────────────┐
│ MENU SIDEBAR           │
│                        │
│ Panel                  │
│ Ajustes                │
│ Estadísticas           │
│                        │
│ Creación de Contenido  │
│ ├─ Generador de Posts  │
│                        │
│ Borradores            │
│ ├─ Calendario          │
│                        │
│ Inspiración           │
│ ├─ 💡 Inspiración ← Click aquí
│                        │
└────────────────────────┘
```

---

## 🔍 Verificación Rápida

### Método 1: Navegación Manual
1. Inicia sesión en http://localhost:3000/signin
2. Busca el sidebar izquierdo (desktop) o botón menú (mobile)
3. Scroll hasta la sección "Inspiración de Contenido"
4. Click en "💡 Inspiración"

### Método 2: URL Directa
```bash
# Abrir directamente (requiere sesión activa)
open http://localhost:3000/inspiration
```

### Método 3: Desde el Dashboard
```javascript
// En la consola del navegador (F12)
window.location.href = '/inspiration';
```

---

## 🎨 Aspecto Visual del Link

El link de "Inspiración" se ve así:

**Estado Normal (no activo):**
```
[ 💡  Inspiración ]
   └─ Gris/Slate
   └─ Hover: Fondo blanco/oscuro
```

**Estado Activo (cuando estás en /inspiration):**
```
[ 💡  Inspiración ]
   └─ Azul/Blue-600
   └─ Fondo blanco
   └─ Shadow
```

---

## 📱 Funcionalidades Una Vez Dentro

Cuando accedas a `/inspiration`, verás:

### Barra de Búsqueda
```
┌─────────────────────────────────────┐
│ 🔍 Buscar por palabras clave...    │
└─────────────────────────────────────┘
```

### Filtros
```
┌─────────────────────┬──────────────────┐
│ Plataforma: Todas ▼ │ 💾 Guardar búsq. │
└─────────────────────┴──────────────────┘
```

### Grid de Posts
```
┌──────────┬──────────┬──────────┐
│ Post 1   │ Post 2   │ Post 3   │
│ LinkedIn │ Twitter  │ LinkedIn │
│ ⭐ Save  │ ⭐ Save  │ ⭐ Save  │
└──────────┴──────────┴──────────┘
```

---

## 🚨 Troubleshooting

### No veo el sidebar
**Causa:** Puede que no hayas iniciado sesión.

**Solución:**
1. Verifica que estás en http://localhost:3000/dashboard (no en landing `/`)
2. Revisa que tu sesión está activa (debería haber un avatar en la esquina superior derecha)

### El link a "Inspiración" no aparece
**Causa:** Puede ser un error de caché o compilación.

**Solución:**
```bash
# Reiniciar servidor
npm run dev

# Limpiar cache de Next.js
rm -rf .next
npm run dev

# Hard refresh en navegador
Cmd+Shift+R (Mac) o Ctrl+Shift+R (Windows)
```

### Error 401 al cargar /inspiration
**Causa:** Sesión expirada o no autenticada.

**Solución:**
1. Volver a iniciar sesión
2. Verificar que el token de sesión es válido

### El sidebar está oculto en mobile
**Causa:** Es el comportamiento esperado en mobile.

**Solución:**
Presiona el botón ☰ en la esquina superior izquierda.

---

## 🔗 URLs Relacionadas

```
/inspiration              → Página principal de búsqueda
/inspiration/saved        → Posts guardados
/dashboard                → Volver al dashboard
/profile                  → Ajustes de usuario
```

---

## 💡 Tips de Uso

1. **Búsqueda rápida:** Escribe cualquier tema y presiona Enter
2. **Filtrar:** Usa el selector de plataforma para enfocarte
3. **Guardar posts:** Click en el icono de bookmark (🔖)
4. **Ver guardados:** Accede a `/inspiration/saved`
5. **Usar como plantilla:** En posts guardados, usa "Usar plantilla"

---

## 📊 Estado de Seed Data

La aplicación ya tiene **15 posts curados** listos para explorar:

- Autores: Simon Sinek, Seth Godin, Adam Grant, Naval Ravikant, Brené Brown
- Topics: Leadership, Business, Startups, Productivity, Mindfulness
- Plataformas: LinkedIn, Twitter, Instagram
- Viral Scores: 79-93

---

## ✅ Checklist de Verificación

- [ ] Servidor corriendo en http://localhost:3000
- [ ] Usuario con sesión activa (iniciado sesión)
- [ ] Sidebar visible en desktop o botón menú en mobile
- [ ] Sección "Inspiración de Contenido" visible en sidebar
- [ ] Link "💡 Inspiración" presente
- [ ] Al hacer click, navega a /inspiration
- [ ] Página de búsqueda carga correctamente
- [ ] Se ven los 15 posts de seed data

---

## 🎯 Resultado Esperado

Al acceder a `/inspiration`, deberías ver:

```
┌──────────────────────────────────────────────┐
│ Inspiration Hub                              │
│ Descubre contenido viral y encuentra        │
│ inspiración para tus próximos posts         │
├──────────────────────────────────────────────┤
│ 🔍 [Buscar...]           [Buscar]           │
│ 🎛️ Plataforma: [Todas ▼]  💾 Guardar búsq. │
├──────────────────────────────────────────────┤
│ ┌────────────┬────────────┬────────────┐    │
│ │ LINKEDIN   │ LINKEDIN   │ TWITTER    │    │
│ │ Simon      │ Seth       │ Naval      │    │
│ │ Sinek      │ Godin      │ Ravikant   │    │
│ │            │            │            │    │
│ │ The        │ Marketing  │ Seek       │    │
│ │ Infinite   │ is about   │ wealth,    │    │
│ │ Game       │ ...        │ not money  │    │
│ │            │            │            │    │
│ │ #leadership│ #marketing │ #wealth    │    │
│ │ 🔖 Save    │ 🔖 Save    │ 🔖 Save    │    │
│ └────────────┴────────────┴────────────┘    │
│ ... (más posts)                              │
└──────────────────────────────────────────────┘
```

---

*Última actualización: 2025-10-30*
*Servidor local: http://localhost:3000*
*Documentación completa: FASE3_INSPIRATION_HUB_COMPLETO.md*
