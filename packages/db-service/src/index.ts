import { Task, decodeTask, encodeTask } from '@alienlabs/protocol';

export type Env = Record<string, never>;

/** In-memory store, per isolate; to be replaced by a D1/Durable Object binding. */
const tasks = new Map<string, Task>();

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

/**
 * db-service: a small REST API over Task.
 *
 *   GET    /tasks       list
 *   POST   /tasks       create (body: encoded Task)
 *   GET    /tasks/:id   read
 *   DELETE /tasks/:id   delete
 */
export default {
  async fetch(request: Request): Promise<Response> {
    const { pathname } = new URL(request.url);
    const match = pathname.match(/^\/tasks(?:\/([^/]+))?$/);
    if (!match) {
      return json({ error: 'not found' }, 404);
    }
    const id = match[1];

    if (!id && request.method === 'GET') {
      return json([...tasks.values()].map((task) => encodeTask(task)));
    }
    if (!id && request.method === 'POST') {
      try {
        const task = decodeTask(await request.json());
        tasks.set(task.id, task);
        return json(encodeTask(task), 201);
      } catch (error) {
        return json({ error: String(error) }, 400);
      }
    }
    if (id) {
      const task = tasks.get(id);
      if (!task) {
        return json({ error: 'not found' }, 404);
      }
      if (request.method === 'GET') {
        return json(encodeTask(task));
      }
      if (request.method === 'DELETE') {
        tasks.delete(id);
        return new Response(null, { status: 204 });
      }
    }
    return json({ error: 'method not allowed' }, 405);
  },
} satisfies ExportedHandler<Env>;
