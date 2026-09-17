import '../src/index.css';

import type { Preview } from 'storybook-solidjs-vite';

import { languages } from '../src/i18n';

const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'Color theme',
      toolbar: { title: 'Theme', icon: 'mirror', items: ['light', 'dark'], dynamicTitle: true },
    },
    locale: {
      description: 'Locale',
      toolbar: { title: 'Locale', icon: 'globe', items: [...languages], dynamicTitle: true },
    },
  },
  initialGlobals: {
    theme: 'light',
    locale: 'en',
  },
};

export default preview;
