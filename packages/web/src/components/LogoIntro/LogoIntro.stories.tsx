import { createSignal } from 'solid-js';
import type { Meta, StoryObj } from 'storybook-solidjs-vite';

import { INTRO_STATES, type IntroState, LogoIntro, type LogoIntroController } from './LogoIntro';

const meta = {
  title: 'Components/LogoIntro',
  component: LogoIntro,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof LogoIntro>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    class: 'relative h-screen w-screen overflow-hidden',
  },
};

/** Starts on the static mesh; Step advances through the six states (wrapping), Play runs them all. */
export const Manual: Story = {
  args: {
    ...Default.args,
    autoplay: false,
  },
  render: (args) => {
    let intro: LogoIntroController | undefined;
    const [state, setState] = createSignal<IntroState>('static');
    const next = () => INTRO_STATES[(INTRO_STATES.indexOf(state()) + 1) % INTRO_STATES.length];
    const sync = () => setState(intro?.state() ?? 'static');
    const button =
      'rounded-md border border-border bg-background px-3 py-1 text-sm text-muted-foreground hover:bg-muted';
    return (
      <>
        <div class='absolute top-4 left-4 z-10 flex items-center gap-2'>
          <button
            type='button'
            class={button}
            onClick={() => {
              void intro?.step().then(sync);
              sync();
            }}
          >
            Step → {next()}
          </button>
          <button
            type='button'
            class={button}
            onClick={() => {
              void intro?.play().then(sync);
              sync();
            }}
          >
            Play
          </button>
          <button
            type='button'
            class={button}
            onClick={() => {
              intro?.reset();
              sync();
            }}
          >
            Reset
          </button>
          <span class='text-sm text-muted-foreground'>{state()}</span>
        </div>
        <LogoIntro {...args} controller={(controller) => (intro = controller)} />
      </>
    );
  },
};
