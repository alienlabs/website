import { describe, expect, it } from 'vitest';

import worker from './index';

describe('cf', () => {
  it('pings', async () => {
    const response = await worker.fetch(new Request('http://cf/ping'));
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('pong');
  });

  it('404s elsewhere', async () => {
    expect((await worker.fetch(new Request('http://cf/'))).status).toBe(404);
  });
});
