/**
 * calculator.ts
 * Basic arithmetic operations with full error handling.
 */

export class DivisionByZeroError extends Error {
  constructor() {
    super('Division by zero is not allowed');
    this.name = 'DivisionByZeroError';
  }
}

/** Adds two numbers. */
export function add(a: number, b: number): number {
  return a + b;
}

/** Subtracts b from a. */
export function subtract(a: number, b: number): number {
  return a - b;
}

/** Multiplies two numbers. */
export function multiply(a: number, b: number): number {
  return a * b;
}

/**
 * Divides a by b.
 * @throws {DivisionByZeroError} if b is 0.
 */
export function divide(a: number, b: number): number {
  if (b === 0) throw new DivisionByZeroError();
  return a / b;
}

/**
 * Returns the remainder of a divided by b.
 * @throws {DivisionByZeroError} if b is 0.
 */
export function modulo(a: number, b: number): number {
  if (b === 0) throw new DivisionByZeroError();
  return a % b;
}

/** Raises base to the exponent power. */
export function power(base: number, exponent: number): number {
  return Math.pow(base, exponent);
}

/** Returns the absolute value. */
export function absolute(n: number): number {
  return Math.abs(n);
}

/** Rounds a number to a given number of decimal places. */
export function roundTo(n: number, decimals: number): number {
  if (decimals < 0) throw new RangeError('Decimals must be non-negative');
  const factor = Math.pow(10, decimals);
  return Math.round(n * factor) / factor;
}
