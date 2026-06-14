/**
 * binarySearch.ts
 * Binary search implementations (iterative and recursive) with variants.
 */

export class SearchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SearchError';
  }
}

/**
 * Iterative binary search on a sorted array.
 * @returns Index of the target, or -1 if not found.
 * @throws {SearchError} if array is not provided.
 */
export function binarySearch<T>(arr: T[], target: T): number {
  if (!arr) throw new SearchError('Array is required');
  let low = 0;
  let high = arr.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (arr[mid] === target) return mid;
    if ((arr[mid] as unknown as number) < (target as unknown as number)) low = mid + 1;
    else high = mid - 1;
  }
  return -1;
}

/**
 * Recursive binary search on a sorted array.
 * @returns Index of the target, or -1 if not found.
 */
export function binarySearchRecursive<T>(
  arr: T[],
  target: T,
  low = 0,
  high = arr.length - 1
): number {
  if (low > high) return -1;
  const mid = Math.floor((low + high) / 2);
  if (arr[mid] === target) return mid;
  if ((arr[mid] as unknown as number) < (target as unknown as number)) {
    return binarySearchRecursive(arr, target, mid + 1, high);
  }
  return binarySearchRecursive(arr, target, low, mid - 1);
}

/**
 * Returns the index of the first element >= target (lower bound).
 */
export function lowerBound(arr: number[], target: number): number {
  let low = 0;
  let high = arr.length;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if ((arr[mid] as number) < target) low = mid + 1;
    else high = mid;
  }
  return low;
}

/**
 * Returns the index of the first element > target (upper bound).
 */
export function upperBound(arr: number[], target: number): number {
  let low = 0;
  let high = arr.length;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if ((arr[mid] as number) <= target) low = mid + 1;
    else high = mid;
  }
  return low;
}

/**
 * Counts occurrences of target in a sorted array.
 */
export function countOccurrences(arr: number[], target: number): number {
  return upperBound(arr, target) - lowerBound(arr, target);
}
