import { HttpApiBuilder, HttpServer } from '@effect/platform';
import { Layer } from 'effect';

import { ApiLive } from './handlers';
import { TaskStore } from './store';

export type Env = Record<string, never>;

/** Browsers may call the API from the site itself, and from a dev server on localhost. */
const ALLOWED_ORIGINS = [
  'https://alienlabs.io',
  'https://www.alienlabs.io',
  'https://alienlaboratories.com',
  'https://www.alienlaboratories.com',
];

const isAllowedOrigin = (origin: string) =>
  ALLOWED_ORIGINS.includes(origin) || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

const CorsLive = HttpApiBuilder.middlewareCors({
  allowedOrigins: isAllowedOrigin,
  allowedMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['content-type'],
  maxAge: 86_400,
});

const { handler } = HttpApiBuilder.toWebHandler(
  Layer.mergeAll(ApiLive.pipe(Layer.provide(TaskStore.memory)), CorsLive, HttpServer.layerContext),
);

export default {
  fetch: (request: Request) => handler(request),
} satisfies ExportedHandler<Env>;
