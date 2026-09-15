export const locales = ['en', 'es'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

export const en = {
  app: {
    title: 'Hello World',
  },
  hello: {
    greeting: 'Hello, {{name}}!',
    clicked: 'Clicked {{count}} times',
    tooltip: 'Click to count',
  },
  theme: {
    light: 'Light',
    dark: 'Dark',
    toggle: 'Switch to {{theme}} theme',
  },
  locale: {
    label: 'Language',
    en: 'English',
    es: 'Spanish',
  },
};

export type Dictionary = typeof en;

export const es: Dictionary = {
  app: {
    title: 'Hola Mundo',
  },
  hello: {
    greeting: '¡Hola, {{name}}!',
    clicked: 'Pulsado {{count}} veces',
    tooltip: 'Pulsa para contar',
  },
  theme: {
    light: 'Claro',
    dark: 'Oscuro',
    toggle: 'Cambiar al tema {{theme}}',
  },
  locale: {
    label: 'Idioma',
    en: 'Inglés',
    es: 'Español',
  },
};

export const dictionaries: Record<Locale, Dictionary> = { en, es };
