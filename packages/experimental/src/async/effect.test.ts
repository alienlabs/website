/**
 * Reading a file, with and without dependency injection:
 *
 * 1. Without injection: a plain async function that imports `node:fs/promises` directly. It works,
 *    but the file system is hard-wired: the only way to test it is with real files on disk, and
 *    what can go wrong is not visible in its type.
 *
 * 2. With injection (Effect): the code asks for the `FileSystem` *service* and a *Layer* supplies
 *    the implementation at the edge — Node's real filesystem in one test, an in-memory fake in the
 *    next — without changing `main`; the error type is part of the signature.
 *
 * Effect concepts used in this file:
 *
 * - FileSystem (from @effect/platform): a service interface for file I/O with typed errors
 *   (`PlatformError`), required through `R` via `yield* FileSystem.FileSystem`.
 *
 * - Layer / Effect.provide: `NodeFileSystem.layer` implements the service with `node:fs`;
 *   `FileSystem.layerNoop({...})` builds a partial fake for tests; `Effect.provide` satisfies `R`.
 */

import { FileSystem, Error as PlatformError } from '@effect/platform';
import { NodeFileSystem } from '@effect/platform-node';
import { Effect } from 'effect';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const path = (name: string) => fileURLToPath(new URL(name, import.meta.url));

type Values = { values: number[] };

const parse = (content: string) => (JSON.parse(content) as Values).values;
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

describe('sum', () => {
  it('parses the values', () => {
    expect(parse('{"values":[1,2,3,4,5]}')).toEqual([1, 2, 3, 4, 5]);
  });

  it('sums the values', () => {
    expect(sum([1, 2, 3, 4, 5])).toBe(15);
  });

  it('parses and sums the values', () => {
    expect(sum(parse('{"values":[1,2,3,4,5]}'))).toBe(15);
  });
});

describe('without injection', () => {
  const main = async (name: string): Promise<number> => {
    const content = await readFile(path(name), 'utf8');
    return sum(parse(content));
  };

  it('reads from disk', async () => {
    expect(await main('data.json')).toBe(15);
  });

  it('fails with an untyped error', async () => {
    await expect(main('missing.json')).rejects.toMatchObject({ code: 'ENOENT' });
  });
});

describe('with injection', () => {
  // R = FileSystem
  const main = (name: string): Effect.Effect<number, PlatformError.PlatformError, FileSystem.FileSystem> =>
    Effect.gen(function* () {
      const fileSystem = yield* FileSystem.FileSystem;
      const content = yield* fileSystem.readFileString(path(name));
      return sum(parse(content));
    });

  it('reads from disk when given the Node filesystem', async () => {
    expect(await Effect.runPromise(main('data.json').pipe(Effect.provide(NodeFileSystem.layer)))).toBe(15);
  });

  it('reads from a fake filesystem when given one', async () => {
    const fake = FileSystem.layerNoop({
      readFileString: () => Effect.succeed(JSON.stringify({ values: [1, 2, 3] })),
    });

    expect(await Effect.runPromise(main('anything.json').pipe(Effect.provide(fake)))).toBe(6);
  });

  it('fails with a typed error that can be handled by tag', async () => {
    // The failure is a PlatformError (here a SystemError with reason NotFound), so it is handled
    // by `catchTag` on the error's `_tag`, not by inspecting a thrown value.
    const recovered = main('missing.json').pipe(
      Effect.catchTag('SystemError', (error) => Effect.succeed(error.reason === 'NotFound' ? -1 : -2)),
      Effect.provide(NodeFileSystem.layer),
    );

    expect(await Effect.runPromise(recovered)).toBe(-1);
  });

  it('fails when the injected filesystem fails', async () => {
    // A fake that always fails, to test the failure path without touching the disk.
    const failing = FileSystem.layerNoop({
      readFileString: (file) =>
        Effect.fail(
          new PlatformError.BadArgument({ module: 'FileSystem', method: 'readFileString', description: file }),
        ),
    });

    const exit = await Effect.runPromiseExit(main('data.json').pipe(Effect.provide(failing)));
    expect(exit._tag).toBe('Failure');
  });
});
