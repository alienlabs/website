import type { i18n as I18n } from 'i18next';
import type { JSX, ParentProps } from 'solid-js';

import { I18nInstanceProvider } from '../i18n/i18n';
import { type Theme, ThemeProvider, useTheme } from '../theme/theme';

const ApplyTheme = (props: ParentProps<{ theme: Theme }>) => {
  const { setMode } = useTheme();
  setMode(props.theme);
  return <>{props.children}</>;
};

/** Minimal shape of what Storybook passes a decorator; kept loose so this module doesn't depend on a framework package. */
export type StorybookDecoratorContext = {
  globals: { theme?: string; locale?: string };
};

export type StorybookDecorator = (Story: () => JSX.Element, context: StorybookDecoratorContext) => JSX.Element;

/**
 * Builds a Storybook decorator that wires up the app's theme and i18n context, synced to the
 * `theme`/`locale` toolbar globals declared in `.storybook/preview.tsx`.
 *
 * `instance` must already be resolved — `Story` never renders if it sits behind an async
 * provider (see `I18nInstanceProvider` vs `I18nProvider`) — so create it once at module scope,
 * ahead of render, and list the result directly:
 *
 * ```tsx
 * const i18nInstance = await createI18n(i18nOptions);
 *
 * const meta = {
 *   title: 'Components/Hello',
 *   component: Hello,
 *   decorators: [createStorybookDecorator(i18nInstance)],
 * } satisfies Meta<typeof Hello>;
 * ```
 */
export const createStorybookDecorator =
  (instance: I18n): StorybookDecorator =>
  (Story, context) => (
    <ThemeProvider>
      <ApplyTheme theme={(context.globals.theme as Theme) ?? 'light'}>
        <I18nInstanceProvider instance={instance} lng={context.globals.locale}>
          <Story />
        </I18nInstanceProvider>
      </ApplyTheme>
    </ThemeProvider>
  );
