import type { StorybookConfig } from "storybook-solidjs-vite";

const config: StorybookConfig = {
  framework: "storybook-solidjs-vite",
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  viteFinal: (config) => {
    // The Cloudflare plugin drives the dev server and build; it is not needed for Storybook.
    config.plugins = (config.plugins ?? [])
      .flat()
      .filter((plugin) => !(plugin && "name" in plugin && plugin.name.startsWith("vite-plugin-cloudflare")));
    return config;
  },
};

export default config;
