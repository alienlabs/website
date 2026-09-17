import { v4 as uuid } from 'uuid';
import { describe, expect, it } from 'vitest';

import worker from './index';

const call = (method: string, path: string, body?: unknown) =>
  worker.fetch(
    new Request(`http://db-service${path}`, {
      method,
      headers: body ? { 'content-type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    }),
  );

describe('db-service', () => {
  it('creates, lists, reads and deletes tasks', async () => {
    const id = uuid();
    const task = { id, title: 'Write worker', status: 'todo', createdAt: '2026-09-17T00:00:00.000Z' };

    const created = await call('POST', '/tasks', task);
    expect(created.status).toBe(201);
    expect(await created.json()).toEqual(task);

    expect(await (await call('GET', '/tasks')).json()).toEqual([task]);
    expect(await (await call('GET', `/tasks/${id}`)).json()).toEqual(task);

    expect((await call('DELETE', `/tasks/${id}`)).status).toBe(204);
    expect((await call('GET', `/tasks/${id}`)).status).toBe(404);
  });

  it('rejects invalid tasks and unknown routes', async () => {
    expect((await call('POST', '/tasks', { title: '' })).status).toBe(400);
    expect((await call('GET', '/nope')).status).toBe(404);
    expect((await call('PUT', '/tasks')).status).toBe(405);
  });
});
