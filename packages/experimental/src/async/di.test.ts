/**
 * Dependency injection with Effect: one abstract service, two implementations, one program.
 *
 * `Logger` is declared once as a service (its interface). `ConsoleLogger` and `FileLogger` are
 * Layers that build it differently. `program` only knows the interface, so the same effect value
 * runs unchanged against both — the layer is chosen at the edge, by the caller.
 *
 * Effect concepts used in this file:
 *
 * - Context.Tag: declares the service `Logger` (a typed key + interface).
 *
 * - Layer.succeed / Layer.effect: build a service from a plain value, or from an effect that may
 *   itself need services (FileLogger needs FileSystem) or set up resources.
 *
 * - Layer.provide: satisfy one layer's requirements with another (FileLogger ⇐ NodeFileSystem).
 *
 * - Effect.provide: run a program with a concrete layer for its requirements.
 */

import { FileSystem } from '@effect/platform';
import { NodeFileSystem } from '@effect/platform-node';
import { Context, Effect, Layer } from 'effect';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

/** The abstract service: what a logger can do, nothing about how. */
class Logger extends Context.Tag('experimental/Logger')<
  Logger,
  { readonly log: (message: string) => Effect.Effect<void> }
>() {}

/** Implementation 1: writes to the console. Needs nothing, so a plain value suffices. */
const ConsoleLogger = Layer.succeed(Logger, Logger.of({ log: (message) => Effect.sync(() => console.log(message)) }));

/** Implementation 2: appends to a file. Depends on the FileSystem service, so it is built by an effect. */
const FileLogger = (file: string) =>
  Layer.effect(
    Logger,
    Effect.gen(function* () {
      const fileSystem = yield* FileSystem.FileSystem;
      return Logger.of({
        log: (message) => fileSystem.writeFileString(file, `${message}\n`, { flag: 'a' }).pipe(Effect.orDie),
      });
    }),
  );

/** The program: requires a Logger (R = Logger) and is otherwise oblivious to the implementation. */
const program = (name: string) =>
  Effect.gen(function* () {
    const logger = yield* Logger;
    yield* logger.log(`hello, ${name}`);
    yield* logger.log(`goodbye, ${name}`);
    return name.length;
  });

describe('dependency injection', () => {
  it('runs against the console logger', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    expect(await Effect.runPromise(program('console').pipe(Effect.provide(ConsoleLogger)))).toBe(7);
    expect(log.mock.calls.map(([message]) => message)).toEqual(['hello, console', 'goodbye, console']);
    log.mockRestore();
  });

  it('runs against the file logger', async () => {
    const file = path.join(await fs.mkdtemp(path.join(os.tmpdir(), 'di-')), 'log.txt');
    // FileLogger's own requirement (FileSystem) is satisfied here, producing a self-contained layer.
    const layer = FileLogger(file).pipe(Layer.provide(NodeFileSystem.layer));
    expect(await Effect.runPromise(program('file').pipe(Effect.provide(layer)))).toBe(4);
    expect(await fs.readFile(file, 'utf8')).toBe('hello, file\ngoodbye, file\n');
  });

  it('the program itself is the same value either way', () => {
    // No implementation is baked in: the requirement is only in the type.
    type Requirements = Effect.Effect.Context<ReturnType<typeof program>>;
    const requiresLogger: [Requirements] extends [Logger] ? true : false = true;
    expect(requiresLogger).toBe(true);
  });
});
