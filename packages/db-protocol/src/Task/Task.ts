/**
 * Effect concepts used in this file:
 *
 * - Schema: a runtime validator and TypeScript type in one; `Schema.Literal`, `UUID`, `Date`,
 *   `optional`, `Trim` and `nonEmptyString` compose into the field rules.
 *
 * - Schema.Class: a schema that is also a class, so `new Task({...})` validates and `instanceof`
 *   works; `Type` is the decoded (in-memory) shape, `Encoded` the wire shape (dates as strings).
 *
 * - propertySignature + withConstructorDefault: a field the constructor fills in when omitted.
 *
 * - decodeUnknownSync / encodeSync: parse untrusted input into a Task (throwing on failure) and
 *   turn a Task back into its wire form.
 */

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
