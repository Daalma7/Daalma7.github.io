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
