import { Context, Effect, Layer, Option } from 'effect';

import type { Task } from '@alienlabs/db-protocol';

type Task = Task.Task;

/** Task persistence; the in-memory implementation is per isolate and will give way to D1/Durable Objects. */
export class TaskStore extends Context.Tag('@alienlabs/db-service/TaskStore')<
  TaskStore,
  {
    readonly list: () => Effect.Effect<ReadonlyArray<Task>>;
    readonly get: (id: string) => Effect.Effect<Option.Option<Task>>;
    readonly put: (task: Task) => Effect.Effect<void>;
    readonly remove: (id: string) => Effect.Effect<boolean>;
  }
>() {
  static readonly memory = Layer.sync(TaskStore, () => {
    const tasks = new Map<string, Task>();
    return TaskStore.of({
      list: () => Effect.sync(() => [...tasks.values()]),
      get: (id) => Effect.sync(() => Option.fromNullable(tasks.get(id))),
      put: (task) => Effect.sync(() => void tasks.set(task.id, task)),
      remove: (id) => Effect.sync(() => tasks.delete(id)),
    });
  });
}
