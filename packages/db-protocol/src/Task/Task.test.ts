/**
 * Effect concepts used in this file:
 *
 * - Schema.is: a type guard derived from a schema, for checking a value without decoding it.
 */

import { Schema } from 'effect';
import { v4 as uuid } from 'uuid';
import { describe, expect, it } from 'vitest';

import * as Task from './Task';

const id = uuid();

describe('Task', () => {
  it('constructs with defaults', () => {
    const task = new Task.Task({ id, createdAt: new Date('2026-09-17T00:00:00Z'), title: 'Write tests' });
    expect(task.status).toBe('todo');
    expect(task.description).toBeUndefined();
    expect(task).toBeInstanceOf(Task.Task);
  });

  it('decodes from the wire format and encodes back', () => {
    const encoded = { id, createdAt: '2026-09-17T12:34:56.000Z', title: ' Ship it ', status: 'done' };
    const task = Task.decodeTask(encoded);
    expect(task.createdAt).toEqual(new Date('2026-09-17T12:34:56.000Z'));
    expect(task.title).toBe('Ship it');
    expect(Task.encodeTask(task)).toEqual({ ...encoded, title: 'Ship it' });
  });

  it('rejects invalid input', () => {
    expect(() => Task.decodeTask({ id: 'nope', createdAt: 'yesterday', title: '' })).toThrow();
    expect(() => Task.decodeTask({ id, createdAt: '2026-09-17T00:00:00Z', title: 'x', status: 'broken' })).toThrow();
    expect(Schema.is(Task.Task)({ id, title: 'x' })).toBe(false);
  });
});
