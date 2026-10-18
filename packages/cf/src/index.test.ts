import { describe, expect, it } from 'vitest';

import worker, { type Env } from './index';

const env = {} as Env;

const createKv = (): KVNamespace => {
  const store = new Map<string, string>();
  return {
    get: async (key: string) => store.get(key) ?? null,
    put: async (key: string, value: string) => void store.set(key, value),
    list: async () => ({ keys: [...store.keys()].map((name) => ({ name })) }),
  } as unknown as KVNamespace;
};

describe('cf', () => {
  it('pings', async () => {
    const response = await worker.fetch(new Request('http://cf/ping'), env);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('pong');
  });

  it('404s elsewhere', async () => {
    expect((await worker.fetch(new Request('http://cf/'), env)).status).toBe(404);
  });

  it('creates and lists tasks', async () => {
    const env = { TASKS: createKv() };
    await env.TASKS.put('legacy', JSON.stringify({ id: '3a23891f-0b13-4a4f-bc56-da70b240ba3c', title: 'legacy' }));
    const created = await worker.fetch(
      new Request('http://cf/task', { method: 'POST', body: JSON.stringify({ title: 'buy milk' }) }),
      env,
    );
    expect(created.status).toBe(200);
    const { tasks } = await (await worker.fetch(new Request('http://cf/task'), env)).json<any>();
    expect(tasks.map((task: any) => task.title).sort()).toEqual(['buy milk', 'legacy']);
    expect(tasks.every((task: any) => task.createdAt && task.status === 'todo')).toBe(true);
  });

  it('rejects empty titles', async () => {
    const env = { TASKS: createKv() };
    const response = await worker.fetch(
      new Request('http://cf/task', { method: 'POST', body: JSON.stringify({ title: ' ' }) }),
      env,
    );
    expect(response.status).toBe(400);
  });
});
