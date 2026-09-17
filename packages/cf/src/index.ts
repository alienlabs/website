import { v4 as uuid } from 'uuid';

export type Env = { TASKS: KVNamespace };

/** A trivial Worker: `GET /ping` answers `pong`. */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);
    console.log(request.method, pathname);
    switch (request.method) {
      case 'GET': {
        switch (pathname) {
          // curl http://localhost:8787/ping
          case '/ping': {
            return new Response('pong', {
              headers: { 'content-type': 'text/plain' },
            });
          }
          // curl http://localhost:8787/time | jq
          case '/time': {
            const response = {
              ts: Date.now(),
            };
            return new Response(JSON.stringify(response), {
              headers: { 'content-type': 'application/json' },
            });
          }
          case '/task': {
            const { keys } = await env.TASKS.list();
            const tasks = await Promise.all(keys.map(async ({ name }) => JSON.parse((await env.TASKS.get(name))!)));
            return new Response(JSON.stringify({ tasks }), {
              headers: { 'content-type': 'application/json' },
            });
          }
          default: {
            break;
          }
        }
        break;
      }

      case 'POST': {
        switch (pathname) {
          // curl -X POST http://localhost:8787/task -H "Content-Type: application/json" -d '{"title":"setup my computer"}'
          case '/task': {
            const data: any = await request.json();
            data.id = uuid();
            await env.TASKS.put(data.id, JSON.stringify(data));
            console.log(JSON.stringify(data));
            return new Response();
          }
          default: {
            break;
          }
        }
        break;
      }
    }

    return new Response('not found', { status: 404 });
  },
} satisfies ExportedHandler<Env>;
