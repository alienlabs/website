export type Env = Record<string, never>;

/** A trivial Worker: `GET /ping` answers `pong`. */
export default {
  async fetch(request: Request): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname === '/ping') {
      return new Response('pong', { headers: { 'content-type': 'text/plain' } });
    }
    return new Response('not found', { status: 404 });
  },
} satisfies ExportedHandler<Env>;
