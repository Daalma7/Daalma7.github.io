# Bilingual site + style system — Design

Date: 2026-08-28
Status: Approved (pending spec review)

## Goal

Two outcomes for `david-villar-website` (Astro personal site, currently a single Spanish
one-pager):

1. **Bilingual (ES / EN).** Make the language switcher in `Navbar.astro` / `Footer.astro`
   real. Spanish stays at `/`, English lives at `/en/`. All copy moves to a typed
   translation dictionary so there is one source of truth.
2. **Style system pass.** Keep the current editorial identity (warm paper background,
   `DM Sans` body, `Playfair Display` italic accents) but make it homogeneous, clean and
   compact: design tokens, shared utility classes, per-component styles, and fixes for the
   concrete bugs listed below.

Non-goals: no visual redesign (palette, fonts, section treatments stay), no CMS/content
collections, no new sections, no framework additions. The shields.io tech badges stay
(only their row layout is normalized).

## Current state (as explored)

- `src/pages/index.astro` — the real site. `<html lang="es">`. Hero + "Sobre mí" written
  inline; other sections are components.
- Components in use: `Navbar`, `Footer`, `ParticleField`, `Reveal`, `Timeline`,
  `Projects` (+ `ProjectGallery`), `Teaching`, `Contact`. `BlogPreview` is imported but
  commented out.
- Dead files (Astro boilerplate or superseded drafts, not referenced anywhere):
  `src/components/Hero.astro`, `src/components/About.astro`, `src/pages/about.astro`,
  `src/pages/projects.astro`, `src/layouts/Layout.astro.txt`.
- `astro.config.mjs` is empty — no i18n.
- `Navbar.astro` language links are `href="#"`. `Footer.astro` shows plain `ES / EN` text.
- `src/styles/global.css` — ~2000 lines, one global stylesheet. Contains a fully
  duplicated `.about-photo*` block inside its `@media (max-width: 800px)`, repeated
  `25%` / `calc(25% + 40px)` grid maths in ~5 places, section padding mixing
  `15vh` / `18vh` / `20vh` (+ `10vh` / `11vh` / `12vh` inner), 5 different label font
  sizes (0.6–0.7rem), and ~8 distinct `clamp()` heading scales each re-declaring
  `em { font-family: "Playfair Display" }`.
- Navbar hides all links below 800px with no replacement menu.

## Decisions (locked)

| Topic | Decision |
|---|---|
| i18n mechanism | Astro native `i18n` routing + typed dictionary. ES at `/`, EN at `/en/`. |
| Style ambition | Design-system pass, keep the existing visual identity. |
| CSS organization | `global.css` = tokens + reset + utilities only. Section CSS moves into each component's `<style>`. |
| Tech badges | Keep shields.io `<img>` badges; only normalize the row (fixed height, alignment, `loading="lazy"`). |
| Cleanup | Delete the 5 dead files. Add a mobile nav menu. Fix Spanish typos + renumber sections. |

## 1. i18n architecture

### 1.1 Config

`astro.config.mjs`:

```js
import { defineConfig } from 'astro/config';

export default defineConfig({
  i18n: {
    locales: ['es', 'en'],
    defaultLocale: 'es',
    routing: { prefixDefaultLocale: false },
  },
});
```

Result: `es` served from `/` (no prefix), `en` from `/en/`.

### 1.2 Dictionary — `src/i18n/`

- **`es.ts`** — default export: one object with every string, grouped by area:
  `meta` (title, description), `nav` (logo, links, `langLabel`), `hero`, `about`,
  `experience` (header + an ordered `items` array), `projects` (header, disciplines,
  an ordered `items` array, shared labels like `viewOnGithub`), `teaching`
  (header, `principles` array, closing), `contact`, `footer`.
- **`en.ts`** — same shape. Typed as `Dict` (see below) so a missing/extra key is a
  build error.
- **`index.ts`**:

  ```ts
  import es from './es';
  import en from './en';

  export type Dict = typeof es;
  export const ui = { es, en } satisfies Record<string, Dict>;
  export type Lang = keyof typeof ui;           // 'es' | 'en'
  export const defaultLang: Lang = 'es';
  export const languages = { es: 'ES', en: 'EN' } as const;

  export function getLangFromUrl(url: URL): Lang {
    const [, seg] = url.pathname.split('/');
    return (seg in ui ? seg : defaultLang) as Lang;
  }

  export function useTranslations(lang: Lang): Dict {
    return ui[lang];
  }

  /** Locale-aware path: localizedPath('/', 'en') -> '/en/' ; localizedPath('/', 'es') -> '/' */
  export function localizedPath(path: string, lang: Lang): string {
    const clean = '/' + path.replace(/^\/+/, '');
    return lang === defaultLang ? clean : `/${lang}${clean === '/' ? '/' : clean}`;
  }
  ```

  `en.ts` is declared as `const en: Dict = { ... }` so shape drift fails `astro check` /
  `astro build`.

### 1.3 Rich-text strings

Headings that contain inline markup (`La <em>curiosidad</em> es el punto de
<em>partida</em>.`, project titles with `<br>`, etc.) are stored as HTML strings and
rendered with `<Fragment set:html={t.about.heading} />`. Content is author-controlled and
static, so `set:html` is acceptable here. Plain strings everywhere else.

### 1.4 Layout + page shell

- **`src/layouts/Layout.astro`** — `Props { lang: Lang }`. Renders
  `<!doctype html><html lang={lang}>` with:
  - `<title>` and `<meta name="description">` from `t.meta`.
  - `<link rel="alternate" hreflang="es" href={SITE + '/'} />`,
    `hreflang="en" href={SITE + '/en/'} />`, `hreflang="x-default" href={SITE + '/'} />`.
  - `import '../styles/global.css'`.
  - `<slot />` inside `<body>`.
- **`src/components/SiteBody.astro`** — `Props { lang: Lang }`. Contains the single
  canonical section list: `<Navbar lang={lang} />` + `<main>` with `Hero markup`,
  `About markup`, `<Timeline lang={lang} />`, `<Projects lang={lang} />`,
  `<Teaching lang={lang} />`, `<Contact lang={lang} />`, `<Footer lang={lang} />`.
  (Hero + About stay as inline markup here, not separate components — matching today's
  structure, just moved out of the page file so both locales share them.)
- **`src/pages/index.astro`**:

  ```astro
  ---
  import Layout from '../layouts/Layout.astro';
  import SiteBody from '../components/SiteBody.astro';
  ---
  <Layout lang="es"><SiteBody lang="es" /></Layout>
  ```

- **`src/pages/en/index.astro`** — identical with `lang="en"`.

`SITE` base URL for absolute `hreflang` hrefs: if a production domain is known, set
`site:` in `astro.config.mjs` and build absolute URLs with `Astro.site`. If not known at
implementation time, this is **not a blocker** — emit root-relative hrefs (`/`, `/en/`)
and leave a `<!-- TODO: set astro.config site for absolute hreflang -->` note. No further
user input required.

### 1.5 Components

Every section component gains `interface Props { lang: Lang }` and does
`const t = useTranslations(lang)`. All visible strings become `t.*` lookups. Ordered
content (timeline entries, project cards, teaching principles) maps over the arrays in the
dictionary so markup and copy stay in sync across locales.

`ProjectGallery.astro` also takes `lang` (or receives already-translated label props from
`Projects.astro`) so its `aria-label`s — "Previous image" / "Next image" /
"Go to image N" — and the fallback `alt` are localized. `Reveal.astro` and
`ParticleField.astro` have no text and are unchanged.

### 1.6 Language switcher

In `Navbar.astro` and `Footer.astro`:

- `ES` → `localizedPath('/', 'es')` = `/`
- `EN` → `localizedPath('/', 'en')` = `/en/`
- The active locale gets `aria-current="true"` and a bolder weight; the other is a normal
  link. Uses the shared `.link-underline` treatment.
- Other nav links stay as in-page anchors (`#about`, `#experience`, `#work`, `#teaching`,
  `#contact`) — identical behaviour on both routes.

### 1.7 English copy

Natural, professional EN — not literal translation. Written in full in `en.ts` during
implementation. Samples:

| Key | ES | EN |
|---|---|---|
| `hero.eyebrow` | MATEMÁTICAS · IA · DATA SCIENCE | MATHEMATICS · AI · DATA SCIENCE |
| `hero.intro` | Profesor de matemáticas, ingeniero informático, científico de datos y entusiasta de la IA. | Mathematics teacher, computer engineer, data scientist and AI enthusiast. |
| `about.heading` | La <em>curiosidad</em> es el punto de <em>partida</em>. | <em>Curiosity</em> is the <em>starting point</em>. |
| `nav.about` | Sobre mí | About |
| `contact.cta` | Contacta | Get in touch |

## 2. Style system

`src/styles/global.css` is rewritten to three parts only: **tokens**, **reset/base**,
**utilities**. Everything section-specific moves into the relevant component `<style>`
block, referencing tokens.

### 2.1 Tokens (`:root`)

Palette unchanged: `--background`, `--foreground`, `--muted`, `--accent`, `--line`.

New:

```
/* horizontal layout */
--gutter: clamp(1.5rem, 8vw, 8rem);   /* replaces the 8vw / 7vw / 35px mix */
--content-max: 1200px;
--col-label: 25%;                     /* label column of the section grid */
--col-gap: clamp(2rem, 4vw, 2.5rem);

/* vertical rhythm */
--space-2xs: 0.5rem;  --space-xs: 0.75rem; --space-sm: 1rem;   --space-md: 1.5rem;
--space-lg: 2rem;     --space-xl: 3rem;    --space-2xl: 4.5rem; --space-3xl: 7rem;
--section-pad-y: clamp(6rem, 15vh, 12rem);   /* replaces 15/18/20vh + 10/11/12vh */

/* typography */
--text-eyebrow: 0.7rem;   /* unifies the 0.6–0.7rem labels */
--tracking-eyebrow: 0.2em;
--text-body: 1rem;
--lead: clamp(1.05rem, 1.6vw, 1.2rem);
--display-xl: clamp(4rem, 13vw, 11rem);      /* hero h1 */
--display-l:  clamp(2.75rem, 7vw, 6rem);     /* section h2 */
--display-m:  clamp(2.25rem, 4.5vw, 4rem);   /* project h3 / teaching h3 / closing */
--display-s:  clamp(1.5rem, 2vw, 2rem);      /* timeline h3 */
--tracking-tight: -0.045em;
--leading-tight: 0.95;
```

### 2.2 Reset / base

Current `* { box-sizing }`, `[id] { scroll-margin-top }`, `html { scroll-behavior }`,
`body`, `a` rules — kept. Add:

- `:focus-visible { outline: 2px solid var(--foreground); outline-offset: 3px; }`
  (none today).
- `@media (prefers-reduced-motion: reduce)` global: neutralize `scroll-behavior`,
  `fadeUp`, and expose a hook the Timeline / ParticleField scripts already respect.
- `img { max-width: 100%; }`.

### 2.3 Utilities

Defined once, replacing repeated blocks:

| Class | Replaces |
|---|---|
| `.section` | per-section `padding: NNvh 8vw; border-top: 1px solid var(--line)` |
| `.section-grid` | hand-rolled `grid-template-columns: 25% 75%` / `calc(25% + 40px)` (about, projects header, timeline header, teaching header, blog header) — collapses to 1 col at `<=800px` |
| `.eyebrow` / `.section-label` | the 5 near-identical label styles |
| `.display-l`, `.display-m`, `.display-s` | the ~8 ad-hoc heading `clamp()` blocks; each includes the `& em { font-family: "Playfair Display", serif; font-weight: 500 }` rule once |
| `.lead` | the ~6 copies of `max-width; font-size: 1.05rem; line-height: 1.8; color: var(--muted)` |
| `.link-underline` | the animated-underline pattern shared by navbar links, `.project-github`, `.contact-link` |

### 2.4 Per-component style migration

Move into the component `<style>` (rewritten against tokens, not verbatim):
`Timeline.astro` (all `.timeline*`), `Projects.astro` (`.projects*`, `.project*`,
`.discipline*`, `.math-placeholder`, `.game-placeholder`), `Teaching.astro`
(`.teaching*`), `Contact.astro` (`.contact*`), `Footer.astro` (`.footer*`), plus the Hero
and About CSS alongside their markup in `SiteBody.astro`. `ProjectGallery.astro` already
has scoped styles — only retokenize colors/spacing.

## 3. Concrete style fixes

1. **Hero / navbar overlap.** The centered hero content's eyebrow currently sits under
   the fixed nav. Fix: add top clearance for the nav height and reduce
   `.hero-content { padding-bottom: 100px }` so nothing collides. `h1` → `--display-xl`
   (today's `clamp(5rem, 15vw, 13rem)` overflows narrow viewports).
2. **"Sobre mí" empty space.** Remove `min-height: 100vh`; use `.section`. Replace the
   `float: right` photo (inside a grid) with a real grid column via `.section-grid`
   inner layout. Cut the `margin-top: 10vh` on `.about-lower` to a `--space-*` value.
3. **Mobile nav.** Add a hamburger button (`<=800px`) toggling a slide-down menu
   (vanilla JS in the existing `<script>`; `aria-expanded`, `Esc` to close, click-out to
   close). Links currently just disappear.
4. **Section numbering — consecutive.** With Journal hidden: `01` Sobre mí /
   `02` Experiencia / `03` Proyectos / `04` Docencia / `05` Contacto. Numbers live in the
   dictionary (`experience.number` etc.) so both locales stay aligned; if Journal is
   re-enabled later it takes `05` and Contact `06`.
5. **Tech badge row.** Keep shields.io `<img>`s. Normalize `.project-tech img` to a fixed
   `height` (~20px), `align-items: center`, one `gap`, `loading="lazy"`,
   `decoding="async"`.
6. **`global.css` dedup.** Delete the duplicated `.about-photo*` media block; drop the
   excessive blank lines; fold repeats into the utilities above. Target: total CSS
   (global + all component styles) well under 800 lines.
7. **A11y.** Global `:focus-visible`; extend `prefers-reduced-motion` to the timeline
   reveal and the particle animation.
8. **`Contact.astro`.** `id = "contact"` → `id="contact"`.

## 4. Content corrections (Spanish source)

- Teaching principle 01: "recivir" → **recibir**.
- Projects item 04 ("Todo un mundo"): "lo constuyo en las aulas" → "lo **construyo** en
  las aulas".
- Projects item 04: the "EXPLORA DOCENCIA" link points to
  `https://github.com/Daalma7/PokemonDataScience`; change `href` to `#teaching`.
- Projects intro: "Una selección de proyectos y experimentos e ideas que exploran sobre
  docencia, datos, IA y sistemas interactivos." → "Una selección de proyectos,
  experimentos e ideas sobre docencia, datos, IA y sistemas interactivos."

## 5. File plan

**New**
- `src/i18n/es.ts`, `src/i18n/en.ts`, `src/i18n/index.ts`
- `src/layouts/Layout.astro`
- `src/components/SiteBody.astro`
- `src/pages/en/index.astro`

**Modified**
- `astro.config.mjs` (i18n block, maybe `site`)
- `src/pages/index.astro` (thin wrapper)
- `src/components/{Navbar,Footer,Timeline,Projects,ProjectGallery,Teaching,Contact}.astro`
  (lang prop + `t` lookups + style migration)
- `src/styles/global.css` (rewritten: tokens + reset + utilities)

**Deleted**
- `src/components/Hero.astro`
- `src/components/About.astro`
- `src/pages/about.astro`
- `src/pages/projects.astro`
- `src/layouts/Layout.astro.txt`

## 6. Implementation phases

1. **i18n scaffold** — config, `src/i18n/*` (ES dictionary = current copy verbatim, EN
   drafted), `Layout.astro`, `SiteBody.astro`, both page files. Wire `lang`/`t` through
   every component. Delete dead files. Site renders identically at `/`, plus a working
   `/en/`.
2. **Tokens + utilities** — rewrite `global.css` to tokens + reset + utilities. Introduce
   `.section`, `.section-grid`, `.display-*`, `.lead`, `.eyebrow`, `.link-underline`.
3. **Component CSS migration + fixes** — move each section's CSS into its component
   against tokens; apply the section 3 fixes (hero overlap, about spacing, mobile nav,
   numbering, badge row, a11y).
4. **Content pass** — Spanish typo fixes, project 04 link, projects intro; finalize EN
   copy.
5. **Verification** — see below.

## 7. Verification

- `npm run build` green (this also type-checks ES/EN dictionary shape parity).
- Manual, both `/` and `/en/`:
  - language switch works both directions; active locale marked.
  - all 5 sections render, in both languages, with correct copy.
  - nav anchors jump correctly on both routes.
  - mobile menu (<=800px) opens/closes via button, `Esc`, and click-out.
  - no console errors; particle field, gallery autoplay, timeline reveal still work.
- `<html lang>` correct per route; `hreflang` alternate links present in `<head>`.
- Visual diff pass at 375 / 768 / 1280 px against the pre-change site to catch
  regressions.
- `git grep -nE "recivir|constuyo|PokemonDataScience" src/` returns nothing (content fixes
  landed); the 5 dead files are gone.
