import { defineConfig } from 'i18next-cli';

export default defineConfig({
  locales: ['en', 'ja'],
  extract: {
    input: ['src/**/*.{ts,tsx}'],
    // Stories are dev-only UI (the `!` negation form is not honoured by the linter's glob).
    ignore: ['src/**/*.stories.tsx'],
    output: 'src/locales/{{language}}/{{namespace}}.json',
    functions: ['t'],
    defaultNS: 'translation',
    keySeparator: '.',
    nsSeparator: ':',
    removeUnusedKeys: true,
    sort: true,
  },
});
