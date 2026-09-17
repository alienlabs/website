import { Schema } from 'effect';

export const ApiError = Schema.Struct({ code: Schema.Number, message: Schema.String });

/** Every Cloudflare v4 response is wrapped in this envelope. */
export const Envelope = <A, I, R>(result: Schema.Schema<A, I, R>) =>
  Schema.Struct({
    success: Schema.Literal(true),
    errors: Schema.Array(ApiError),
    result,
  });

/** A failed request: same envelope, `success: false`, errors populated (the API sends no `_tag`). */
export class ErrorEnvelope extends Schema.Class<ErrorEnvelope>('ErrorEnvelope')({
  success: Schema.Literal(false),
  errors: Schema.Array(ApiError),
  result: Schema.NullOr(Schema.Unknown),
}) {
  get message() {
    return this.errors.map(({ code, message }) => `${code}: ${message}`).join('; ');
  }
}

export const Account = Schema.Struct({ id: Schema.String, name: Schema.String });
export type Account = typeof Account.Type;

export const Zone = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  status: Schema.String,
  name_servers: Schema.optional(Schema.Array(Schema.String)),
});
export type Zone = typeof Zone.Type;

/** Workers Builds: the build configuration attached to a Git-connected Worker. */
export const BuildTrigger = Schema.Struct({
  trigger_uuid: Schema.String,
  trigger_name: Schema.String,
  build_command: Schema.NullOr(Schema.String),
  deploy_command: Schema.NullOr(Schema.String),
  root_directory: Schema.NullOr(Schema.String),
  branch_includes: Schema.Array(Schema.String),
  branch_excludes: Schema.Array(Schema.String),
});
export type BuildTrigger = typeof BuildTrigger.Type;

export const Build = Schema.Struct({
  build_uuid: Schema.String,
  status: Schema.String,
  build_outcome: Schema.NullOr(Schema.String),
  trigger: BuildTrigger,
});
export type Build = typeof Build.Type;

export const BuildLogLine = Schema.Tuple(Schema.String, Schema.String); // [timestamp, line]
export const BuildLogs = Schema.Struct({ lines: Schema.Array(BuildLogLine), truncated: Schema.Boolean });
export type BuildLogs = typeof BuildLogs.Type;
