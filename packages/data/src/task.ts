import { Schema } from 'effect';

export const TaskStatus = Schema.Literal('todo', 'in-progress', 'done');
export type TaskStatus = typeof TaskStatus.Type;

export class Task extends Schema.Class<Task>('Task')({
  id: Schema.UUID,
  title: Schema.Trim.pipe(Schema.nonEmptyString()),
  description: Schema.optional(Schema.String),
  status: TaskStatus.pipe(
    Schema.propertySignature,
    Schema.withConstructorDefault(() => 'todo' as const),
  ),
  createdAt: Schema.Date,
}) {}

export type TaskEncoded = typeof Task.Encoded;

export const decodeTask = Schema.decodeUnknownSync(Task);
export const encodeTask = Schema.encodeSync(Task);
