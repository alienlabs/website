import { Tooltip } from '@ark-ui/solid/tooltip';
import { format } from 'd3';
import { Effect } from 'effect';
import { createSignal } from 'solid-js';

import { type Translator, useI18n } from '../../i18n';

const greet = (t: Translator, name: string) => Effect.sync(() => t('hello.greeting', { name }));

export type HelloProps = {
  name: string;
};

export const Hello = (props: HelloProps) => {
  const { t } = useI18n();
  const [count, setCount] = createSignal(0);
  const message = () => Effect.runSync(greet(t, props.name));

  return (
    <div class='flex flex-col items-center gap-4'>
      <h1 class='text-4xl font-semibold tracking-tight'>{message()}</h1>
      <Tooltip.Root openDelay={200}>
        <Tooltip.Trigger
          class='rounded-md bg-primary px-4 py-2 text-primary-foreground hover:opacity-90'
          onClick={() => setCount((n) => n + 1)}
        >
          {t('hello.clicked', { count: format(',d')(count()) })}
        </Tooltip.Trigger>
        <Tooltip.Positioner>
          <Tooltip.Content class='rounded border border-border bg-muted px-2 py-1 text-sm text-muted-foreground'>
            {t('hello.tooltip')}
          </Tooltip.Content>
        </Tooltip.Positioner>
      </Tooltip.Root>
    </div>
  );
};
