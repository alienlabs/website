/**
 * Effect concepts used in this file:
 *
 * - Effect<A, E, R>: a lazy computation that succeeds with A, may fail with E and needs services R;
 *   nothing runs until the program is executed at the edge (here, the HTTP handler).
 *
 * - Context.Tag: a typed key that declares a service (its shape) so code can require it via `R`.
 *
 * - Layer: a recipe that builds a service (dependency injection); swap layers to swap
 *   implementations (memory → KV) without touching consumers.
 *
 * - Option: an explicit "present or absent" value instead of undefined.
 *
 * - Effect.sync: wraps a synchronous, non-throwing function as an Effect.
 */

import { Context, Effect, Layer, Option } from 'effect';

import type { Task } from '@alienlabs/db-protocol';

/** Task persistence; the in-memory implementation is per isolate and will give way to KV/D1. */
export class TaskStore extends Context.Tag('@alienlabs/db-service/TaskStore')<
  TaskStore,
  {
    readonly list: () => Effect.Effect<ReadonlyArray<Task.Task>>;
    readonly get: (id: string) => Effect.Effect<Option.Option<Task.Task>>;
    readonly put: (task: Task.Task) => Effect.Effect<void>;
    readonly remove: (id: string) => Effect.Effect<boolean>;
  }
>() {
  static readonly memory = Layer.sync(TaskStore, () => {
    // TODO(burdon): Replace with KV store.
    const tasks = new Map<string, Task.Task>();
    return TaskStore.of({
      list: () => Effect.sync(() => [...tasks.values()]),
      get: (id) => Effect.sync(() => Option.fromNullable(tasks.get(id))),
      put: (task) => Effect.sync(() => void tasks.set(task.id, task)),
      remove: (id) => Effect.sync(() => tasks.delete(id)),
    });
  });
}
