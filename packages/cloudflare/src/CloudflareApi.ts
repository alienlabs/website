import { HttpClient, HttpClientError, HttpClientRequest, HttpClientResponse } from '@effect/platform';
import { Config, Context, Data, Effect, Layer, ParseResult, Redacted, Schema } from 'effect';

import { Account, Build, BuildLogs, BuildTrigger, Envelope, Zone } from './schema';

const BASE_URL = 'https://api.cloudflare.com/client/v4';

/** A request the API answered with `success: false`. */
export class CloudflareError extends Data.TaggedError('CloudflareError')<{
  readonly path: string;
  readonly errors: ReadonlyArray<{ code: number; message: string }>;
}> {}

/** Credentials: either an API token (Bearer) or the legacy global key + email. */
export type CloudflareAuth =
  | { readonly token: Redacted.Redacted }
  | { readonly key: Redacted.Redacted; readonly email: string };

export class CloudflareApi extends Context.Tag('@alienlabs/cloudflare/CloudflareApi')<
  CloudflareApi,
  {
    readonly accounts: () => Effect.Effect<ReadonlyArray<Account>, CloudflareError | ApiFailure>;
    readonly zones: (accountId: string) => Effect.Effect<ReadonlyArray<Zone>, CloudflareError | ApiFailure>;
    readonly build: (accountId: string, buildId: string) => Effect.Effect<Build, CloudflareError | ApiFailure>;
    readonly buildLogs: (accountId: string, buildId: string) => Effect.Effect<BuildLogs, CloudflareError | ApiFailure>;
    readonly updateBuildTrigger: (
      accountId: string,
      triggerId: string,
      patch: Partial<Pick<BuildTrigger, 'build_command' | 'deploy_command' | 'root_directory'>>,
    ) => Effect.Effect<BuildTrigger, CloudflareError | ApiFailure>;
  }
>() {}

/** Transport or decoding failures, as raised by the HTTP client and schema layer. */
export type ApiFailure = HttpClientError.HttpClientError | ParseResult.ParseError;

const headers = (auth: CloudflareAuth) =>
  'token' in auth
    ? { authorization: `Bearer ${Redacted.value(auth.token)}` }
    : { 'x-auth-key': Redacted.value(auth.key), 'x-auth-email': auth.email };

/** Builds the service from an HttpClient; the caller provides credentials. */
export const make = (auth: CloudflareAuth) =>
  Effect.gen(function* () {
    const client = (yield* HttpClient.HttpClient).pipe(
      HttpClient.mapRequest(HttpClientRequest.prependUrl(BASE_URL)),
      HttpClient.mapRequest(HttpClientRequest.setHeaders(headers(auth))),
    );

    // Sends a request and unwraps the envelope, failing on `success: false` or a null result.
    const call = <A, I>(schema: Schema.Schema<A, I>, request: HttpClientRequest.HttpClientRequest) =>
      client.execute(request).pipe(
        Effect.flatMap(HttpClientResponse.schemaBodyJson(Envelope(schema))),
        Effect.flatMap(({ success, errors, result }) =>
          success && result !== null
            ? Effect.succeed(result)
            : Effect.fail(new CloudflareError({ path: request.url, errors })),
        ),
        Effect.scoped,
      );

    return CloudflareApi.of({
      accounts: () => call(Schema.Array(Account), HttpClientRequest.get('/accounts')),
      zones: (accountId) =>
        call(
          Schema.Array(Zone),
          HttpClientRequest.get('/zones').pipe(HttpClientRequest.setUrlParam('account.id', accountId)),
        ),
      build: (accountId, buildId) =>
        call(Build, HttpClientRequest.get(`/accounts/${accountId}/builds/builds/${buildId}`)),
      buildLogs: (accountId, buildId) =>
        call(BuildLogs, HttpClientRequest.get(`/accounts/${accountId}/builds/builds/${buildId}/logs`)),
      updateBuildTrigger: (accountId, triggerId, patch) =>
        call(
          BuildTrigger,
          HttpClientRequest.patch(`/accounts/${accountId}/builds/triggers/${triggerId}`).pipe(
            HttpClientRequest.bodyUnsafeJson(patch),
          ),
        ),
    });
  });

/** Layer wired from the environment: CLOUDFLARE_API_TOKEN, or CLOUDFLARE_API_KEY + CLOUDFLARE_EMAIL. */
export const layerFromEnv = Layer.effect(
  CloudflareApi,
  Effect.gen(function* () {
    const token = yield* Config.option(Config.redacted('CLOUDFLARE_API_TOKEN'));
    const auth: CloudflareAuth =
      token._tag === 'Some'
        ? { token: token.value }
        : { key: yield* Config.redacted('CLOUDFLARE_API_KEY'), email: yield* Config.string('CLOUDFLARE_EMAIL') };
    return yield* make(auth);
  }),
);

/** Layer with explicit credentials (tests, scripts). */
export const layer = (auth: CloudflareAuth) => Layer.effect(CloudflareApi, make(auth));
