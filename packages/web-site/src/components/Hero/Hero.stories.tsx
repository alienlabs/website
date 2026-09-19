import { createSignal } from 'solid-js';
import type { Meta, StoryObj } from 'storybook-solidjs-vite';

import { Hero, HERO_STATES, type HeroController, type HeroRootProps, type HeroState } from './Hero';

const HeroDemo = (props: HeroRootProps) => (
  <Hero.Root {...props}>
    <Hero.Mesh />
    <Hero.Content>
      <Hero.Logo />
      <Hero.LogoType />
    </Hero.Content>
  </Hero.Root>
);

const meta = {
  title: 'Components/Hero',
  component: HeroDemo,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof HeroDemo>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    class: 'relative h-screen w-screen overflow-hidden',
  },
};

/** Starts on the static mesh; Step advances through the states (wrapping), Play runs them all. */
export const Manual: Story = {
  args: {
    ...Default.args,
    autoplay: false,
  },
  render: (args) => {
    let intro: HeroController | undefined;
    const [state, setState] = createSignal<HeroState>('static');
    const next = () => HERO_STATES[(HERO_STATES.indexOf(state()) + 1) % HERO_STATES.length];
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
        <HeroDemo {...args} controller={(controller) => (intro = controller)} />
      </>
    );
  },
};
