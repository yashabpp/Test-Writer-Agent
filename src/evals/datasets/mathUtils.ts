/**
 * mathUtils.ts
 * Mathematical utility functions.
 */

export class MathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MathError';
  }
}

/**
 * Computes the factorial of n.
 * @throws {MathError} for negative numbers or non-integers.
 */
export function factorial(n: number): number {
  if (!Number.isInteger(n)) throw new MathError('Input must be an integer');
  if (n < 0) throw new MathError('Factorial is not defined for negative numbers');
  if (n === 0 || n === 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

/**
 * Returns the nth Fibonacci number (0-indexed).
 * @throws {MathError} for negative indices.
 */
export function fibonacci(n: number): number {
  if (!Number.isInteger(n) || n < 0) throw new MathError('n must be a non-negative integer');
  if (n === 0) return 0;
  if (n === 1) return 1;
  let a = 0, b = 1;
  for (let i = 2; i <= n; i++) [a, b] = [b, a + b];
  return b;
}

/** Returns true if n is a prime number. */
export function isPrime(n: number): boolean {
  if (!Number.isInteger(n) || n < 2) return false;
  if (n === 2) return true;
  if (n % 2 === 0) return false;
  for (let i = 3; i <= Math.sqrt(n); i += 2) {
    if (n % i === 0) return false;
  }
  return true;
}

/**
 * Computes the Greatest Common Divisor of two integers.
 * @throws {MathError} if either argument is not a non-negative integer.
 */
export function gcd(a: number, b: number): number {
  if (!Number.isInteger(a) || !Number.isInteger(b)) throw new MathError('Inputs must be integers');
  if (a < 0 || b < 0) throw new MathError('Inputs must be non-negative');
  while (b !== 0) [a, b] = [b, a % b];
  return a;
}

/**
 * Computes the Least Common Multiple of two integers.
 * @throws {MathError} if either argument is not a non-negative integer.
 */
export function lcm(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return Math.abs((a / gcd(a, b)) * b);
}

/** Clamps a value between min and max. */
export function clamp(value: number, min: number, max: number): number {
  if (min > max) throw new RangeError('min must be <= max');
  return Math.min(Math.max(value, min), max);
}

/** Returns the sum of an array of numbers. */
export function sum(numbers: number[]): number {
  return numbers.reduce((acc, n) => acc + n, 0);
}

/** Returns the arithmetic mean of an array of numbers. */
export function mean(numbers: number[]): number {
  if (numbers.length === 0) throw new MathError('Cannot compute mean of empty array');
  return sum(numbers) / numbers.length;
}
