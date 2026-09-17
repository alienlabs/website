import { HttpClient, HttpClientResponse, UrlParams } from '@effect/platform';
import { Effect, Layer, Redacted } from 'effect';
import { describe, expect, it } from 'vitest';

import { Cloudflare, type CloudflareAuth, result } from './CloudflareApi';
import { ErrorEnvelope } from './schema';

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
      const hit = routes[key];
      const payload =
        hit === undefined
          ? { success: false, errors: [{ code: 7003, message: 'no route' }], result: null }
          : { success: true, errors: [], result: hit };
      return HttpClientResponse.fromWeb(
        request,
        new Response(JSON.stringify(payload), {
          status: hit === undefined ? 404 : 200,
          headers: { 'content-type': 'application/json' },
        }),
      );
    }),
  );
  return { seen, layer: Layer.succeed(HttpClient.HttpClient, client) };
};

const run = <A, E>(
  effect: Effect.Effect<A, E, Cloudflare>,
  routes: Record<string, unknown>,
  auth: CloudflareAuth = { token: Redacted.make('t0k3n') },
) => {
  const fake = fakeClient(routes);
  const layer = Cloudflare.layer(auth).pipe(Layer.provide(fake.layer));
  return { seen: fake.seen, result: Effect.runPromise(effect.pipe(Effect.provide(layer))) };
};

describe('Cloudflare', () => {
  it('lists accounts with a bearer token', async () => {
    const { seen, result: accounts } = run(
      Effect.flatMap(Cloudflare, (cf) => result(cf.accounts.list())),
      { 'GET /client/v4/accounts': [{ id: 'a1', name: 'Alien Labs' }] },
    );
    expect(await accounts).toEqual([{ id: 'a1', name: 'Alien Labs' }]);
    expect(seen[0]?.headers['authorization']).toBe('Bearer t0k3n');
  });

  it('uses key + email auth and query params', async () => {
    const { seen, result: zones } = run(
      Effect.flatMap(Cloudflare, (cf) => result(cf.zones.list({ urlParams: { 'account.id': 'a1' } }))),
      { 'GET /client/v4/zones?account.id=a1': [{ id: 'z1', name: 'alienlabs.io', status: 'active' }] },
      { key: Redacted.make('k3y'), email: 'rich@alienlabs.io' },
    );
    expect((await zones).map((zone) => zone.name)).toEqual(['alienlabs.io']);
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
    const { seen, result: updated } = run(
      Effect.flatMap(Cloudflare, (cf) =>
        result(
          cf.builds.updateTrigger({
            path: { accountId: 'a1', triggerId: 't1' },
            payload: { build_command: 'pnpm build' },
          }),
        ),
      ),
      { 'PATCH /client/v4/accounts/a1/builds/triggers/t1': trigger },
    );
    expect((await updated).build_command).toBe('pnpm build');
    expect(seen[0]?.body).toEqual({ build_command: 'pnpm build' });
  });

  it('fails with the error envelope on a 4xx response', async () => {
    const fake = fakeClient({});
    const error = await Effect.runPromise(
      Effect.flatMap(Cloudflare, (cf) => cf.accounts.list()).pipe(
        Effect.flip,
        Effect.provide(Cloudflare.layer({ token: Redacted.make('x') }).pipe(Layer.provide(fake.layer))),
      ),
    );
    expect(error).toBeInstanceOf(ErrorEnvelope);
    expect((error as ErrorEnvelope).errors[0]?.code).toBe(7003);
  });
});
