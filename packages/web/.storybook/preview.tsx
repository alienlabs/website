import '../src/index.css';

import type { Preview } from 'storybook-solidjs-vite';

import { I18nProvider } from '@richburdon/ui-core/i18n';
import { type Theme, ThemeProvider, useTheme } from '@richburdon/ui-core/theme';

import { i18nOptions, languages } from '../src/i18n';

const ApplyTheme = (props: { theme: Theme; children: unknown }) => {
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
      toolbar: { title: 'Locale', icon: 'globe', items: [...languages], dynamicTitle: true },
    },
  },
  initialGlobals: {
    theme: 'light',
    locale: 'en',
  },
  decorators: [
    (Story, context) => (
      <ThemeProvider>
        <ApplyTheme theme={context.globals.theme as Theme}>
          <I18nProvider options={{ ...i18nOptions, lng: context.globals.locale as string }}>
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
