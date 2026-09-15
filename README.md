# website

Monorepo managed by [moon](https://moonrepo.dev) + [pnpm](https://pnpm.io), with toolchain versions pinned in `.prototools` ([proto](https://moonrepo.dev/proto)).

## Packages

| Package | Description |
| --- | --- |
| `packages/ui-core` | Shared Solid utilities: theme (light/dark via `data-theme`) and i18n (i18next provider) |
| `packages/web` | SolidJS + Vite site, deployed to Cloudflare Workers (static assets) |

Stack: Vite, SolidJS, Tailwind CSS v4, Ark UI, Effect, i18next, Storybook, Cloudflare Workers.

## Setup

```bash
proto use
pnpm install
```

## Commands

```bash
moon run web:dev
moon run web:storybook
moon run web:build
moon run web:typecheck
moon run web:deploy
moon run :lint
moon run :lint-fix
pnpm format
```

## Lint / format

- [oxlint](https://oxc.rs/docs/guide/usage/linter) (type-aware via `oxlint-tsgolint`) with ESLint JS plugins `unused-imports`, `perfectionist`, `import-x` — config in `.oxlintrc.json`; `lint` / `lint-fix` moon tasks are inherited by every TypeScript project.
- [oxfmt](https://oxc.rs/docs/guide/usage/formatter) for formatting (single quotes, 120 cols, sorted imports) — config in `.oxfmtrc.json`.
- Dependency versions are pinned once in the `catalog:` of `pnpm-workspace.yaml`; packages reference them as `"catalog:"` (enforced by `pnpm pkg-lint`).
- [knip](https://knip.dev) (`pnpm knip`) reports unused files, exports and dependencies; config in `.config/knip.ts`.
- [husky](https://typicode.github.io/husky) hooks: `pre-commit` runs `lint-staged` (oxfmt, oxlint --fix, pkg-lint on staged files); `pre-push` refuses direct pushes to `main` (`push_to_main=true git push` to override).
- CI (`.github/workflows/ci.yml`): pkg-lint, format check, knip, then `moon ci` (affected build/lint/typecheck). `deploy.yml` deploys `web` on push to `main`; needs `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets.

## i18n

Translations live in `packages/web/src/locales/<lng>/<namespace>.json` (i18next layout) and are lazy-loaded per language. `t()` keys and interpolation params are typed from `en/translation.json` via i18next's `CustomTypeOptions` (see `packages/web/src/i18n.ts`).

Locale files are maintained by [i18next-cli](https://github.com/i18next/i18next-cli) (`packages/web/i18next.config.ts`):

```bash
moon run web:i18n-extract
moon run web:i18n-check
```

`i18n-extract` scans source for `t()` calls and adds/removes/sorts keys in every locale (plural forms per CLDR rules). `i18n-check` (run in CI) fails if locale files are out of sync, lints for hardcoded strings, and prints translation status. Keys built dynamically (`t(\`locale.${code}\`)`) must be declared in a comment next to the call: `// t('locale.en')`.

`moon run :build` / `moon run :typecheck` run the task across all projects.

## Deploy

`web:deploy` runs `vite build` then `wrangler deploy`; the Cloudflare Vite plugin emits `dist/wrangler.json`, which wrangler picks up automatically. Requires `wrangler login` (or `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`) once.
