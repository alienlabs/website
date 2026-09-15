import type { I18nOptions } from '@richburdon/ui-core/i18n';

import type en from './locales/en/translation.json';

export const languages = ['en', 'ja'] as const;

export const i18nOptions: I18nOptions = {
  supportedLngs: languages,
  // Vite code-splits one chunk per `locales/<lng>/<ns>.json`.
  loadResources: (lng, ns) => import(`./locales/${lng}/${ns}.json`),
};

// Typed `t()` keys and interpolation params, derived from the base language bundle.
declare module 'i18next' {
  interface CustomTypeOptions {
    resources: { translation: typeof en };
  }
}
