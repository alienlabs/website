/**
 * The same asynchronous operation, four ways: callbacks, Promises, async/await, and Effect.
 *
 * Each section reads `data.json` from disk (real I/O, which may fail) and `main` combines the two
 * numbers in it (1..5 → 15); each is then tested for success and for a missing file.
 */

import { Data, Effect } from 'effect';
import * as fs from 'node:fs';
import { readFile as readFileAsync } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/** Files live next to this test; `missing.json` does not exist. */
const path = (name: string) => fileURLToPath(new URL(name, import.meta.url));

type Values = { values: number[] };

const parse = (content: string) => (JSON.parse(content) as Values).values;
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

/**
 * `it` with a Jest/Mocha-style `done` callback. Vitest only understands Promises (it removed
 * `done`), so the wrapper turns "call `done()`" into "resolve", and `done(error)` into "reject".
 * Caveat of the style: an assertion that throws inside a callback (setTimeout, fs) is an uncaught
 * exception rather than a rejection, so failures should be reported through `done(error)`.
 */
const test = (name: string, run: (done: (error?: unknown) => void) => void) =>
  it(name, () => new Promise<void>((resolve, reject) => run((error) => (error ? reject(error) : resolve()))));

const random = () => Math.floor(Math.random() * 100) + 1;

// 0. setTimeout: the most basic callback, and the same thing wrapped as a Promise.
describe('setTimeout', () => {
  const wait = (ms: number, callback: (ms: number) => void) => setTimeout(() => callback(ms), ms);

  const computeCallback = (ms: number, cb: (result: number) => void): void => {
    const t = setTimeout(() => {
      const result = random();
      console.log('computed', result);
      cb(result);
    }, ms);
  };

  test('calls back after the delay', (done) => {
    computeCallback(1000, (result) => {
      console.log('result', result);
      expect(result).toBeGreaterThan(0);
      done();
    });
  });

  test('compute multiple', (done) => {
    computeCallback(100, (result) => {
      computeCallback(200, (result) => {
        console.log('result', result);
        expect(result).toBeGreaterThan(0);
        done();
      });
    });
  });

  const computeAsync = (ms: number): Promise<number> => {
    return new Promise<number>((resolve) => {
      console.log('thinking...', ms);
      const t = setTimeout(() => {
        const result = random();
        console.log('computed', result);
        resolve(result);
      }, ms);
    });
  };

  it('resolves after the delay', async () => {
    console.log('step-1');
    const x = computeAsync(1000);
    console.log('step-2', { x });
    console.log('ha ha ha');
    const y = await x;
    console.log('step-3', { y });
    expect(y).toBeGreaterThan(0);
  });

  it.only('resolves many', async () => {
    const a = await computeAsync(100);
    const b = await computeAsync(100);
    const result = a + b;
    console.log('result', result);
  });

  it('resolves many', async () => {
    const r1 = computeAsync(200);
    const r2 = computeAsync(100);
    const r3 = computeAsync(300);
    const results = await Promise.all([r1, r2, r3]);
    console.log('results', results);
    expect(results).toHaveLength(3);
  });
});

// 1. Callbacks (node style: the first argument is the error, the second the value).
//    Sequencing means nesting; errors must be checked and forwarded at every level; a callback
//    that is called twice, or never, goes unnoticed by the type system.
describe('callbacks', () => {
  type Callback<T> = (error: Error | null, value?: T) => void;

  // Node's classic API: the last argument is an error-first callback.
  const readFile = (name: string, callback: Callback<string>) => fs.readFile(path(name), 'utf8', callback);

  const main = (name: string, callback: Callback<number>) => {
    readFile(name, (error, content) => {
      if (error) {
        return callback(error);
      }
      const values = parse(content!);
      readFile(name, (error) => {
        // A second read, just to show the nesting grow.
        if (error) {
          return callback(error);
        }
        callback(null, sum(values));
      });
    });
  };

  test('succeeds', (done) => {
    main('data.json', (error, value) => {
      if (error) {
        return done(error);
      }
      expect(value).toBe(15);
      done();
    });
  });

  test('fails', (done) => {
    main('missing.json', (error, value) => {
      if (!error) {
        return done(new Error('expected a failure'));
      }
      expect((error as NodeJS.ErrnoException).code).toBe('ENOENT');
      expect(value).toBeUndefined();
      done();
    });
  });
});

// 2. Promises. A Promise is a value representing the eventual result, so steps chain with `.then`
//    instead of nesting, and a single `.catch` at the end handles any failure along the chain.
describe('promises', () => {
  // The same call wrapped in a Promise by hand (what `fs/promises` does for us in the next section).
  const readFile = (name: string) =>
    new Promise<string>((resolve, reject) => {
      fs.readFile(path(name), 'utf8', (error, content) => (error ? reject(error) : resolve(content)));
    });

  const main = (name: string) =>
    readFile(name)
      .then(parse)
      .then((values) => readFile(name).then(() => sum(values)));

  it('succeeds', () => expect(main('data.json')).resolves.toBe(15));

  it('fails', () => expect(main('missing.json')).rejects.toMatchObject({ code: 'ENOENT' }));

  it('runs independent work concurrently', async () => {
    // Both reads start immediately; `Promise.all` waits for both.
    const [a, b] = await Promise.all([readFile('data.json'), readFile('data.json')]);
    expect(a).toBe(b);
  });
});

// 3. async/await: syntax over Promises. `await` pauses the function until the Promise settles, so
//    the code reads sequentially, and a rejected Promise becomes an ordinary `throw`, so `try/catch`
//    works. Under the hood it is exactly the Promise version.
describe('async/await', () => {
  // Node's Promise API.
  const readFile = (name: string) => readFileAsync(path(name), 'utf8');

  const main = async (name: string) => {
    const content = await readFile(name);
    const values = parse(content);
    await readFile(name);
    return sum(values);
  };

  it('succeeds', async () => {
    expect(await main('data.json')).toBe(15);
  });

  it('fails, and the error can be caught like a synchronous one', async () => {
    let caught: unknown;
    try {
      await main('missing.json');
    } catch (error) {
      caught = error;
    }
    expect(caught).toMatchObject({ code: 'ENOENT' });
  });

  it('is still a Promise', () => {
    expect(main('data.json')).toBeInstanceOf(Promise);
  });
});

// 4. Effect. An Effect<A, E, R> is a *description* of a computation (like a Promise it represents an
//    eventual value, unlike a Promise it does not start until run), with the failure type `E` in
//    the signature, so errors are handled by type (`catchTag`) rather than by `instanceof`, and the
//    pipeline stays a plain value that can be retried, timed out or composed before it runs.
describe('effect', () => {
  class NotFound extends Data.TaggedError('NotFound')<{ name: string }> {}

  // Effect.async bridges the callback API; the I/O error becomes a typed NotFound failure.
  const readFile = (name: string): Effect.Effect<string, NotFound> =>
    Effect.async((resume) => {
      fs.readFile(path(name), 'utf8', (error, content) =>
        resume(error ? Effect.fail(new NotFound({ name })) : Effect.succeed(content)),
      );
    });

  // Effect.gen reads like async/await; `yield*` awaits an effect and propagates its failure.
  const main = (name: string): Effect.Effect<number, NotFound> =>
    Effect.gen(function* () {
      const content = yield* readFile(name);
      const values = parse(content);
      yield* readFile(name);
      return sum(values);
    });

  it('succeeds', async () => {
    expect(await Effect.runPromise(main('data.json'))).toBe(15);
  });

  it('fails with a typed error that can be handled by tag', async () => {
    const recovered = main('missing.json').pipe(
      Effect.catchTag('NotFound', (error) => Effect.succeed(-1 * error.name.length)),
    );
    expect(await Effect.runPromise(recovered)).toBe(-'missing.json'.length);
  });

  it('is a value: nothing runs until it is executed', async () => {
    let reads = 0;
    const counted = Effect.sync(() => reads++).pipe(Effect.andThen(main('data.json')));
    expect(reads).toBe(0);
    await Effect.runPromise(counted);
    await Effect.runPromise(counted); // Running the same value again re-runs it.
    expect(reads).toBe(2);
  });

  it('composes retry and concurrency declaratively', async () => {
    const both = Effect.all([readFile('data.json'), readFile('data.json')], { concurrency: 'unbounded' });
    const [a, b] = await Effect.runPromise(both.pipe(Effect.retry({ times: 2 })));
    expect(a).toBe(b);
  });
});
