import { Task } from '@alienlabs/db-protocol';

const baseUrl = import.meta.env.VITE_CF_API_URL;

export const listTasks = async (): Promise<Task.Task[]> => {
  const response = await fetch(`${baseUrl}/task`);
  const { tasks } = await response.json();
  return tasks.map(Task.decodeTask);
};

export const createTask = async (title: string): Promise<void> => {
  await fetch(`${baseUrl}/task`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title }),
  });
};
