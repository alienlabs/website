import { Schema } from 'effect';
import { v4 as uuid } from 'uuid';
import { describe, expect, it } from 'vitest';

import { Task, decodeTask, encodeTask } from './task';

const id = uuid();

describe('Task', () => {
  it('constructs with defaults', () => {
    const task = new Task({ id, title: 'Write tests', createdAt: new Date('2026-09-17T00:00:00Z') });
    expect(task.status).toBe('todo');
    expect(task.description).toBeUndefined();
    expect(task).toBeInstanceOf(Task);
  });

  it('decodes from the wire format and encodes back', () => {
    const encoded = { id, title: ' Ship it ', status: 'done', createdAt: '2026-09-17T12:34:56.000Z' };
    const task = decodeTask(encoded);
    expect(task.createdAt).toEqual(new Date('2026-09-17T12:34:56.000Z'));
    expect(task.title).toBe('Ship it');
    expect(encodeTask(task)).toEqual({ ...encoded, title: 'Ship it' });
  });

  it('rejects invalid input', () => {
    expect(() => decodeTask({ id: 'nope', title: '', createdAt: 'yesterday' })).toThrow();
    expect(() => decodeTask({ id, title: 'x', status: 'blocked', createdAt: '2026-09-17T00:00:00Z' })).toThrow();
    expect(Schema.is(Task)({ id, title: 'x' })).toBe(false);
  });
});
