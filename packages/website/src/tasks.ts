import { v4 as uuid } from 'uuid';

import { Task } from '@alienlabs/db-protocol';

// const baseUrl = import.meta.env.VITE_CF_API_URL;
const baseUrl = 'https://tasks.alienlabs.io';

export const listTasks = async (): Promise<Task.Task[]> => {
  const response = await fetch(`${baseUrl}/tasks`);
  return await response.json();
};

export const createTask = async (title: string): Promise<void> => {
  const task = new Task.Task({ id: uuid(), title, createdAt: new Date() });
  await fetch(`${baseUrl}/tasks`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(task),
  });
};

export const status = async (): Promise<any> => {
  const response = await fetch(`${baseUrl}/status`);
  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
  return data;
};
