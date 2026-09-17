import { Schema } from 'effect';

export const TaskStatus = Schema.Literal('todo', 'started', 'blocked', 'done');
export type TaskStatus = typeof TaskStatus.Type;

export class Task extends Schema.Class<Task>('Task')({
  id: Schema.UUID,
  createdAt: Schema.Date,
  title: Schema.Trim.pipe(Schema.nonEmptyString()),
  description: Schema.optional(Schema.String),
  status: TaskStatus.pipe(
    Schema.propertySignature,
    Schema.withConstructorDefault(() => 'todo' as const),
  ),
}) {}

export type TaskEncoded = typeof Task.Encoded;

export const decodeTask = Schema.decodeUnknownSync(Task);
export const encodeTask = Schema.encodeSync(Task);
