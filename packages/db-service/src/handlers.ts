import { HttpApiBuilder, HttpApiError } from '@effect/platform';
import { Effect, Layer, Option } from 'effect';

import { TasksApi } from './api';
import { TaskStore } from './store';

const TasksLive = HttpApiBuilder.group(TasksApi, 'tasks', (handlers) =>
  Effect.gen(function* () {
    const store = yield* TaskStore;
    const found = <A>(option: Option.Option<A>) =>
      Option.match(option, { onNone: () => Effect.fail(new HttpApiError.NotFound()), onSome: Effect.succeed });
    return handlers
      .handle('list', () => store.list())
      .handle('create', ({ payload }) => store.put(payload).pipe(Effect.as(payload)))
      .handle('read', ({ path }) => store.get(path.id).pipe(Effect.flatMap(found)))
      .handle('delete', ({ path }) =>
        store
          .remove(path.id)
          .pipe(Effect.flatMap((removed) => (removed ? Effect.void : Effect.fail(new HttpApiError.NotFound())))),
      );
  }),
);

/** The whole API, given a TaskStore. */
export const ApiLive = HttpApiBuilder.api(TasksApi).pipe(Layer.provide(TasksLive));
