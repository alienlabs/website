import '../src/index.css';

import type { Preview } from 'storybook-solidjs-vite';

import { I18nProvider, type Locale } from '../src/i18n';
import { ThemeProvider, useTheme } from '../src/theme';

const ApplyTheme = (props: { theme: 'light' | 'dark'; children: unknown }) => {
  const { setMode } = useTheme();
  setMode(props.theme);
  return <>{props.children}</>;
};

const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'Color theme',
      toolbar: { title: 'Theme', icon: 'mirror', items: ['light', 'dark'], dynamicTitle: true },
    },
    locale: {
      description: 'Locale',
      toolbar: { title: 'Locale', icon: 'globe', items: ['en', 'es'], dynamicTitle: true },
    },
  },
  initialGlobals: {
    theme: 'light',
    locale: 'en',
  },
  decorators: [
    (Story, context) => (
      <ThemeProvider>
        <ApplyTheme theme={context.globals.theme as 'light' | 'dark'}>
          <I18nProvider locale={context.globals.locale as Locale}>
            <div class='min-h-screen bg-background p-8 text-foreground'>
              <Story />
            </div>
          </I18nProvider>
        </ApplyTheme>
      </ThemeProvider>
    ),
  ],
};

export default preview;
