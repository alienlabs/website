import { Show, createSignal, onCleanup } from 'solid-js';

import { I18nProvider, useI18n } from '@richburdon/ui-core/i18n';
import { ThemeProvider } from '@richburdon/ui-core/theme';
import { mx } from '@richburdon/ui-core/utils';

import { Hero, type HeroController, LocaleSelect, ThemeToggle } from './components';
import { i18nOptions } from './i18n';

const Page = () => {
  const { t } = useI18n();
  let hero: HeroController | undefined;
  const [started, setStarted] = createSignal(false);

  // Once the intro has finished, hold for a while, then reset and offer Start again.
  const RESET_AFTER_MS = 30_000;
  let resetTimer: number | undefined;
  onCleanup(() => clearTimeout(resetTimer));
  const start = async () => {
    clearTimeout(resetTimer);
    setStarted(true);
    await hero?.play();
    resetTimer = window.setTimeout(() => {
      hero?.reset();
      setStarted(false);
    }, RESET_AFTER_MS);
  };

  const panel = 'rounded-lg bg-background/40 shadow-sm backdrop-blur';

  return (
    <main class='relative h-screen w-screen overflow-hidden'>
      {/* Not autoplayed: browsers only allow the ambience after a gesture, so Start runs the intro. */}
      <Hero.Root class='absolute inset-0 overflow-hidden' autoplay={false} controller={(c) => (hero = c)}>
        <Hero.Mesh />
        <Hero.Content>
          <Hero.Logo />
          <Hero.LogoType />
        </Hero.Content>
      </Hero.Root>
      <header class={mx('absolute top-4 right-4 flex gap-2 p-2', panel)}>
        <LocaleSelect />
        <ThemeToggle />
      </header>
      <Show when={!started()}>
        <footer class={mx('absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-4 p-3', panel)}>
          <button
            type='button'
            class='rounded-md p-3 text-sm text-muted-foreground hover:bg-muted/50'
            onClick={() => void start()}
          >
            {t('hero.start')}
          </button>
        </footer>
      </Show>
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
