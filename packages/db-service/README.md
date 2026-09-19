# db-service

A Cloudflare Worker exposing a REST API over `Task` objects (list, create, read, delete), backed by an in-memory store for now.

- [Cloudflare Workers](https://developers.cloudflare.com/workers/) via [Wrangler](https://developers.cloudflare.com/workers/wrangler/) — runtime and deploy
- [Effect](https://effect.website) — services (`TaskStore`), layers and error handling
- [@effect/platform](https://effect.website/docs/platform/introduction/) `HttpApi` / `HttpApiBuilder` — declarative API definition, handlers and the Worker `fetch` handler (`toWebHandler`)
- `@alienlabs/db-protocol` — the `Task` schema
- [Vitest](https://vitest.dev) — tests call the handler directly with `Request`s
