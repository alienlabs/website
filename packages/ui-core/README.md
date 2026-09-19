# ui-core

Shared UI foundation for the Solid apps: theming, localisation, fonts and class-name utilities.

- [SolidJS](https://www.solidjs.com) — `ThemeProvider` (light/dark via `data-theme`) and `I18nProvider`
- [i18next](https://www.i18next.com) — lazy-loaded per-language resources, browser language detection
- [Tailwind CSS](https://tailwindcss.com) — `mx()` ([clsx](https://github.com/lukeed/clsx) + [tailwind-merge](https://github.com/dcastil/tailwind-merge)) for composing class names
- Self-hosted fonts (`fonts.css`) and sound assets
- Storybook decorator for theme/i18n (`testing`)
