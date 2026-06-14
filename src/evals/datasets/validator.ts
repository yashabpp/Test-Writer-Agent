/**
 * validator.ts
 * Input validation functions for common data types.
 */

/** Returns true if the string is a valid email address. */
export function isEmail(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  const pattern = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  return pattern.test(value.trim());
}

/** Returns true if the string is a valid URL (http or https). */
export function isURL(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Returns true if the string is a valid international phone number (E.164). */
export function isPhoneNumber(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  return /^\+?[1-9]\d{6,14}$/.test(value.trim().replace(/[\s\-().]/g, ''));
}

/** Returns true if the string is a valid US postal code (5 or 9 digit). */
export function isPostalCode(value: string, country = 'US'): boolean {
  if (!value || typeof value !== 'string') return false;
  const patterns: Record<string, RegExp> = {
    US: /^\d{5}(-\d{4})?$/,
    UK: /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i,
    CA: /^[A-Z]\d[A-Z]\s*\d[A-Z]\d$/i,
  };
  const pattern = patterns[country];
  if (!pattern) throw new Error(`Unsupported country code: ${country}`);
  return pattern.test(value.trim());
}

/** Returns true if the value is a non-empty string. */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/** Returns true if the number is within the given range [min, max] (inclusive). */
export function isInRange(value: number, min: number, max: number): boolean {
  if (min > max) throw new RangeError('min must be <= max');
  return Number.isFinite(value) && value >= min && value <= max;
}

/** Returns true if the string matches the given regex pattern. */
export function matchesPattern(value: string, pattern: RegExp): boolean {
  if (!value || typeof value !== 'string') return false;
  return pattern.test(value);
}

/** Returns true if the object has all the required keys with non-null values. */
export function hasRequiredFields(obj: Record<string, unknown>, fields: string[]): boolean {
  if (!obj || typeof obj !== 'object') return false;
  return fields.every((field) => field in obj && obj[field] !== null && obj[field] !== undefined);
}
