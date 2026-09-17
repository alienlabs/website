import {
  HttpApi,
  HttpApiClient,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  HttpClient,
  HttpClientRequest,
} from '@effect/platform';
import { Config, Context, Effect, Layer, Redacted, Schema } from 'effect';

import { Account, Build, BuildLogs, BuildTrigger, Envelope, ErrorEnvelope, Zone } from './schema';

const BASE_URL = 'https://api.cloudflare.com/client/v4';

const accountId = HttpApiSchema.param('accountId', Schema.String);
const buildId = HttpApiSchema.param('buildId', Schema.String);
const triggerId = HttpApiSchema.param('triggerId', Schema.String);

/** Cloudflare v4 REST API, declared with HttpApi; the client (and, if ever needed, a server) derive from it. */
export class CloudflareApi extends HttpApi.make('Cloudflare')
  .add(
    HttpApiGroup.make('accounts').add(
      HttpApiEndpoint.get('list', '/accounts').addSuccess(Envelope(Schema.Array(Account))),
    ),
  )
  .add(
    HttpApiGroup.make('zones').add(
      HttpApiEndpoint.get('list', '/zones')
        .setUrlParams(Schema.Struct({ 'account.id': Schema.optional(Schema.String) }))
        .addSuccess(Envelope(Schema.Array(Zone))),
    ),
  )
  .add(
    HttpApiGroup.make('builds')
      .add(HttpApiEndpoint.get('get')`/accounts/${accountId}/builds/builds/${buildId}`.addSuccess(Envelope(Build)))
      .add(
        HttpApiEndpoint.get('logs')`/accounts/${accountId}/builds/builds/${buildId}/logs`.addSuccess(
          Envelope(BuildLogs),
        ),
      )
      .add(
        HttpApiEndpoint.patch('updateTrigger')`/accounts/${accountId}/builds/triggers/${triggerId}`
          .setPayload(Schema.partial(BuildTrigger.pick('build_command', 'deploy_command', 'root_directory')))
          .addSuccess(Envelope(BuildTrigger)),
      ),
  )
  // Cloudflare reports failures in the same envelope shape with a 4xx status.
  .addError(ErrorEnvelope, { status: 400 })
  .addError(ErrorEnvelope, { status: 403 })
  .addError(ErrorEnvelope, { status: 404 }) {}

/** Credentials: either an API token (Bearer) or the legacy global key + email. */
export type CloudflareAuth =
  | { readonly token: Redacted.Redacted }
  | { readonly key: Redacted.Redacted; readonly email: string };

const authHeaders = (auth: CloudflareAuth) =>
  'token' in auth
    ? { authorization: `Bearer ${Redacted.value(auth.token)}` }
    : { 'x-auth-key': Redacted.value(auth.key), 'x-auth-email': auth.email };

/** The derived client, keyed by group and endpoint: `client.zones.list({ urlParams: { 'account.id' } })`. */
export type CloudflareClient = Effect.Effect.Success<ReturnType<typeof makeClient>>;

export const makeClient = (auth: CloudflareAuth) =>
  HttpApiClient.make(CloudflareApi, {
    baseUrl: BASE_URL,
    transformClient: HttpClient.mapRequest(HttpClientRequest.setHeaders(authHeaders(auth))),
  });

export class Cloudflare extends Context.Tag('@alienlabs/cloudflare/Cloudflare')<Cloudflare, CloudflareClient>() {
  /** Layer with explicit credentials (tests, scripts). */
  static readonly layer = (auth: CloudflareAuth) => Layer.effect(Cloudflare, makeClient(auth));

  /** Layer wired from the environment: CLOUDFLARE_API_TOKEN, or CLOUDFLARE_API_KEY + CLOUDFLARE_EMAIL. */
  static readonly layerFromEnv = Layer.effect(
    Cloudflare,
    Effect.gen(function* () {
      const token = yield* Config.option(Config.redacted('CLOUDFLARE_API_TOKEN'));
      const auth: CloudflareAuth =
        token._tag === 'Some'
          ? { token: token.value }
          : { key: yield* Config.redacted('CLOUDFLARE_API_KEY'), email: yield* Config.string('CLOUDFLARE_EMAIL') };
      return yield* makeClient(auth);
    }),
  );
}

/** Unwraps a successful envelope to its `result`. */
export const result = <A, E, R>(effect: Effect.Effect<{ readonly result: A }, E, R>) =>
  Effect.map(effect, (envelope) => envelope.result);
