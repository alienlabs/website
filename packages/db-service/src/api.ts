/**
 * Effect concepts used in this file:
 *
 * - HttpApi / HttpApiGroup / HttpApiEndpoint: a declarative description of the API (paths, methods,
 *   payload/success/error schemas) from which both the server and typed clients derive.
 *
 * - Schema: runtime validation + TypeScript types for request and response bodies.
 *
 * - HttpApiSchema.param: a typed path parameter (here a UUID).
 */

import { HttpApi, HttpApiEndpoint, HttpApiError, HttpApiGroup, HttpApiSchema } from '@effect/platform';
import { Schema } from 'effect';

import { Task } from '@alienlabs/db-protocol';

const id = HttpApiSchema.param('id', Schema.UUID);

/**
 * db-service: a small REST API for Task objects.
 *
 *   GET    /tasks       list
 *   POST   /tasks       create (body: encoded Task)
 *   GET    /tasks/:id   read
 *   DELETE /tasks/:id   delete
 */
export class TasksApi extends HttpApi.make('db-service').add(
  HttpApiGroup.make('tasks')
    .add(HttpApiEndpoint.get('list', '/tasks').addSuccess(Schema.Array(Task.Task)))
    .add(HttpApiEndpoint.post('create', '/tasks').setPayload(Task.Task).addSuccess(Task.Task, { status: 201 }))
    .add(HttpApiEndpoint.get('read')`/tasks/${id}`.addSuccess(Task.Task).addError(HttpApiError.NotFound))
    .add(
      HttpApiEndpoint.del('delete')`/tasks/${id}`.addSuccess(HttpApiSchema.NoContent).addError(HttpApiError.NotFound),
    ),
) {}
