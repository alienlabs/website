import type { Preview } from "storybook-solidjs-vite";

import "../src/index.css";

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: "dark",
    },
  },
};

export default preview;
