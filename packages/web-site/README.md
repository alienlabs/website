# web-site

The public Alien Labs site (alienlabs.io): a client-rendered Solid app with the animated logo intro, served as static assets from a Cloudflare Worker.

- [SolidJS](https://www.solidjs.com) — UI, with [Ark UI](https://ark-ui.com) headless primitives
- [Vite](https://vite.dev) + [@cloudflare/vite-plugin](https://developers.cloudflare.com/workers/vite-plugin/) — dev server in workerd, build, `wrangler deploy`
- [Tailwind CSS](https://tailwindcss.com) — styling; theme tokens and `mx()` from `@alienlabs/ui-core`
- [d3](https://d3js.org) — layout and animation of the hero (Logo, Mesh, LogoType)
- [i18next](https://www.i18next.com) — localisation (`en`, `ja`), keys checked by i18next-cli
- [Storybook](https://storybook.js.org) — component workshop
- [Effect](https://effect.website) — used in the demo component
