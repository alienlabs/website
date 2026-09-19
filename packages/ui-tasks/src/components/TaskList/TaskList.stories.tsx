import { faker } from '@faker-js/faker';
import { createSignal } from 'solid-js';
import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { v4 as uuid } from 'uuid';

import { TaskList } from './TaskList';

const meta = {
  title: 'ui-tasks/components/TaskList',
  component: TaskList,
} satisfies Meta<typeof TaskList>;

export default meta;

type Story = StoryObj<typeof meta>;

const makeTasks = (count = 5) =>
  Array.from({ length: count }, () => ({
    id: uuid(),
    title: faker.hacker.phrase(),
  }));

export const Default: Story = {
  args: {
    tasks: makeTasks(0),
  },
};

export const Border: Story = {
  args: {
    className: 'border rounded p-2',
    tasks: makeTasks(3),
  },
  render: (args) => {
    const [tasks, setTasks] = createSignal(args.tasks ?? []);
    return <TaskList {...args} tasks={tasks()} onCreate={(task) => setTasks((current) => [...current, task])} />;
  },
};
