import type { Meta, StoryObj } from 'storybook-solidjs-vite';

import { Mesh } from './Mesh';

const meta = {
  title: 'Components/Mesh',
  component: Mesh,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Mesh>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    origin: { x: 400, y: 300 },
    unit: 0.1,
    class: 'h-screen w-screen',
  },
};

export const NoHole: Story = {
  args: {
    ...Default.args,
    hole: false,
  },
};
