import { I18nProvider } from '@richburdon/ui-core/i18n';
import { ThemeProvider } from '@richburdon/ui-core/theme';

import { Hello, LocaleSelect, QRTest, ThemeToggle } from './components';
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
          <div class='flex flex-1 items-center justify-center'>
            <Hello name='ALIEN' />
          </div>
          <div class='flex flex-1 items-center justify-center'>
            <QRTest link='https://www.youtube.com/watch?v=hvL1339luv0' />
          </div>
        </main>
      </I18nProvider>
    </ThemeProvider>
  );
};
