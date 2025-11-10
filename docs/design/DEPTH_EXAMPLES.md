# Depth System - Usage Examples

## Button Examples

### Primary Action with Glow
```tsx
<Button variant="primary" size="lg" glow={true}>
  Get Started
</Button>
```

### Complementary CTA (Orange)
```tsx
<Button variant="action" size="lg" glow={true}>
  Start Free Trial
</Button>
```

### Success Button
```tsx
<Button variant="success" size="md">
  Save Changes
</Button>
```

### Button Sizes
```tsx
<Button variant="primary" size="sm">Small</Button>
<Button variant="primary" size="md">Medium</Button>
<Button variant="primary" size="lg">Large</Button>
```

## Card Examples

### Elevated Card
```tsx
<Card variant="elevated" depth="lg">
  <h3>Premium Feature</h3>
  <p>Description text here</p>
</Card>
```

### Glass Card
```tsx
<Card variant="glass" depth="md">
  <h3>Transparent Content</h3>
  <p>With backdrop blur</p>
</Card>
```

### Gradient Card
```tsx
<Card variant="gradient" depth="xl" hover={true}>
  <h3>Special Announcement</h3>
  <p>Important content</p>
</Card>
```

## Scroll Reveal Examples

### Fade Up Animation
```tsx
<ScrollReveal direction="up">
  <YourComponent />
</ScrollReveal>
```

### Staggered Animations
```tsx
{items.map((item, index) => (
  <ScrollReveal
    key={item.id}
    direction="left"
    delay={index * 100}
  >
    <Card>{item.content}</Card>
  </ScrollReveal>
))}
```

### Scale Animation
```tsx
<ScrollReveal direction="scale" delay={200}>
  <ImportantFeature />
</ScrollReveal>
```

## Floating Elements

### Hero Decoration
```tsx
<FloatingElement delay={0}>
  <div className="h-32 w-32 rounded-full bg-primary-200 blur-3xl" />
</FloatingElement>
```

### Icon Animation
```tsx
<FloatingElement delay={1}>
  <Sparkles className="h-8 w-8 text-primary-500" />
</FloatingElement>
```

## Gradient Text

### Heading with Gradient
```tsx
<h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 via-primary-700 to-slate-900 bg-clip-text text-transparent">
  Your Heading
</h1>
```

### Colored Gradient
```tsx
<h2 className="text-3xl font-bold bg-gradient-to-r from-complementary-orange to-complementary-coral bg-clip-text text-transparent">
  Call to Action
</h2>
```

## Icon Containers with Gradients

### Primary Gradient Icon
```tsx
<div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-depth-md">
  <Icon className="h-8 w-8" />
</div>
```

### Complementary Gradient Icon
```tsx
<div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-complementary-orange to-complementary-coral text-white shadow-depth-md group-hover:shadow-depth-xl transition-all duration-300 group-hover:scale-110">
  <Icon className="h-8 w-8" />
</div>
```

### Multiple Color Options
```tsx
// Teal to Info
<div className="bg-gradient-to-br from-complementary-teal to-action-info">

// Purple to Pink
<div className="bg-gradient-to-br from-complementary-purple to-complementary-pink">

// Success to Accent
<div className="bg-gradient-to-br from-action-success to-accent">

// Warning to Amber
<div className="bg-gradient-to-br from-action-warning to-complementary-amber">
```

## Feature Cards with Hover Effects

### Complete Feature Card
```tsx
<Card
  variant="elevated"
  depth="lg"
  className="h-full text-center group"
>
  <div className="p-6">
    <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-depth-md group-hover:shadow-depth-xl transition-all duration-300 group-hover:scale-110">
      <Icon className="h-8 w-8" />
    </div>
    <h3 className="mb-3 text-xl font-bold text-slate-900">Feature Title</h3>
    <p className="text-slate-600 leading-relaxed">Feature description text</p>
  </div>
</Card>
```

## Pricing Cards

### Highlighted Plan Card
```tsx
<div className="relative rounded-3xl bg-white p-8 border-2 border-complementary-orange/50 ring-4 ring-complementary-orange/10 shadow-depth-lg hover:shadow-depth-2xl transition-all duration-300 hover:-translate-y-2">
  {/* Most Popular Badge */}
  <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full bg-gradient-to-r from-complementary-orange to-complementary-coral px-6 py-2 text-xs font-bold text-white shadow-depth-lg animate-bounce-subtle">
    <Zap className="h-3 w-3" />
    Most popular
  </div>

  {/* Gradient accent bar */}
  <div className="absolute top-0 left-0 right-0 h-1 rounded-t-3xl bg-gradient-to-r from-complementary-orange to-complementary-coral"></div>

  {/* Content */}
  <div className="mt-2">
    <h3 className="text-2xl font-bold text-slate-900">Plan Name</h3>
    <p className="mt-2 text-sm text-slate-600">Plan description</p>
  </div>

  <div className="mt-6 flex items-end gap-2">
    <span className="text-5xl font-bold bg-gradient-to-br from-slate-900 to-primary-600 bg-clip-text text-transparent">
      €99
    </span>
    <span className="mb-2 text-xs uppercase text-slate-500">/mes</span>
  </div>
</div>
```

## Background Patterns

### Subtle Dot Pattern
```tsx
<section className="relative">
  <div className="absolute inset-0 opacity-[0.03]">
    <div className="absolute inset-0" style={{
      backgroundImage: 'radial-gradient(circle at 1px 1px, rgb(3, 115, 254) 1px, transparent 0)',
      backgroundSize: '40px 40px'
    }}></div>
  </div>

  <div className="relative">
    {/* Your content */}
  </div>
</section>
```

### Floating Gradient Blobs
```tsx
<div className="absolute inset-0 overflow-hidden opacity-40">
  <div className="absolute -left-4 top-20 h-72 w-72 rounded-full bg-primary-200 blur-3xl animate-float"></div>
  <div className="absolute -right-4 top-40 h-96 w-96 rounded-full bg-complementary-coral/20 blur-3xl animate-float" style={{ animationDelay: '1s' }}></div>
</div>
```

## Toggle Switch (Animated)

### Gradient Toggle
```tsx
<button
  type="button"
  className="relative flex w-16 items-center rounded-full bg-gradient-to-r from-primary-400 to-primary-600 p-1 shadow-depth-sm hover:shadow-depth-md transition-all"
  onClick={handleToggle}
>
  <span
    className={`h-6 w-6 rounded-full bg-white shadow-depth-sm transition-transform duration-300 ${
      isActive ? "translate-x-8" : "translate-x-0"
    }`}
  />
</button>
```

## Guarantee/Feature Cards

### Info Card with Icon
```tsx
<div className="flex items-start gap-4 rounded-2xl border border-primary-200 bg-gradient-to-br from-primary-50 to-white p-6 shadow-depth-md hover:shadow-depth-lg hover:-translate-y-1 transition-all duration-300">
  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-depth-sm flex-shrink-0">
    <Icon className="h-7 w-7" />
  </div>
  <div>
    <h3 className="font-bold text-slate-900">Feature Title</h3>
    <p className="mt-2 text-sm text-slate-600 leading-relaxed">
      Feature description with more details about what this offers.
    </p>
  </div>
</div>
```

## Utility Classes Quick Reference

### Depth Shadows
```css
shadow-depth-sm
shadow-depth-md
shadow-depth-lg
shadow-depth-xl
shadow-depth-2xl
shadow-depth-3xl
```

### Hover Effects
```css
hover-lift         /* Large lift + scale */
hover-lift-sm      /* Small lift + scale */
hover-glow-primary /* Blue glow on hover */
```

### Animations
```css
animate-float          /* Continuous floating */
animate-pulse-glow     /* Pulsing glow */
animate-bounce-subtle  /* Subtle bounce */
animate-fade-in-up     /* Fade in from bottom */
animate-slide-in-right /* Slide from right */
```

### Glass Effects
```css
glass           /* Standard glassmorphism */
glass-frosted   /* Enhanced frosted glass */
```

## Color Reference

### Action Colors
- `bg-action-success` - Green (#10B981)
- `bg-action-warning` - Orange (#F59E0B)
- `bg-action-danger` - Red (#EF4444)
- `bg-action-info` - Cyan (#06B6D4)

### Complementary Colors
- `bg-complementary-orange` - Orange (#FF6B35)
- `bg-complementary-coral` - Coral (#FF8C69)
- `bg-complementary-purple` - Purple (#A78BFA)
- `bg-complementary-pink` - Pink (#EC4899)
- `bg-complementary-teal` - Teal (#14B8A6)
- `bg-complementary-amber` - Amber (#FBBF24)

### Primary Scale
- `bg-primary-50` through `bg-primary-900`
- Main: `bg-primary` (#0373FE)

---

**Tip:** Combine multiple utilities for compound effects:
```tsx
<div className="rounded-xl shadow-depth-lg hover:shadow-depth-xl hover:-translate-y-2 transition-all duration-300">
  <!-- Smooth depth transition on hover -->
</div>
```
