import type { Task } from '@alienlabs/ui-tasks';

const baseUrl = import.meta.env.VITE_CF_API_URL;

export const listTasks = async (): Promise<Task[]> => {
  const response = await fetch(`${baseUrl}/task`);
  const { tasks } = await response.json();
  return tasks;
};

export const createTask = async (title: string): Promise<void> => {
  await fetch(`${baseUrl}/task`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title }),
  });
};
