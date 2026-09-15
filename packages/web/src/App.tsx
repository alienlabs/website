import { I18nProvider } from '@richburdon/ui-core/i18n';
import { ThemeProvider } from '@richburdon/ui-core/theme';

import { Hello, LocaleSelect, LogoIntro, ThemeToggle } from './components';
import { i18nOptions } from './i18n';

export const App = () => {
  return (
    <ThemeProvider>
      <I18nProvider options={i18nOptions}>
        <main class='flex min-h-screen flex-col'>
          <header class='flex justify-end gap-2 p-4'>
            <LocaleSelect />
            <ThemeToggle />
          </header>
          <div class='relative flex-1'>
            <LogoIntro.Root class='absolute inset-0 overflow-hidden'>
              <LogoIntro.Mesh />
              <LogoIntro.Content>
                <LogoIntro.Logo />
                <LogoIntro.LogoType />
              </LogoIntro.Content>
            </LogoIntro.Root>
          </div>
          <div class='flex justify-center p-4'>
            <Hello name='World' />
          </div>
        </main>
      </I18nProvider>
    </ThemeProvider>
  );
};
