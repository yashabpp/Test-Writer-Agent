/**
 * objectUtils.ts
 * Object manipulation utilities: deep clone, merge, pick, omit, flatten.
 */

type PlainObject = Record<string, unknown>;

/**
 * Deep clones a plain object or array using JSON serialization.
 * Does not support: functions, Dates, undefined values, circular refs.
 * @throws if the object is not JSON-serializable.
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  return JSON.parse(JSON.stringify(obj)) as T;
}

/**
 * Deep merges source into target (non-mutating).
 * Arrays from source overwrite arrays from target.
 */
export function deepMerge<T extends PlainObject>(target: T, source: Partial<T>): T {
  const result = { ...target } as PlainObject;
  for (const key of Object.keys(source)) {
    const sourceVal = (source as PlainObject)[key];
    const targetVal = result[key];
    if (
      typeof sourceVal === 'object' &&
      sourceVal !== null &&
      !Array.isArray(sourceVal) &&
      typeof targetVal === 'object' &&
      targetVal !== null &&
      !Array.isArray(targetVal)
    ) {
      result[key] = deepMerge(targetVal as PlainObject, sourceVal as PlainObject);
    } else if (sourceVal !== undefined) {
      result[key] = sourceVal;
    }
  }
  return result as T;
}

/**
 * Returns a new object with only the specified keys.
 * @throws if keys is empty.
 */
export function pick<T extends PlainObject, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) result[key] = obj[key];
  }
  return result;
}

/**
 * Returns a new object without the specified keys.
 */
export function omit<T extends PlainObject, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const keySet = new Set(keys as string[]);
  const result = {} as PlainObject;
  for (const key of Object.keys(obj)) {
    if (!keySet.has(key)) result[key] = obj[key];
  }
  return result as Omit<T, K>;
}

/**
 * Flattens a nested object into a single-level object using dot notation.
 * @example flatten({ a: { b: 1 } }) => { 'a.b': 1 }
 */
export function flattenObject(
  obj: PlainObject,
  prefix = '',
  result: PlainObject = {}
): Record<string, unknown> {
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const val = obj[key];
    if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
      flattenObject(val as PlainObject, fullKey, result);
    } else {
      result[fullKey] = val;
    }
  }
  return result;
}

/**
 * Checks if two objects are deeply equal.
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, i) => deepEqual(item, b[i]));
  }
  if (typeof a === 'object' && typeof b === 'object') {
    const aObj = a as PlainObject;
    const bObj = b as PlainObject;
    const aKeys = Object.keys(aObj);
    const bKeys = Object.keys(bObj);
    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every((k) => deepEqual(aObj[k], bObj[k]));
  }
  return false;
}
