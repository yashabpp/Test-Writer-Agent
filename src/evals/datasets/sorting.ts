/**
 * sorting.ts
 * Classic sorting algorithm implementations.
 * All functions return a new sorted array (non-mutating).
 */

/**
 * Bubble sort — O(n²)
 */
export function bubbleSort(arr: number[]): number[] {
  const result = [...arr];
  const n = result.length;
  for (let i = 0; i < n - 1; i++) {
    let swapped = false;
    for (let j = 0; j < n - i - 1; j++) {
      if ((result[j] as number) > (result[j + 1] as number)) {
        [result[j], result[j + 1]] = [result[j + 1] as number, result[j] as number];
        swapped = true;
      }
    }
    if (!swapped) break;
  }
  return result;
}

/**
 * Merge sort — O(n log n)
 */
export function mergeSort(arr: number[]): number[] {
  if (arr.length <= 1) return [...arr];
  const mid = Math.floor(arr.length / 2);
  const left = mergeSort(arr.slice(0, mid));
  const right = mergeSort(arr.slice(mid));
  return merge(left, right);
}

function merge(left: number[], right: number[]): number[] {
  const result: number[] = [];
  let i = 0, j = 0;
  while (i < left.length && j < right.length) {
    if ((left[i] as number) <= (right[j] as number)) result.push(left[i++] as number);
    else result.push(right[j++] as number);
  }
  return result.concat(left.slice(i)).concat(right.slice(j));
}

/**
 * Quick sort — O(n log n) average
 */
export function quickSort(arr: number[]): number[] {
  if (arr.length <= 1) return [...arr];
  const pivot = arr[Math.floor(arr.length / 2)] as number;
  const left = arr.filter((x) => x < pivot);
  const middle = arr.filter((x) => x === pivot);
  const right = arr.filter((x) => x > pivot);
  return [...quickSort(left), ...middle, ...quickSort(right)];
}

/**
 * Insertion sort — O(n²), efficient for small or nearly-sorted arrays
 */
export function insertionSort(arr: number[]): number[] {
  const result = [...arr];
  for (let i = 1; i < result.length; i++) {
    const key = result[i] as number;
    let j = i - 1;
    while (j >= 0 && (result[j] as number) > key) {
      result[j + 1] = result[j] as number;
      j--;
    }
    result[j + 1] = key;
  }
  return result;
}

/** Returns true if the array is sorted in ascending order. */
export function isSorted(arr: number[]): boolean {
  for (let i = 0; i < arr.length - 1; i++) {
    if ((arr[i] as number) > (arr[i + 1] as number)) return false;
  }
  return true;
}
