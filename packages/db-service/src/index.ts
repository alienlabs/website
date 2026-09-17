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
