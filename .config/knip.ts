import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  workspaces: {
    '.': {
      entry: ['scripts/*.mjs'],
      project: ['scripts/**/*.mjs'],
    },
    'packages/ui-tasks': {
      entry: ['src/index.{ts,tsx}!'],
      project: ['src/**/*.{ts,tsx}!'],
      storybook: true,
      // Referenced from CSS (`@import`), which knip does not parse.
      ignoreDependencies: ['@alienlabs/ui-core', 'tailwindcss'],
    },
    'packages/*': {
      // `!` marks production entries, so `--production` audits `dependencies` without dev-only files.
      entry: ['src/index.{ts,tsx}!', 'i18next.config.ts'],
      project: ['src/**/*.{ts,tsx}!'],
      // Storybook 10 ships as `storybook` (no `@storybook/*` dep), which knip's auto-detection misses.
      storybook: true,
      ignoreDependencies: [
        // Referenced from CSS (`@import 'tailwindcss'`), which knip does not parse.
        'tailwindcss',
      ],
    },
  },
  ignoreBinaries: [
    // Installed via proto (.prototools), not npm.
    'moon',
  ],
  ignoreDependencies: [
    // Loaded by oxlint via `jsPlugins` in .oxlintrc.json.
    'eslint',
    'eslint-plugin-import-x',
    'eslint-plugin-perfectionist',
    'eslint-plugin-unused-imports',
    // Companion binary used by oxlint for type-aware rules.
    'oxlint-tsgolint',
  ],
};

export default config;
