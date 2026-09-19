# experimental

A scratch Cloudflare Worker for trying platform features: `ping`, `time`, and a KV-backed `task` endpoint.

- [Cloudflare Workers](https://developers.cloudflare.com/workers/) via [Wrangler](https://developers.cloudflare.com/workers/wrangler/) — runtime, local dev (`wrangler dev`) and deploy
- [Workers KV](https://developers.cloudflare.com/kv/) — `TASKS` namespace binding
- [uuid](https://github.com/uuidjs/uuid) — ids
- [Vitest](https://vitest.dev) — tests call the handler directly
