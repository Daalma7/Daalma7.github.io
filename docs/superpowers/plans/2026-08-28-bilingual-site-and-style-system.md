# Bilingual Site + Style System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `david-villar-website` bilingual (Spanish at `/`, English at `/en/`) with a real language switcher, and refactor its CSS into a token-based design system while keeping the current editorial look.

**Architecture:** Astro native `i18n` routing with `prefixDefaultLocale: false`. All copy lives in typed dictionaries (`src/i18n/es.ts`, `src/i18n/en.ts`); `en.ts` is typed as `Dict` (= `typeof es`) so key drift breaks the build. A thin `Layout.astro` shell + `SiteBody.astro` (holds the one canonical section list) let `src/pages/index.astro` and `src/pages/en/index.astro` be 3-line wrappers. Styling moves to `:root` tokens + utility classes in `global.css`, with each section's rules relocated into its component's `<style>` block.

**Tech Stack:** Astro 7, plain CSS (no framework), `node:test` for the pure i18n helpers (built into Node — no new dependency). Package manager: npm.

## Global Constraints

- Node `>=22.12.0` (from `package.json` engines; dev machine runs v26).
- No new runtime or UI-framework dependencies. `node:test` (stdlib) is the only test runner.
- Keep the visual identity: `--background: #f4f2ed`, `--foreground: #171717`, `--muted: #77736b`, `--accent: #c45a3c`, `--line: rgba(23,23,23,0.15)`; body font `"DM Sans", sans-serif`; italic accents `"Playfair Display", serif` weight 500.
- Spanish is `defaultLocale` and serves from `/` with **no** path prefix. English serves from `/en/`.
- Section numbers, once Journal stays hidden, are consecutive: `01` Sobre mí · `02` Experiencia · `03` Proyectos · `04` Docencia · `05` Contacto.
- Rich-text headings (containing `<em>` / `<br>`) are stored as HTML strings and rendered with `<Fragment set:html={...} />`. Plain strings everywhere else.
- Dev server: `npx astro dev --background`; manage with `npx astro dev stop|status|logs` (per `CLAUDE.md`).
- Every task ends by running `npx astro check` (must pass: 0 errors) and, where noted, `npm run build`.
- Commit after every task. Conventional-commit style messages. End commit messages with:
  `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`
- Work happens on branch `feature/bilingual-and-style-system` (already created).

---

## File Structure

**New files**

| Path | Responsibility |
|---|---|
| `src/i18n/routing.ts` | Pure, import-free: `Lang` type, `locales`, `defaultLang`, `languages`, `getLangFromUrl(url)`, `localizedPath(path, lang)`. Unit-tested. |
| `src/i18n/routing.test.ts` | `node:test` coverage for `getLangFromUrl` + `localizedPath`. |
| `src/i18n/es.ts` | Canonical Spanish dictionary (default export). Defines the shape all locales follow. |
| `src/i18n/en.ts` | English dictionary, typed `: Dict`. |
| `src/i18n/index.ts` | Aggregator: re-exports routing, defines `Dict`, `ui`, `useTranslations(lang)`. |
| `src/layouts/Layout.astro` | `<html lang>` shell: `<head>` (title/description per locale, hreflang alternates), imports `global.css`, renders `<slot />`. |
| `src/components/SiteBody.astro` | Takes `lang`; renders `Navbar` + `<main>` (Hero markup, About markup, `Timeline`, `Projects`, `Teaching`, `Contact`) + `Footer`. The single section list. |
| `src/pages/en/index.astro` | 3-line English page wrapper. |

**Modified files**

| Path | Change |
|---|---|
| `astro.config.mjs` | Add `i18n` block (+ `site` TODO). |
| `tsconfig.json` | Exclude `src/**/*.test.ts` from `astro check`. |
| `src/pages/index.astro` | Reduce to 3-line Spanish wrapper. |
| `src/components/Navbar.astro` | `lang` prop, `t` lookups, real language switcher w/ active state, mobile hamburger menu, CSS → tokens. |
| `src/components/Footer.astro` | `lang` prop, `t` lookups, switcher, CSS → tokens. |
| `src/components/Timeline.astro` | `lang` prop, map over `t.experience.items`, CSS → tokens. |
| `src/components/Projects.astro` | `lang` prop, map over `t.projects.items`, fix project-04 `href` → `#teaching`, CSS → tokens, normalize badge row. |
| `src/components/ProjectGallery.astro` | `lang` prop for `aria-label`s + `alt`, CSS retokenized. |
| `src/components/Teaching.astro` | `lang` prop, map over `t.teaching.principles`, CSS → tokens. |
| `src/components/Contact.astro` | `lang` prop, `t` lookups, fix `id = "contact"` → `id="contact"`, CSS → tokens. |
| `src/styles/global.css` | Rewritten: tokens + reset/base + utilities only. |

**Deleted files**

- `src/components/Hero.astro`
- `src/components/About.astro`
- `src/pages/about.astro`
- `src/pages/projects.astro`
- `src/layouts/Layout.astro.txt`

---

## Task 1: i18n config + routing helpers

**Files:**
- Modify: `astro.config.mjs`
- Modify: `tsconfig.json`
- Create: `src/i18n/routing.ts`
- Test: `src/i18n/routing.test.ts`

**Interfaces:**
- Produces:
  - `type Lang = 'es' | 'en'`
  - `const locales: readonly Lang[]` = `['es', 'en']`
  - `const defaultLang: Lang` = `'es'`
  - `const languages: Record<Lang, string>` = `{ es: 'ES', en: 'EN' }`
  - `function getLangFromUrl(url: URL): Lang` — reads first path segment; returns `defaultLang` if it is not a known non-default locale.
  - `function localizedPath(path: string, lang: Lang): string` — `localizedPath('/', 'es') === '/'`, `localizedPath('/', 'en') === '/en/'`, `localizedPath('/about', 'en') === '/en/about'`, leading slashes normalized.

- [ ] **Step 1: Write the failing test**

Create `src/i18n/routing.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getLangFromUrl, localizedPath, defaultLang, locales } from './routing.ts';

test('defaultLang is es and locales lists es then en', () => {
  assert.equal(defaultLang, 'es');
  assert.deepEqual([...locales], ['es', 'en']);
});

test('getLangFromUrl: root is default locale', () => {
  assert.equal(getLangFromUrl(new URL('http://x/')), 'es');
});

test('getLangFromUrl: /en/ prefix is en', () => {
  assert.equal(getLangFromUrl(new URL('http://x/en/')), 'en');
  assert.equal(getLangFromUrl(new URL('http://x/en')), 'en');
});

test('getLangFromUrl: unknown or default prefix falls back to es', () => {
  assert.equal(getLangFromUrl(new URL('http://x/es/')), 'es');
  assert.equal(getLangFromUrl(new URL('http://x/blog/post')), 'es');
});

test('localizedPath: default locale is unprefixed', () => {
  assert.equal(localizedPath('/', 'es'), '/');
  assert.equal(localizedPath('/about', 'es'), '/about');
});

test('localizedPath: en is prefixed, root keeps trailing slash', () => {
  assert.equal(localizedPath('/', 'en'), '/en/');
  assert.equal(localizedPath('/about', 'en'), '/en/about');
  assert.equal(localizedPath('about', 'en'), '/en/about');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/i18n/routing.test.ts`
Expected: FAIL — `Cannot find module './routing.ts'` (file not created yet).

- [ ] **Step 3: Create the implementation**

Create `src/i18n/routing.ts`:

```ts
export type Lang = 'es' | 'en';

export const locales = ['es', 'en'] as const satisfies readonly Lang[];
export const defaultLang: Lang = 'es';
export const languages: Record<Lang, string> = { es: 'ES', en: 'EN' };

/** Non-default locales that take a URL path prefix. */
const prefixedLocales = locales.filter((l) => l !== defaultLang);

export function getLangFromUrl(url: URL): Lang {
  const segment = url.pathname.split('/')[1];
  return (prefixedLocales as readonly string[]).includes(segment)
    ? (segment as Lang)
    : defaultLang;
}

/**
 * Build a locale-aware absolute path.
 * Default locale: unprefixed. Other locales: `/<lang>` prefix.
 * The site root keeps its trailing slash (`/` -> `/en/`).
 */
export function localizedPath(path: string, lang: Lang): string {
  const clean = '/' + path.replace(/^\/+/, '');
  if (lang === defaultLang) return clean;
  return clean === '/' ? `/${lang}/` : `/${lang}${clean}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test src/i18n/routing.test.ts`
Expected: PASS — 6 tests, 0 failures.

- [ ] **Step 5: Add the i18n config**

In `astro.config.mjs`, replace the body with:

```js
// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  // TODO: set `site` to the production URL to emit absolute hreflang hrefs.
  i18n: {
    locales: ['es', 'en'],
    defaultLocale: 'es',
    routing: { prefixDefaultLocale: false },
  },
});
```

- [ ] **Step 6: Exclude test files from `astro check`**

In `tsconfig.json`, change the `exclude` line to:

```json
  "exclude": ["dist", "src/**/*.test.ts"]
```

- [ ] **Step 7: Verify the toolchain is still green**

Run: `npx astro check`
Expected: `0 errors` (may report `0 warnings` / `0 hints`).

Run: `npm run build`
Expected: build completes; `dist/index.html` produced.

- [ ] **Step 8: Commit**

```bash
git add astro.config.mjs tsconfig.json src/i18n/routing.ts src/i18n/routing.test.ts
git commit -m "feat(i18n): add Astro i18n config and routing helpers

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 2: Translation dictionaries + aggregator

**Files:**
- Create: `src/i18n/es.ts`
- Create: `src/i18n/en.ts`
- Create: `src/i18n/index.ts`

**Interfaces:**
- Consumes: `Lang`, routing exports from Task 1 (`src/i18n/routing.ts`).
- Produces:
  - `src/i18n/es.ts` default export `es` — the object below.
  - `type Dict = typeof es` (from `index.ts`).
  - `const ui: Record<Lang, Dict>` = `{ es, en }`.
  - `function useTranslations(lang: Lang): Dict` = `ui[lang]`.
  - `index.ts` also re-exports everything from `./routing`.

### Dictionary shape (authoritative)

Both `es.ts` and `en.ts` export **this exact structure**. `es.ts` uses `export default { ... } satisfies` nothing (it defines the shape); `en.ts` is `const en: Dict = { ... }; export default en;`.

```ts
// shape — keys are identical across locales
{
  meta: { title: string; description: string },
  nav: {
    logo: string;
    about: string; experience: string; projects: string; teaching: string; contact: string;
    toEs: string;   // aria-label for the ES switch link, e.g. "Ver en español"
    toEn: string;   // aria-label for the EN switch link
    menuOpen: string;  // hamburger aria-label, e.g. "Abrir menú"
    menuClose: string;
  },
  hero: {
    eyebrow: string;
    name: string;        // HTML: "David<br />Villar Martos"
    intro: string;
    scroll: string;      // "Baja para explorar"
  },
  about: {
    number: string;      // "01"
    label: string;       // "SOBRE MÍ"
    heading: string;     // HTML with <em>
    paragraphs: string[];// 3 body paragraphs (plain)
    closing: string;     // HTML with <br> + <em>
    caption: string;     // "DAVID VILLAR MARTOS"
    photoAlt: string;
  },
  experience: {
    number: string;      // "02"
    label: string;       // "EXPERIENCIA"
    heading: string;     // HTML with <em>
    intro: string;
    items: Array<{ year: string; type: string; title: string; body: string }>; // 6
  },
  projects: {
    number: string;      // "03"
    label: string;       // "PROYECTOS"
    heading: string;     // HTML with <em>
    intro: string;
    disciplines: { math: string; ai: string; games: string }; // HTML (<br/> allowed)
    viewOnGithub: string;
    exploreTeaching: string; // "EXPLORA DOCENCIA"
    comingSoon: { kicker: string; title: string; meta: string }; // game placeholder
    mathPlaceholder: string; // "MATEMÁTICAS"
    items: Array<{
      category: string;
      title: string;     // HTML (<em>, <br/>)
      subtitle: string;
      description: string;
      galleryAlt: string;
    }>; // 5, in render order (tfm, pokemon, covid, math, game)
  },
  teaching: {
    number: string;      // "04"
    label: string;       // "DOCENCIA"
    heading: string;     // HTML with <em>
    intro: string;
    principles: Array<{
      number: string;    // "01".."03"
      label: string;
      title: string;     // HTML with <em>
      paragraphs: string[]; // 2
    }>;
    closingLabel: string; // "EDUCAR ES"
    closingText: string;
  },
  contact: {
    number: string;      // "05"
    label: string;       // "CONTACTO"
    heading: string;     // HTML with <em>
    body: string;
    cta: string;         // "Contacta"
    email: string;       // "villarmartosdavid@gmail.com"
  },
  footer: {
    tagline: string;     // "MATEMÁTICAS · IA · DATA SCIENCE"
    rights: string;      // "© 2026 David Villar Martos"
    github: string; linkedin: string; email: string; // aria-labels
  },
  gallery: {
    prev: string; next: string; goTo: string; // goTo used as `${goTo} ${n}`
  }
}
```

- [ ] **Step 1: Create `src/i18n/es.ts`**

Port the **current Spanish copy verbatim** from the components, applying the corrections marked below. Exact sources:

- `meta.title`: `"David Villar Martos"` · `meta.description`: `"David Villar Martos — Matemáticas, Inteligencia Artificial y Ciencia de Datos."`
- `nav`: `logo` `"DAVID VILLAR MARTOS"`; `about` `"Sobre mí"`, `experience` `"Experiencia"`, `projects` `"Proyectos"`, `teaching` `"Docencia"`, `contact` `"Contacto"`; `toEs` `"Ver en español"`, `toEn` `"View in English"`; `menuOpen` `"Abrir menú"`, `menuClose` `"Cerrar menú"`.
- `hero`: `eyebrow` `"MATEMÁTICAS · IA · DATA SCIENCE"`; `name` `"David<br />Villar Martos"`; `intro` `"Profesor de matemáticas, ingeniero informático, científico de datos y entusiasta de la IA."`; `scroll` `"Baja para explorar"`.
- `about` (from `src/pages/index.astro:48-92`): `number` `"01"`; `label` `"SOBRE MÍ"`; `heading` `"La <em>curiosidad</em> es el punto de <em>partida</em>."`; `paragraphs` = the 3 `<p>` at lines 64, 67-69, 71-73 verbatim; `closing` `"Al final, todo se reduce a lo mismo:<br /> <em>comprender, construir y compartir.</em>"`; `caption` `"DAVID VILLAR MARTOS"`; `photoAlt` `"David Villar Martos"`.
- `experience` (from `src/components/Timeline.astro`): `number` `"02"`; `label` `"EXPERIENCIA"`; `heading` `"Un camino a través del <em>conocimiento.</em>"`; `intro` `"Matemáticas, computación, IA, docencia... Construyendo una visión global e interconectada entre ellas."`; `items` = the 6 `<article>` blocks in document order, each `{ year, type, title, body }` copied verbatim from lines 36-56, 67-88, 98-118, 128-148, 159-179, 190-210.
- `projects` (from `src/components/Projects.astro`): `number` `"03"`; `label` `"PROYECTOS"`; `heading` `"Transformando <em>ideas</em> en <em>realidades</em>."`; `intro` — **corrected** to `"Una selección de proyectos, experimentos e ideas sobre docencia, datos, IA y sistemas interactivos."`; `disciplines` `{ math: "MATEMÁTICAS", ai: "INTELIGENCIA<br />ARTIFICIAL", games: "DESARROLLO<br />DE JUEGOS" }`; `viewOnGithub` `"Ver en GitHub"`; `exploreTeaching` `"Explora docencia"`; `comingSoon` `{ kicker: "DESARROLLO DE JUEGOS", title: "Se está<br /> acercando.", meta: "Godot · Estrategia · Coleccionismo" }`; `mathPlaceholder` `"MATEMÁTICAS"`; `items` (5, in this order):
  1. `category` `"DATA SCIENCE · IA · MACHINE LEARNING"`, `title` `"Construyendo un <em>mundo más justo.</em>"`, `subtitle` `"Desarrollo de Modelos de Aprendizaje Automático Justo basados en Árboles de Decisión."`, `description` verbatim from lines 91-93, `galleryAlt` `"Modelos de aprendizaje automático justo"`.
  2. `category` `"DATA SCIENCE · IA · VISIÓN POR COMPUTADOR"`, `title` `"Encontrando patrones en<br /> <em>nuestros gustos.</em>"`, `subtitle` `"Pokémon Data Science"`, `description` verbatim from lines 253-255, `galleryAlt` `"Pokémon Data Science"`.
  3. `category` `"IA · DEEP LEARNING · VISIÓN POR COMPUTADOR"`, `title` `"Identificando <em>y combatiendo enfermedades</em>."`, `subtitle` `"Clasificación de Radiografías de Pecho para la Detección de COVID-19 y Diferenciación de Otras Neumonías Víricas Usando CNNs."`, `description` verbatim from lines 425-427, `galleryAlt` `"Clasificación de radiografías con CNNs"`.
  4. `category` `"MATEMÁTICAS · VISUALIZACIÓN"`, `title` `"Explorando<br /> <em>ideas matemáticas.</em>"`, `subtitle` `"Todo un mundo"`, `description` — **corrected** to `"Mi proyecto matemático lo construyo en las aulas, donde todo el alumnado aprende y se nutre de él."`, `galleryAlt` `""`.
  5. `category` `"DESARROLLO DE JUEGOS"`, `title` `"Construyendo<br /> <em>mundos interactivos.</em>"`, `subtitle` `"Un juego sin anunciar"`, `description` `"Un proyecto personal que explora límites en términos de estrategia y coleccionismo."`, `galleryAlt` `""`.
- `teaching` (from `src/components/Teaching.astro`): `number` `"04"` (**renumbered** from 05); `label` `"DOCENCIA"`; `heading` `"Transformando <em>curiosidad</em> en <em>comprensión</em>."`; `intro` verbatim from lines 20; `principles` (3), each `{ number, label, title, paragraphs: [2] }`:
  1. `"01"`, `"QUERER SABER"`, `"Comenzar con <em>preguntas.</em>"`, paragraphs from lines 56-61 (**corrected**: `recivir` → `recibir`) and 63-65.
  2. `"02"`, `"QUERER SABER HACER"`, `"Ampliar <em>horizontes.</em>"`, paragraphs from lines 103-110 and 112-115.
  3. `"03"`, `"QUERER SABER SER"`, `"Desde el <em>corazón.</em>"`, paragraphs from lines 153-156 and 158-160.
  `closingLabel` `"EDUCAR ES"`; `closingText` verbatim from lines 189-191.
- `contact` (from `src/components/Contact.astro`): `number` `"05"` (**renumbered** from 07); `label` `"CONTACTO"`; `heading` `"Construyamos <em>juntos</em>"`; `body` `"Ya sea matemáticas, tecnología, educación, IA, Data Science o desarrollo de juegos."`; `cta` `"Contacta"`; `email` `"villarmartosdavid@gmail.com"`.
- `footer` (from `src/components/Footer.astro`): `tagline` `"MATEMÁTICAS · IA · DATA SCIENCE"`; `rights` `"© 2026 David Villar Martos"`; `github` `"GitHub"`, `linkedin` `"LinkedIn"`, `email` `"Correo"`.
- `gallery`: `prev` `"Imagen anterior"`, `next` `"Imagen siguiente"`, `goTo` `"Ir a la imagen"`.

File skeleton:

```ts
const es = {
  meta: {
    title: 'David Villar Martos',
    description:
      'David Villar Martos — Matemáticas, Inteligencia Artificial y Ciencia de Datos.',
  },
  nav: {
    logo: 'DAVID VILLAR MARTOS',
    about: 'Sobre mí',
    experience: 'Experiencia',
    projects: 'Proyectos',
    teaching: 'Docencia',
    contact: 'Contacto',
    toEs: 'Ver en español',
    toEn: 'View in English',
    menuOpen: 'Abrir menú',
    menuClose: 'Cerrar menú',
  },
  hero: {
    eyebrow: 'MATEMÁTICAS · IA · DATA SCIENCE',
    name: 'David<br />Villar Martos',
    intro:
      'Profesor de matemáticas, ingeniero informático, científico de datos y entusiasta de la IA.',
    scroll: 'Baja para explorar',
  },
  about: {
    number: '01',
    label: 'SOBRE MÍ',
    heading: 'La <em>curiosidad</em> es el punto de <em>partida</em>.',
    paragraphs: [
      'Soy David, matemático, ingeniero informático, científico de datos y profesor. Me gusta aprender cosas nuevas, entender cómo encajan entre sí y encontrar formas de convertir ese conocimiento en algo útil.',
      'Las matemáticas me enseñaron a pensar, la informática a construir y la ciencia de datos y la IA, a encontrar patrones y conocimiento en sistemas complejos. La docencia me ha dado la oportunidad de compartir todo ello y descubrir que una idea difícil puede convertirse en algo sencillo cuando encuentras la forma adecuada de explicarla.',
      'Fuera del aula, disfruto llevando estas ideas a otros lugares: experimentando con datos, diseñando juegos y construyendo experiencias interactivas.',
    ],
    closing:
      'Al final, todo se reduce a lo mismo:<br /> <em>comprender, construir y compartir.</em>',
    caption: 'DAVID VILLAR MARTOS',
    photoAlt: 'David Villar Martos',
  },
  experience: {
    number: '02',
    label: 'EXPERIENCIA',
    heading: 'Un camino a través del <em>conocimiento.</em>',
    intro:
      'Matemáticas, computación, IA, docencia... Construyendo una visión global e interconectada entre ellas.',
    items: [
      {
        year: '2016-2021',
        type: 'EDUCACIÓN - MATEMÁTICAS',
        title: 'Grado en Matemáticas (UGR)',
        body: 'Donde desarrollé una forma de pensar basada en el razonamiento lógico, la abstracción y la resolución de problemas, construyendo una base sólida en análisis, álgebra, geometría, probabilidad, estadística y matemática aplicada.',
      },
      {
        year: '2016-2021',
        type: 'EDUCACIÓN - INFORMÁTICA',
        title:
          'Grado en Ingeniería Informática con mención en Computación y Sistemas Inteligentes (UGR)',
        body: 'Donde aprendí sobre computación, programación, algoritmia, pensamiento computacional, metaheurísticas, visión por computador y aprendizaje automático, complementando mi formación matemática con una perspectiva computacional orientada a resolver problemas complejos.',
      },
      {
        year: '2022-2023',
        type: 'EDUCACIÓN - DOCENCIA',
        title:
          'Máster en Educación Secundaria, con Especialidad en Matemáticas (UGR)',
        body: 'Donde profundicé en psicología del desarrollo y del aprendizaje, didáctica de las matemáticas, evaluación y diseño de actividades y recursos, llevando estos conocimientos a la práctica durante mi formación en el instituto.',
      },
      {
        year: '2021-2024',
        type: 'EDUCACIÓN - IA Y DATA SCIENCE',
        title:
          'Máster en Ciencia de Datos e Ingeniería de Computadores con Especialidad en Ciencia de Datos y Tecnologías Inteligentes (UGR)',
        body: 'Donde profundicé en ciencia y minería de datos, Big Data, análisis de redes sociales, minería de procesos y modelos probabilísticos, consolidando mi formación en inteligencia artificial y análisis de datos. Obtuve matrícula de honor en mi Trabajo Fin de Máster: "Development of Fair Machine Learning Algorithms Based on Decision Trees".',
      },
      {
        year: '2021-2023',
        type: 'TRABAJO - INVESTIGACIÓN',
        title: 'Data Scientist e Investigador con Cargo a Proyecto',
        body: 'Trabajé como desarrollador principal en el proyecto "Evaluación de necesidades asistenciales de personas con enfermedades crónicas según determinantes sociales y ambientales mediante metodologías avanzadas de ciencia de datos", aplicando técnicas de ciencia de datos a un problema real con impacto social.',
      },
      {
        year: '2025 - ACTUALIDAD',
        type: 'TRABAJO - DOCENCIA',
        title: 'Profesor de Matemáticas en Educación Secundaria Pública',
        body: 'Mi día a día en el aula me ha enseñado a convertir ideas complejas en experiencias de aprendizaje accesibles, adaptarme a diferentes ritmos y necesidades y gestionar un entorno donde comunicación, organización y flexibilidad son esenciales.',
      },
    ],
  },
  projects: {
    number: '03',
    label: 'PROYECTOS',
    heading: 'Transformando <em>ideas</em> en <em>realidades</em>.',
    intro:
      'Una selección de proyectos, experimentos e ideas sobre docencia, datos, IA y sistemas interactivos.',
    disciplines: {
      math: 'MATEMÁTICAS',
      ai: 'INTELIGENCIA<br />ARTIFICIAL',
      games: 'DESARROLLO<br />DE JUEGOS',
    },
    viewOnGithub: 'Ver en GitHub',
    exploreTeaching: 'Explora docencia',
    comingSoon: {
      kicker: 'DESARROLLO DE JUEGOS',
      title: 'Se está<br /> acercando.',
      meta: 'Godot · Estrategia · Coleccionismo',
    },
    mathPlaceholder: 'MATEMÁTICAS',
    items: [
      {
        category: 'DATA SCIENCE · IA · MACHINE LEARNING',
        title: 'Construyendo un <em>mundo más justo.</em>',
        subtitle:
          'Desarrollo de Modelos de Aprendizaje Automático Justo basados en Árboles de Decisión.',
        description:
          'Proyecto final de máster (MH) en el que construí modelos de aprendizaje automático que tuvieran en cuenta los sesgos de sus predicciones y que los minimizan mientras aprenden, utilizando optimización multiobjetivo, árboles de decisión y algoritmos genéticos.',
        galleryAlt: 'Modelos de aprendizaje automático justo',
      },
      {
        category: 'DATA SCIENCE · IA · VISIÓN POR COMPUTADOR',
        title: 'Encontrando patrones en<br /> <em>nuestros gustos.</em>',
        subtitle: 'Pokémon Data Science',
        description:
          'Un proyecto de ciencia de datos que incluye recopilación de información, análisis exploratorio, clustering y clasificación de imágenes usando deep learning y extracción de características.',
        galleryAlt: 'Pokémon Data Science',
      },
      {
        category: 'IA · DEEP LEARNING · VISIÓN POR COMPUTADOR',
        title: 'Identificando <em>y combatiendo enfermedades</em>.',
        subtitle:
          'Clasificación de Radiografías de Pecho para la Detección de COVID-19 y Diferenciación de Otras Neumonías Víricas Usando CNNs.',
        description:
          'Un proyecto que muestra el potencial de la IA como sistema de apoyo a la decisión médica e identificación y discriminación de enfermedades.',
        galleryAlt: 'Clasificación de radiografías con CNNs',
      },
      {
        category: 'MATEMÁTICAS · VISUALIZACIÓN',
        title: 'Explorando<br /> <em>ideas matemáticas.</em>',
        subtitle: 'Todo un mundo',
        description:
          'Mi proyecto matemático lo construyo en las aulas, donde todo el alumnado aprende y se nutre de él.',
        galleryAlt: '',
      },
      {
        category: 'DESARROLLO DE JUEGOS',
        title: 'Construyendo<br /> <em>mundos interactivos.</em>',
        subtitle: 'Un juego sin anunciar',
        description:
          'Un proyecto personal que explora límites en términos de estrategia y coleccionismo.',
        galleryAlt: '',
      },
    ],
  },
  teaching: {
    number: '04',
    label: 'DOCENCIA',
    heading: 'Transformando <em>curiosidad</em> en <em>comprensión</em>.',
    intro:
      'Abogo por una educación pública y de calidad para todo el mundo, que exprima al máximo las capacidades de cada persona y sin importar nada más que el interés que uno tenga de alcanzar sus metas. Aquí plasmo unas pinceladas de mi filosofía como docente:',
    principles: [
      {
        number: '01',
        label: 'QUERER SABER',
        title: 'Comenzar con <em>preguntas.</em>',
        paragraphs: [
          'Siempre comienzo preguntando algo aparentemente simple, ya que el mejor aprendizaje se produce en situaciones donde pica la curiosidad, que motiven de manera intrínseca y movilicen todas las ideas matemáticas previas en lugar de solo recibir nuevas. Experimentar, hacer conjeturas, identificar patrones... todo nace de esa motivación.',
          'A veces, la parte más valiosa del proceso de enseñanza-aprendizaje está en cómo hacer mejores preguntas.',
        ],
      },
      {
        number: '02',
        label: 'QUERER SABER HACER',
        title: 'Ampliar <em>horizontes.</em>',
        paragraphs: [
          'Las matemáticas están llenas de conceptos y relaciones que cuestan ver al principio, pero que una vez entendemos, vemos con claridad. Hay muchas maneras de hacer lo abstracto concreto: visualizar, enlazar, observar, manipular... Las herramientas tecnológicas también juegan un gran papel en que el alumnado pueda razonar y construir su propio conocimiento.',
          'Las matemáticas desbloquean nuevas formas de pensar, razonar y entender la realidad que nos rodea.',
        ],
      },
      {
        number: '03',
        label: 'QUERER SABER SER',
        title: 'Desde el <em>corazón.</em>',
        paragraphs: [
          'La vida me ha enseñado que lo más importante son las personas que nos rodean, y no puedo sentir más orgullo que el de trabajar educando y verlas crecer. Intento plasmar mi visión del mundo y dejar una huella en cada persona, vivir en su recuerdo y marcarlas de manera positiva para que puedan vivir mejor.',
          'No se trata de ser felices al final, sino de valorar todo lo feliz que hay en el proceso.',
        ],
      },
    ],
    closingLabel: 'EDUCAR ES',
    closingText:
      'Despertar la curiosidad, hacer visible lo abstracto y acompañar a cada persona a descubrir nuevas formas de pensar, comprender y disfrutar del proceso de aprender.',
  },
  contact: {
    number: '05',
    label: 'CONTACTO',
    heading: 'Construyamos <em>juntos</em>',
    body: 'Ya sea matemáticas, tecnología, educación, IA, Data Science o desarrollo de juegos.',
    cta: 'Contacta',
    email: 'villarmartosdavid@gmail.com',
  },
  footer: {
    tagline: 'MATEMÁTICAS · IA · DATA SCIENCE',
    rights: '© 2026 David Villar Martos',
    github: 'GitHub',
    linkedin: 'LinkedIn',
    email: 'Correo',
  },
  gallery: {
    prev: 'Imagen anterior',
    next: 'Imagen siguiente',
    goTo: 'Ir a la imagen',
  },
};

export default es;
```

- [ ] **Step 2: Create `src/i18n/index.ts`**

```ts
import type { Lang } from './routing';
import es from './es';
import en from './en';

export * from './routing';

export type Dict = typeof es;

export const ui: Record<Lang, Dict> = { es, en };

export function useTranslations(lang: Lang): Dict {
  return ui[lang];
}
```

- [ ] **Step 3: Create `src/i18n/en.ts` (natural English, full)**

```ts
import type { Dict } from './index';

const en: Dict = {
  meta: {
    title: 'David Villar Martos',
    description:
      'David Villar Martos — Mathematics, Artificial Intelligence and Data Science.',
  },
  nav: {
    logo: 'DAVID VILLAR MARTOS',
    about: 'About',
    experience: 'Experience',
    projects: 'Projects',
    teaching: 'Teaching',
    contact: 'Contact',
    toEs: 'Ver en español',
    toEn: 'View in English',
    menuOpen: 'Open menu',
    menuClose: 'Close menu',
  },
  hero: {
    eyebrow: 'MATHEMATICS · AI · DATA SCIENCE',
    name: 'David<br />Villar Martos',
    intro:
      'Mathematics teacher, computer engineer, data scientist and AI enthusiast.',
    scroll: 'Scroll to explore',
  },
  about: {
    number: '01',
    label: 'ABOUT',
    heading: '<em>Curiosity</em> is the <em>starting point</em>.',
    paragraphs: [
      "I'm David — a mathematician, computer engineer, data scientist and teacher. I like learning new things, understanding how they fit together, and finding ways to turn that knowledge into something useful.",
      'Mathematics taught me how to think, computer science how to build, and data science and AI how to find patterns and meaning in complex systems. Teaching has given me the chance to share all of it — and to discover that a hard idea can become a simple one once you find the right way to explain it.',
      'Outside the classroom, I enjoy taking these ideas elsewhere: experimenting with data, designing games and building interactive experiences.',
    ],
    closing:
      'In the end, it all comes down to the same thing:<br /> <em>understand, build and share.</em>',
    caption: 'DAVID VILLAR MARTOS',
    photoAlt: 'David Villar Martos',
  },
  experience: {
    number: '02',
    label: 'EXPERIENCE',
    heading: 'A path through <em>knowledge.</em>',
    intro:
      'Mathematics, computing, AI, teaching... building a global, interconnected view across them.',
    items: [
      {
        year: '2016-2021',
        type: 'EDUCATION - MATHEMATICS',
        title: "Bachelor's Degree in Mathematics (UGR)",
        body: 'Where I developed a way of thinking rooted in logical reasoning, abstraction and problem solving, building a solid foundation in analysis, algebra, geometry, probability, statistics and applied mathematics.',
      },
      {
        year: '2016-2021',
        type: 'EDUCATION - COMPUTER SCIENCE',
        title:
          "Bachelor's Degree in Computer Engineering, specialising in Computation and Intelligent Systems (UGR)",
        body: 'Where I learned about computation, programming, algorithmics, computational thinking, metaheuristics, computer vision and machine learning, complementing my mathematical training with a computational perspective aimed at solving complex problems.',
      },
      {
        year: '2022-2023',
        type: 'EDUCATION - TEACHING',
        title:
          "Master's in Secondary Education, specialising in Mathematics (UGR)",
        body: 'Where I went deeper into developmental and learning psychology, the didactics of mathematics, assessment, and the design of activities and resources, putting it all into practice during my training placement at a secondary school.',
      },
      {
        year: '2021-2024',
        type: 'EDUCATION - AI & DATA SCIENCE',
        title:
          "Master's in Data Science and Computer Engineering, specialising in Data Science and Intelligent Technologies (UGR)",
        body: 'Where I went deeper into data science and mining, Big Data, social network analysis, process mining and probabilistic models, consolidating my background in artificial intelligence and data analysis. I received top honours for my Master\'s Thesis: "Development of Fair Machine Learning Algorithms Based on Decision Trees".',
      },
      {
        year: '2021-2023',
        type: 'WORK - RESEARCH',
        title: 'Data Scientist and Project-Funded Researcher',
        body: 'I worked as lead developer on the project "Assessing the care needs of people with chronic illnesses according to social and environmental determinants using advanced data science methodologies", applying data science techniques to a real problem with social impact.',
      },
      {
        year: '2025 - PRESENT',
        type: 'WORK - TEACHING',
        title: 'Mathematics Teacher in Public Secondary Education',
        body: 'My day-to-day in the classroom has taught me to turn complex ideas into accessible learning experiences, adapt to different paces and needs, and manage an environment where communication, organisation and flexibility are essential.',
      },
    ],
  },
  projects: {
    number: '03',
    label: 'PROJECTS',
    heading: 'Turning <em>ideas</em> into <em>reality</em>.',
    intro:
      'A selection of projects, experiments and ideas around teaching, data, AI and interactive systems.',
    disciplines: {
      math: 'MATHEMATICS',
      ai: 'ARTIFICIAL<br />INTELLIGENCE',
      games: 'GAME<br />DEVELOPMENT',
    },
    viewOnGithub: 'View on GitHub',
    exploreTeaching: 'Explore teaching',
    comingSoon: {
      kicker: 'GAME DEVELOPMENT',
      title: 'It\'s getting<br /> closer.',
      meta: 'Godot · Strategy · Collecting',
    },
    mathPlaceholder: 'MATHEMATICS',
    items: [
      {
        category: 'DATA SCIENCE · AI · MACHINE LEARNING',
        title: 'Building a <em>fairer world.</em>',
        subtitle:
          'Development of Fair Machine Learning Models Based on Decision Trees.',
        description:
          'Master\'s thesis (with honours) in which I built machine learning models that account for the bias in their predictions and minimise it while they learn, using multi-objective optimisation, decision trees and genetic algorithms.',
        galleryAlt: 'Fair machine learning models',
      },
      {
        category: 'DATA SCIENCE · AI · COMPUTER VISION',
        title: 'Finding patterns in<br /> <em>what we like.</em>',
        subtitle: 'Pokémon Data Science',
        description:
          'A data science project covering data collection, exploratory analysis, clustering and image classification using deep learning and feature extraction.',
        galleryAlt: 'Pokémon Data Science',
      },
      {
        category: 'AI · DEEP LEARNING · COMPUTER VISION',
        title: 'Identifying <em>and fighting disease</em>.',
        subtitle:
          'Chest X-ray Classification for COVID-19 Detection and Differentiation from Other Viral Pneumonias Using CNNs.',
        description:
          'A project showing the potential of AI as a support system for medical decision-making and for identifying and distinguishing diseases.',
        galleryAlt: 'Chest X-ray classification with CNNs',
      },
      {
        category: 'MATHEMATICS · VISUALISATION',
        title: 'Exploring<br /> <em>mathematical ideas.</em>',
        subtitle: 'A whole world',
        description:
          'My mathematics project takes shape in the classroom, where every student learns from it and adds to it.',
        galleryAlt: '',
      },
      {
        category: 'GAME DEVELOPMENT',
        title: 'Building<br /> <em>interactive worlds.</em>',
        subtitle: 'An unannounced game',
        description:
          'A personal project exploring the limits of strategy and collecting.',
        galleryAlt: '',
      },
    ],
  },
  teaching: {
    number: '04',
    label: 'TEACHING',
    heading: 'Turning <em>curiosity</em> into <em>understanding</em>.',
    intro:
      'I believe in high-quality public education for everyone — education that makes the most of each person\'s abilities, with nothing mattering more than their own desire to reach their goals. Here are a few brushstrokes of my philosophy as a teacher:',
    principles: [
      {
        number: '01',
        label: 'WANTING TO KNOW',
        title: 'Start with <em>questions.</em>',
        paragraphs: [
          'I always begin by asking something seemingly simple, because the best learning happens when curiosity is sparked — situations that motivate intrinsically and mobilise every prior mathematical idea rather than just adding new ones. Experimenting, making conjectures, spotting patterns... it all grows from that motivation.',
          'Sometimes the most valuable part of teaching and learning lies in how to ask better questions.',
        ],
      },
      {
        number: '02',
        label: 'WANTING TO KNOW HOW',
        title: 'Widen <em>horizons.</em>',
        paragraphs: [
          'Mathematics is full of concepts and relationships that are hard to see at first but become clear once we understand them. There are many ways to make the abstract concrete: visualising, connecting, observing, manipulating... Technology also plays a big part in letting students reason and build their own knowledge.',
          'Mathematics unlocks new ways to think, reason and understand the reality around us.',
        ],
      },
      {
        number: '03',
        label: 'WANTING TO KNOW HOW TO BE',
        title: 'From the <em>heart.</em>',
        paragraphs: [
          'Life has taught me that what matters most is the people around us, and I could feel no greater pride than working in education and watching them grow. I try to share my view of the world and leave a mark on each person, to live on in their memory and shape them positively so they can live better.',
          'It is not about being happy at the end, but about valuing all the happiness there is along the way.',
        ],
      },
    ],
    closingLabel: 'TO TEACH IS',
    closingText:
      'To awaken curiosity, make the abstract visible, and walk with each person as they discover new ways to think, understand and enjoy the process of learning.',
  },
  contact: {
    number: '05',
    label: 'CONTACT',
    heading: "Let's build <em>together</em>",
    body: 'Whether it\'s mathematics, technology, education, AI, data science or game development.',
    cta: 'Get in touch',
    email: 'villarmartosdavid@gmail.com',
  },
  footer: {
    tagline: 'MATHEMATICS · AI · DATA SCIENCE',
    rights: '© 2026 David Villar Martos',
    github: 'GitHub',
    linkedin: 'LinkedIn',
    email: 'Email',
  },
  gallery: {
    prev: 'Previous image',
    next: 'Next image',
    goTo: 'Go to image',
  },
};

export default en;
```

- [ ] **Step 4: Verify shape parity + types**

Run: `npx astro check`
Expected: `0 errors`. If `en.ts` is missing or has an extra key, this fails with a TS error pointing at `en.ts` — fix until green.

- [ ] **Step 5: Sanity-check the ES port for drift**

Run: `git grep -nE "recivir|constuyo" src/i18n/` → Expected: no output.
Run: `node --test src/i18n/routing.test.ts` → Expected: PASS (unchanged).

- [ ] **Step 6: Commit**

```bash
git add src/i18n/es.ts src/i18n/en.ts src/i18n/index.ts
git commit -m "feat(i18n): add es/en dictionaries and translation aggregator

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 3: Layout shell, SiteBody, page wrappers, delete dead files

**Files:**
- Create: `src/layouts/Layout.astro`
- Create: `src/components/SiteBody.astro`
- Create: `src/pages/en/index.astro`
- Modify: `src/pages/index.astro`
- Delete: `src/components/Hero.astro`, `src/components/About.astro`, `src/pages/about.astro`, `src/pages/projects.astro`, `src/layouts/Layout.astro.txt`

**Interfaces:**
- Consumes: `useTranslations`, `getLangFromUrl`, `localizedPath`, `type Lang` from `src/i18n`.
- Produces:
  - `Layout.astro` — `Props { lang: Lang }`, renders `<html lang>` + `<head>` + `<slot />`.
  - `SiteBody.astro` — `Props { lang: Lang }`, renders the whole page body. Passes `lang` to `Timeline`, `Projects`, `Teaching`, `Contact`, `Navbar`, `Footer`.
- NOTE: In this task the child components still render hardcoded Spanish (their `lang` prop is accepted but unused). Later tasks wire each one to `t`. The site therefore serves identical Spanish at `/` and `/en/` after this task, but with correct `<html lang>` and hreflang per route.

- [ ] **Step 1: Create `src/layouts/Layout.astro`**

```astro
---
import "../styles/global.css";
import { localizedPath, type Lang, useTranslations } from "../i18n";

interface Props {
  lang: Lang;
}

const { lang } = Astro.props;
const t = useTranslations(lang);

// Root-relative alternates. TODO: prefix with Astro.site once `site` is set in astro.config.
const alternates: { hreflang: string; href: string }[] = [
  { hreflang: "es", href: localizedPath("/", "es") },
  { hreflang: "en", href: localizedPath("/", "en") },
  { hreflang: "x-default", href: localizedPath("/", "es") },
];
---

<!doctype html>
<html lang={lang}>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width" />
    <meta name="description" content={t.meta.description} />
    <link rel="icon" href="/favicon.ico" sizes="any" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    {alternates.map((a) => (
      <link rel="alternate" hreflang={a.hreflang} href={a.href} />
    ))}
    <title>{t.meta.title}</title>
  </head>
  <body>
    <slot />
  </body>
</html>
```

- [ ] **Step 2: Create `src/components/SiteBody.astro`**

Port the Hero + About markup **verbatim** from the current `src/pages/index.astro:24-97` (the `<section class="hero">` and `<section id="about">` blocks, including `<ParticleField />` and the `<Reveal>` wrappers). Keep hardcoded Spanish text for now.

```astro
---
import type { Lang } from "../i18n";
import ParticleField from "./ParticleField.astro";
import Reveal from "./Reveal.astro";
import Navbar from "./Navbar.astro";
import Timeline from "./Timeline.astro";
import Projects from "./Projects.astro";
import Teaching from "./Teaching.astro";
import Contact from "./Contact.astro";
import Footer from "./Footer.astro";

interface Props {
  lang: Lang;
}

const { lang } = Astro.props;
---

<Navbar lang={lang} />

<main>
  <section class="hero" id="top">
    <ParticleField />
    <div class="hero-content">
      <p class="eyebrow">MATEMÁTICAS · IA · DATA SCIENCE</p>
      <h1>David<br />Villar Martos</h1>
      <p class="intro">
        Profesor de matemáticas, ingeniero informático, científico de datos y entusiasta de la IA.
      </p>
      <a href="#about" class="scroll-indicator">
        <span>Baja para explorar</span>
        <span class="arrow">↓</span>
      </a>
    </div>
  </section>

  <section id="about" class="about">
    <p class="section-label">01 — SOBRE MÍ</p>
    <div class="about-content">
      <Reveal>
        <h2>La <em> curiosidad</em> es el punto de <em> partida</em>.</h2>
      </Reveal>
      <div class="about-lower">
        <Reveal delay={150}>
          <div class="about-text">
            <p>Soy David, matemático, ingeniero informático, científico de datos y profesor. Me gusta aprender cosas nuevas, entender cómo encajan entre sí y encontrar formas de convertir ese conocimiento en algo útil.</p>
            <p>Las matemáticas me enseñaron a pensar, la informática a construir y la ciencia de datos y la IA, a encontrar patrones y conocimiento en sistemas complejos. La docencia me ha dado la oportunidad de compartir todo ello y descubrir que una idea difícil puede convertirse en algo sencillo cuando encuentras la forma adecuada de explicarla.</p>
            <p>Fuera del aula, disfruto llevando estas ideas a otros lugares: experimentando con datos, diseñando juegos y construyendo experiencias interactivas.</p>
            <p class="about-closing">Al final, todo se reduce a lo mismo:<br /> <em> comprender, construir y compartir.</em></p>
          </div>
        </Reveal>
        <Reveal delay={300}>
          <figure class="about-photo">
            <div class="about-photo-frame">
              <img src="/images/david-villar.png" alt="David Villar Martos" />
            </div>
            <figcaption>DAVID VILLAR MARTOS</figcaption>
          </figure>
        </Reveal>
      </div>
    </div>
  </section>

  <Timeline lang={lang} />
  <Projects lang={lang} />
  <Teaching lang={lang} />
  <Contact lang={lang} />
  <Footer lang={lang} />
</main>
```

- [ ] **Step 3: (nothing to do — child components stay as-is this task)**

`SiteBody.astro` passes `lang={lang}` to `Navbar`, `Timeline`, `Projects`, `Teaching`,
`Contact`, `Footer`. None of them declare a `Props` interface yet, and Astro silently
accepts extra props on components without one — so `astro check` stays green without any
stub. Each component gets its `interface Props { lang: Lang }` + `useTranslations` in its
own later task (5–8), where `lang` is actually consumed. Do **not** add unused-prop stubs
here (they would trip `noUnusedLocals` from `astro/tsconfigs/strict`).

- [ ] **Step 4: Rewrite `src/pages/index.astro`**

```astro
---
import Layout from "../layouts/Layout.astro";
import SiteBody from "../components/SiteBody.astro";
---

<Layout lang="es">
  <SiteBody lang="es" />
</Layout>
```

- [ ] **Step 5: Create `src/pages/en/index.astro`**

```astro
---
import Layout from "../../layouts/Layout.astro";
import SiteBody from "../../components/SiteBody.astro";
---

<Layout lang="en">
  <SiteBody lang="en" />
</Layout>
```

- [ ] **Step 6: Delete dead files**

```bash
git rm src/components/Hero.astro src/components/About.astro \
       src/pages/about.astro src/pages/projects.astro \
       src/layouts/Layout.astro.txt
```

- [ ] **Step 7: Verify build + both routes**

Run: `npx astro check`
Expected: `0 errors`.

Run: `npm run build`
Expected: build succeeds; both `dist/index.html` and `dist/en/index.html` exist.

Run: `grep -o '<html lang="[a-z]*"' dist/index.html dist/en/index.html`
Expected: `dist/index.html:<html lang="es"` and `dist/en/index.html:<html lang="en"`.

Run: `grep -c 'hreflang' dist/en/index.html`
Expected: `3`.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(i18n): add Layout + SiteBody shell and en/ route; remove dead files

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 4: Wire Hero + About markup to translations

**Files:**
- Modify: `src/components/SiteBody.astro`

**Interfaces:**
- Consumes: `useTranslations(lang)` → `t`; uses `t.hero.*`, `t.about.*`.
- Produces: no new exports. Hero + About now render locale-correct copy.

- [ ] **Step 1: Import translations in `SiteBody.astro` frontmatter**

Add to the frontmatter:

```astro
import { useTranslations } from "../i18n";
const t = useTranslations(lang);
```

- [ ] **Step 2: Replace Hero markup text with `t` lookups**

```astro
<div class="hero-content">
  <p class="eyebrow">{t.hero.eyebrow}</p>
  <h1><Fragment set:html={t.hero.name} /></h1>
  <p class="intro">{t.hero.intro}</p>
  <a href="#about" class="scroll-indicator">
    <span>{t.hero.scroll}</span>
    <span class="arrow">↓</span>
  </a>
</div>
```

- [ ] **Step 3: Replace About markup text with `t` lookups**

```astro
<section id="about" class="about">
  <p class="section-label">{t.about.number} — {t.about.label}</p>
  <div class="about-content">
    <Reveal>
      <h2><Fragment set:html={t.about.heading} /></h2>
    </Reveal>
    <div class="about-lower">
      <Reveal delay={150}>
        <div class="about-text">
          {t.about.paragraphs.map((p) => <p>{p}</p>)}
          <p class="about-closing"><Fragment set:html={t.about.closing} /></p>
        </div>
      </Reveal>
      <Reveal delay={300}>
        <figure class="about-photo">
          <div class="about-photo-frame">
            <img src="/images/david-villar.png" alt={t.about.photoAlt} />
          </div>
          <figcaption>{t.about.caption}</figcaption>
        </figure>
      </Reveal>
    </div>
  </div>
</section>
```

Note: `t.about.paragraphs` has exactly 3 entries; the last `<p class="about-closing">` is rendered separately from `t.about.closing`.

- [ ] **Step 4: Verify both languages**

Run: `npx astro check` → Expected: `0 errors`.
Run: `npm run build` → Expected: succeeds.
Run: `grep -o 'Scroll to explore' dist/en/index.html` → Expected: match.
Run: `grep -o 'Baja para explorar' dist/index.html` → Expected: match.
Run: `grep -o 'starting point' dist/en/index.html` → Expected: match (About heading translated).

- [ ] **Step 5: Commit**

```bash
git add src/components/SiteBody.astro
git commit -m "feat(i18n): localize hero and about sections

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 5: Localize Navbar + Footer + working language switcher

**Files:**
- Modify: `src/components/Navbar.astro`
- Modify: `src/components/Footer.astro`

**Interfaces:**
- Consumes: `useTranslations(lang)` → `t`; `localizedPath`, `languages`, `type Lang` from `src/i18n`.
- Produces: Navbar + Footer render locale copy; `ES` / `EN` links point to `/` and `/en/` with the active locale marked `aria-current="true"`.

- [ ] **Step 1: Navbar frontmatter**

Replace the `void lang;` stub with:

```astro
---
import { languages, localizedPath, useTranslations, type Lang } from "../i18n";

interface Props {
  lang: Lang;
}

const { lang } = Astro.props;
const t = useTranslations(lang);

const navLinks = [
  { href: "#about", label: t.nav.about },
  { href: "#experience", label: t.nav.experience },
  { href: "#work", label: t.nav.projects },
  { href: "#teaching", label: t.nav.teaching },
  { href: "#contact", label: t.nav.contact },
];

const langLinks = (["es", "en"] as Lang[]).map((code) => ({
  code,
  label: languages[code],
  href: localizedPath("/", code),
  current: code === lang,
  aria: code === "es" ? t.nav.toEs : t.nav.toEn,
}));
---
```

- [ ] **Step 2: Navbar markup — logo, links, language**

```astro
<a href="#top" class="navbar-logo">{t.nav.logo}</a>

<div class="navbar-links">
  {navLinks.map((l) => <a href={l.href}>{l.label}</a>)}
</div>

<div class="navbar-language">
  {langLinks.map((l, i) => (
    <>
      {i > 0 && <span>/</span>}
      <a
        href={l.href}
        aria-label={l.aria}
        aria-current={l.current ? "true" : undefined}
        class:list={["navbar-language-link", { "is-current": l.current }]}
      >{l.label}</a>
    </>
  ))}
</div>
```

Keep the existing `<script>` and `<style>` untouched in this task (style pass is Task 11). Add this rule to the existing `<style>` so the active locale reads as active:

```css
  .navbar-language-link.is-current {
    font-weight: 600;
    color: var(--foreground);
  }
```

- [ ] **Step 3: Footer frontmatter + markup**

Frontmatter:

```astro
---
import { localizedPath, languages, useTranslations, type Lang } from "../i18n";

interface Props {
  lang: Lang;
}

const { lang } = Astro.props;
const t = useTranslations(lang);
---
```

Replace the hardcoded strings:
- `<span>DAVID VILLAR MARTOS</span>` → `<span>{t.nav.logo}</span>`
- `<span>MATEMÁTICAS · IA · DATA SCIENCE</span>` → `<span>{t.footer.tagline}</span>`
- `<span>© 2026 David Villar Martos</span>` → `<span>{t.footer.rights}</span>`
- `aria-label="GitHub"` → `aria-label={t.footer.github}` (and LinkedIn → `t.footer.linkedin`, Email → `t.footer.email`)
- The trailing `<span>ES / EN</span>` → a real switcher:

```astro
<div class="footer-language">
  <a href={localizedPath("/", "es")} aria-current={lang === "es" ? "true" : undefined}>{languages.es}</a>
  <span>/</span>
  <a href={localizedPath("/", "en")} aria-current={lang === "en" ? "true" : undefined}>{languages.en}</a>
</div>
```

- [ ] **Step 4: Verify**

Run: `npx astro check` → Expected: `0 errors`.
Run: `npm run build` → Expected: succeeds.
Run: `grep -o 'href="/en/"' dist/index.html | head -1` → Expected: match (ES page links to EN).
Run: `grep -o 'href="/"[^>]*aria-current="true"' dist/index.html` → Expected: match (ES active on ES page).
Run: `grep -oE '>(About|Experience|Projects|Teaching|Contact)<' dist/en/index.html | sort -u` → Expected: all five.

- [ ] **Step 5: Commit**

```bash
git add src/components/Navbar.astro src/components/Footer.astro
git commit -m "feat(i18n): localize navbar and footer, wire language switcher

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 6: Localize Timeline

**Files:**
- Modify: `src/components/Timeline.astro`

**Interfaces:**
- Consumes: `useTranslations(lang)` → `t`; uses `t.experience.*` (`number`, `label`, `heading`, `intro`, `items[]`).
- Produces: Experience section renders from the dictionary array; markup count is driven by `t.experience.items.length`.

- [ ] **Step 1: Frontmatter**

```astro
---
import { useTranslations, type Lang } from "../i18n";

interface Props {
  lang: Lang;
}

const { lang } = Astro.props;
const t = useTranslations(lang);
---
```

- [ ] **Step 2: Replace the header block**

```astro
<div class="timeline-header">
  <p class="section-label">{t.experience.number} — {t.experience.label}</p>
  <div class="timeline-header-content">
    <h2><Fragment set:html={t.experience.heading} /></h2>
    <p>{t.experience.intro}</p>
  </div>
</div>
```

- [ ] **Step 3: Replace the six hardcoded `<article class="timeline-item">` blocks with a map**

```astro
<div class="timeline">
  <div class="timeline-line" aria-hidden="true">
    <div class="timeline-line-progress"></div>
  </div>

  {t.experience.items.map((item) => (
    <article class="timeline-item">
      <div class="timeline-year">{item.year}</div>
      <div class="timeline-marker"><div class="timeline-dot"></div></div>
      <div class="timeline-content">
        <p class="timeline-type">{item.type}</p>
        <h3>{item.title}</h3>
        <p>{item.body}</p>
      </div>
    </article>
  ))}
</div>
```

Keep the existing `<script>` (IntersectionObserver) unchanged.

- [ ] **Step 4: Verify**

Run: `npx astro check` → Expected: `0 errors`.
Run: `npm run build` → Expected: succeeds.
Run: `grep -c 'timeline-item' dist/index.html` → Expected: `>= 6` (6 items; `timeline-item` also appears in the `:has()` CSS selector inside the inlined critical CSS may inflate — accept `>= 6`).
Run: `grep -o "A path through" dist/en/index.html` → Expected: match.
Run: `grep -o "Un camino a través" dist/index.html` → Expected: match.

- [ ] **Step 5: Commit**

```bash
git add src/components/Timeline.astro
git commit -m "feat(i18n): localize experience timeline

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 7: Localize Projects + ProjectGallery

**Files:**
- Modify: `src/components/Projects.astro`
- Modify: `src/components/ProjectGallery.astro`

**Interfaces:**
- Consumes: `useTranslations(lang)` → `t`; `t.projects.*`. `ProjectGallery` gains `Props { images: string[]; alt?: string; interval?: number; labels: { prev: string; next: string; goTo: string } }`.
- Produces: Projects section renders category/title/subtitle/description from `t.projects.items[0..4]`; project-04 link now points to `#teaching`.

- [ ] **Step 1: `ProjectGallery.astro` — accept localized labels**

Update the `Props` interface + destructure:

```ts
interface Props {
  images: string[];
  alt?: string;
  interval?: number;
  labels: { prev: string; next: string; goTo: string };
}

const {
  images,
  alt = "Project image",
  interval = 4500,
  labels,
} = Astro.props;
```

Replace the three hardcoded strings in the markup:
- `aria-label="Previous image"` → `aria-label={labels.prev}`
- `aria-label="Next image"` → `aria-label={labels.next}`
- `aria-label={`Go to image ${index + 1}`}` → `aria-label={`${labels.goTo} ${index + 1}`}`

`<script>` and `<style>` unchanged.

- [ ] **Step 2: `Projects.astro` frontmatter**

```astro
---
import ProjectGallery from "./ProjectGallery.astro";
import { useTranslations, type Lang } from "../i18n";

interface Props {
  lang: Lang;
}

const { lang } = Astro.props;
const t = useTranslations(lang);
const p = t.projects;
const galleryLabels = t.gallery;

// image sets keep their existing order: tfm, pokemon, covid
const galleries = [
  ["/images/tfm/1.png", "/images/tfm/2.png", "/images/tfm/3.png", "/images/tfm/4.png", "/images/tfm/5.png"],
  ["/images/pokemon/1.png", "/images/pokemon/2.png", "/images/pokemon/3.png", "/images/pokemon/4.png", "/images/pokemon/5.png"],
  ["/images/covid/1.png", "/images/covid/2.png", "/images/covid/3.png", "/images/covid/4.png"],
];

const githubUrls = [
  "https://github.com/Daalma7/FairTreesAlgorithms",
  "https://github.com/Daalma7/PokemonDataScience",
  "https://github.com/Daalma7/CNNsXraysCOVID",
];
---
```

- [ ] **Step 3: Header + disciplines**

```astro
<div class="projects-header">
  <p class="section-label">{p.number} — {p.label}</p>
  <div>
    <h2><Fragment set:html={p.heading} /></h2>
    <p class="projects-intro">{p.intro}</p>
  </div>
</div>

<div class="project-disciplines">
  <a href="#mathematics-projects" class="discipline-circle discipline-math">
    <span set:html={p.disciplines.math} />
  </a>
  <a href="#ai-projects" class="discipline-circle discipline-ai">
    <span set:html={p.disciplines.ai} />
  </a>
  <a href="#game-projects" class="discipline-circle discipline-games">
    <span set:html={p.disciplines.games} />
  </a>
</div>
```

- [ ] **Step 4: AI project group (items 0–2) — replace the three `project-large` articles**

Keep the existing per-article structure (number, `project-heading`, `project-description`, `project-tech` badge `<img>` list, `project-github` link, `ProjectGallery`). Replace **only** the text nodes and wire the gallery labels. For each of the three articles, index `i` in `0..2`:

- `.project-number` → `0${i + 1}` (i.e. `01`, `02`, `03`)
- `.project-category` → `{p.items[i].category}`
- `<h3>` → `<Fragment set:html={p.items[i].title} />`
- `<h4>` → `{p.items[i].subtitle}`
- description `<p>` → `{p.items[i].description}`
- Leave every `<img src="https://img.shields.io/...">` badge exactly as-is.
- `.project-github` `href` → `{githubUrls[i]}`; the label `<span>` → `{p.viewOnGithub}`; keep `↗`.
- `<ProjectGallery images={galleries[i]} alt={p.items[i].galleryAlt} interval={4500} labels={galleryLabels} />`

- [ ] **Step 5: Mathematics project group (item 3)**

```astro
<div id="mathematics-projects" class="project-group">
  <article class="project">
    <div class="project-number">04</div>
    <div class="project-main">
      <div class="project-content">
        <div class="project-info">
          <div class="project-heading">
            <p class="project-category">{p.items[3].category}</p>
            <h3><Fragment set:html={p.items[3].title} /></h3>
            <h4>{p.items[3].subtitle}</h4>
          </div>
          <div class="project-description">
            <p>{p.items[3].description}</p>
          </div>
          <a class="project-github" href="#teaching">
            <span>{p.exploreTeaching}</span>
            <span class="github-arrow">↗</span>
          </a>
        </div>
        <div class="project-gallery-wrapper">
          <div class="math-placeholder"><span>{p.mathPlaceholder}</span></div>
        </div>
      </div>
    </div>
  </article>
</div>
```

Note: the `href` changed from `https://github.com/Daalma7/PokemonDataScience` to `#teaching`, and `target`/`rel` are dropped (internal anchor).

- [ ] **Step 6: Games project group (item 4)**

```astro
<div id="game-projects" class="project-group">
  <article class="project project-game">
    <div class="project-number">05</div>
    <div class="project-main">
      <div class="project-content">
        <div class="project-info">
          <div class="project-heading">
            <p class="project-category">{p.items[4].category}</p>
            <h3><Fragment set:html={p.items[4].title} /></h3>
            <h4>{p.items[4].subtitle}</h4>
          </div>
          <div class="project-description">
            <p>{p.items[4].description}</p>
            <div class="project-tech">
              <img src="https://img.shields.io/badge/Godot-478CBF?style=flat-square&logo=godot-engine&logoColor=white" alt="Godot" loading="lazy" decoding="async" />
              <img src="https://img.shields.io/badge/Game_Design-171717?style=flat-square" alt="Game Design" loading="lazy" decoding="async" />
            </div>
          </div>
        </div>
        <div class="project-gallery-wrapper">
          <div class="game-placeholder">
            <span>{p.comingSoon.kicker}</span>
            <strong><Fragment set:html={p.comingSoon.title} /></strong>
            <small>{p.comingSoon.meta}</small>
          </div>
        </div>
      </div>
    </div>
  </article>
</div>
```

- [ ] **Step 7: Verify**

Run: `npx astro check` → Expected: `0 errors`.
Run: `npm run build` → Expected: succeeds.
Run: `git grep -n "PokemonDataScience" src/` → Expected: **one** hit only, in `src/components/Projects.astro` inside `githubUrls` (the pokemon repo link is legitimate); the project-04 `href` must be `#teaching`.
Run: `grep -o 'href="#teaching"' dist/index.html` → Expected: match.
Run: `grep -o "Turning .*ideas" dist/en/index.html` → Expected: match.
Run: `grep -o "View on GitHub" dist/en/index.html` → Expected: match.

- [ ] **Step 8: Commit**

```bash
git add src/components/Projects.astro src/components/ProjectGallery.astro
git commit -m "feat(i18n): localize projects, fix project-04 link to #teaching

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 8: Localize Teaching + Contact

**Files:**
- Modify: `src/components/Teaching.astro`
- Modify: `src/components/Contact.astro`

**Interfaces:**
- Consumes: `useTranslations(lang)` → `t`; `t.teaching.*`, `t.contact.*`.
- Produces: Teaching renders from `t.teaching.principles[]`; Contact numbered `05`, `id="contact"` fixed.

- [ ] **Step 1: `Teaching.astro` frontmatter**

```astro
---
import { useTranslations, type Lang } from "../i18n";

interface Props {
  lang: Lang;
}

const { lang } = Astro.props;
const t = useTranslations(lang);
const te = t.teaching;

// principle images stay tied to position
const principleImages = [
  "/images/teaching/preguntas.png",
  "/images/teaching/horizontes.webp",
  "/images/teaching/corazon.png",
];
---
```

- [ ] **Step 2: `Teaching.astro` markup**

```astro
<div class="teaching-header">
  <p class="section-label">{te.number} — {te.label}</p>
  <div class="teaching-header-content">
    <h2><Fragment set:html={te.heading} /></h2>
    <p class="teaching-intro">{te.intro}</p>
  </div>
</div>

<div class="teaching-principles">
  {te.principles.map((principle, i) => (
    <article class="teaching-principle">
      <div class="teaching-principle-number">{principle.number}</div>
      <div class="teaching-principle-content">
        <div class="teaching-principle-copy">
          <p class="teaching-principle-label">{principle.label}</p>
          <h3><Fragment set:html={principle.title} /></h3>
          {principle.paragraphs.map((para) => (
            <p class="teaching-principle-text">{para}</p>
          ))}
        </div>
        <div class="teaching-principle-image">
          <img src={principleImages[i]} alt="" loading="lazy" />
        </div>
      </div>
    </article>
  ))}
</div>

<div class="teaching-closing">
  <p class="teaching-closing-label">{te.closingLabel}</p>
  <p class="teaching-closing-text">{te.closingText}</p>
</div>
```

- [ ] **Step 3: `Contact.astro` — full rewrite of the component body**

```astro
---
import { useTranslations, type Lang } from "../i18n";

interface Props {
  lang: Lang;
}

const { lang } = Astro.props;
const t = useTranslations(lang);
const c = t.contact;
---

<section id="contact" class="contact">
  <p class="section-label">{c.number} — {c.label}</p>

  <div class="contact-content">
    <h2><Fragment set:html={c.heading} /></h2>
    <p>{c.body}</p>
    <a href={`mailto:${c.email}`} class="contact-link">
      {c.cta}
      <span>↗</span>
    </a>
  </div>
</section>
```

Note: `id = "contact"` (with spaces) is corrected to `id="contact"`.

- [ ] **Step 4: Verify**

Run: `npx astro check` → Expected: `0 errors`.
Run: `npm run build` → Expected: succeeds.
Run: `grep -o '05 — CONTACTO' dist/index.html` → Expected: match.
Run: `grep -o '04 — DOCENCIA' dist/index.html` → Expected: match.
Run: `grep -o 'id="contact"' dist/index.html` → Expected: match.
Run: `grep -o "To awaken curiosity" dist/en/index.html` → Expected: match.

- [ ] **Step 5: Manual check — dev server, both languages**

```bash
npx astro dev --background
```

Open `http://localhost:4321/` and `http://localhost:4321/en/`. Confirm:
- Every section shows the right language.
- Language switcher (navbar + footer) moves between `/` and `/en/` and back.
- All anchor links (`#about` … `#contact`) scroll correctly on both routes.
- No errors in the browser console.

```bash
npx astro dev stop
```

- [ ] **Step 6: Commit**

```bash
git add src/components/Teaching.astro src/components/Contact.astro
git commit -m "feat(i18n): localize teaching and contact, renumber sections, fix contact id

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

**i18n is now functionally complete.** Tasks 9–15 are the style-system pass.

---

## Task 9: Design tokens + reset + utility classes (additive)

**Files:**
- Modify: `src/styles/global.css`

**Interfaces:**
- Produces (CSS custom properties on `:root`, consumed by every later task):
  - Layout: `--gutter`, `--content-max`, `--col-label`, `--col-gap`
  - Space scale: `--space-2xs` … `--space-3xl`, `--section-pad-y`
  - Type: `--text-eyebrow`, `--tracking-eyebrow`, `--text-body`, `--lead`, `--display-xl`, `--display-l`, `--display-m`, `--display-s`, `--tracking-tight`, `--leading-tight`
  - Utility classes: `.section`, `.section-grid`, `.eyebrow`, `.section-label`, `.display-l`, `.display-m`, `.display-s`, `.lead`, `.link-underline`
- NOTE: This task is **purely additive** — no existing rule is removed. Existing section CSS still wins by specificity/order where it overlaps. The site looks the same after this task.

- [ ] **Step 1: Add the token block at the top of `global.css`**

Immediately after the `@import url('https://fonts.googleapis.com/...')` line, replace the current `:root { ... }` with:

```css
:root {
  /* palette (unchanged) */
  --background: #f4f2ed;
  --foreground: #171717;
  --muted: #77736b;
  --accent: #c45a3c;
  --line: rgba(23, 23, 23, 0.15);

  /* horizontal layout */
  --gutter: clamp(1.5rem, 8vw, 8rem);
  --content-max: 1200px;
  --col-label: 25%;
  --col-gap: clamp(2rem, 4vw, 2.5rem);

  /* vertical rhythm */
  --space-2xs: 0.5rem;
  --space-xs: 0.75rem;
  --space-sm: 1rem;
  --space-md: 1.5rem;
  --space-lg: 2rem;
  --space-xl: 3rem;
  --space-2xl: 4.5rem;
  --space-3xl: 7rem;
  --section-pad-y: clamp(6rem, 15vh, 12rem);

  /* typography */
  --text-eyebrow: 0.7rem;
  --tracking-eyebrow: 0.2em;
  --text-body: 1rem;
  --lead: clamp(1.05rem, 1.6vw, 1.2rem);
  --display-xl: clamp(4rem, 13vw, 11rem);
  --display-l: clamp(2.75rem, 7vw, 6rem);
  --display-m: clamp(2.25rem, 4.5vw, 4rem);
  --display-s: clamp(1.5rem, 2vw, 2rem);
  --tracking-tight: -0.045em;
  --leading-tight: 0.95;
}
```

- [ ] **Step 2: Extend the reset/base block**

After the existing `a { ... }` rule, add:

```css
img {
  max-width: 100%;
}

:focus-visible {
  outline: 2px solid var(--foreground);
  outline-offset: 3px;
}

@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }

  *,
  *::before,
  *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
  }
}
```

- [ ] **Step 3: Add the utility classes**

At the end of `global.css`, add a clearly delimited block:

```css
/* ─────────────────────────────
   UTILITIES (design system)
───────────────────────────── */

.section {
  padding: var(--section-pad-y) var(--gutter);
  border-top: 1px solid var(--line);
}

.section-grid {
  display: grid;
  grid-template-columns: var(--col-label) 1fr;
  gap: var(--col-gap);
}

.eyebrow,
.section-label {
  margin: 0;
  font-size: var(--text-eyebrow);
  letter-spacing: var(--tracking-eyebrow);
  text-transform: uppercase;
  color: var(--muted);
}

.display-l {
  margin: 0;
  font-size: var(--display-l);
  line-height: var(--leading-tight);
  letter-spacing: var(--tracking-tight);
  font-weight: 500;
}

.display-m {
  margin: 0;
  font-size: var(--display-m);
  line-height: 0.95;
  letter-spacing: var(--tracking-tight);
  font-weight: 500;
}

.display-s {
  margin: 0;
  font-size: var(--display-s);
  line-height: 1.1;
  letter-spacing: -0.025em;
  font-weight: 500;
}

.display-l em,
.display-m em,
.display-s em {
  font-family: "Playfair Display", serif;
  font-weight: 500;
}

.lead {
  max-width: 46ch;
  margin: var(--space-xl) 0 0;
  font-size: var(--lead);
  line-height: 1.75;
  color: var(--muted);
}

.link-underline {
  position: relative;
}

.link-underline::after {
  content: "";
  position: absolute;
  left: 0;
  bottom: -5px;
  width: 100%;
  height: 1px;
  background: currentColor;
  transform: scaleX(0);
  transform-origin: right;
  transition: transform 0.3s ease;
}

.link-underline:hover::after {
  transform: scaleX(1);
  transform-origin: left;
}

@media (max-width: 800px) {
  .section-grid {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 4: Verify no visual regression**

Run: `npx astro check` → Expected: `0 errors`.
Run: `npm run build` → Expected: succeeds.

```bash
npx astro dev --background
```
Open `http://localhost:4321/`. The page must look **unchanged** from before this task (tokens are defined but existing section CSS still applies). Note any obvious shift; if the eyebrow/label sizes changed because a `.section-label` rule now matches — that's expected and acceptable (it's the unification), confirm it still reads well.
```bash
npx astro dev stop
```

- [ ] **Step 5: Commit**

```bash
git add src/styles/global.css
git commit -m "feat(style): add design tokens, base reset, and utility classes

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 10: Migrate Hero + About styles; fix navbar overlap + about whitespace

**Files:**
- Modify: `src/components/SiteBody.astro` (add a `<style>` block)
- Modify: `src/styles/global.css` (remove the migrated Hero + About rules)

**Interfaces:**
- Consumes: tokens/utilities from Task 9.
- Produces: Hero + About styling lives in `SiteBody.astro`. `.hero` no longer collides with the fixed navbar; `.about` no longer forces `100vh`.

- [ ] **Step 1: Add a scoped `<style>` to `SiteBody.astro`**

Append (Astro scopes it to this component's markup):

```astro
<style>
  main {
    /* clearance so the fixed navbar never overlaps hero content */
    padding-top: 0;
  }

  .hero {
    min-height: 100svh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: clamp(7rem, 14vh, 10rem) var(--gutter) var(--space-3xl);
    position: relative;
    overflow: hidden;
    isolation: isolate;
  }

  .hero-content {
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: var(--content-max);
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .eyebrow {
    margin: 0 0 var(--space-lg);
    color: var(--muted);
    animation: fadeUp 1s ease both;
  }

  .hero h1 {
    margin: 0;
    font-size: var(--display-xl);
    line-height: 0.82;
    letter-spacing: -0.06em;
    font-weight: 500;
    animation: fadeUp 1s 0.15s ease both;
  }

  .intro {
    max-width: 30ch;
    margin-top: var(--space-xl);
    font-size: var(--lead);
    line-height: 1.5;
    color: var(--muted);
    animation: fadeUp 1s 0.3s ease both;
  }

  .scroll-indicator {
    position: absolute;
    left: 50%;
    bottom: var(--space-lg);
    transform: translateX(-50%);
    z-index: 2;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2xs);
    width: max-content;
    font-size: 0.6rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--muted);
    transition: color 0.3s ease;
  }

  .scroll-indicator::before {
    content: "";
    width: 1px;
    height: 20px;
    background: var(--muted);
    opacity: 0.45;
  }

  .scroll-indicator .arrow {
    font-size: 1rem;
  }

  .scroll-indicator:hover {
    color: var(--foreground);
  }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(30px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* ABOUT */
  .about {
    padding: var(--section-pad-y) var(--gutter);
    border-top: 1px solid var(--line);
    display: grid;
    grid-template-columns: var(--col-label) 1fr;
    gap: var(--col-gap);
  }

  .about-content {
    max-width: var(--content-max);
  }

  .about h2 {
    margin: 0;
    max-width: 18ch;
    font-size: var(--display-l);
    line-height: 1;
    letter-spacing: -0.04em;
    font-weight: 500;
  }

  .about h2 em {
    font-family: "Playfair Display", serif;
    font-weight: 500;
  }

  .about-lower {
    margin-top: var(--space-3xl);
    display: grid;
    grid-template-columns: minmax(0, 1fr) 280px;
    gap: clamp(3rem, 8vw, 7rem);
    align-items: start;
  }

  .about-text {
    max-width: 60ch;
  }

  .about-text p {
    margin: 0 0 var(--space-md);
    font-size: 1.05rem;
    line-height: 1.8;
    color: var(--muted);
  }

  .about-text p:last-child {
    margin-bottom: 0;
  }

  .about-closing {
    margin-top: var(--space-xl) !important;
    color: var(--foreground) !important;
    font-size: 1.15rem !important;
  }

  .about-closing em {
    font-family: "Playfair Display", serif;
    font-size: 1.3em;
    font-weight: 500;
  }

  .about-photo {
    margin: 0;
    width: 280px;
  }

  .about-photo-frame {
    position: relative;
    width: 100%;
    aspect-ratio: 4 / 5;
    overflow: hidden;
    background: #dedbd4;
  }

  .about-photo-frame::after {
    content: "";
    position: absolute;
    inset: 0;
    border: 1px solid rgba(23, 23, 23, 0.12);
    pointer-events: none;
  }

  .about-photo img {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: cover;
    filter: grayscale(35%) contrast(1.05) sepia(8%);
    transform: scale(1.01);
    transition: filter 0.6s ease, transform 0.8s cubic-bezier(0.2, 0.65, 0.3, 1);
  }

  .about-photo figcaption {
    margin-top: var(--space-xs);
    text-align: center;
    font-size: 0.6rem;
    letter-spacing: 0.16em;
    color: var(--muted);
    text-transform: uppercase;
  }

  @media (max-width: 800px) {
    .about {
      grid-template-columns: 1fr;
    }

    .about-lower {
      grid-template-columns: 1fr;
      margin-top: var(--space-2xl);
    }

    .about-photo {
      width: min(240px, 65vw);
      margin: 0 auto;
    }

    .about-photo img {
      filter: grayscale(90%) contrast(1.05) sepia(8%);
    }
  }
</style>
```

Key differences from the old rules: `.hero` uses a top `padding` for navbar clearance instead of the old `padding: 60px 8vw` + `.hero-content { padding-bottom: 100px }`; `.about` drops `min-height: 100vh` (this removes the large empty gap); `.about-lower` margin reduced from `10vh` to `--space-3xl`; the photo `float: right` is gone (it now sits in its grid column).

- [ ] **Step 2: Remove the migrated rules from `global.css`**

Delete these now-duplicated blocks from `global.css` (they live in the component now):
- the `HERO` section: `.hero`, `.hero-content`, `.hero h1`, `.eyebrow`, `h1` (the bare `h1` rule — **move its non-hero concerns nowhere; it was hero-only**), `.intro`, `.scroll-indicator` and its `::before` / `span` / `:hover`
- the `ABOUT` + `ABOUT LOWER` + `ABOUT PHOTO` + `RESPONSIVE` (the `@media (max-width: 800px)` that only contains `.about*`) + the `.about` rules inside `@media (max-width: 700px)`
- the `@keyframes fadeUp` (moved into the component)

Leave `[id] { scroll-margin-top: 100px }`, `html`, `body`, `a`, and the new token/utility/reset blocks intact.

- [ ] **Step 3: Verify**

Run: `npx astro check` → Expected: `0 errors`.
Run: `npm run build` → Expected: succeeds.

```bash
npx astro dev --background
```
Open `http://localhost:4321/`:
- The hero eyebrow `MATEMÁTICAS · IA · DATA SCIENCE` sits **below** the navbar with clear space — no overlap.
- `h1` fits on screen at 1280px and at 375px (no horizontal scroll).
- Scrolling from hero into "Sobre mí" — no giant empty band before the heading.
- Photo sits to the right of the about text on desktop, centred below it under 800px.
Check the same at 375 px (devtools).
```bash
npx astro dev stop
```

- [ ] **Step 4: Commit**

```bash
git add src/components/SiteBody.astro src/styles/global.css
git commit -m "refactor(style): move hero/about CSS into SiteBody, fix navbar overlap and about whitespace

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 11: Migrate Navbar + Footer styles; add mobile menu

**Files:**
- Modify: `src/components/Navbar.astro` (`<style>` + `<script>` + a hamburger button in markup)
- Modify: `src/components/Footer.astro` (`<style>`)
- Modify: `src/styles/global.css` (remove `.footer*` rules — Navbar CSS is already component-scoped)

**Interfaces:**
- Consumes: tokens/utilities from Task 9.
- Produces: Navbar has a working `<=800px` hamburger menu (`aria-expanded`, Esc + click-out close). Footer CSS is component-scoped.

- [ ] **Step 1: Add the hamburger button to Navbar markup**

Between `.navbar-links` and `.navbar-language`, add:

```astro
<button
  class="navbar-toggle"
  type="button"
  aria-expanded="false"
  aria-controls="navbar-links"
  aria-label={t.nav.menuOpen}
  data-open-label={t.nav.menuOpen}
  data-close-label={t.nav.menuClose}
>
  <span class="navbar-toggle-bar"></span>
  <span class="navbar-toggle-bar"></span>
</button>
```

Give the links container the id: `<div class="navbar-links" id="navbar-links">`.

- [ ] **Step 2: Extend the Navbar `<script>`**

Append to the existing `<script>` (after `updateNavbar()`):

```js
const toggle = document.querySelector(".navbar-toggle");
const links = document.getElementById("navbar-links");

function setMenu(open) {
  navbar?.classList.toggle("menu-open", open);
  toggle?.setAttribute("aria-expanded", String(open));
  if (toggle) {
    toggle.setAttribute(
      "aria-label",
      open ? toggle.dataset.closeLabel : toggle.dataset.openLabel,
    );
  }
}

toggle?.addEventListener("click", () => {
  setMenu(!navbar?.classList.contains("menu-open"));
});

links?.addEventListener("click", (e) => {
  if (e.target instanceof HTMLAnchorElement) setMenu(false);
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") setMenu(false);
});

document.addEventListener("click", (e) => {
  if (
    navbar?.classList.contains("menu-open") &&
    e.target instanceof Node &&
    !navbar.contains(e.target)
  ) {
    setMenu(false);
  }
});
```

- [ ] **Step 3: Replace the Navbar `<style>` block**

```astro
<style>
  .navbar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 100;
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    padding: var(--space-md) var(--gutter);
    background: transparent;
    transition:
      transform 0.5s cubic-bezier(0.22, 1, 0.36, 1),
      background 0.4s ease,
      backdrop-filter 0.4s ease;
  }

  .navbar.scrolled {
    background: rgba(244, 242, 237, 0.75);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(23, 23, 23, 0.08);
  }

  .navbar.hidden {
    transform: translateY(-100%);
  }

  .navbar-logo {
    justify-self: start;
    font-size: 0.7rem;
    letter-spacing: 0.12em;
    font-weight: 600;
  }

  .navbar-links {
    display: flex;
    gap: var(--space-lg);
    align-items: center;
  }

  .navbar-links a,
  .navbar-language a {
    font-size: 0.65rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    position: relative;
  }

  .navbar-links a::after,
  .navbar-language a::after {
    content: "";
    position: absolute;
    left: 0;
    bottom: -5px;
    width: 100%;
    height: 1px;
    background: var(--foreground);
    transform: scaleX(0);
    transform-origin: right;
    transition: transform 0.3s ease;
  }

  .navbar-links a:hover::after,
  .navbar-language a:hover::after {
    transform: scaleX(1);
    transform-origin: left;
  }

  .navbar-language {
    justify-self: end;
    display: flex;
    gap: 6px;
    align-items: center;
  }

  .navbar-language span {
    font-size: 0.65rem;
    color: var(--muted);
  }

  .navbar-language-link.is-current {
    font-weight: 600;
    color: var(--foreground);
  }

  .navbar-toggle {
    display: none;
    justify-self: end;
    width: 40px;
    height: 40px;
    padding: 0;
    border: 0;
    background: transparent;
    cursor: pointer;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 5px;
  }

  .navbar-toggle-bar {
    display: block;
    width: 20px;
    height: 1px;
    background: var(--foreground);
    transition: transform 0.3s ease, opacity 0.3s ease;
  }

  .navbar.menu-open .navbar-toggle-bar:first-child {
    transform: translateY(3px) rotate(45deg);
  }

  .navbar.menu-open .navbar-toggle-bar:last-child {
    transform: translateY(-3px) rotate(-45deg);
  }

  @media (max-width: 800px) {
    .navbar {
      grid-template-columns: 1fr auto;
      padding: var(--space-sm) var(--gutter);
    }

    .navbar-toggle {
      display: flex;
    }

    .navbar-links {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      flex-direction: column;
      align-items: flex-start;
      gap: var(--space-md);
      padding: var(--space-lg) var(--gutter);
      background: rgba(244, 242, 237, 0.96);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(23, 23, 23, 0.08);
      transform: translateY(-8px);
      opacity: 0;
      pointer-events: none;
      transition: transform 0.3s ease, opacity 0.3s ease;
    }

    .navbar.menu-open .navbar-links {
      transform: translateY(0);
      opacity: 1;
      pointer-events: auto;
    }

    .navbar-language {
      grid-column: 1 / -1;
      justify-self: start;
      margin-top: var(--space-2xs);
    }
  }
</style>
```

Note: the language switch stays visible on mobile (small, top-left under the logo); only the section links collapse into the menu.

- [ ] **Step 4: Move Footer CSS into `Footer.astro`**

Add a `<style>` block to `Footer.astro` with the `.footer*` rules retokenized, and add a `.footer-language` rule:

```astro
<style>
  .footer {
    padding: var(--space-2xl) var(--gutter);
    background: var(--foreground);
    color: var(--background);
  }

  .footer-top,
  .footer-bottom {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-lg);
  }

  .footer-top {
    padding-bottom: var(--space-lg);
    border-bottom: 1px solid rgba(244, 242, 237, 0.15);
    font-size: 0.65rem;
    letter-spacing: 0.15em;
  }

  .footer-bottom {
    padding-top: var(--space-md);
    font-size: 0.65rem;
    color: rgba(244, 242, 237, 0.5);
  }

  .footer-links {
    display: flex;
    gap: var(--space-md);
  }

  .footer-links a {
    width: 17px;
    height: 17px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.3s ease;
  }

  .footer-links a svg {
    width: 100%;
    height: 100%;
    display: block;
  }

  .footer-links a:hover {
    color: var(--background);
  }

  .footer-language {
    display: flex;
    gap: 6px;
    align-items: center;
  }

  .footer-language a[aria-current="true"] {
    color: var(--background);
    font-weight: 600;
  }

  @media (max-width: 700px) {
    .footer-top,
    .footer-bottom {
      flex-direction: column;
      align-items: flex-start;
    }
  }
</style>
```

- [ ] **Step 5: Remove `.footer*` rules from `global.css`**

Delete the entire `FOOTER` section from `global.css` (from the `/* ... FOOTER ... */` banner to the end of its `@media (max-width: 700px)` block). The Navbar had no rules in `global.css` (already scoped) — nothing to remove there.

- [ ] **Step 6: Verify**

Run: `npx astro check` → Expected: `0 errors`.
Run: `npm run build` → Expected: succeeds.

```bash
npx astro dev --background
```
- Desktop 1280px: navbar unchanged in look; hamburger hidden.
- 375px: section links hidden, hamburger shown. Tap it → menu slides down, `aria-expanded="true"`. Tap a link → menu closes and page scrolls. Open again, press `Esc` → closes. Open again, tap outside → closes.
- Footer: `ES / EN` are links; the current one is bold/light. Switch works.
```bash
npx astro dev stop
```

- [ ] **Step 7: Commit**

```bash
git add src/components/Navbar.astro src/components/Footer.astro src/styles/global.css
git commit -m "refactor(style): scope navbar/footer CSS, add mobile nav menu

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 12: Migrate Timeline styles

**Files:**
- Modify: `src/components/Timeline.astro` (add `<style>`)
- Modify: `src/styles/global.css` (remove `EXPERIENCE` + `TIMELINE` rules)

**Interfaces:**
- Consumes: tokens/utilities from Task 9.
- Produces: all `.timeline*` CSS is component-scoped and tokenized.

- [ ] **Step 1: Add `<style>` to `Timeline.astro`**

Move the current `global.css` blocks `EXPERIENCE`, `EXPERIENCE HEADER`, `TIMELINE`, `VERTICAL LINE`, `ITEM`, `YEAR`, `MARKER`, `DOT`, `CONTENT`, `TYPE`, `TITLE`, `DESCRIPTION`, `ACTIVE ITEM`, `CURRENT ITEM`, and the timeline `@media (max-width: 700px)` into a scoped `<style>`, with these token substitutions:

- `.timeline-section` → `padding: var(--section-pad-y) var(--gutter); border-top: 1px solid var(--line);`
- `.timeline-header` → `display: grid; grid-template-columns: var(--col-label) 1fr; gap: var(--col-gap); margin-bottom: var(--space-3xl);`
- `.timeline-header h2` → `font-size: var(--display-l); line-height: 1; letter-spacing: -0.04em; font-weight: 500; margin: 0 0 var(--space-md);` + keep `em { font-family: "Playfair Display", serif; font-weight: 500 }`
- `.timeline-header-content > p` → `font-size: 1.05rem; line-height: 1.8; color: var(--muted); max-width: 55ch; margin: 0;`
- `.timeline-content h3` → `font-size: var(--display-s); line-height: 1.1; letter-spacing: -0.025em; font-weight: 500; margin: 0 0 var(--space-sm);`
- Replace the `left: calc(25% + 40px)` magic in `.timeline-line`, `.timeline-marker`, `.timeline-item` grid column with `calc(var(--col-label) + var(--col-gap))` — **note**: `--col-gap` is a `clamp()`, which is valid inside `calc()`. Verify the line still aligns to the content column start after the change.
- All `2rem` / `4rem` / `5rem` / `25px` paddings → nearest `--space-*`.
- Keep every `transition`, `transform`, `opacity`, `@keyframes`-free animation hook and the `.is-visible` rules exactly as-is (the `<script>` depends on `.is-visible`).

- [ ] **Step 2: Remove those blocks from `global.css`**

Delete everything from the `/* ... EXPERIENCE ... */` banner through the end of the timeline `@media (max-width: 700px)` block.

- [ ] **Step 3: Verify**

Run: `npx astro check` → Expected: `0 errors`.
Run: `npm run build` → Expected: succeeds.

```bash
npx astro dev --background
```
Open `http://localhost:4321/#experience`:
- The vertical line starts exactly at the left edge of the content column (aligned with the heading text, not floating mid-gap).
- Year labels sit in the left column, right-aligned.
- Scrolling reveals each item (dots pop, content fades up).
- At 375px: single-column layout, line at the far left, items readable.
```bash
npx astro dev stop
```

- [ ] **Step 4: Commit**

```bash
git add src/components/Timeline.astro src/styles/global.css
git commit -m "refactor(style): scope and tokenize timeline CSS

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 13: Migrate Projects + ProjectGallery styles; normalize badge row

**Files:**
- Modify: `src/components/Projects.astro` (add `<style>`)
- Modify: `src/components/ProjectGallery.astro` (retokenize its existing `<style>`)
- Modify: `src/styles/global.css` (remove `PROJECTS` … `GAME` + project `@media` blocks)

**Interfaces:**
- Consumes: tokens/utilities from Task 9.
- Produces: all `.projects*` / `.project*` / `.discipline*` / `.math-placeholder` / `.game-placeholder` CSS is component-scoped; `.project-tech img` has a fixed height and aligned baseline.

- [ ] **Step 1: Add `<style>` to `Projects.astro`**

Move the `global.css` blocks `PROJECTS`, `PROJECT DISCIPLINES`, `DISCIPLINES — VENN`, `CIRCLES`, `COLOURS`, `TEXT`, `HOVER`, `PROJECT ANCHORS`, the disciplines `@media (max-width: 700px)`, `PROJECT LIST`, `PROJECT CONTENT`, `PROJECT INFO`, `PROJECT TITLE`, `DESCRIPTION`, `TECHNOLOGY BADGES`, `GITHUB`, `GALLERY`, `MATHEMATICS PLACEHOLDER`, `GAME`, `IMAGE HOVER`, and both project `@media` blocks into a scoped `<style>`, with:

- `.projects` → `padding: var(--section-pad-y) var(--gutter); border-top: 1px solid var(--line);`
- `.projects-header` → `display: grid; grid-template-columns: var(--col-label) 1fr; gap: var(--col-gap);`
- `.projects-header h2` → `font-size: var(--display-l); line-height: 0.95; letter-spacing: -0.05em; font-weight: 500; margin: 0;` + `em { font-family: "Playfair Display", serif; }`
- `.projects-intro` → `max-width: 52ch; margin-top: var(--space-xl); font-size: 1.1rem; line-height: 1.8; color: var(--muted);`
- `.project-info h3` → `font-size: var(--display-m); line-height: 0.9; letter-spacing: -0.05em; font-weight: 500; margin: 0;` + `em` Playfair rule
- **Badge row** `.project-tech` → `display: flex; flex-wrap: wrap; gap: var(--space-2xs); align-items: center; margin-top: var(--space-lg);`
- **Badge image** `.project-tech img` → `height: 20px; width: auto; display: block; border-radius: 3px;` (fixed height gives the row one baseline)
- `.project-github` → keep the pattern but swap the hand-rolled underline for reuse of `.link-underline` **is optional**; simplest is to keep its current border-bottom rule, just retokenize `margin-top: var(--space-lg); font-size: 0.7rem;`
- magic numbers (`80px`, `35px`, `28px`, `30px`, `25px`) → nearest `--space-*`
- `min-height: 500px` on `.project-info` → keep (it balances the gallery height) but note it in a comment
- Keep the `.discipline-*` Venn positioning numbers as-is (they're a bespoke diagram, not layout rhythm) — only retokenize the `transition` durations if trivial; otherwise leave verbatim.

- [ ] **Step 2: Retokenize `ProjectGallery.astro` `<style>`**

Only these substitutions (leave structure/animation intact):
- `padding: 35px` on `.gallery-slide` → `padding: var(--space-xl)` (and the `700px` media `20px` → `var(--space-lg)`)
- hard-coded `rgba(244, 242, 237, ...)` backgrounds → keep (they're deliberate frosted-glass values)
- `.project-gallery { background: var(--background) }` → unchanged.

- [ ] **Step 3: Remove the migrated blocks from `global.css`**

Delete from the `/* ... PROJECTS ... */` banner through the end of the second project `@media (max-width: 700px)` block.

- [ ] **Step 4: Verify**

Run: `npx astro check` → Expected: `0 errors`.
Run: `npm run build` → Expected: succeeds.

```bash
npx astro dev --background
```
Open `http://localhost:4321/#work`:
- Header + intro aligned to the same label grid as other sections.
- The three Venn discipline circles overlap as before; hover dims the others.
- Project cards: text left, gallery right on desktop; stacked under 900px.
- **Tech badge rows**: all badges the same height, sitting on one line, wrapping cleanly — no ragged vertical offsets.
- Project 04 "Explora docencia" link scrolls to the Teaching section.
- Gallery autoplay + arrows + dots still work.
```bash
npx astro dev stop
```

- [ ] **Step 5: Commit**

```bash
git add src/components/Projects.astro src/components/ProjectGallery.astro src/styles/global.css
git commit -m "refactor(style): scope project CSS, normalize tech badge row

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 14: Migrate Teaching + Contact styles

**Files:**
- Modify: `src/components/Teaching.astro` (add `<style>`)
- Modify: `src/components/Contact.astro` (add `<style>`)
- Modify: `src/styles/global.css` (remove `TEACHING` + `CONTACT` blocks; also remove the now-dead `BLOG` block)

**Interfaces:**
- Consumes: tokens/utilities from Task 9.
- Produces: `.teaching*` and `.contact*` CSS component-scoped and tokenized; `BLOG` CSS removed (component is not rendered).

- [ ] **Step 1: Add `<style>` to `Teaching.astro`**

Move `global.css` blocks `TEACHING`, `HEADER`, `PRINCIPLES`, `PRINCIPLE CONTENT`, `COPY`, `TEXT`, `IMAGE`, `CLOSING`, and both teaching `@media` blocks into a scoped `<style>`, with:

- `.teaching` → `padding: var(--section-pad-y) var(--gutter); border-top: 1px solid var(--line);`
- `.teaching-header` → `display: grid; grid-template-columns: var(--col-label) 1fr; gap: var(--col-gap);`
- `.teaching-header h2` → `font-size: var(--display-l); line-height: 0.95; letter-spacing: -0.05em; font-weight: 500; margin: 0;` + `em` Playfair
- `.teaching-intro` → `max-width: 58ch; margin: var(--space-xl) 0 0; font-size: 1.05rem; line-height: 1.8; color: var(--muted);`
- `.teaching-principle-copy h3` → `font-size: var(--display-m); line-height: 0.95; letter-spacing: -0.05em; font-weight: 500; margin: 0;` + `em` Playfair
- `.teaching-principle-text` → `max-width: 52ch; margin: var(--space-lg) 0 0; font-size: 0.96rem; line-height: 1.75; color: var(--muted);`
- `.teaching-closing` → `margin: var(--space-3xl) 0 0; margin-left: var(--col-label); max-width: 60ch;` (keep the deliberate left indent, but source it from the token)
- `.teaching-closing-text` → `font-size: var(--display-m); line-height: 1.05; letter-spacing: -0.04em; font-weight: 500; margin: 0;` + `em` Playfair
- magic paddings (`65px`, `28px`, `22px`) → nearest `--space-*`
- Keep the `-webkit-mask-image` / `mask-image` radial-gradient on `.teaching-principle-image` and its `::after` gradient **verbatim** (bespoke image vignette).

- [ ] **Step 2: Add `<style>` to `Contact.astro`**

```astro
<style>
  .contact {
    padding: var(--section-pad-y) var(--gutter);
    background: var(--foreground);
    color: var(--background);
  }

  .contact-content {
    max-width: var(--content-max);
    margin-left: var(--col-label);
  }

  .contact h2 {
    margin: 0;
    font-size: clamp(4rem, 10vw, 10rem);
    line-height: 0.85;
    letter-spacing: -0.06em;
    font-weight: 400;
  }

  .contact h2 em {
    font-family: "Playfair Display", serif;
  }

  .contact-content > p {
    max-width: 44ch;
    margin-top: var(--space-2xl);
    color: rgba(244, 242, 237, 0.6);
    line-height: 1.7;
  }

  .contact-link {
    display: inline-flex;
    align-items: center;
    gap: var(--space-md);
    margin-top: var(--space-2xl);
    padding-bottom: var(--space-2xs);
    border-bottom: 1px solid rgba(244, 242, 237, 0.5);
    font-size: 1rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
  }

  .contact-link span {
    font-size: 1.5rem;
    transition: transform 0.4s ease;
  }

  .contact-link:hover span {
    transform: translate(7px, -7px);
  }

  @media (max-width: 700px) {
    .contact-content {
      margin-left: 0;
    }
  }
</style>
```

- [ ] **Step 3: Trim `global.css`**

Delete the `TEACHING` … `CLOSING` blocks + teaching `@media` blocks, the `CONTACT` block + its `@media`, and the entire `BLOG` block (the `BlogPreview` component is commented out in `SiteBody`, so its CSS is dead weight).

- [ ] **Step 4: Verify**

Run: `npx astro check` → Expected: `0 errors`.
Run: `npm run build` → Expected: succeeds.

```bash
npx astro dev --background
```
Open `http://localhost:4321/#teaching` and scroll to Contact:
- Teaching header aligned to the label grid; three principles alternate copy/image; images keep the soft vignette.
- Closing line indented to the content column.
- Contact: dark section, big heading, "Contacta"/"Get in touch" link with the arrow nudging on hover.
- 375px: everything single-column, contact indent removed.
```bash
npx astro dev stop
```

- [ ] **Step 5: Commit**

```bash
git add src/components/Teaching.astro src/components/Contact.astro src/styles/global.css
git commit -m "refactor(style): scope teaching/contact CSS, drop dead blog styles

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 15: `global.css` final cleanup

**Files:**
- Modify: `src/styles/global.css`

**Interfaces:**
- Consumes: nothing new.
- Produces: `global.css` contains **only** `@import`, `:root` tokens, reset/base, and the utilities block. No section-specific selectors remain.

- [ ] **Step 1: Audit what's left**

Run: `grep -nE '^\.[a-z]' src/styles/global.css`
Expected remaining top-level selectors: only `.section`, `.section-grid`, `.eyebrow`, `.section-label`, `.display-l`, `.display-m`, `.display-s`, `.lead`, `.link-underline`.
If any `.hero* / .about* / .timeline* / .project* / .discipline* / .teaching* / .contact* / .blog* / .footer* / .navbar*` selector is still present, it was missed in Tasks 10–14 — move it to the right component now and delete it here.

- [ ] **Step 2: Remove leftover cruft**

- Delete the standalone `h1 { ... }` rule if still present (hero-only; now in `SiteBody`).
- Delete any empty `@media` blocks left behind.
- Collapse runs of 3+ blank lines to 1.
- Ensure the file ends with a single newline.

- [ ] **Step 3: Verify size + content**

Run: `wc -l src/styles/global.css`
Expected: well under 200 lines (tokens + reset + utilities only).

Run: `grep -cE 'about-photo' src/styles/global.css`
Expected: `0` (the old duplicated block is gone).

Run: `npx astro check` → Expected: `0 errors`.
Run: `npm run build` → Expected: succeeds.

- [ ] **Step 4: Full visual regression pass**

```bash
npx astro dev --background
```
At widths **375, 768, 1280 px**, scroll the entire page on both `/` and `/en/`. Compare against the pre-refactor site (git stash / previous deploy / screenshots). Confirm:
- No section lost its styling.
- No horizontal scrollbar at any width.
- Section rhythm looks consistent (equal breathing room between sections).
- All five section labels use the same size/tracking.
```bash
npx astro dev stop
```

- [ ] **Step 5: Commit**

```bash
git add src/styles/global.css
git commit -m "refactor(style): reduce global.css to tokens, reset and utilities

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 16: Final verification pass

**Files:** none (verification only; fixes go back to the relevant task's files if something fails).

- [ ] **Step 1: Clean build + type check**

```bash
rm -rf dist
npx astro check
npm run build
```
Expected: `astro check` → `0 errors`; build → succeeds; `dist/index.html` and `dist/en/index.html` present.

- [ ] **Step 2: Automated grep assertions**

```bash
node --test src/i18n/routing.test.ts
git grep -nE "recivir|constuyo" src/            # expect: no output
grep -o '<html lang="es"' dist/index.html       # expect: match
grep -o '<html lang="en"' dist/en/index.html    # expect: match
grep -c 'hreflang' dist/index.html              # expect: 3
grep -o '01 — SOBRE MÍ' dist/index.html         # expect: match
grep -o '05 — CONTACTO' dist/index.html         # expect: match
grep -o '01 — ABOUT' dist/en/index.html         # expect: match
grep -o '05 — CONTACT' dist/en/index.html       # expect: match
test -f src/components/Hero.astro && echo "STILL THERE" || echo "deleted ok"
test -f src/pages/about.astro && echo "STILL THERE" || echo "deleted ok"
```
Expected: as annotated; both `test -f` lines print `deleted ok`.

- [ ] **Step 3: Manual checklist (dev server, both routes)**

```bash
npx astro dev --background
```
On `http://localhost:4321/` and `http://localhost:4321/en/`, verify:
- [ ] Every section's copy is in the correct language.
- [ ] Navbar language switch: `/` → `/en/` → `/` works; active locale is visually marked in navbar and footer.
- [ ] All anchor links (`#about`, `#experience`, `#work`, `#teaching`, `#contact`) scroll to the right section on both routes.
- [ ] Mobile (375px): hamburger opens/closes the menu via button, `Esc`, outside-click, and link-click.
- [ ] Hero eyebrow does not overlap the navbar.
- [ ] No large empty gap between hero and "Sobre mí" / "About".
- [ ] Tech-badge rows are visually even.
- [ ] Particle field animates in the hero; project galleries autoplay; timeline items reveal on scroll.
- [ ] Browser console: no errors on either route.
- [ ] `prefers-reduced-motion` (emulate in devtools): animations are suppressed, page still usable.
```bash
npx astro dev stop
```

- [ ] **Step 4: Finalize**

If everything passes, the branch `feature/bilingual-and-style-system` is ready for review/merge. Use `superpowers:finishing-a-development-branch` to decide how to integrate.

If any manual check fails, fix it in the owning component (not with a `global.css` override), re-run Steps 1–3, then commit with a `fix(...)` message.

---

## Self-Review

**1. Spec coverage**

| Spec section | Task(s) |
|---|---|
| i18n config (`astro.config.mjs`) | 1 |
| `src/i18n/routing.ts` + helpers + tests | 1 |
| `es.ts` / `en.ts` / `index.ts`, `Dict` parity typing | 2 |
| Rich-text via `<Fragment set:html>` | 2 (stored), 4/6/7/8 (rendered) |
| `Layout.astro` shell + hreflang + per-locale title/description | 3 |
| `SiteBody.astro` single section list | 3 |
| `src/pages/index.astro` + `src/pages/en/index.astro` | 3 |
| `site` URL fallback (root-relative, non-blocking) | 1 (config TODO), 3 (Layout comment) |
| Delete 5 dead files | 3 |
| Per-component `lang` prop + `t` lookups | 4 (hero/about), 5 (nav/footer), 6 (timeline), 7 (projects/gallery), 8 (teaching/contact) |
| `ProjectGallery` localized aria-labels | 7 |
| Language switcher w/ active state (navbar + footer) | 5 |
| Design tokens (`--gutter`, space scale, type scale, layout vars) | 9 |
| Reset additions (`:focus-visible`, `prefers-reduced-motion`, `img`) | 9 |
| Utility classes (`.section`, `.section-grid`, `.display-*`, `.lead`, `.eyebrow`, `.link-underline`) | 9 |
| CSS moved into each component `<style>` | 10 (hero/about), 11 (nav/footer), 12 (timeline), 13 (projects/gallery), 14 (teaching/contact) |
| Hero/navbar overlap fix | 10 |
| About `min-height:100vh` / whitespace fix | 10 |
| Mobile hamburger menu | 11 |
| Consecutive section numbering 01–05 | 2 (dictionary values), consumed 4/6/7/8 |
| Tech-badge row normalization (keep shields.io) | 13 |
| `global.css` dedup / `.about-photo` dup removed / < ~800 lines | 15 |
| `Contact.astro` `id="contact"` fix | 8 |
| Spanish typo fixes (`recivir`, `constuyo`) | 2 |
| Project-04 `href` → `#teaching` | 7 |
| Projects intro rephrase | 2 |
| `<html lang>` per route + hreflang present | 3 (impl), 16 (verify) |
| Build + manual + responsive verification | every task's verify step + 16 |

No gaps found.

**2. Placeholder scan**

Deliberate, spec-sanctioned TODO: the `site` URL comment in `astro.config.mjs` / `Layout.astro`. The spec explicitly makes this non-blocking with a defined fallback (root-relative hrefs). Not a plan-failure placeholder. Tasks 12–14 use "move blocks X…Y with these substitutions" rather than reproducing ~1500 lines of CSS verbatim — the substitution lists are exact (selector → declaration), the source ranges are named, and the invariants ("keep every transition", "keep the mask-image verbatim", "line must align to content column") are called out. This is a mechanical relocation of existing, in-repo code, not new logic.

**3. Type consistency**

- `Lang` = `'es' | 'en'` — defined in `routing.ts` (Task 1), imported everywhere.
- `Dict` = `typeof es` — defined in `index.ts` (Task 2); `en.ts` imports it as a type and annotates `const en: Dict`.
- `useTranslations(lang: Lang): Dict` — Task 2; called in Tasks 4–8 as `const t = useTranslations(lang)`.
- `localizedPath(path: string, lang: Lang): string` — Task 1; used in Tasks 3 (Layout alternates) and 5 (switcher).
- `getLangFromUrl` — defined Task 1; not strictly needed by later tasks (pages pass `lang` explicitly) but exported for completeness and tested.
- `ProjectGallery` `Props.labels: { prev; next; goTo }` — defined Task 7 Step 1; passed from `Projects.astro` as `labels={galleryLabels}` where `galleryLabels = t.gallery` (shape `{ prev; next; goTo }`). Matches.
- Dictionary key paths used in components (`t.hero.eyebrow`, `t.about.paragraphs`, `t.experience.items[]`, `t.projects.items[]`, `t.projects.disciplines.{math,ai,games}`, `t.projects.comingSoon.{kicker,title,meta}`, `t.teaching.principles[]`, `t.contact.email`, `t.gallery.*`, `t.nav.*`, `t.footer.*`) — all present in the Task 2 shape. Consistent.
- CSS token names (`--gutter`, `--col-label`, `--col-gap`, `--section-pad-y`, `--space-*`, `--display-*`, `--lead`, `--text-eyebrow`, `--tracking-eyebrow`, `--tracking-tight`, `--leading-tight`) — defined in Task 9 Step 1, referenced in Tasks 10–14. Consistent.

No inconsistencies found.
