import { createResource } from 'solid-js';

/** Home page: calls the `/api/ping` route from the client. */
export default function Home() {
  const [pong] = createResource(() => fetch('/api/ping').then((response) => response.text()));
  return (
    <main>
      <h1>SolidStart on Cloudflare</h1>
      <p>/api/ping → {pong() ?? '…'}</p>
    </main>
  );
}
