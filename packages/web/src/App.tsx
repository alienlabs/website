import { I18nProvider, useI18n } from '@richburdon/ui-core/i18n';
import { ThemeProvider } from '@richburdon/ui-core/theme';

import { Hello, Hero, type HeroController, LocaleSelect, ThemeToggle } from './components';
import { i18nOptions } from './i18n';

const Page = () => {
  const { t } = useI18n();
  let hero: HeroController | undefined;

  return (
    <main class='flex min-h-screen flex-col'>
      <header class='flex justify-end gap-2 p-4'>
        <LocaleSelect />
        <ThemeToggle />
      </header>
      <div class='relative flex-1'>
        {/* Not autoplayed: browsers only allow the ambience after a gesture, so Start runs the intro. */}
        <Hero.Root class='absolute inset-0 overflow-hidden' autoplay={false} controller={(c) => (hero = c)}>
          <Hero.Mesh />
          <Hero.Content>
            <Hero.Logo />
            <Hero.LogoType />
          </Hero.Content>
        </Hero.Root>
      </div>
      <footer class='flex items-center justify-center gap-4 p-4'>
        <button
          type='button'
          class='rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted'
          onClick={() => void hero?.play()}
        >
          {t('hero.start')}
        </button>
        <Hello name='World' />
      </footer>
    </main>
  );
};

export const App = () => {
  return (
    <ThemeProvider>
      <I18nProvider options={i18nOptions}>
        <Page />
      </I18nProvider>
    </ThemeProvider>
  );
};
