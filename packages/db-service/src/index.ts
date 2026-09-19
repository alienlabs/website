/**
 * Effect concepts used in this file:
 *
 * - Layer.mergeAll / Layer.provide: assemble the application's services (API + store + HTTP
 *   platform) into one dependency graph.
 *
 * - HttpApiBuilder.toWebHandler: turns the API layer into a standard `(Request) => Response`
 *   function, which is what a Cloudflare Worker's `fetch` needs.
 */

import { HttpApiBuilder, HttpServer } from '@effect/platform';
import { Layer } from 'effect';

import { ApiLive } from './handlers';
import { TaskStore } from './store';

export type Env = Record<string, never>;

const { handler } = HttpApiBuilder.toWebHandler(
  Layer.mergeAll(ApiLive.pipe(Layer.provide(TaskStore.memory)), HttpServer.layerContext),
);

export default {
  fetch: (request: Request) => handler(request),
} satisfies ExportedHandler<Env>;
