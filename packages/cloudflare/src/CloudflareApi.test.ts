import { HttpClient, HttpClientResponse, UrlParams } from '@effect/platform';
import { Effect, Layer, Redacted } from 'effect';
import { describe, expect, it } from 'vitest';

import { CloudflareApi, type CloudflareAuth, CloudflareError, layer } from './CloudflareApi';

/** A fake HttpClient answering from a route table; records the requests it sees. */
const fakeClient = (routes: Record<string, unknown>) => {
  const seen: { method: string; url: string; headers: Record<string, string>; body?: unknown }[] = [];
  const client = HttpClient.make((request) =>
    Effect.gen(function* () {
      const url = new URL(request.url);
      const params = UrlParams.toString(request.urlParams);
      const key = `${request.method} ${url.pathname}${params ? `?${params}` : ''}`;
      const body =
        request.body._tag === 'Uint8Array' ? JSON.parse(new TextDecoder().decode(request.body.body)) : undefined;
      seen.push({ method: request.method, url: request.url, headers: request.headers, body });
      const result = routes[key];
      const payload =
        result === undefined
          ? { success: false, errors: [{ code: 7003, message: 'no route' }], result: null }
          : { success: true, errors: [], result };
      return HttpClientResponse.fromWeb(
        request,
        new Response(JSON.stringify(payload), { headers: { 'content-type': 'application/json' } }),
      );
    }),
  );
  return { seen, layer: Layer.succeed(HttpClient.HttpClient, client) };
};

const run = <A, E>(
  effect: Effect.Effect<A, E, CloudflareApi>,
  routes: Record<string, unknown>,
  auth: CloudflareAuth = { token: Redacted.make('t0k3n') },
) => {
  const fake = fakeClient(routes);
  const api = layer(auth).pipe(Layer.provide(fake.layer));
  return { seen: fake.seen, result: Effect.runPromise(effect.pipe(Effect.provide(api))) };
};

describe('CloudflareApi', () => {
  it('lists accounts with a bearer token', async () => {
    const { seen, result } = run(
      Effect.flatMap(CloudflareApi, (api) => api.accounts()),
      { 'GET /client/v4/accounts': [{ id: 'a1', name: 'Alien Labs' }] },
    );
    expect(await result).toEqual([{ id: 'a1', name: 'Alien Labs' }]);
    expect(seen[0]?.headers['authorization']).toBe('Bearer t0k3n');
  });

  it('uses key + email auth and query params', async () => {
    const { seen, result } = run(
      Effect.flatMap(CloudflareApi, (api) => api.zones('a1')),
      { 'GET /client/v4/zones?account.id=a1': [{ id: 'z1', name: 'alienlabs.io', status: 'active' }] },
      { key: Redacted.make('k3y'), email: 'rich@alienlabs.io' },
    );
    expect((await result).map((zone) => zone.name)).toEqual(['alienlabs.io']);
    expect(seen[0]?.headers['x-auth-key']).toBe('k3y');
    expect(seen[0]?.headers['x-auth-email']).toBe('rich@alienlabs.io');
  });

  it('patches a build trigger', async () => {
    const trigger = {
      trigger_uuid: 't1',
      trigger_name: 'Deploy non-production branches',
      build_command: 'pnpm build',
      deploy_command: 'npx wrangler versions upload',
      root_directory: 'packages/web',
      branch_includes: ['*'],
      branch_excludes: ['production'],
    };
    const { seen, result } = run(
      Effect.flatMap(CloudflareApi, (api) => api.updateBuildTrigger('a1', 't1', { build_command: 'pnpm build' })),
      { 'PATCH /client/v4/accounts/a1/builds/triggers/t1': trigger },
    );
    expect((await result).build_command).toBe('pnpm build');
    expect(seen[0]?.body).toEqual({ build_command: 'pnpm build' });
  });

  it('fails with CloudflareError on an unsuccessful envelope', async () => {
    const error = await Effect.runPromise(
      Effect.flatMap(CloudflareApi, (api) => api.accounts()).pipe(
        Effect.flip,
        Effect.provide(layer({ token: Redacted.make('x') }).pipe(Layer.provide(fakeClient({}).layer))),
      ),
    );
    expect(error).toBeInstanceOf(CloudflareError);
    expect((error as CloudflareError).errors[0]?.code).toBe(7003);
  });
});
