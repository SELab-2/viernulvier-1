# VierNulVier Design System

A reference for keeping the archive coherent. Every page on the site should
feel like it was made by the same hand, in the same week, for the same
publication. This document is the definition of "the same hand".

This file is **binding**. When in doubt, check it before reaching for a
custom value. If a pattern is missing, propose it as an addition rather
than inventing one in a component. If a value in code contradicts this
file, the file wins — the code is in violation and should be brought into
compliance in a follow-up PR.

---

## 0. Three registers, one publication

The product has **three visual registers**, all within the same warm-neutral
palette and the same typeface pairing:

| Register | Where | Feel |
|----------|-------|------|
| **Editorial** — long-form article | Production detail, blog post detail, future essay pages | Magazine longread: serif headlines, drop cap, pull quote, italic deck, photographs in colour, generous leading, justified body |
| **Catalogue** — entry, listing, navigation | Productions list, blog index, home, footer, navbar, public 404 | Newspaper directory: small caps labels, sober list rows, archival grayscale thumbnails, tabular metadata, no decorative drama |
| **CMS** — admin tooling | All pages under `/admin`, the CMS grid, side panels, confirmation modals | Quiet workshop: dense data tables, clear destructive cues, modals, dropdowns. Same palette and fonts as the public site, **muted** instead of dramatic. |

All three registers share the same colour tokens, the same fonts, the same
spacing scale. The difference is in the **rhythm of typography, density
and chrome**, never in a different palette.

When you build a new page, decide which register it lives in *first*, then
pick the patterns from §11 (editorial), §12 (catalogue) or §13 (CMS)
accordingly.

The CMS is allowed extra primitives — modals, overlays, destructive
buttons, dense tables, dropdowns — that the public site does not need.
Those are codified in §13 and §14 with explicit tokens. The CMS is
**not** allowed to invent new colour pairs, custom fonts, or marketing-y
chrome.

---

## 1. Architecture

```
src/
  assets/
    fonts/inter.css                 ← Inter (UI / body), self-hosted
    stylesheets/
      design-tokens.css             ← CSS custom properties (colours, fonts)
      navbar.css                    ← shared navbar primitives
      cms-view.css                  ← CMS layout primitives (panels, modals)
      cms-ag-grid.css               ← AG Grid theme bridge
  style.css                         ← imports tokens, registers Tailwind @theme
  components/*.vue                  ← consume Tailwind utilities
```

- **Source Serif 4** is loaded from Google Fonts in `index.html` as the
  display font. Self-host later if the runtime CDN dependency becomes a
  concern.
- **Inter** is self-hosted via `assets/fonts/inter.css`.
- **Dark mode** is handled by a `.dark` class on `<html>`. CSS custom
  properties switch values automatically; components never use `dark:`
  prefixes.
- **Scoped styles** that reference design tokens must use
  `@reference "@/style.css";` at the top of the `<style scoped>` block.
  `@reference "tailwindcss"` does **not** resolve custom theme tokens.
- CMS-only utility classes live in `cms-view.css` and are prefixed
  `cms-*`. The public site must not import or use them.

---

## 2. Colour palette — light mode

### 2.1 Standard surfaces (background → foreground layering)

| Token | Hex | Tailwind class | Role |
|-------|-----|----------------|------|
| `--surface-0` | `#F5F0E8` | `bg-surface-0` | Page background — raw paper |
| `--surface-1` | `#EBE6DD` | `bg-surface-1` | Cards, secondary panels, list backgrounds |
| `--surface-2` | `#E2DCD2` | `bg-surface-2` | Raised elements, gallery backdrops |
| `--surface-3` | `#D8D2C8` | `border-surface-3` | Borders, dividers, strokes |

Each step is roughly ΔL\* ≈ 4–5 in CIELAB. **Do not introduce a fifth
surface level.** Flatten the component instead.

### 2.2 Inverted surfaces (high-contrast sections)

For the navbar, occasional accent bands, modal overlays, and as a
margin-callout background.

| Token | Hex | Tailwind class | Role |
|-------|-----|----------------|------|
| `--surface-inv` | `#2B2826` | `bg-surface-inv` | Dark ground, modal overlay base |
| `--surface-inv-raised` | `#3D3835` | `bg-surface-inv-raised` | Raised on inverted bg |
| `--surface-inv-border` | `#5C5650` | `border-surface-inv-border` | Borders on inverted bg |

### 2.3 Ink (text & icons)

| Token | Hex | Tailwind class | Role |
|-------|-----|----------------|------|
| `--ink-primary` | `#2B2826` | `text-ink-primary` | Headings, primary body |
| `--ink-secondary` | `#5C5650` | `text-ink-secondary` | Descriptions, captions, meta |
| `--ink-tertiary` | `#8A8279` | `text-ink-tertiary` | Placeholders, disabled, muted decoration |
| `--ink-on-inv` | `#F5F0E8` | `text-ink-on-inv` | Primary text on dark bg |
| `--ink-on-inv-secondary` | `#B5AFA6` | `text-ink-on-inv-secondary` | Secondary text on dark bg |
| `--ink-on-inv-tertiary` | `#7D776E` | `text-ink-on-inv-tertiary` | Muted text on dark bg |

### 2.4 Accent & interactive

| Token | Hex | Tailwind class | Role |
|-------|-----|----------------|------|
| `--accent-dark` | `#2B2826` | `bg-accent-dark` | Solid (primary) buttons |
| `--accent-dark-hover` | `#3D3835` | `hover:bg-accent-dark-hover` | Solid button hover |
| `--accent-outline` | `#2B2826` | `border-accent-outline` | Ghost / outline button border |
| `--accent-highlight` | `#D4E4EF` | `bg-accent-highlight` | Soft blue — focus rings, info callouts only |
| `--stat-fill` | `#C8C1B5` | `text-stat-fill` | Optional decorative stat numerals |
| `--stat-label` | `#5C5650` | `text-stat-label` | Stat caption |

### 2.5 Tag chips

| Token | Hex | Tailwind class | Role |
|-------|-----|----------------|------|
| `--tag-genre-bg` | `#2B2826` | `bg-tag-genre-bg` | Solid genre chip ground |
| `--tag-genre-text` | `#F5F0E8` | `text-tag-genre-text` | Solid genre chip text |

The genre chip uses the ink-primary value, **not** a coloured fill.
Differentiation between tags is by *label*, never by hue.

### 2.6 Destructive (CMS only)

The CMS occasionally needs to signal "this action will delete data and
cannot be undone." Pure red (`text-red-700`, `bg-red-500/10`) is **forbidden**
because it fights the warm palette. Use a deep terracotta that sits in
the same family.

| Token | Hex | Tailwind class | Role |
|-------|-----|----------------|------|
| `--destructive` | `#8B3A2E` | `text-destructive` `border-destructive` | Destructive ink and outline |
| `--destructive-bg` | `#F2E0DC` | `bg-destructive-bg` | Destructive tinted background |

Where: confirmation modal body, the inline error line in CMS forms,
the destructive button border. Public site must never import these
tokens. See §13.6.

### 2.7 Photographic / chrome overlay

| Token | Value | Role |
|-------|-------|------|
| `--photo-overlay` | `#2B2826` | Dark wash for hero overlays and modal backdrops |
| `--photo-opacity` | `0.55` | Wash opacity on standard surfaces |
| `--overlay` | `var(--surface-inv)` | Modal/dropdown backdrop ground |
| `--overlay-opacity` | `0.6` | Modal/dropdown backdrop opacity |

Modal overlays use `bg-surface-inv/60` (or the `--overlay` token applied
through Tailwind's slash-opacity). **Never** use `bg-black/*` or the
literal hex `#000` for overlays.

---

## 3. Colour palette — dark mode

The dark mode inverts the value scale but keeps the warm undertone.
Every token has a dark variant; components use the same class names.

| Token | Light | Dark |
|-------|-------|------|
| `--surface-0` | `#F5F0E8` | `#1C1A17` |
| `--surface-1` | `#EBE6DD` | `#272420` |
| `--surface-2` | `#E2DCD2` | `#33302B` |
| `--surface-3` | `#D8D2C8` | `#443F39` |
| `--ink-primary` | `#2B2826` | `#EDE8DF` |
| `--ink-secondary` | `#5C5650` | `#B5AFA6` |
| `--ink-tertiary` | `#8A8279` | `#7D776E` |
| `--accent-dark` | `#2B2826` | `#EDE8DF` (light fill) |
| `--accent-highlight` | `#D4E4EF` | `#263A48` |
| `--destructive` | `#8B3A2E` | `#D88E80` |
| `--destructive-bg` | `#F2E0DC` | `#4A1F18` |
| `--photo-opacity` | `0.55` | `0.65` |
| `--overlay-opacity` | `0.6` | `0.7` |

**Never use `#000` or `#FFF` anywhere.** The warmest dark is `#1C1A17`,
the lightest light is `#F5F0E8`. This is the single most-violated rule
in the codebase — verify every literal colour you write against this
table.

---

## 4. Typography

Two fonts. Use the right one for the job.

### 4.1 Fonts

| Family | Token | Tailwind class | When | Weights in use |
|--------|-------|----------------|------|----------------|
| **Source Serif 4** (display) | `--font-serif` | `font-serif` | Editorial headlines (h1–h3 in articles), the article kadertje, list-card titles, stat numerals, pull-quote text | 400, 500, 600, 700 |
| **Inter** (UI, body) | `--font-sans` | `font-sans` (Tailwind default) | Everything else: body text in lists/forms, navigation, buttons, captions, metadata labels, table cells, CMS chrome | 400, 500, 600, 700 |

The serif/sans pairing is the **newspaper** model: editorial typography
gets the warmth and authority of a serif, UI chrome stays neutral and
legible in sans.

### 4.2 Heading scale

Two scales — one for editorial headings (article voice), one for
catalogue/CMS headings (UI voice). Both use the same families but
differ in weight and size.

#### Editorial scale (article-voice)

Used inside an article body and inside the kadertje. Always serif.

| Role | Class | Where |
|------|-------|-------|
| h1 — article masthead | `font-serif text-3xl md:text-5xl font-semibold leading-[1.1] tracking-tight text-ink-primary` | One per article, inside the kadertje |
| h2 — section heading | `font-serif text-3xl md:text-4xl font-semibold leading-tight tracking-tight text-ink-primary` | Section titles in articles **and** in catalogue pages — they share this style |
| h3 — subheading | `font-serif text-lg md:text-xl font-semibold text-ink-primary` | Small headings inside content |
| h4 — museum-label | `inline-block border-b-2 border-ink-primary pb-1 text-[11px] font-bold uppercase tracking-[0.25em] text-ink-primary` | Credits, in-body section labels (§11.8) |
| h5 / h6 | Avoid. If you reach for h5, restructure. |  |

#### Catalogue / CMS scale (UI-voice)

Used in list pages, navigation, footer, CMS panels and modals. Sans-serif.

| Role | Class | Where |
|------|-------|-------|
| h1 — page title | `font-serif text-3xl md:text-4xl font-semibold leading-tight tracking-tight text-ink-primary` | Listing page hero (shares editorial h2 style for coherence) |
| h2 — section title | `text-xl font-semibold text-ink-primary` | CMS sections, panel headings |
| h3 — subsection | `text-base font-semibold text-ink-primary` | Group headers inside a panel |
| h4 — kicker / overline | `text-xs font-semibold uppercase tracking-[0.2em] text-ink-secondary` | Form group labels, drawer category titles |
| h5 — micro label | `text-[11px] font-semibold uppercase tracking-[0.25em] text-ink-tertiary` | Sub-grouping inside a CMS panel |

Never reach for `text-2xl` headings outside the canonical scale.
Never use a pixel-arbitrary class like `text-[14px]` — use the
nearest scale step (`text-sm`).

### 4.3 Body & UI scale

| Role | Class | Notes |
|------|-------|-------|
| Body — article lead | `font-serif text-lg md:text-xl leading-[1.7] text-ink-primary text-justify hyphens-auto` | Lead paragraph in articles |
| Body — article continuation | `font-serif text-base leading-[1.7] text-ink-secondary text-justify hyphens-auto` | Secondary paragraphs |
| Body — UI / list | `text-base leading-relaxed text-ink-primary` | List rows, navigation, panel content (sans by default) |
| Body — dense (CMS) | `text-sm text-ink-primary` | CMS forms, table cells, modal bodies |
| Caption / dateline | `font-serif text-xs italic text-ink-tertiary md:text-sm` | Photo captions, side notes |
| Meta label | `text-xs font-medium uppercase tracking-[0.2em] text-ink-tertiary` | Small labels, kicker pieces |
| Helper / hint | `text-xs text-ink-secondary` | Form helper text, "X items selected" |
| Smallest readable | `text-xs` (12 px) | The floor — never go below |

**Minimum readable size: 12px (`text-xs`).** Classes like `text-[7px]`,
`text-[8px]`, `text-[9px]` are forbidden everywhere except non-textual
ornaments. The footer and any micro-caps labels live at `text-xs` minimum.

### 4.4 Numerals

| Role | Class | Notes |
|------|-------|-------|
| Stat numeral | `font-serif text-3xl md:text-4xl font-semibold tabular-nums text-ink-primary` | Stats bars; `tabular-nums` for alignment |
| Date in event row | `font-serif text-2xl font-semibold tracking-tight tabular-nums` | Event-style list rows |
| Price / year inline | `font-serif tabular-nums` | Wherever numbers must align across rows |
| Pagination "page X of Y" | `text-sm tabular-nums text-ink-secondary` | Pagination strip |

Always pair numeric data with `tabular-nums` so columns align across rows.
Never `font-mono` for prices, dates or large numbers.

### 4.5 Forbidden in content

- ❌ `font-black` (900). The shouty filmposter weight. Use `font-bold`
  (700) at most — and only on h1's inside an editorial kadertje.
  This includes the footer: replace `font-black uppercase tracking-[0.3em]`
  with `font-semibold uppercase tracking-[0.2em]`.
- ❌ `tracking-tighter`. Combined with `font-black uppercase` it produces
  the concert-poster look we are explicitly *not* doing. `tracking-tight`
  is fine.
- ❌ `italic` on UI text or section headings. Italic is reserved for
  editorial elements: pull quotes, the article deck, photo datelines,
  marginalia.
- ❌ `uppercase` on body text or editorial headings. Allowed only on
  meta-label content (≤ 4 words: "From the archive", "Theatre · 1987").
- ❌ `font-mono`. Only allowed inside genuinely tabular technical content
  (e.g. event time captions). Never on prices, dates, or large numbers.
- ❌ Custom display fonts. Source Serif 4 is the only display family.
- ❌ `text-[Npx]` smaller than 12px in textual content.
- ❌ `hover:text-white` — use `hover:text-ink-on-inv` (no literal `#FFF`).

---

## 5. Spacing & rhythm

A 4-px base, expressed in Tailwind's default scale (1 = `0.25rem` = 4 px).
The values that *appear* in this codebase form a small whitelist; staying
inside it keeps every page on the same grid.

### 5.1 Spacing whitelist

| Use | Tailwind | px |
|-----|----------|-----|
| Hairline gap (icon ↔ text) | `gap-1` `gap-1.5` | 4–6 |
| Tight cluster (chip internals, button) | `gap-2` `px-2.5 py-1` | 8–10 |
| Form field internal padding | `px-3 py-2` | 12 / 8 |
| Standard card padding | `p-4` `p-5` `p-6` | 16 / 20 / 24 |
| Generous panel padding (kadertje) | `px-6 py-10 md:px-12 md:py-14` | 24/40 → 48/56 |
| List row vertical | `py-8` | 32 |
| Section vertical (between page sections) | `py-12 md:py-20` | 48 → 80 |
| Container gutter (page side padding) | `px-6 lg:px-10` | 24 → 40 |
| Footer outer padding | `px-6 py-12` | 24 / 48 |

Avoid arbitrary spacing (`p-[18px]`, `mt-[37px]`). If you reach for one,
the layout probably wants a different scale step.

### 5.2 Section paddings (page composition)

A page section is a horizontal band with its own background tint.

```html
<!-- Standard page section -->
<section class="px-6 py-12 lg:px-10 lg:py-20">
  <div class="mx-auto max-w-4xl">
    <!-- content -->
  </div>
</section>
```

- Side padding: `px-6 lg:px-10`. Always.
- Vertical padding: `py-12` (mobile) / `py-20` (desktop) for standard
  sections. Heroes can go larger (`py-24 lg:py-32`); CMS panels go
  smaller (`p-5` to `p-6`).
- Inside a section, content sits in a centred container — see §6.2.

### 5.3 Vertical rhythm inside content

- Between two paragraphs in editorial body: handled by the body's
  natural margin (`text-justify` block). For other contexts, use
  `space-y-3` (small) / `space-y-6` (medium) / `space-y-10` (large
  between sub-sections).
- Between a label and its input: `gap-2`.
- Between a section heading and its first body element: `mb-4` (small
  heading) or `mb-6` (large heading).
- Between two stacked cards in a list: handled by `border-b border-surface-3`
  on each row, **not** by `space-y-*`. Borders carry separation in lists.

---

## 6. Layout

### 6.1 Breakpoints

We use Tailwind's default breakpoints, with one project convention.

| Token | Min width | When |
|-------|-----------|------|
| (default) | 0 | Mobile portrait |
| `sm:` | 640 px | Compact tablet / large phone landscape |
| `md:` | 768 px | Tablet |
| `lg:` | 1024 px | Small desktop |
| `xl:` | 1280 px | Desktop |
| `2xl:` | 1536 px | Wide desktop |

Convention: use `md:` for the **typography breakpoint** (where headlines
grow, body lengthens) and `lg:` for the **layout breakpoint** (where
columns split, side panels appear, section padding widens). `sm:` is
mostly for navigation chrome (hamburger ↔ horizontal nav). `xl:` and
`2xl:` are reserved for the CMS grid and the footer's widest container.

### 6.2 Container widths

Pick the narrowest container that still reads well. Each container
implies a register.

| Container | Class | Use |
|-----------|-------|-----|
| Article column | `max-w-2xl` (672 px) | Editorial body text — single-column reading |
| Standard page | `max-w-4xl` (896 px) | Catalogue list pages, standard content |
| Wide layout | `max-w-6xl` (1152 px) | Catalogue with side rails, gallery grids |
| Full chrome | `max-w-[1400px]` | Footer, CMS shell — the only sanctioned arbitrary width |
| Modal — confirm | `max-w-md` (448 px) | ChangePasswordModal, simple confirmations |
| Modal — remove confirm | `max-w-2xl` (672 px) | CMS remove confirmation |
| Modal — edit form | `max-w-5xl` (1024 px) | CMS create/edit modal |
| Side panel | `max-w-xl` (576 px) | CMS form drawer |

Always centre with `mx-auto`. Always combine with section side padding
(§5.2).

### 6.3 Z-index scale

A small, explicit ladder. Do not invent intermediate values (`z-[42]`
is forbidden).

| Token | Tailwind | Use |
|-------|----------|-----|
| Surface | (none / `z-0`) | Default flow |
| Stuck content | `z-10` | Sticky kicker, in-page sticky elements |
| Sticky chrome | `z-40` | Mobile nav drawer |
| Navbar | `z-50` | Sticky top navbar |
| Overlay | `z-50` | Modal backdrop, side panel backdrop |
| Modal content | `z-50` (inside the backdrop's stacking context) | Modal panel |
| Dropdown popover | `z-50` (locally) — explicit `z-index: 100` only inside the navbar dropdown | Popover above navbar |

The navbar and modal overlay share `z-50`; modals open *after* the
navbar and naturally win. The single sanctioned `z-index: 100` is for
the admin profile dropdown so it sits above the navbar that contains it.

---

## 7. Borders, radii, shadows

### 7.1 Borders

- **Standard width**: 1 px. Just `border` (no `border-2`).
- **Standard colour (light surface)**: `border-surface-3`.
- **Standard colour (inverted surface)**: `border-surface-inv-border`.
- **Standard colour (CMS destructive)**: `border-destructive`.
- **Heavier rule (museum-label)**: `border-b-2 border-ink-primary`.
  This is the **only** sanctioned 2 px border in the system.
- **Section dividers**: `border-t border-surface-3` or `border-b border-surface-3`.
- **Forbidden**: `border-3`, `border-4`, dashed borders (`border-dashed`)
  outside the CMS empty-state placeholder, gradient borders, double
  borders.

### 7.2 Radius scale

A short, intentional scale. Each value has a designated owner.

| Class | Radius | Owner |
|-------|--------|-------|
| (none) — square | 0 | Editorial kadertje (§11.2). Photographic frames inside articles. |
| `rounded-sm` | 2 px | Tag chips, inline pills inside catalogue rows |
| `rounded-md` | 6 px | **Default** — buttons, inputs, cards, list rows, dropdowns, mini-buttons, the CMS side-panel save button |
| `rounded-lg` | 8 px | Modal dialogs, side-panel containers, dropdown menus |
| `rounded-full` | ∞ | Avatars, circular icon-only controls (rare). **Not** for buttons, **not** for CMS pills. |

The currently-shipping `rounded-xl`, `rounded-2xl`, `rounded-t-md`-only
outliers in `ChangePasswordModal.vue` and `cms-view.css`
(`cms-add-button`, `cms-remove-button`) are violations and should
collapse to `rounded-md` (button) or `rounded-lg` (modal) in a follow-up.

**Asymmetric radii** (`rounded-t-md`) are allowed on tab chrome only
(see §13.2).

### 7.3 Shadows

The system is mostly **shadow-free**. Borders carry separation; tone
shifts carry layering. Shadows are reserved for elements that
genuinely float over other content.

| Class | Where | Rationale |
|-------|-------|-----------|
| (none) | Cards, list rows, buttons, panels in flow | Borders + surface steps do the work |
| `shadow-sm` | The CMS save button | Subtle lift to mark the primary action |
| `shadow-lg` | Modal dialogs that float over a backdrop | Clear separation from page content |
| `shadow-xl` | Side panels (drawers), navbar dropdowns | Strongest sanctioned lift |
| `shadow-2xl` | The CMS side panel (`cms-side-panel`) | One-off — sanctioned because the panel covers half the screen |

**Forbidden**: `shadow` / `shadow-md` on cards, list rows, tag chips,
buttons in flow, or any element that does not float. If you reach
for a shadow to "make a card pop", step the surface (`bg-surface-1` →
`bg-surface-2`) instead.

---

## 8. Motion

Allowed but quiet.

### 8.1 Allowed

- **Opacity / fade-up on mount**: `0 → 1`, `0.3s–0.8s`, `ease-out`.
  Tokens: `--animate-fade-up`, `--animate-fade-in` (registered in
  `style.css`).
- **Stagger between siblings**: ≤ `60ms`, total stagger ≤ `~600ms`.
  See `ProductionListCard`'s `--production-list-stagger`.
- **Colour transitions on hover**: `transition-colors duration-200`.
- **Mild scale on card thumbnails**: `group-hover:scale-105`,
  `transition-transform duration-700`.
- **Drawer slide / fade**: `transition-all duration-200 ease-out` with
  `opacity-0 -translate-y-2` on enter/leave (see `navbar.css`).
- **Skeleton pulse**: Tailwind's `animate-pulse` on placeholder shapes.
- **Page-change fade overlay**: `transition-opacity duration-200` on a
  list wrapper, going to `opacity-50 pointer-events-none` while the
  next page loads (see ProductionsView).

### 8.2 Forbidden

- ❌ Bounce, spring, rotate, slide animations on content.
- ❌ Parallax or scroll-driven effects.
- ❌ Animations longer than `0.8s`.
- ❌ Animation on every page mount (the entrance animation should only
  fire on the *first* render — not on filter changes or pagination,
  see §12.2).

### 8.3 Reduced motion

Every animation must have a `@media (prefers-reduced-motion: reduce)`
rule that disables it (or reduces it to opacity only). This is
non-negotiable.

---

## 9. Photography

The site has two photographic registers, mirroring the two writing
registers.

### 9.1 Editorial photographs (article hero)

Used inside the article kadertje as a banner. Full colour, no filter,
no dramatic gradient overlay.

```html
<img
  :src="bannerUrl"
  :alt="..."
  class="h-full w-full object-cover object-center"
  loading="eager"
/>
```

- Aspect: tall enough to host the kadertje overlap. `h-[55vh] md:h-[65vh]`.
- Grayscale: **no**.
- Gradient overlay: **no**. The kadertje carries its own contrast.
- Hover effects: **no**.

### 9.2 Archival thumbnails (lists, cards, blog covers, gallery)

Used in productions list rows, gallery thumbnails, blog covers. Filtered
to unify them with the paper palette — even when the source images vary
wildly in tone.

```html
<img class="h-full w-full object-cover grayscale contrast-125" />
```

- Aspect: `aspect-[4/3]` (cards), `aspect-[3/2]` (lists), `aspect-square`
  (small thumbnails). Never 16:9.
- Always `grayscale contrast-125`.
- Optional: `--photo-overlay` at `--photo-opacity` for legibility when
  text overlays the image.
- Hover: a subtle scale (`group-hover:scale-105`) is allowed in
  card-style components. Static elsewhere.

### 9.3 Forbidden

- ❌ Drop shadows on images.
- ❌ Coloured overlays other than `--photo-overlay`.
- ❌ Rounded corners larger than `rounded-md` on photographs.
- ❌ Mixing register: never a colour photograph in a list row, never a
  grayscale photograph in an article hero.

---

## 10. Iconography

- **Inline SVG only**, sized via Tailwind classes.
- **Standard sizes**: `size-3` (12), `size-4` (16), `size-5` (20),
  `size-6` (24). Stick to this ladder.
- **Stroke / fill**: `currentColor`. Never coloured. Icons inherit
  text colour from their context.
- **Stroke width**: `1.5` for outlined icons (matches the Lucide /
  Phosphor families used in the codebase).
- **Standalone icon button**: must have an `aria-label`. A `<button>`
  with only an `<svg>` child is not allowed without one.
- **Icons accompany text** by default. A bare icon should be a
  recognised affordance (close ×, hamburger ≡, chevron ⌄).
- **Forbidden**: emoji, raster icons, decorative gradients on icons,
  icons larger than `size-6` outside the navbar drawer hamburger.

---

## 11. Editorial article patterns

Article-style pages (production detail, blog detail) use this set of
patterns. These are the structural elements of a longread.

### 11.1 Kicker (department · genre · year)

Small caps line above the headline, with a thin horizontal rule on each
side. Composed of two or three short metadata pieces joined by `·`.

```html
<div
  class="mb-6 flex items-center justify-center gap-3 text-xs font-bold uppercase tracking-[0.25em] text-ink-secondary"
>
  <span class="h-px w-8 bg-ink-tertiary opacity-50" aria-hidden="true" />
  <span class="whitespace-nowrap">Theatre · 1987</span>
  <span class="h-px w-8 bg-ink-tertiary opacity-50" aria-hidden="true" />
</div>
```

- Composition: `[department] · [genre] · [year]`, deduplicated.
- Render only when at least one piece is non-empty.

### 11.2 Kadertje (article header card over photo)

A "letterpress" card overlapping the lower half of a banner photograph.
Paper-coloured background, thin ink-coloured border, square corners, no
shadow. Like a museum label or magazine title plate.

```html
<header class="relative z-10 mx-auto -mt-32 max-w-2xl px-6 md:-mt-44 md:px-0">
  <div
    class="border border-ink-primary bg-surface-0 px-6 py-10 text-center md:px-12 md:py-14"
  >
    <!-- kicker -->
    <!-- h1 (font-serif, semibold, mixed case) -->
    <!-- italic serif deck -->
    <!-- small caps byline -->
  </div>
</header>
```

- Negative top margin pulls the kadertje up over the photo.
- A small italic dateline can sit beneath the kadertje (§11.6).
- **Never** use `rounded-*` on the kadertje. Square corners only.

### 11.3 Drop cap

The first letter of the lead paragraph, spanning three body lines.

```css
.article-lead :first-child::first-letter {
  -webkit-initial-letter: 3;
  initial-letter: 3;
  font-family: var(--font-serif);
  font-weight: 700;
  margin-right: 0.4rem;
  color: var(--ink-primary);
}

@supports not ((initial-letter: 3) or (-webkit-initial-letter: 3)) {
  .article-lead :first-child::first-letter {
    float: left;
    font-size: 4.8em;
    line-height: 1;
    margin: 0.05em 0.5rem 0 0;
  }
}
```

- Use only on a paragraph that is genuinely the lead (the first body
  block of the article).
- `:first-child::first-letter` because v-html wraps content in `<p>`.
- `initial-letter` for modern browsers; float-based fallback for older.

### 11.4 Pull quote

A quote pulled into the body to break a long passage. Hanging serif
open-quote glyph in the margin, italic medium serif quote text,
small-caps caption underneath.

```html
<figure class="relative">
  <span
    aria-hidden="true"
    class="pointer-events-none absolute -left-2 -top-6 select-none font-serif text-7xl leading-none text-ink-tertiary opacity-40 md:-left-8 md:-top-10 md:text-8xl"
  >
    &ldquo;
  </span>
  <blockquote class="space-y-4">
    <p
      class="font-serif italic text-2xl font-medium leading-[1.2] tracking-tight text-ink-primary md:text-4xl"
    >
      {{ quote }}
    </p>
    <figcaption
      class="pl-8 text-xs font-semibold uppercase tracking-[0.2em] text-ink-secondary md:pl-16"
    >
      &mdash; {{ source }}
    </figcaption>
  </blockquote>
</figure>
```

- Place quotes in the **middle** of the body, never at the top.
- Use `figure` / `blockquote` / `figcaption` for semantics.
- The open-quote glyph is decorative (`aria-hidden`).

### 11.5 Asterism break

When two body paragraphs exist but no pull quote separates them, mark
the break with an asterism — three centred asterisks with wide tracking.

```html
<div aria-hidden="true" class="select-none text-center text-ink-tertiary">
  <span class="font-serif text-xl tracking-[0.6em]">***</span>
</div>
```

- Use only when there is no quote between the two paragraphs.
- Never use `<hr>` or full-width rules inside the body.

### 11.6 Photo dateline / caption

A single sober italic line beneath the kadertje (or under any in-body
photograph). Anchors the image as archival material.

```html
<p class="font-serif text-xs italic text-ink-tertiary md:text-sm">
  Beeld uit het archief van De Vooruit
</p>
```

### 11.7 Marginalia (sidebar note)

A short side note in the article gutter — teaser text, archival
annotations, editor's notes. Thin vertical rule on the left, italic
serif body.

```html
<aside class="border-l-2 border-ink-tertiary pl-5 md:pl-6">
  <p class="font-serif italic text-base leading-relaxed text-ink-primary md:text-lg">
    {{ teaser }}
  </p>
</aside>
```

- **No dark backgrounds.** A marginalia is a quiet kantlijn-aantekening,
  not a promo card.

### 11.8 Museum-label heading (in-body section labels)

A short bold caps label with a thick underline only as wide as the
text. Used for credit-style sections inside an article (e.g. "Extra
info", "Programme").

```html
<h3
  class="mb-4 inline-block border-b-2 border-ink-primary pb-1
         text-[11px] font-bold uppercase tracking-[0.25em] text-ink-primary"
>
  Extra info
</h3>
```

- The underline is the visual anchor — it lets a small label dominate a
  larger body.
- Use for in-body section labels, not for top-of-page section headings.

### 11.9 Credits footer

The bottom band of an article, holding info / programme / sources.
Single thin top rule, two-column grid, museum-label headings, serif
body.

```html
<footer class="lg:col-span-12 border-t border-surface-3 pt-10">
  <div class="grid grid-cols-1 gap-12 lg:grid-cols-12">
    <div class="lg:col-span-7">
      <h3 class="...museum-label..."> Extra info </h3>
      <div class="font-serif text-sm leading-[1.7] text-ink-secondary"> ... </div>
    </div>
    <div class="lg:col-span-5"> ... </div>
  </div>
</footer>
```

### 11.10 End-mark

Closes the body when there is content to close. The classic newspaper
"story ends here" sign.

```html
<div
  v-if="hasBodyContent"
  aria-hidden="true"
  class="select-none pt-4 text-center text-xs font-semibold tracking-[0.4em] text-ink-tertiary"
>
  &mdash;30&mdash;
</div>
```

- Use literal `—30—` (em dashes around the digits 30).
- Never use a custom symbol or graphic.

### 11.11 Body conventions

- **Serif**: `font-serif` for both lead and continuation.
- **Generous leading**: `leading-[1.7]` (~28 px line on 17 px text).
- **Justified**: `text-justify hyphens-auto` for print-quality reading
  rhythm. Leave lists, captions and UI text left-aligned.
- **Pre-line whitespace**: `whitespace-pre-line` so paragraph breaks in
  source content render as line breaks.

---

## 12. Catalogue / list patterns

Listing pages, navigation, footer, list rows. The register is sober and
print-archival rather than long-form editorial.

### 12.1 Section heading

Same style as editorial h2 — the page-level heading harmonises across
both registers.

```html
<h2
  class="font-serif text-3xl md:text-4xl font-semibold leading-tight tracking-tight text-ink-primary"
>
  ...
</h2>
```

- **Never** `font-black uppercase tracking-tighter`. That is the old
  filmposter pattern; it is forbidden going forward.

### 12.2 List row (productions, events)

Horizontal rows separated by thin dividers. Title in serif semibold,
metadata in sans secondary ink, optional thumbnail on the left.

```html
<a
  class="group -mx-3 flex items-stretch gap-4 border-b border-surface-3
         px-3 py-8 transition-colors hover:bg-surface-1/60"
>
  <!-- thumbnail (archival treatment, see §9.2) -->
  <div class="flex-1 min-w-0">
    <h2 class="font-serif text-xl md:text-2xl font-semibold leading-tight tracking-tight text-ink-primary">
      ...
    </h2>
    <p class="mt-1 text-base text-ink-secondary">...</p>
    <!-- venue, tags, etc. -->
  </div>
</a>
```

- **Title font**: `font-serif`, never `font-black`.
- **Date in event-style rows**: `font-serif text-2xl font-semibold tracking-tight`.
- **Numeric data (price, year)**: `font-serif tabular-nums`. Never
  `font-mono` or `font-black`.
- **Entrance animation**: only on the *first* render. When the user
  paginates or filters, pass `:animate="false"` so the rows do not
  re-animate. See §14.10.

### 12.3 Tag chip

Small caps, square-ish corners. Two variants only.

| Variant | When | Class |
|---------|------|-------|
| **Genre** (solid) | Primary classification of a production | `bg-tag-genre-bg text-tag-genre-text rounded-sm px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide` |
| **Generic** (outline) | All other tags (theme, language, format) | `border border-surface-3 bg-surface-1 text-ink-secondary rounded-sm px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide` |

- **No coloured tags** (purple, orange, etc.). Differentiation is by
  *label*, not by colour.
- Tags use square-ish corners (`rounded-sm`), never `rounded-full`.
- The current `--tag-genre-bg: #8224e3` (purple) in `design-tokens.css`
  is a **violation** and must be corrected to `#2B2826` per §2.5.

### 12.4 Tag drawer (sidebar collapsible)

When there are many tags grouped by type. Light bordered card with a
clickable header that toggles open/closed.

```html
<div class="border border-surface-3 bg-surface-0 transition-all">
  <button class="group flex w-full items-center justify-between px-6 py-5">
    <h3 class="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-secondary">
      Tags
    </h3>
    <svg class="h-3 w-3 text-ink-tertiary group-hover:text-ink-primary"> ... </svg>
  </button>
  <div v-if="open" class="space-y-6 border-t border-surface-3 p-6"> ... </div>
</div>
```

- Light border (`border-surface-3`), light background (`surface-0`),
  no shadows.
- Header label in `font-semibold` — not `font-black`.

### 12.5 Card (gallery, blog post)

Standard archival card: bordered, no shadow, archival-treated cover
image at top, small-caps category, serif title, sans body.

```html
<article class="group block">
  <div class="aspect-[3/2] mb-4 overflow-hidden bg-surface-2">
    <img class="grayscale contrast-125 ..." />
  </div>
  <span class="text-[10px] font-semibold uppercase tracking-widest text-ink-tertiary">
    Reportage · Mar 2026
  </span>
  <h3 class="font-serif mt-2 text-xl font-semibold leading-snug tracking-tight">
    ...
  </h3>
  <p class="mt-3 text-sm leading-relaxed text-ink-secondary"> ... </p>
</article>
```

### 12.6 Forbidden

- ❌ `shadow-*` on cards or list rows. Borders carry the separation.
- ❌ Card-on-card backgrounds (e.g. `bg-surface-1` inside `bg-surface-1`).
  Step the surface or use a divider.
- ❌ `font-black uppercase tracking-tighter` titles.

---

## 13. CMS / admin patterns

The CMS is its own register. It shares the palette and fonts but uses
a denser grid, plain modals, dropdowns and explicit destructive
signals — primitives the public site does not need.

CMS-only utilities live in `assets/stylesheets/cms-view.css` (panels,
modals) and `cms-ag-grid.css` (data grid). The public site must not
import them.

### 13.1 Architecture

```
src/
  components/
    nav/AdminNavbar.vue              ← admin-only top bar (with profile dropdown)
    admin/
      ChangePasswordModal.vue        ← simple modal example
      cms/
        CmsTabShell.vue              ← outer shell for a CMS tab (controls + grid + modals slot)
        CmsGridControls.vue          ← search input + utility buttons
        CmsColumnChooser.vue         ← column toggling
        CmsRemoveConfirmModal.vue    ← destructive confirmation
        CmsTagDrawer.vue             ← tag selection inside a panel
        admins/, productions/, tags/ ← per-resource CRUD components
  views/admin/
    AdminView.vue, CmsView.vue, LoginView.vue
```

### 13.2 Tab shell

Tabs sit on a thin underline. The active tab "lifts" by losing its
bottom border and adopting `surface-0`.

```html
<div class="cms-tabs">
  <button class="cms-tab" :class="{ 'cms-tab-active': isActive }">
    {{ label }}
  </button>
</div>
```

```css
.cms-tabs { @apply flex gap-1 border-b border-surface-3; }
.cms-tab {
  @apply -mb-px rounded-t-md border border-transparent px-4 py-2
         text-sm font-medium text-ink-secondary transition hover:text-ink-primary;
}
.cms-tab-active {
  @apply border-surface-3 border-b-transparent bg-surface-0 text-ink-primary;
}
```

### 13.3 AG Grid bridge

AG Grid is theme-bridged to design tokens in `style.css` so the grid
visually belongs to the rest of the site.

- Header background: `--surface-1` (light) / `--surface-inv-raised` (dark).
- Row hover: `--surface-2` at ~70% mix.
- Selected row: `--surface-2` at ~55% mix.
- Border: `--surface-3` / `--surface-inv-border`.
- Font family: Inter Variable. Font size: 13 px.
- Header weight: 700; tracking: 0.01em.

Do **not** override AG Grid colours per-grid. If a colour reads wrong,
fix the bridge in `style.css`, not the grid component.

### 13.4 Side panel (form drawer)

A right-anchored drawer for create / edit forms. Full screen height,
bordered on the left, raised with `shadow-2xl`.

```html
<div class="cms-side-overlay" />
<aside class="cms-side-panel">
  <header class="cms-side-header">
    <h2 class="text-xl font-semibold text-ink-primary">{{ title }}</h2>
    <button class="cms-side-close">{{ t("cms.panel.close") }}</button>
  </header>
  <div class="cms-side-body"> <!-- form fields --> </div>
  <footer class="cms-side-footer">
    <p class="cms-side-save-hint">{{ hint }}</p>
    <button class="cms-side-save">{{ t("general.save") }}</button>
  </footer>
</aside>
```

- Width: `max-w-xl` (576 px) on desktop, full width on mobile.
- Background: `bg-surface-0`. Border: `border-l border-surface-3`.
- Save button: `bg-surface-inv text-ink-on-inv rounded-md` (not
  `rounded-full`, not `bg-accent-dark` — the inverse surface signals
  "primary in CMS context").
- Close button: text + `border border-surface-3`.

### 13.5 Confirmation modal

Centred dialog over a backdrop. Three slots: header, body, footer.
Confirm-and-cancel button pair on the right.

```html
<div class="cms-modal-overlay" @click.self="$emit('close')">
  <section class="cms-modal cms-remove-modal" role="dialog" aria-modal="true">
    <header class="cms-modal-header">
      <h2 class="text-xl font-semibold text-ink-primary">{{ title }}</h2>
      <button class="cms-side-close">{{ t("cms.panel.close") }}</button>
    </header>
    <div class="cms-modal-body">
      <p class="text-sm text-ink-secondary">{{ body }}</p>
      <p v-if="error" class="text-sm text-destructive">{{ error }}</p>
    </div>
    <footer class="cms-modal-footer">
      <button class="cms-side-close" @click="$emit('close')">{{ t("general.cancel") }}</button>
      <button class="cms-side-save" @click="$emit('confirm')">{{ confirmLabel }}</button>
    </footer>
  </section>
</div>
```

- Overlay: `bg-surface-inv/60` (not `bg-black/40`). The current
  `cms-modal-overlay` uses `bg-black/40` — that is a violation.
- Modal panel: `bg-surface-0`, `border border-surface-3`, `rounded-lg`
  (not `rounded-xl`), `shadow-lg`.
- Close on backdrop click via `@click.self`.
- `role="dialog" aria-modal="true"`. Focus must be trapped (use a
  composable; not the responsibility of this section).

### 13.6 Destructive action

Used for "remove this admin", "delete these productions", etc. Always
pairs with a confirmation modal — never a one-click destroy.

```html
<button class="cms-remove-button">
  {{ t("cms.actions.remove") }}
</button>
```

```css
.cms-remove-button {
  @apply inline-flex w-fit items-center rounded-md border border-destructive
         bg-destructive-bg px-4 py-2 text-sm font-medium text-destructive
         transition hover:bg-destructive-bg/80
         disabled:cursor-not-allowed disabled:opacity-50;
}
```

- Tokens: `--destructive` (`#8B3A2E` light) and `--destructive-bg`
  (`#F2E0DC` light). See §2.6.
- **Never** raw `text-red-700`, `bg-red-500/10`, `border-red-400/40`.
  These contradict the warm palette.
- The current `cms-remove-button` in `cms-view.css` (`text-red-700`,
  `rounded-full`) is a violation and should be migrated to the snippet
  above.
- Inline error text inside CMS forms: `text-sm text-destructive`.

### 13.7 Form inputs (CMS-specific)

Form fields inside CMS panels and modals.

```css
.cms-text-input {
  @apply rounded-md border border-surface-3 bg-surface-0 px-3 py-2
         text-sm text-ink-primary
         focus-visible:outline-2 focus-visible:outline-offset-2
         focus-visible:outline-accent-highlight;
}
.cms-side-textarea {
  @apply min-h-28 rounded-md border border-surface-3 bg-surface-1 p-3
         text-sm text-ink-primary;
}
.cms-lang-label {
  @apply text-xs font-semibold uppercase tracking-wide text-ink-secondary;
}
```

- Inputs: `surface-0` background, `surface-3` border, `rounded-md`.
- Textareas can use `surface-1` (one step deeper) inside a `surface-0`
  panel.
- Labels: `text-xs font-semibold uppercase tracking-wide text-ink-secondary`.
- Focus: `outline-accent-highlight`. Never a border-colour change.

### 13.8 Toolbars & mini buttons

A toolbar above the grid holds search, selection summary, and utility
actions.

```css
.cms-toolbar {
  @apply flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between;
}
.cms-search-input {
  @apply w-full rounded-md border border-surface-3 bg-surface-0 px-4 py-2
         text-sm text-ink-primary placeholder:text-ink-tertiary sm:max-w-md;
}
.cms-mini-btn {
  @apply rounded-md border border-surface-3 bg-surface-0 px-3 py-1
         text-xs font-semibold text-ink-secondary transition hover:bg-surface-1;
}
.cms-selected-chip {
  @apply inline-flex w-fit items-center rounded-full border border-surface-3
         bg-surface-0 px-3 py-1 text-xs font-semibold text-ink-secondary;
}
```

- The selected-count chip is the **one** sanctioned `rounded-full` in
  the CMS — it reads as a status pill rather than a button.

---

## 14. Cross-cutting components

Components that appear across registers, with one canonical
implementation each.

### 14.1 Navbar

Sticky top bar, dark surface, `h-16`. Two flavours: `AppNavbar` (public)
and `AdminNavbar` (admin) sharing primitives in
`assets/stylesheets/navbar.css`.

```css
.navbar {
  @apply sticky top-0 z-50 flex h-16 w-full items-center justify-between
         bg-surface-inv px-6 lg:px-10;
}
.nav-link {
  @apply text-lg font-medium text-ink-on-inv-secondary transition
         hover:text-ink-on-inv;
}
.nav-link.router-link-active { @apply text-ink-on-inv; }
```

- Mobile: hamburger ↔ drawer (`NavDrawer`) below the navbar, dark
  surface, slide+fade transition.
- Sign-out / destructive items in the drawer use **`--destructive`**,
  not `text-red-400`.

### 14.2 Footer

Dark surface, four columns on desktop (`lg:grid-cols-4`), two on tablet,
one on mobile. Caps labels per column.

```html
<footer class="bg-surface-inv text-ink-on-inv border-t border-surface-inv-border px-6 py-12">
  <div class="mx-auto max-w-[1400px]">
    <div class="grid grid-cols-1 gap-x-12 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
      <section>
        <h4 class="text-xs font-semibold uppercase tracking-[0.2em] text-ink-on-inv">
          {{ heading }}
        </h4>
        <p class="mt-3 text-sm text-ink-on-inv-secondary leading-relaxed">
          {{ body }}
        </p>
      </section>
      <!-- … three more columns -->
    </div>
  </div>
</footer>
```

- Heading: `text-xs font-semibold uppercase tracking-[0.2em]`. **Not**
  `font-black`, **not** `text-[9px]`. The current footer code uses
  both — those are violations.
- Body: `text-sm text-ink-on-inv-secondary`.
- Links: `text-ink-on-inv-secondary hover:text-ink-on-inv` (not
  `hover:text-white`).
- Social icons: `size-4`, `text-ink-on-inv-tertiary hover:text-ink-on-inv`,
  `transition-colors duration-200`. No `hover:scale-110`.
- Copyright line: `text-xs text-ink-on-inv-tertiary opacity-70`. **Not**
  `text-[7px] opacity-30` — that fails WCAG and the readable-floor rule.

### 14.3 Buttons (full reference)

Three variants on the public site, plus two CMS-specific extensions.

#### Primary (solid)

```html
<button class="inline-flex items-center gap-2 rounded-md bg-accent-dark
               px-4 py-2 text-sm font-medium text-surface-0 transition-colors
               hover:bg-accent-dark-hover
               focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-highlight">
  ...
</button>
```

On inverted (dark) surfaces, swap to a light fill: `bg-ink-on-inv text-surface-inv`.

#### Ghost / outline

```html
<button class="inline-flex items-center gap-2 rounded-md border border-accent-outline
               px-4 py-2 text-sm font-medium text-accent-outline transition-colors
               hover:bg-surface-2">
  ...
</button>
```

#### Inline link with hairline underline

For "Read more" / "All articles" / etc. inside content.

```html
<a class="inline-block border-b border-ink-tertiary pb-0.5
          text-sm font-medium text-ink-primary transition-colors
          hover:border-ink-primary">
  Lees verder
</a>
```

#### CMS save (extension)

`bg-surface-inv text-ink-on-inv rounded-md shadow-sm`. See §13.4.

#### CMS destructive (extension)

`border border-destructive bg-destructive-bg text-destructive rounded-md`.
See §13.6.

#### Forbidden

- ❌ Coloured fills (red "delete", green "save"). Use the destructive
  token (§2.6) for delete; save uses standard primary.
- ❌ `rounded-full` on standard buttons. Buttons are `rounded-md`.
- ❌ Trailing arrow icons on a CTA unless the button literally navigates
  forward through paginated content.
- ❌ `font-bold` or `font-black` on buttons. `font-medium` (500).
- ❌ `rounded-xl` / `rounded-2xl` on buttons (currently in
  `ChangePasswordModal.vue`).

### 14.4 Forms & inputs (full reference)

Public site:

```html
<input class="w-full rounded-md border border-surface-3 bg-surface-0
              px-3 py-2 text-sm text-ink-primary
              placeholder:text-ink-tertiary
              focus-visible:outline-2 focus-visible:outline-offset-2
              focus-visible:outline-accent-highlight" />
```

- Background: `surface-0` (sits on cards / `surface-1`).
- Focus: `--accent-highlight` outline. Never a border-colour change.
- Labels: `text-sm font-medium text-ink-primary` above the input.
- Helper text: `text-xs text-ink-secondary`.
- Error text: `text-xs text-destructive` (CMS) or `text-xs text-ink-secondary`
  (public site — the archive does not need to scold the reader).

CMS variants: see §13.7.

### 14.5 Modals & overlays

Used by the CMS only. The public site never needs a modal — anything
that wants to be a modal should be a route or a side panel instead.

```html
<div class="fixed inset-0 z-50 flex items-center justify-center
            bg-surface-inv/60 p-4" @click.self="close">
  <section class="flex w-full max-w-md flex-col rounded-lg border border-surface-3
                  bg-surface-0 shadow-lg" role="dialog" aria-modal="true">
    <!-- header / body / footer -->
  </section>
</div>
```

- Backdrop: `bg-surface-inv/60`. Never `bg-black/*`.
- Panel: `bg-surface-0 border border-surface-3 rounded-lg shadow-lg`.
- Sizes: see §6.2 (modal-confirm `max-w-md`, modal-remove `max-w-2xl`,
  modal-edit `max-w-5xl`).
- Backdrop click closes via `@click.self`.
- ARIA: `role="dialog" aria-modal="true"`. The label or labelledby
  attribute is mandatory.

### 14.6 Dropdowns & popovers

A dropdown menu attached to a trigger. Used for the admin profile menu
and (potentially) for column choosers.

```html
<div ref="popoverWrapper" class="relative">
  <button class="..."> Trigger </button>
  <div v-if="open"
       class="absolute right-0 top-full mt-2 min-w-[140px] overflow-hidden
              rounded-lg border border-surface-3 bg-surface-0 shadow-xl"
       style="z-index: 100;">
    <button class="block w-full px-4 py-2 text-left text-sm text-ink-secondary
                   transition hover:bg-surface-1 hover:text-ink-primary">
      Item
    </button>
  </div>
</div>
```

- Border: `border-surface-3` (light context) or `border-surface-inv-border` (dark context).
- Radius: `rounded-lg`.
- Shadow: `shadow-xl`.
- z-index: `100` only when the popover must escape a `z-50` navbar.
- Outside-click closes.

### 14.7 Skeleton loading

Used on initial page load when there is no content yet to show. After
the first load, prefer the **fade overlay** (§14.10) over more
skeletons.

```html
<div class="animate-pulse">
  <div class="h-7 w-1/2 rounded bg-surface-2 mb-2"></div>
  <div class="h-5 w-1/3 rounded bg-surface-1 mb-6"></div>
  <div class="h-4 w-32 rounded bg-surface-1"></div>
</div>
```

- Placeholder shapes: `bg-surface-2` for primary lines, `bg-surface-1`
  for secondary.
- Always wrap in `animate-pulse`.
- Number of placeholders: match the page-size of the resource (do not
  hard-code `5` if the page renders 10).
- Skeleton **only on initial mount**. Subsequent fetches use §14.10.

### 14.8 Empty states

A short, calm sentence explaining why nothing is shown. Always inside
the layout (do not collapse the section).

```html
<p class="py-16 text-center text-sm text-ink-secondary">
  {{ t("productionsPage.noResults") }}
</p>
```

- Centred, generous vertical padding (`py-16`).
- `text-sm text-ink-secondary`.
- No illustration. No "click here to add one" button (that belongs
  inline elsewhere).

### 14.9 Error states & 404

#### Inline error (failed fetch)

```html
<p class="rounded-md border border-surface-3 bg-surface-1 px-4 py-3
          text-sm text-ink-secondary">
  {{ errorMessage }}
</p>
```

- Neutral surface, no destructive colour. Errors on the public site
  are conditions, not crimes.

#### CMS error banner

```html
<p class="rounded-md border border-destructive bg-destructive-bg
          px-4 py-3 text-sm text-destructive">
  {{ saveError }}
</p>
```

#### Full-page 404

The 404 view sits inside the public chrome (`AppNavbar` + `AppFooter`)
with a sober editorial-h2 heading and a helper line. Never a 404
illustration.

### 14.10 Pagination

The canonical pagination strip (productions, blog).

```html
<nav class="mt-10 grid grid-cols-1 gap-y-6 border-t border-surface-3 pt-8
            sm:grid-cols-[1fr_auto] sm:items-center sm:gap-x-12 sm:gap-y-0">
  <p class="text-center text-sm text-ink-secondary sm:text-left">
    Showing {{ from }}–{{ to }} of {{ total }}
  </p>
  <div class="flex items-center gap-x-4" role="group" :aria-label="t('goToPage')">
    <button class="rounded-md border border-accent-outline bg-surface-0 px-3 py-1.5
                   text-sm font-medium text-ink-primary transition hover:bg-surface-2
                   disabled:cursor-not-allowed disabled:opacity-40"
            :disabled="currentPage <= 0 || listLoading">Prev</button>
    <input type="text" inputmode="numeric"
           class="min-w-6 max-w-8 border-0 border-b border-surface-3 bg-transparent
                  px-0 pb-px text-center text-sm tabular-nums text-ink-secondary
                  focus:border-ink-primary focus:text-ink-primary focus:outline-none" />
    <span class="whitespace-nowrap">of {{ totalPages }}</span>
    <button class="..." :disabled="currentPage >= totalPages - 1 || listLoading">Next</button>
  </div>
</nav>
```

- Top rule (`border-t border-surface-3`) marks the end of the list.
- Buttons disabled when the boundary is reached **or** while loading.
- Page-number input: hairline underline, no border-box.

Subsequent-fetch loading state: fade the existing list while the next
page resolves, do not show skeletons again.

```html
<div class="transition-opacity duration-200"
     :class="{ 'opacity-50 pointer-events-none': listLoading }">
  <!-- list rows here -->
</div>
```

### 14.11 Search & filter chips

Chips that show "currently active filters" (genre, date range, search
term). One chip per filter, with an `×` to remove.

```html
<button class="inline-flex items-center gap-1.5 rounded-sm border border-surface-3
               bg-surface-1 px-2.5 py-1 text-xs text-ink-secondary
               transition hover:bg-surface-2 hover:text-ink-primary">
  {{ label }}
  <span aria-hidden="true">×</span>
  <span class="sr-only">Remove filter</span>
</button>
```

- Same square-ish corners as the generic tag chip (§12.3).
- Hover deepens the surface, never adds colour.

### 14.12 Carousel & gallery

Image carousel for production gallery sections.

- Frame: full-bleed inside its section, `bg-surface-2` backdrop.
- Images: archival treatment (§9.2) — `grayscale contrast-125`.
- Arrow buttons: round (`rounded-full`), `bg-surface-inv/60` (the one
  sanctioned overlay use), `text-ink-on-inv`, `size-10`. Round is
  acceptable here because the button is purely an affordance over the
  image, not a content button.
- Dot pagination: small `size-2 rounded-full` dots, `bg-surface-3`
  (inactive) / `bg-ink-primary` (active).

### 14.13 Toasts (when introduced)

Not yet shipped. When introduced:

- Bottom-right anchor, `max-w-sm`.
- `bg-surface-inv text-ink-on-inv rounded-md shadow-xl px-4 py-3`.
- `text-sm`. No icon by default; an icon is allowed for destructive
  results.
- Auto-dismiss after 4 s. Always pair with an `aria-live="polite"`
  region.

---

## 15. Page-level rhythm

How full pages compose. The header (`AppNavbar` / `AdminNavbar`) and
footer (`AppFooter`) are constants; the body composition depends on
the register.

### 15.1 Editorial article page

```
AppNavbar           bg-surface-inv     (dark, sticky)
HeroSection         bg-surface-0       (banner photo + kadertje + dateline)
DetailsSection      bg-surface-1       (article body: lead → quote → continuation;
                                       sidebar marginalia + tag drawer; credits footer)
EventsSection       bg-surface-0       (catalogue list)
GallerySection      bg-surface-2       (carousel of archival thumbnails)
BlogSection         bg-surface-0       (related cards)
AppFooter           bg-surface-inv
```

- Photo, kadertje, drop cap and end-mark live exclusively here.

### 15.2 Catalogue / listing page

```
AppNavbar           bg-surface-inv     (dark)
Header / intro      bg-surface-0       (sober h1/h2 + intro paragraph + filters)
List                bg-surface-0       (horizontal rows, pagination footer)
AppFooter           bg-surface-inv
```

- No banner photographs, no kadertje, no drop cap.
- The section heading (§12.1) is the strongest visual element.

### 15.3 CMS page

```
AdminNavbar         bg-surface-inv     (dark, sticky, with profile dropdown)
CmsView shell       bg-surface-0       (tabs + grid + side panels + modals)
(no footer)
```

- No public footer in CMS.
- Container width: `max-w-[1400px]` (the dataset is wide).
- Side panel (`cms-side-panel`) and modals are layered on top.

### 15.4 Forbidden on every page

- ❌ Bento grids.
- ❌ Marketing-style "Get started" CTAs.
- ❌ Italic / uppercase / `font-black` on the page title.
- ❌ Hero photographs with overlaid headline-of-tagline-of-CTA stack
  (the "concert poster" pattern). Use a kadertje (§11.2) or a sober
  intro (§15.2) instead.
- ❌ Multiple section backgrounds at the same surface step in a row
  (`surface-0` immediately followed by another `surface-0`). Step the
  surface to mark the transition.

---

## 16. Accessibility

### 16.1 Focus state — single canonical pattern

```
focus-visible:outline-2 focus-visible:outline-offset-2
focus-visible:outline-accent-highlight
```

- Always the **outline** utility — never a border-colour change, never
  a box-shadow ring (`ring-*` is reserved for avatars).
- Always `focus-visible`, not `focus`. We do not show focus on mouse
  clicks.
- The accent-highlight blue is the only sanctioned focus colour. It
  is the single use case for the cool blue token.

### 16.2 Contrast

Verified pairs (light mode):

| Pair | Ratio | WCAG |
|------|-------|------|
| `surface-0` / `ink-primary` | ~12.5 : 1 | AAA |
| `surface-0` / `ink-secondary` | ~6.5 : 1 | AA |
| `surface-0` / `ink-tertiary` | ~3.5 : 1 | AA large |
| `surface-inv` / `ink-on-inv` | ~12.5 : 1 | AAA |
| `surface-0` / `destructive` | ~5.5 : 1 | AA |

Dark mode is symmetrically validated. **Do not** introduce a new
colour pair without checking contrast.

When a label or icon sits on `surface-2` or a hover state, recheck the
contrast — the ink token may need to step up from secondary to primary.

### 16.3 ARIA & icon labelling

- Interactive icon-only controls require `aria-label`. A `<button>`
  whose only child is an `<svg>` and which has no `aria-label` is a
  bug.
- Decorative icons (the kicker hairlines, the pull-quote glyph, the
  hamburger animation) use `aria-hidden="true"`.
- Live regions for asynchronous feedback (search-results count, save
  status) use `aria-live="polite"`.
- Pagination strips wrap their controls in `role="group"
  aria-label="Page navigation"`.

### 16.4 Reduced motion

Every animation must have a `@media (prefers-reduced-motion: reduce)`
rule that disables it (or reduces it to opacity only). The list-card
entrance, the drawer slide, the skeleton pulse, the hover scale —
all must respect the preference.

### 16.5 Keyboard navigation

- Modals trap focus (Tab cycles inside, Esc closes).
- Side panels trap focus.
- Dropdowns close on Esc and on outside click.
- The mobile drawer closes on Esc.

---

## 17. Quick-reference rules

1. **No pure black, no pure white.** Use the warm-neutral tokens.
2. **Hierarchy through value, not weight or hue.** Step the surface,
   step the ink — do not reach for a bigger weight or a stronger colour.
3. **The blue accent is earned.** One use case: focus rings (and
   info callouts, when introduced).
4. **Standard surfaces stack in four small steps.** Never a fifth.
5. **`font-black` is forbidden in content.** `tracking-tighter` too.
6. **Three registers** — editorial, catalogue, CMS. Pick one per page.
7. **Source Serif 4 for display, Inter for UI.** Never the reverse.
8. **Photographs in colour for editorial heroes; grayscale + contrast-125
   everywhere else.**
9. **Kadertje, drop cap and end-mark live only on editorial pages.**
10. **Tags are square (`rounded-sm`), neutral, two variants only.**
11. **Buttons are `rounded-md`, `font-medium`, three variants** + two
    CMS extensions.
12. **Lists separate by border, not by shadow.** No card-on-card.
13. **Animations are quiet** and respect `prefers-reduced-motion`.
14. **Modals belong to the CMS.** Backdrop is `bg-surface-inv/60`,
    never `bg-black/*`.
15. **Destructive uses terracotta**, not red. CMS only.
16. **Focus is one outline pattern**, accent-highlight blue,
    `focus-visible` only.
17. **Minimum readable size is `text-xs` (12 px).** Anything smaller
    is ornamental, never textual.
18. **Shadows are reserved for elements that float** (modals, side
    panels, dropdowns). In-flow elements are flat.
19. **The radius scale has five steps** (none, `sm`, `md`, `lg`,
    `full`) and each has a designated owner. No `rounded-xl` /
    `rounded-2xl`.
20. **Z-index is a small ladder** — `z-10`, `z-40`, `z-50`. Anything
    higher is a smell.

---

## 18. Implementation reference

### 18.1 Files

| File | Purpose |
|------|---------|
| `src/assets/stylesheets/design-tokens.css` | All CSS custom properties (light + dark) |
| `src/style.css` | Imports tokens, registers Tailwind `@theme` (colours, fonts, animations), AG Grid bridge |
| `src/assets/stylesheets/navbar.css` | Shared navbar primitives (public + admin) |
| `src/assets/stylesheets/cms-view.css` | CMS layout primitives (panels, modals, tabs, mini-buttons) |
| `src/assets/stylesheets/cms-ag-grid.css` | AG Grid theme bridge |
| `src/components/nav/AppNavbar.vue` | Public sticky nav |
| `src/components/nav/AdminNavbar.vue` | Admin sticky nav (with profile dropdown) |
| `src/components/nav/NavDrawer.vue` | Mobile drawer |
| `src/components/AppFooter.vue` | Footer (dark surface) |
| `src/components/production/HeroSection.vue` | Canonical kadertje implementation |
| `src/components/production/DetailsSection.vue` | Canonical drop cap, pull quote, marginalia, credits, end-mark |
| `src/components/production/ProductionImageCarousel.vue` | Canonical carousel |
| `src/components/productions/ProductionListCard.vue` | Canonical list-row implementation |
| `src/components/admin/cms/CmsTabShell.vue` | CMS tab + grid + slot for modals |
| `src/components/admin/cms/CmsRemoveConfirmModal.vue` | Canonical confirmation modal |
| `src/components/admin/ChangePasswordModal.vue` | Simple modal example (currently in violation, see §18.4) |

### 18.2 Adding a new token

1. Add the property to `design-tokens.css`, both `:root` and `.dark`.
2. Map it inside the `@theme` block in `style.css` (`--color-foo: var(--foo);`).
3. Use the generated utility (`bg-foo`, `text-foo`, …).

If your component "needs a new colour", the answer is almost always: it
doesn't. Use an existing surface step or ink level.

### 18.3 Scoped styles

```html
<style scoped>
@reference "@/style.css";

.my-class {
  @apply text-ink-primary bg-surface-0;
}
</style>
```

Using `@reference "tailwindcss"` will **not** resolve custom theme tokens.

### 18.4 Migrating known violations

The following are codified violations of this document. Each should be
addressed in its own PR; none are blocking but all should land before
this design system can claim full compliance.

| File | Violation | Fix |
|------|-----------|-----|
| `assets/stylesheets/design-tokens.css` | `--tag-genre-bg: #8224e3` (purple) | Set to `#2B2826` per §2.5 |
| `assets/stylesheets/design-tokens.css` | Missing `--font-sans`, `--destructive`, `--destructive-bg`, `--overlay`, `--overlay-opacity` tokens | Add per §2.6, §2.7, §4.1 |
| `assets/stylesheets/cms-view.css` (`cms-modal-overlay`) | `bg-black/40` | Use `bg-surface-inv/60` per §14.5 |
| `assets/stylesheets/cms-view.css` (`cms-add-button`, `cms-remove-button`) | `rounded-full` + `text-red-700` + `bg-red-500/10` | Use `rounded-md` + destructive token per §13.6 |
| `assets/stylesheets/cms-view.css` (`cms-modal`) | `rounded-xl` | Use `rounded-lg` per §7.2 |
| `components/admin/ChangePasswordModal.vue` | `bg-surface-inv/60` ✓ but `rounded-2xl` modal, `rounded-xl` inputs/buttons | Collapse to `rounded-lg` (modal) and `rounded-md` (inputs/buttons) per §7.2 |
| `components/AppFooter.vue` | `font-black`, `text-[7px]`–`text-[9px]`, `hover:text-white` | Use `font-semibold`, `text-xs` minimum, `hover:text-ink-on-inv` per §14.2 |
| `components/nav/AdminNavbar.vue` (`drawer-signout`) | `text-red-400 hover:text-red-300` | Use `text-destructive` per §14.1 |
| `components/admin/cms/CmsTabShell.vue` | Inline `text-red-700`, `border-red-400/40`, `bg-red-400/10` for error banners | Use `text-destructive`, `border-destructive`, `bg-destructive-bg` per §14.9 |
