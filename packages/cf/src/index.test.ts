import { describe, expect, it } from 'vitest';

import worker, { type Env } from './index';

const env = {} as Env;

describe('cf', () => {
  it('pings', async () => {
    const response = await worker.fetch(new Request('http://cf/ping'), env);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('pong');
  });

  it('404s elsewhere', async () => {
    expect((await worker.fetch(new Request('http://cf/'), env)).status).toBe(404);
  });
});
