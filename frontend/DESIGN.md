# VierNulVier Design System

A reference for keeping the archive coherent. Every page on the site should
feel like it was made by the same hand, in the same week, for the same
publication. This document is the definition of "the same hand".

When in doubt: check this file before reaching for a custom value. If a
pattern is missing here, propose it as an addition rather than inventing
one in a component.

---

## 0. Two registers, one publication

The site has **two visual registers**, both within the same warm-neutral
palette and the same typeface pairing:

| Register | Where | Feel |
|----------|-------|------|
| **Editorial** — long-form article | Production detail, blog post detail, future essay pages | Magazine longread: serif headlines, drop cap, pull quote, italic deck, photographs in colour, generous leading, justified body |
| **Catalogue** — entry, listing, navigation | Productions list, blog index, home, footer, navbar | Newspaper directory: small caps labels, sober list rows, archival grayscale thumbnails, tabular metadata, no decorative drama |

Both registers share the same colour tokens, the same fonts, the same
spacing scale. The difference is in the **rhythm of typography and
photography**, not in a different palette.

When you build a new page, decide which register it lives in *first*, then
pick the patterns from §6 (editorial) or §7 (catalogue) accordingly.

---

## 1. Architecture

```
src/
  assets/
    fonts/inter.css                 ← Inter (UI / body), self-hosted
    stylesheets/design-tokens.css   ← CSS custom properties (colours, fonts)
  style.css                         ← imports tokens, registers Tailwind @theme
  components/*.vue                  ← consume Tailwind utilities
```

- **Source Serif 4** is loaded from Google Fonts in `index.html` as the
  display font. Self-host later if the runtime CDN dependency becomes a
  concern.
- **Dark mode** is handled by a `.dark` class on `<html>`. CSS custom
  properties switch values automatically; components never use `dark:`
  prefixes.
- **Scoped styles** that reference design tokens must use
  `@reference "@/style.css";` at the top of the `<style scoped>` block.
  `@reference "tailwindcss"` does **not** resolve custom theme tokens.

---

## 2. Colour palette — light mode

### Standard surfaces (background → foreground layering)

| Token | Hex | Tailwind class | Role |
|-------|-----|----------------|------|
| `--surface-0` | `#F5F0E8` | `bg-surface-0` | Page background — raw paper |
| `--surface-1` | `#EBE6DD` | `bg-surface-1` | Cards, secondary panels, list backgrounds |
| `--surface-2` | `#E2DCD2` | `bg-surface-2` | Raised elements, gallery backdrops |
| `--surface-3` | `#D8D2C8` | `border-surface-3` | Borders, dividers, strokes |

Each step is roughly ΔL\* ≈ 4–5 in CIELAB. **Do not introduce a fifth
surface level.** Flatten the component instead.

### Inverted surfaces (high-contrast sections)

For the navbar, occasional accent bands, and as a margin-callout
background.

| Token | Hex | Tailwind class | Role |
|-------|-----|----------------|------|
| `--surface-inv` | `#2B2826` | `bg-surface-inv` | Dark ground |
| `--surface-inv-raised` | `#3D3835` | `bg-surface-inv-raised` | Raised on inverted bg |
| `--surface-inv-border` | `#5C5650` | `border-surface-inv-border` | Borders on inverted bg |

### Ink (text & icons)

| Token | Hex | Tailwind class | Role |
|-------|-----|----------------|------|
| `--ink-primary` | `#2B2826` | `text-ink-primary` | Headings, primary body |
| `--ink-secondary` | `#5C5650` | `text-ink-secondary` | Descriptions, captions, meta |
| `--ink-tertiary` | `#8A8279` | `text-ink-tertiary` | Placeholders, disabled, muted decoration |
| `--ink-on-inv` | `#F5F0E8` | `text-ink-on-inv` | Primary text on dark bg |
| `--ink-on-inv-secondary` | `#B5AFA6` | `text-ink-on-inv-secondary` | Secondary text on dark bg |
| `--ink-on-inv-tertiary` | `#7D776E` | `text-ink-on-inv-tertiary` | Muted text on dark bg |

### Accent & interactive

| Token | Hex | Tailwind class | Role |
|-------|-----|----------------|------|
| `--accent-dark` | `#2B2826` | `bg-accent-dark` | Solid (primary) buttons |
| `--accent-dark-hover` | `#3D3835` | `hover:bg-accent-dark-hover` | Solid button hover |
| `--accent-outline` | `#2B2826` | `border-accent-outline` | Ghost / outline button border |
| `--accent-highlight` | `#D4E4EF` | `bg-accent-highlight` | Soft blue — focus rings, info callouts only |
| `--stat-fill` | `#C8C1B5` | `text-stat-fill` | Optional decorative stat numerals |
| `--stat-label` | `#5C5650` | `text-stat-label` | Stat caption |

### Tag chips

| Token | Hex | Role |
|-------|-----|------|
| `--tag-genre-bg` | `#2B2826` | Solid genre chip ground |
| `--tag-genre-text` | `#F5F0E8` | Solid genre chip text |

### Photographic overlay

| Token | Value | Role |
|-------|-------|------|
| `--photo-overlay` | `#2B2826` | Dark wash for hero overlays |
| `--photo-opacity` | `0.55` | Wash opacity on standard surfaces |

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
| `--accent-dark` | `#2B2826` | `#EDE8DF` (light fill) |
| `--accent-highlight` | `#D4E4EF` | `#263A48` |
| `--photo-opacity` | `0.55` | `0.65` |

**Never use `#000` or `#FFF` anywhere.** The warmest dark is `#1C1A17`,
the lightest light is `#F5F0E8`.

---

## 4. Typography

Two fonts. Use the right one for the job.

### 4.1 Fonts

| Family | When | Weights in use |
|--------|------|----------------|
| **Source Serif 4** (display, `font-serif`) | Editorial headlines (h1–h3 in articles), the article kadertje, list-card titles, stat numerals, pull-quote text | 400, 500, 600, 700 |
| **Inter** (UI, `font-sans`) | Everything else: body text in lists/forms, navigation, buttons, captions, metadata labels, table cells | 400, 500, 600, 700 |

The serif/sans pairing is the **newspaper** model: editorial typography
gets the warmth and authority of a serif, UI chrome stays neutral and
legible in sans.

### 4.2 Type scale

| Role | Class | Notes |
|------|-------|-------|
| Editorial h1 (article masthead) | `font-serif text-3xl md:text-5xl font-semibold leading-[1.1] tracking-tight text-ink-primary` | One per article page, inside the kadertje |
| Editorial h2 (section heading) | `font-serif text-3xl md:text-4xl font-semibold leading-tight tracking-tight text-ink-primary` | Section titles in articles AND in catalogue pages — they share this style for coherence |
| Editorial h3 (subheading) | `font-serif text-lg font-semibold text-ink-primary` | Small headings inside content |
| Body (article) | `font-serif text-lg md:text-xl leading-[1.7] text-ink-primary text-justify hyphens-auto` | Lead paragraph in articles |
| Body (continuation) | `font-serif text-base leading-[1.7] text-ink-secondary text-justify hyphens-auto` | Secondary paragraphs |
| Body (UI / list) | `font-sans text-base leading-relaxed text-ink-primary` | List rows, forms, navigation |
| Caption / dateline | `font-serif text-xs italic text-ink-tertiary md:text-sm` | Photo captions, side notes |
| Meta label | `text-xs font-medium uppercase tracking-[0.2em] text-ink-tertiary` | Small labels, kicker pieces |
| Museum-label heading | `inline-block border-b-2 border-ink-primary pb-1 text-[11px] font-bold uppercase tracking-[0.25em] text-ink-primary` | Section heads inside content (credits, info, etc.) |
| Stat numeral | `font-serif text-3xl md:text-4xl font-semibold tabular-nums text-ink-primary` | Numbers in stats bars; tabular-nums for alignment |

### 4.3 Forbidden in content

- ❌ `font-black` (900). The shouty filmposter weight. Use `font-bold`
  (700) at most — and only on h1's inside an editorial kadertje.
- ❌ `tracking-tighter`. Combined with `font-black uppercase` it produces
  the concert-poster look we are explicitly *not* doing. `tracking-tight`
  is fine.
- ❌ `italic` on UI text or section headings. Italic is reserved for
  editorial elements: pull quotes, the article deck, photo datelines.
- ❌ `uppercase` on body text or editorial headings. Allowed only on
  meta-label content (≤ 3 words: "From the archive", "Theatre · 1987").
- ❌ `font-mono`. Only allowed inside genuinely tabular technical content
  (e.g. event time captions). Never on prices, dates, or large numbers.
- ❌ Custom display fonts. Source Serif 4 is the only display family.

---

## 5. Photography

The site has two photographic registers, mirroring the two writing
registers.

### 5.1 Editorial photographs (article hero)

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

### 5.2 Archival thumbnails (lists, cards, blog covers)

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

### 5.3 Forbidden

- ❌ Drop shadows on images.
- ❌ Coloured overlays other than `--photo-overlay`.
- ❌ Rounded corners larger than `rounded-md` on photographs.
- ❌ Mixing register: never a colour photograph in a list row, never a
  grayscale photograph in an article hero.

---

## 6. Editorial article patterns

Article-style pages (production detail, blog detail) use this set of
patterns. These are the structural elements of a longread.

### 6.1 Kicker (department · genre · year)

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

### 6.2 Kadertje (article header card over photo)

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
- A small italic dateline can sit beneath the kadertje (§6.6).
- **Never** use `rounded-*` on the kadertje. Square corners only.

### 6.3 Drop cap

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

### 6.4 Pull quote

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

### 6.5 Asterism break

When two body paragraphs exist but no pull quote separates them, mark
the break with an asterism — three centred asterisks with wide tracking.

```html
<div aria-hidden="true" class="select-none text-center text-ink-tertiary">
  <span class="font-serif text-xl tracking-[0.6em]">***</span>
</div>
```

- Use only when there is no quote between the two paragraphs.
- Never use `<hr>` or full-width rules inside the body.

### 6.6 Photo dateline / caption

A single sober italic line beneath the kadertje (or under any in-body
photograph). Anchors the image as archival material.

```html
<p class="font-serif text-xs italic text-ink-tertiary md:text-sm">
  Beeld uit het archief van De Vooruit
</p>
```

### 6.7 Marginalia (sidebar note)

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

### 6.8 Museum-label heading (in-body section labels)

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

### 6.9 Credits footer

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

### 6.10 End-mark

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

### 6.11 Body conventions

- **Serif:** `font-serif` for both lead and continuation.
- **Generous leading:** `leading-[1.7]` (~28px line on 17px text).
- **Justified:** `text-justify hyphens-auto` for print-quality reading
  rhythm. Leave lists, captions and UI text left-aligned.
- **Pre-line whitespace:** `whitespace-pre-line` so paragraph breaks in
  source content render as line breaks.

---

## 7. Catalogue / list patterns

Listing pages, navigation, footer, list rows. The register is sober and
print-archival rather than long-form editorial.

### 7.1 Section heading

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

### 7.2 List row (productions, events)

Horizontal rows separated by thin dividers. Title in serif semibold,
metadata in sans secondary ink, optional thumbnail on the left.

```html
<a
  class="group -mx-3 flex items-stretch gap-4 border-b border-surface-3
         px-3 py-8 transition-colors hover:bg-surface-1/60"
>
  <!-- thumbnail (archival treatment, see §5.2) -->
  <div class="flex-1 min-w-0">
    <h2 class="font-serif text-xl md:text-2xl font-semibold leading-tight tracking-tight text-ink-primary">
      ...
    </h2>
    <p class="mt-1 text-base text-ink-secondary">...</p>
    <!-- venue, tags, etc. -->
  </div>
</a>
```

- **Title font:** `font-serif`, never `font-black`.
- **Date in event-style rows:** `font-serif text-2xl font-semibold tracking-tight`.
- **Numeric data (price, year):** `font-serif tabular-nums`. Never
  `font-mono` or `font-black`.

### 7.3 Tag chip

Small caps, square-ish corners. Two variants only.

| Variant | When | Class |
|---------|------|-------|
| **Genre** (solid) | Primary classification of a production | `bg-tag-genre-bg text-tag-genre-text rounded-sm px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide` |
| **Generic** (outline) | All other tags (theme, language, format) | `border border-surface-3 bg-surface-1 text-ink-secondary rounded-sm px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide` |

- **No coloured tags** (purple, orange, etc.). Differentiation is by
  *label*, not by colour.
- Tags use square-ish corners (`rounded-sm`), never `rounded-full`.

### 7.4 Tag drawer (sidebar collapsible)

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

### 7.5 Card (gallery, blog post)

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

### 7.6 Forbidden

- ❌ `shadow-*` on cards or list rows. Borders carry the separation.
- ❌ Card-on-card backgrounds (e.g. `bg-surface-1` inside `bg-surface-1`).
  Step the surface or use a divider.
- ❌ `font-black uppercase tracking-tighter` titles.

---

## 8. Buttons

Three variants. No others.

### 8.1 Primary (solid)

```html
<button
  class="inline-flex items-center gap-2 rounded-md bg-accent-dark px-4 py-2
         text-sm font-medium text-surface-0 transition-colors
         hover:bg-accent-dark-hover
         focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-highlight"
>
  ...
</button>
```

On inverted (dark) surfaces, swap to a light fill: `bg-ink-on-inv text-surface-inv`.

### 8.2 Ghost / outline

```html
<button
  class="inline-flex items-center gap-2 rounded-md border border-accent-outline
         px-4 py-2 text-sm font-medium text-accent-outline transition-colors
         hover:bg-surface-2"
>
  ...
</button>
```

### 8.3 Inline link with hairline underline

For "Read more" / "All articles" / etc. inside content.

```html
<a class="inline-block border-b border-ink-tertiary pb-0.5 text-sm font-medium text-ink-primary transition-colors hover:border-ink-primary">
  Lees verder
</a>
```

### 8.4 Forbidden

- ❌ Coloured fills (red "delete", green "save"). Destructive actions
  use a confirmation modal, not a coloured button.
- ❌ `rounded-full` on standard buttons. Buttons are `rounded-md`.
- ❌ Trailing arrow icons on a CTA unless the button literally navigates
  forward through paginated content.
- ❌ `font-bold` or `font-black` on buttons. `font-medium` (500).

---

## 9. Forms & inputs

```html
<input
  class="w-full rounded-md border border-surface-3 bg-surface-0 px-3 py-2
         text-sm text-ink-primary placeholder:text-ink-tertiary
         focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-highlight"
/>
```

- Background: `surface-0` (sits on cards / `surface-1`).
- Focus: `--accent-highlight` outline. Never a border-colour change.
- Labels: `text-sm font-medium text-ink-primary` above the input.
- Error text: `text-xs text-ink-secondary` plus an inline icon. **No
  red.** The archive does not need to scold the reader.

---

## 10. Page-level rhythm

How full pages compose. The header (`AppNavbar`) and footer
(`AppFooter`) are constants; the body composition depends on the
register.

### 10.1 Editorial article page

```
Navbar              bg-surface-inv     (dark, sticky)
HeroSection         bg-surface-0       (banner photo + kadertje + dateline)
DetailsSection      bg-surface-1       (article body: lead → quote → continuation; sidebar marginalia + tag drawer; credits footer)
EventsSection       bg-surface-0       (catalogue list)
GallerySection      bg-surface-2       (carousel of archival thumbnails)
BlogSection         bg-surface-0       (related cards)
Footer              bg-surface-1
```

- Photo, kadertje, drop cap and end-mark live exclusively here.

### 10.2 Catalogue / listing page

```
Navbar              bg-surface-inv     (dark)
Header / intro      bg-surface-0       (sober h1/h2 + intro paragraph + filters)
List                bg-surface-0       (horizontal rows)
Footer              bg-surface-1
```

- No banner photographs, no kadertje, no drop cap.
- The section heading (§7.1) is the strongest visual element.

### 10.3 Forbidden on every page

- ❌ Bento grids.
- ❌ Marketing-style "Get started" CTAs.
- ❌ Italic / uppercase / `font-black` on the page title.
- ❌ Hero photographs with overlaid headline-of-tagline-of-CTA stack
  (the "concert poster" pattern). Use a kadertje (§6.2) or a sober
  intro (§10.2) instead.

---

## 11. Animation

Allowed but quiet.

### 11.1 Allowed

- Opacity fades on mount: `0 → 1`, `0.3s–0.8s`, `ease-out`.
  Tokens: `--animate-fade-up`, `--animate-fade-in` (in `style.css`).
- Stagger between siblings ≤ `60ms`, total stagger ≤ `~600ms`.
- Colour transitions on hover: `transition-colors`, `duration-200`.
- Mild scale on card thumbnails: `group-hover:scale-105`,
  `transition-transform duration-700`.

### 11.2 Forbidden

- ❌ Bounce, spring, rotate, slide animations on content.
- ❌ Parallax or scroll-driven effects.
- ❌ Animations longer than `0.8s`.

### 11.3 Reduced motion

Every animation must have a `@media (prefers-reduced-motion: reduce)`
rule that disables it.

---

## 12. Iconography

- Inline SVG only, sized via Tailwind classes (`size-3`, `size-4`,
  `size-5`).
- Stroke / fill: `currentColor`. Never coloured.
- Icons accompany text. A standalone icon button must have an
  `aria-label`.

---

## 13. Contrast (WCAG)

Verified pairs (light mode):

| Pair | Ratio | WCAG |
|------|-------|------|
| `surface-0` / `ink-primary` | ~12.5 : 1 | AAA |
| `surface-0` / `ink-secondary` | ~6.5 : 1 | AA |
| `surface-0` / `ink-tertiary` | ~3.5 : 1 | AA large |
| `surface-inv` / `ink-on-inv` | ~12.5 : 1 | AAA |

Dark mode is symmetrically validated. **Do not** introduce a new colour
pair without checking contrast.

---

## 14. The thirteen rules — quick reference

1. No pure black, no pure white.
2. Hierarchy through value, not weight or hue.
3. The blue accent is earned. One use case: focus rings & info callouts.
4. Standard surfaces stack in four small steps. Never a fifth.
5. `font-black` is forbidden in content. `tracking-tighter` is too.
6. Two registers — editorial (article) and catalogue (list). Pick one
   per page.
7. Source Serif 4 for display, Inter for UI. Never the reverse.
8. Photographs in colour for editorial heroes; grayscale + contrast-125
   everywhere else.
9. Kadertje, drop cap and end-mark live only on editorial pages.
10. Tags are square (`rounded-sm`), neutral, two variants only.
11. Buttons are `rounded-md`, `font-medium`, three variants only.
12. Lists separate by border, not by shadow. No card-on-card.
13. Animations are quiet and respect `prefers-reduced-motion`.

---

## 15. Implementation reference

### 15.1 Files

| File | Purpose |
|------|---------|
| `src/assets/stylesheets/design-tokens.css` | All CSS custom properties (light + dark) |
| `src/style.css` | Imports tokens, registers Tailwind `@theme` (colours + `--font-serif`) |
| `src/components/nav/AppNavbar.vue` | Sticky nav bar (inverted surface) |
| `src/components/AppFooter.vue` | Footer (standard surface) |
| `src/components/production/HeroSection.vue` | Canonical kadertje implementation |
| `src/components/production/DetailsSection.vue` | Canonical drop cap, pull quote, marginalia, credits, end-mark |
| `src/components/productions/ProductionListCard.vue` | Canonical list-row implementation |

### 15.2 Adding a new token

1. Add the property to `design-tokens.css`, both `:root` and `.dark`.
2. Map it inside the `@theme` block in `style.css` (`--color-foo: var(--foo);`).
3. Use the generated utility (`bg-foo`, `text-foo`, …).

If your component "needs a new colour", the answer is almost always: it
doesn't. Use an existing surface step or ink level.

### 15.3 Scoped styles

```html
<style scoped>
@reference "@/style.css";

.my-class {
  @apply text-ink-primary bg-surface-0;
}
</style>
```

Using `@reference "tailwindcss"` will **not** resolve custom theme tokens.
