/** `GET /api/ping` → `pong` (a SolidStart API route). */
export function GET() {
  return new Response('pong', { headers: { 'content-type': 'text/plain' } });
}
