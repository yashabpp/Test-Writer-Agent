/**
 * arrayUtils.ts
 * Functional array manipulation utilities.
 */

/** Splits an array into chunks of the specified size. */
export function chunk<T>(arr: T[], size: number): T[][] {
  if (size <= 0) throw new RangeError('Chunk size must be greater than 0');
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

/** Flattens a nested array one level deep. */
export function flatten<T>(arr: (T | T[])[]): T[] {
  return arr.reduce<T[]>((acc, val) => acc.concat(val), []);
}

/** Returns a new array with duplicate values removed (preserves order). */
export function unique<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

/**
 * Groups array elements by a key selector function.
 * Returns a Map from key to array of elements.
 */
export function groupBy<T, K extends string | number | symbol>(
  arr: T[],
  keySelector: (item: T) => K
): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of arr) {
    const key = keySelector(item);
    const group = map.get(key) ?? [];
    group.push(item);
    map.set(key, group);
  }
  return map;
}

/**
 * Zips two arrays together into an array of tuples.
 * Stops at the length of the shorter array.
 */
export function zip<A, B>(a: A[], b: B[]): [A, B][] {
  const length = Math.min(a.length, b.length);
  const result: [A, B][] = [];
  for (let i = 0; i < length; i++) {
    result.push([a[i] as A, b[i] as B]);
  }
  return result;
}

/** Returns the intersection of two arrays (elements present in both). */
export function intersection<T>(a: T[], b: T[]): T[] {
  const setB = new Set(b);
  return a.filter((item) => setB.has(item));
}

/** Returns elements in a that are not in b. */
export function difference<T>(a: T[], b: T[]): T[] {
  const setB = new Set(b);
  return a.filter((item) => !setB.has(item));
}

/** Returns a new array with elements in random order (Fisher-Yates shuffle). */
export function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j] as T, result[i] as T];
  }
  return result;
}
