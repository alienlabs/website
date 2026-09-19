import type { Meta, StoryObj } from 'storybook-solidjs-vite';

import { LogoType } from './LogoType';

const meta = {
  title: 'Components/LogoType',
  component: LogoType,
} satisfies Meta<typeof LogoType>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Static: Story = {
  args: {
    animate: false,
  },
};
