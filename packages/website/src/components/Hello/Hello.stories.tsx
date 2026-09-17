import type { Meta, StoryObj } from 'storybook-solidjs-vite';

import { createI18n } from '@alienlabs/ui-core/i18n';
import { createStorybookDecorator } from '@alienlabs/ui-core/testing';

import { i18nOptions } from '../../i18n';
import { Hello } from './Hello';

// Created once, synchronously ahead of render: `Story` never renders if it sits behind
// the async provider (see I18nProvider vs I18nInstanceProvider in ui-core).
const i18nInstance = await createI18n(i18nOptions);

const meta = {
  title: 'Components/Hello',
  component: Hello,
  decorators: [createStorybookDecorator(i18nInstance)],
} satisfies Meta<typeof Hello>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    name: 'World',
  },
};
