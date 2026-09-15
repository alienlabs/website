# website

Monorepo managed by [moon](https://moonrepo.dev) + [pnpm](https://pnpm.io), with toolchain versions pinned in `.prototools` ([proto](https://moonrepo.dev/proto)).

## Packages

| Package | Description |
| --- | --- |
| `packages/web` | SolidJS + Vite site, deployed to Cloudflare Workers (static assets) |

Stack: Vite, SolidJS, Tailwind CSS v4, Ark UI, Effect, D3, Storybook, Cloudflare Workers.

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
- Dependency versions are pinned once in the `catalog:` of `pnpm-workspace.yaml`; packages reference them as `"catalog:"`.

`moon run :build` / `moon run :typecheck` run the task across all projects.

## Deploy

`web:deploy` runs `vite build` then `wrangler deploy`; the Cloudflare Vite plugin emits `dist/wrangler.json`, which wrangler picks up automatically. Requires `wrangler login` (or `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`) once.
