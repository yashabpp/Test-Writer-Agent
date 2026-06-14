/**
 * promiseUtils.ts
 * Promise utility functions: retry, timeout, debounce, throttle.
 */

export class TimeoutError extends Error {
  constructor(ms: number) {
    super(`Operation timed out after ${ms}ms`);
    this.name = 'TimeoutError';
  }
}

export class RetryExhaustedError extends Error {
  public readonly lastError: unknown;
  constructor(attempts: number, lastError: unknown) {
    super(`All ${attempts} retry attempts failed`);
    this.name = 'RetryExhaustedError';
    this.lastError = lastError;
  }
}

/**
 * Retries an async function up to `attempts` times with optional delay.
 * @param fn      The async function to retry.
 * @param attempts Number of attempts (default: 3).
 * @param delayMs  Delay between retries in ms (default: 0).
 * @throws {RetryExhaustedError} after all attempts fail.
 */
export async function retry<T>(
  fn: () => Promise<T>,
  attempts = 3,
  delayMs = 0
): Promise<T> {
  if (attempts <= 0) throw new RangeError('attempts must be positive');
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i < attempts - 1 && delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  throw new RetryExhaustedError(attempts, lastError);
}

/**
 * Wraps a promise with a timeout.
 * @throws {TimeoutError} if the promise does not resolve within `ms` milliseconds.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  if (ms <= 0) return Promise.reject(new RangeError('Timeout must be positive'));
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new TimeoutError(ms)), ms)
    ),
  ]);
}

/**
 * Returns a debounced version of the function.
 * The function is called only after `waitMs` milliseconds have elapsed since the last call.
 */
export function debounce<T extends unknown[]>(
  fn: (...args: T) => void,
  waitMs: number
): { (...args: T): void; cancel: () => void } {
  let timerId: ReturnType<typeof setTimeout> | undefined;

  function debounced(...args: T): void {
    if (timerId !== undefined) clearTimeout(timerId);
    timerId = setTimeout(() => {
      fn(...args);
      timerId = undefined;
    }, waitMs);
  }

  debounced.cancel = (): void => {
    if (timerId !== undefined) {
      clearTimeout(timerId);
      timerId = undefined;
    }
  };

  return debounced;
}

/**
 * Returns a throttled version of the function.
 * The function is called at most once per `limitMs` milliseconds.
 */
export function throttle<T extends unknown[]>(
  fn: (...args: T) => void,
  limitMs: number
): (...args: T) => void {
  let lastCallTime = 0;
  return function (...args: T): void {
    const now = Date.now();
    if (now - lastCallTime >= limitMs) {
      lastCallTime = now;
      fn(...args);
    }
  };
}

/**
 * Resolves all promises and returns results, distinguishing fulfilled from rejected.
 */
export async function allSettledGrouped<T>(
  promises: Promise<T>[]
): Promise<{ fulfilled: T[]; rejected: unknown[] }> {
  const results = await Promise.allSettled(promises);
  const fulfilled: T[] = [];
  const rejected: unknown[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled') fulfilled.push(result.value);
    else rejected.push(result.reason);
  }
  return { fulfilled, rejected };
}
