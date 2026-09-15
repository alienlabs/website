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
```

`moon run :build` / `moon run :typecheck` run the task across all projects.

## Deploy

`web:deploy` runs `vite build` then `wrangler deploy`; the Cloudflare Vite plugin emits `dist/wrangler.json`, which wrangler picks up automatically. Requires `wrangler login` (or `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`) once.
