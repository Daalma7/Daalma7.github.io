import type { Lang } from './routing';
import es from './es';
import en from './en';

export * from './routing';

export type Dict = typeof es;

export const ui: Record<Lang, Dict> = { es, en };

export function useTranslations(lang: Lang): Dict {
  return ui[lang];
}
