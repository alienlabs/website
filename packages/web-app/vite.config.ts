import { solidStart } from '@solidjs/start/config';
import { nitro } from 'nitro/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [solidStart(), nitro()],
  nitro: {
    // Cloudflare Workers (module syntax). Nitro merges wrangler.json (strict JSON: it does not accept
    // trailing commas, hence not .jsonc) with the generated `main`/`assets` into
    // .output/server/wrangler.json and points wrangler at it via .wrangler/deploy/config.json.
    preset: 'cloudflare_module',
  },
});
