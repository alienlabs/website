import type { Meta, StoryObj } from 'storybook-solidjs-vite';

import { Logo, type LogoController } from './Logo';

const meta = {
  title: 'Components/Logo',
  component: Logo,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof Logo>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Large: Story = {
  args: {
    class: 'mb-24 h-48 w-auto',
  },
};

export const Spin: Story = {
  args: {
    spin: true,
    class: 'mb-24 h-48 w-auto',
  },
};

export const Static: Story = {
  args: {
    animate: false,
    class: 'h-48 w-auto',
  },
};

/** Starts folded; the button replays the intro. */
export const Manual: Story = {
  args: {
    animate: 'manual',
    class: 'h-full w-full',
  },
  render: (args) => {
    let logo: LogoController | undefined;
    return (
      <div class='absolute inset-0 flex flex-col items-start gap-4'>
        <div class='absolute left-0 top-0 right-0 p-1'>
          <button
            type='button'
            class='relative z-10 rounded-md border border-border bg-background px-3 py-1 text-sm text-muted-foreground hover:bg-muted'
            onClick={() => {
              logo?.reset();
              void logo?.play();
            }}
          >
            Play
          </button>
        </div>
        <Logo {...args} controller={(controller) => (logo = controller)} />
      </div>
    );
  },
};
