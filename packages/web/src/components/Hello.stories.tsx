import type { Meta, StoryObj } from "storybook-solidjs-vite";

import { Hello } from "./Hello";

const meta = {
  title: "Components/Hello",
  component: Hello,
} satisfies Meta<typeof Hello>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    name: "World",
  },
};

export const Storybook: Story = {
  args: {
    name: "Storybook",
  },
};
