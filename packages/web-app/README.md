# web-app

A server-rendered SolidStart application deployed as a Cloudflare Worker (beta support), with file-system page and API routes.

- [SolidStart 2](https://docs.solidjs.com/solid-start) — SSR, hydration, file routes (`src/routes`), API routes (`src/routes/api`)
- [SolidJS](https://www.solidjs.com), [@solidjs/router](https://docs.solidjs.com/solid-router), [@solidjs/meta](https://docs.solidjs.com/solid-meta)
- [Vite](https://vite.dev) — dev server and build
- [Nitro](https://nitro.build) `cloudflare_module` preset — emits the Worker (`.output/server`) and static assets (`.output/public`), and generates the wrangler config
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/) — deploy (`wrangler.json` is strict JSON: nitro merges it at build time)
