# VierNulVier Design System

## Philosophy

The palette draws from aged newsprint. Every colour is a warm neutral — no pure whites, no cool greys. The result feels like handling a broadsheet that has yellowed gracefully over decades.

Contrast is created through **value steps** within the same warm family, not through hue shifts. The page alternates between light "paper" sections and dark "inverted" sections, creating a strong visual rhythm while staying within a single warm hue family (~HSL 35-40).

---

## 1. Architecture

All design tokens live in a single CSS file and are consumed by Tailwind via a `@theme` block.

```
src/
  assets/
    design-tokens.css    <-- single source of truth (CSS custom properties)
  style.css              <-- imports tokens, maps them to Tailwind @theme
  components/
    *.vue                <-- use Tailwind utilities (bg-surface-0, text-ink-primary, ...)
```

**Dark mode** is handled by a `.dark` class on the root element. The CSS custom properties automatically switch values — components never need `dark:` prefixes.

---

## 2. Light-mode palette

### Standard surfaces (background -> foreground layering)

| Token | Hex | Tailwind class | Role |
|-------|-----|----------------|------|
| `--surface-0` | `#F5F0E8` | `bg-surface-0` | Page background — the "raw paper" ground |
| `--surface-1` | `#EBE6DD` | `bg-surface-1` | Cards, secondary panels, stats bar |
| `--surface-2` | `#E2DCD2` | `bg-surface-2` | Raised elements, bento cards |
| `--surface-3` | `#D8D2C8` | `border-surface-3` | Borders, divider lines, strokes |

Every step is roughly DeltaL* ~ 4-5 in CIELAB — enough to separate layers without breaking the newsprint illusion.

### Inverted surfaces (high-contrast sections)

Used for navbar, hero, featured card, newsletter — sections that need a dark ground for visual rhythm.

| Token | Hex | Tailwind class | Role |
|-------|-----|----------------|------|
| `--surface-inv` | `#2B2826` | `bg-surface-inv` | Dark background for high-contrast sections |
| `--surface-inv-raised` | `#3D3835` | `bg-surface-inv-raised` | Raised elements on inverted bg (inputs, image cards) |
| `--surface-inv-border` | `#5C5650` | `border-surface-inv-border` | Borders and dividers on inverted bg |

### Ink (text & icons)

#### On standard surfaces

| Token | Hex | Tailwind class | Role |
|-------|-----|----------------|------|
| `--ink-primary` | `#2B2826` | `text-ink-primary` | Headlines, logo, primary body text |
| `--ink-secondary` | `#5C5650` | `text-ink-secondary` | Descriptions, captions, meta text |
| `--ink-tertiary` | `#8A8279` | `text-ink-tertiary` | Placeholder text, disabled labels |

#### On inverted surfaces

| Token | Hex | Tailwind class | Role |
|-------|-----|----------------|------|
| `--ink-on-inv` | `#F5F0E8` | `text-ink-on-inv` | Primary text on dark bg |
| `--ink-on-inv-secondary` | `#B5AFA6` | `text-ink-on-inv-secondary` | Secondary text on dark bg |
| `--ink-on-inv-tertiary` | `#7D776E` | `text-ink-on-inv-tertiary` | Muted text on dark bg |

### Accent & interactive

| Token | Hex | Tailwind class | Role |
|-------|-----|----------------|------|
| `--accent-dark` | `#2B2826` | `bg-accent-dark` | Primary buttons on standard surfaces |
| `--accent-dark-hover` | `#3D3835` | `hover:bg-accent-dark-hover` | Hover state for primary buttons |
| `--accent-outline` | `#2B2826` | `border-accent-outline` | Ghost / outline button borders |
| `--accent-highlight` | `#D4E4EF` | `bg-accent-highlight` | Soft blue tint — info callouts, focus states |

### Stats / display numerals

| Token | Hex | Tailwind class | Role |
|-------|-----|----------------|------|
| `--stat-fill` | `#C8C1B5` | `text-stat-fill` | Large decorative numbers (subtle weight) |
| `--stat-label` | `#5C5650` | `text-stat-label` | Labels underneath stats |

### Photographic overlay

| Token | Hex / value | Role |
|-------|-------------|------|
| `--photo-overlay` | `#2B2826` | Dark wash over hero images |
| `--photo-opacity` | `0.55` | Lets the photograph breathe while keeping text legible |

---

## 3. Dark-mode palette

The dark mode inverts the value scale but keeps the warm undertone. Think of a newspaper photographed under tungsten lamplight.

### Standard surfaces

| Token | Hex | Role |
|-------|-----|------|
| `--surface-0` | `#1C1A17` | Page background — deep warm charcoal |
| `--surface-1` | `#272420` | Cards, secondary panels |
| `--surface-2` | `#33302B` | Raised elements |
| `--surface-3` | `#443F39` | Borders, dividers |

### Inverted surfaces

| Token | Hex | Role |
|-------|-----|------|
| `--surface-inv` | `#1C1A17` | Dark sections collapse into the bg in dark mode |
| `--surface-inv-raised` | `#272420` | Raised elements within inverted sections |
| `--surface-inv-border` | `#443F39` | Borders on inverted bg |

### Ink

| Token | Hex | Role |
|-------|-----|------|
| `--ink-primary` | `#EDE8DF` | Headlines, body — warm off-white, never #FFF |
| `--ink-secondary` | `#B5AFA6` | Descriptions, captions |
| `--ink-tertiary` | `#7D776E` | Placeholders, disabled |
| `--ink-on-inv` | `#EDE8DF` | Primary text on inverted bg |
| `--ink-on-inv-secondary` | `#B5AFA6` | Secondary text on inverted bg |
| `--ink-on-inv-tertiary` | `#7D776E` | Muted text on inverted bg |

### Accent & interactive

| Token | Hex | Role |
|-------|-----|------|
| `--accent-dark` | `#EDE8DF` | Primary buttons swap to light fill |
| `--accent-dark-hover` | `#D8D2C8` | Hover — slightly muted |
| `--accent-outline` | `#EDE8DF` | Ghost buttons — light border |
| `--accent-highlight` | `#263A48` | Desaturated deep blue |

### Photographic overlay

| Token | Hex / value | Role |
|-------|-------------|------|
| `--photo-overlay` | `#1C1A17` | Blends hero into the dark background |
| `--photo-opacity` | `0.65` | Slightly heavier to keep text legible on bright photos |

---

## 4. Contrast checks

### Light mode

| Pair | Ratio | WCAG |
|------|-------|------|
| `--surface-0` / `--ink-primary` | ~12.5 : 1 | AAA |
| `--surface-0` / `--ink-secondary` | ~6.5 : 1 | AA (all) |
| `--surface-0` / `--ink-tertiary` | ~3.5 : 1 | AA (large) |
| `--surface-inv` / `--ink-on-inv` | ~12.5 : 1 | AAA |
| `--surface-inv` / `--ink-on-inv-secondary` | ~6.5 : 1 | AA (all) |

### Dark mode

| Pair | Ratio | WCAG |
|------|-------|------|
| `--surface-0` / `--ink-primary` | ~13 : 1 | AAA |
| `--surface-0` / `--ink-secondary` | ~7 : 1 | AA (all) |
| `--surface-0` / `--ink-tertiary` | ~4 : 1 | AA (large) |
| `--accent-dark` / `--surface-0` | ~13 : 1 | AAA |

---

## 5. Page rhythm

The landing page alternates between standard and inverted surfaces to create visual contrast:

```
  Navbar          bg-surface-inv       (dark)
  Hero            bg-surface-inv       (dark)
  Stats           bg-surface-1         (light)
  Bento Grid      bg-surface-1         (light)
    Featured card   bg-surface-inv     (dark)
    Category cards  bg-surface-2       (light)
  Newsletter      bg-surface-inv       (dark)
  Footer          bg-surface-1         (light)
```

This dark-light-dark-light rhythm creates clear section separation without introducing new hues.

---

## 6. Button patterns

### On standard (light) surfaces

```html
<!-- Primary button -->
<button class="bg-accent-dark text-surface-0 hover:bg-accent-dark-hover">

<!-- Ghost button -->
<button class="border border-accent-outline text-accent-outline hover:bg-surface-2">
```

### On inverted (dark) surfaces

Buttons invert — they become the lightest element to carry the highest local contrast.

```html
<!-- Primary button on dark bg -->
<button class="bg-ink-on-inv text-surface-inv hover:bg-ink-on-inv-secondary">
```

---

## 7. Typography

- **Font family:** Inter (weights 400, 500, 600, 700, 900) via Google Fonts
- **Icons:** Material Symbols Outlined via Google Fonts
- **Hero title:** `text-5xl lg:text-6xl xl:text-7xl font-black italic uppercase`
- **Section headings:** `text-2xl font-bold`
- **Body text:** `text-base leading-relaxed` (primary) or `text-sm leading-relaxed` (secondary)

---

## 8. Photography treatment

All photographic content is filtered to unify it with the paper palette:

```css
.hero-photo {
  opacity: calc(1 - var(--photo-opacity));
}

.hero-overlay {
  background: linear-gradient(to top, var(--photo-overlay) 0%, transparent 60%);
  opacity: var(--photo-opacity);
}
```

Optional: add a CSS noise texture at 3-5% opacity for a film-grain look.

---

## 9. Implementation reference

### Files

| File | Purpose |
|------|---------|
| `src/assets/design-tokens.css` | All CSS custom properties (light + dark) |
| `src/style.css` | Imports tokens, registers Tailwind `@theme` utilities |
| `src/components/home/*.vue` | Landing page section components |
| `src/components/AppNavbar.vue` | Sticky nav bar (inverted surface) |
| `src/components/AppFooter.vue` | Footer (standard surface) |

### Adding a new token

1. Add the CSS custom property to `design-tokens.css` (both `:root` and `.dark`)
2. Register the Tailwind mapping in `style.css` inside the `@theme` block
3. Use the generated utility class in components (e.g. `bg-my-token`, `text-my-token`)

### Scoped styles

Components with `<style scoped>` that use design-token Tailwind classes must reference the main stylesheet:

```css
<style scoped>
@reference "../style.css";

.my-class {
  @apply text-ink-primary bg-surface-0;
}
</style>
```

Using `@reference "tailwindcss"` will **not** resolve custom theme tokens.

---

## 10. Key design rules

1. **No pure black or pure white.** The warmest dark is `#1C1A17`; the lightest light is `#F5F0E8`.
2. **Hierarchy through value, not hue.** There is one hue family (~HSL 35-40). Hierarchy comes from lightness shifts.
3. **The blue accent is earned.** `--accent-highlight` is the only non-neutral colour. Reserve it for informational callouts and focus states — never for large surfaces.
4. **Standard surfaces stack in small steps.** DeltaL* ~ 4-5. Adding a fifth surface level is discouraged — flatten the component hierarchy instead.
5. **Use inverted surfaces for rhythm.** Alternate `bg-surface-inv` and `bg-surface-0/1` sections to create clear visual separation.
6. **Buttons carry highest local contrast.** On light surfaces they are dark; on dark surfaces they are light.
7. **Photography is always filtered.** Apply `--photo-overlay` at `--photo-opacity` to unify photographic content with the paper palette.
8. **Dark mode swaps values, not approach.** Every token has a dark variant. Components use the same class names — the `.dark` class on the root element handles the switch.
