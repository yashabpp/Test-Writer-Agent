/**
 * dateUtils.ts
 * Date manipulation and formatting utilities.
 */

export class DateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DateError';
  }
}

/**
 * Formats a Date object as a string using a simple pattern.
 * Supported tokens: YYYY, MM, DD, HH, mm, ss
 */
export function formatDate(date: Date, format = 'YYYY-MM-DD'): string {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new DateError('Invalid date provided');
  }
  const pad = (n: number): string => n.toString().padStart(2, '0');
  return format
    .replace('YYYY', date.getFullYear().toString())
    .replace('MM', pad(date.getMonth() + 1))
    .replace('DD', pad(date.getDate()))
    .replace('HH', pad(date.getHours()))
    .replace('mm', pad(date.getMinutes()))
    .replace('ss', pad(date.getSeconds()));
}

/**
 * Adds a specified number of days to a date.
 * @param days Can be negative to subtract days.
 */
export function addDays(date: Date, days: number): Date {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new DateError('Invalid date provided');
  }
  if (!Number.isInteger(days)) throw new DateError('days must be an integer');
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Returns the number of full days between two dates.
 * Result is always non-negative (absolute difference).
 */
export function daysBetween(dateA: Date, dateB: Date): number {
  if (!(dateA instanceof Date) || isNaN(dateA.getTime())) throw new DateError('Invalid dateA');
  if (!(dateB instanceof Date) || isNaN(dateB.getTime())) throw new DateError('Invalid dateB');
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.abs(Math.floor((dateB.getTime() - dateA.getTime()) / msPerDay));
}

/** Returns true if the date falls on a Saturday or Sunday. */
export function isWeekend(date: Date): boolean {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new DateError('Invalid date provided');
  }
  const day = date.getDay();
  return day === 0 || day === 6;
}

/**
 * Parses a date string in YYYY-MM-DD format.
 * @throws {DateError} if the string is not a valid date.
 */
export function parseDate(dateStr: string): Date {
  if (!dateStr || typeof dateStr !== 'string') {
    throw new DateError('dateStr must be a non-empty string');
  }
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) throw new DateError(`Invalid date format: "${dateStr}". Expected YYYY-MM-DD`);
  const [, year, month, day] = match.map(Number) as [number, number, number, number];
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    throw new DateError(`Date out of range: "${dateStr}"`);
  }
  return date;
}

/** Returns the start of the day (midnight) for a given date. */
export function startOfDay(date: Date): Date {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new DateError('Invalid date provided');
  }
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}
