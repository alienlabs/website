import { Hello, LocaleSelect, ThemeToggle } from './components';
import { I18nProvider } from './i18n';
import { ThemeProvider } from './theme';

export const App = () => {
  return (
    <ThemeProvider>
      <I18nProvider>
        <main class='flex min-h-screen flex-col'>
          <header class='flex justify-end gap-2 p-4'>
            <LocaleSelect />
            <ThemeToggle />
          </header>
          <div class='flex flex-1 items-center justify-center'>
            <Hello name='World' />
          </div>
        </main>
      </I18nProvider>
    </ThemeProvider>
  );
};
