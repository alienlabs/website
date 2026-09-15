import * as i18n from '@solid-primitives/i18n';
import { type Accessor, type ParentProps, createContext, createMemo, createSignal, useContext } from 'solid-js';

import { type Dictionary, type Locale, defaultLocale, dictionaries, locales } from './locales';

const STORAGE_KEY = 'locale';

const isLocale = (value: unknown): value is Locale => locales.includes(value as Locale);

const readStoredLocale = (): Locale => {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (isLocale(value)) {
      return value;
    }
  } catch {
    // Storage unavailable.
  }
  const browser = navigator.language.split('-')[0];
  return isLocale(browser) ? browser : defaultLocale;
};

type FlatDictionary = i18n.Flatten<Dictionary>;

export type Translator = i18n.Translator<FlatDictionary>;

export type I18nContextValue = {
  t: Translator;
  locale: Accessor<Locale>;
  setLocale: (locale: Locale) => void;
};

const I18nContext = createContext<I18nContextValue>();

export const createI18n = (initial?: Locale): I18nContextValue => {
  const [locale, setLocaleSignal] = createSignal<Locale>(initial ?? readStoredLocale());
  const dict = createMemo(() => i18n.flatten(dictionaries[locale()]));
  const t = i18n.translator(dict, i18n.resolveTemplate);

  const setLocale = (next: Locale) => {
    setLocaleSignal(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage unavailable.
    }
  };

  return { t, locale, setLocale };
};

export const I18nProvider = (props: ParentProps<{ locale?: Locale }>) => {
  const value = createI18n(props.locale);
  return <I18nContext.Provider value={value}>{props.children}</I18nContext.Provider>;
};

export const useI18n = (): I18nContextValue => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};
