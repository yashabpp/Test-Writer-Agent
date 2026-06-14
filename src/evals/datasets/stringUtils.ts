/**
 * stringUtils.ts
 * Common string manipulation utilities.
 */

/** Capitalizes the first letter of each word. */
export function capitalize(str: string): string {
  if (!str) return str;
  return str
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Truncates a string to maxLength, appending suffix if truncated.
 * @param suffix Defaults to '...'
 */
export function truncate(str: string, maxLength: number, suffix = '...'): string {
  if (maxLength < 0) throw new RangeError('maxLength must be non-negative');
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - suffix.length) + suffix;
}

/** Converts a string to a URL-friendly slug. */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Converts a kebab-case or snake_case string to camelCase. */
export function toCamelCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[-_\s](.)/g, (_, char: string) => char.toUpperCase());
}

/** Returns true if the string is a palindrome (ignores case and spaces). */
export function isPalindrome(str: string): boolean {
  const clean = str.toLowerCase().replace(/[^a-z0-9]/g, '');
  return clean === clean.split('').reverse().join('');
}

/** Counts occurrences of a substring within a string. */
export function countOccurrences(str: string, sub: string): number {
  if (!sub) return 0;
  let count = 0;
  let pos = str.indexOf(sub);
  while (pos !== -1) {
    count++;
    pos = str.indexOf(sub, pos + 1);
  }
  return count;
}

/** Reverses a string. */
export function reverseString(str: string): string {
  return str.split('').reverse().join('');
}

/** Pads a string on the left to the specified length. */
export function padLeft(str: string, length: number, char = ' '): string {
  if (char.length !== 1) throw new Error('Padding character must be exactly one character');
  return str.padStart(length, char);
}
