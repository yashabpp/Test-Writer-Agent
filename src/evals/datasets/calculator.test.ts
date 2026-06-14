/**
 * calculator.test.ts
 * Comprehensive test suite for calculator.ts
 */

import { describe, it, expect } from 'vitest';
import {
  DivisionByZeroError,
  add,
  subtract,
  multiply,
  divide,
  modulo,
  power,
  absolute,
  roundTo,
} from './calculator';

describe('DivisionByZeroError', () => {
  it('should create an error with the correct message', () => {
    const error = new DivisionByZeroError();
    expect(error.message).toBe('Division by zero is not allowed');
  });

  it('should have the correct name property', () => {
    const error = new DivisionByZeroError();
    expect(error.name).toBe('DivisionByZeroError');
  });

  it('should be an instance of Error', () => {
    const error = new DivisionByZeroError();
    expect(error).toBeInstanceOf(Error);
  });
});

describe('add', () => {
  it('should add two positive numbers', () => {
    expect(add(2, 3)).toBe(5);
  });

  it('should add two negative numbers', () => {
    expect(add(-2, -3)).toBe(-5);
  });

  it('should add a positive and a negative number', () => {
    expect(add(5, -3)).toBe(2);
  });

  it('should add zero to a number', () => {
    expect(add(5, 0)).toBe(5);
    expect(add(0, 5)).toBe(5);
  });

  it('should add two zeros', () => {
    expect(add(0, 0)).toBe(0);
  });

  it('should handle decimal numbers', () => {
    expect(add(0.1, 0.2)).toBeCloseTo(0.3);
  });

  it('should handle very large numbers', () => {
    expect(add(Number.MAX_SAFE_INTEGER, 0)).toBe(Number.MAX_SAFE_INTEGER);
  });

  it('should handle Infinity', () => {
    expect(add(Infinity, 5)).toBe(Infinity);
    expect(add(5, Infinity)).toBe(Infinity);
    expect(add(Infinity, Infinity)).toBe(Infinity);
  });

  it('should handle -Infinity', () => {
    expect(add(-Infinity, 5)).toBe(-Infinity);
  });

  it('should handle NaN', () => {
    expect(add(NaN, 5)).toBeNaN();
    expect(add(5, NaN)).toBeNaN();
  });
});

describe('subtract', () => {
  it('should subtract two positive numbers', () => {
    expect(subtract(5, 3)).toBe(2);
  });

  it('should subtract two negative numbers', () => {
    expect(subtract(-5, -3)).toBe(-2);
  });

  it('should subtract a negative from a positive', () => {
    expect(subtract(5, -3)).toBe(8);
  });

  it('should subtract zero from a number', () => {
    expect(subtract(5, 0)).toBe(5);
  });

  it('should subtract a number from zero', () => {
    expect(subtract(0, 5)).toBe(-5);
  });

  it('should subtract two zeros', () => {
    expect(subtract(0, 0)).toBe(0);
  });

  it('should handle decimal numbers', () => {
    expect(subtract(0.3, 0.1)).toBeCloseTo(0.2);
  });

  it('should handle Infinity', () => {
    expect(subtract(Infinity, 5)).toBe(Infinity);
    expect(subtract(5, Infinity)).toBe(-Infinity);
  });

  it('should handle NaN', () => {
    expect(subtract(NaN, 5)).toBeNaN();
  });
});

describe('multiply', () => {
  it('should multiply two positive numbers', () => {
    expect(multiply(3, 4)).toBe(12);
  });

  it('should multiply two negative numbers', () => {
    expect(multiply(-3, -4)).toBe(12);
  });

  it('should multiply a positive and a negative number', () => {
    expect(multiply(3, -4)).toBe(-12);
  });

  it('should multiply by zero', () => {
    expect(multiply(5, 0)).toBe(0);
    expect(multiply(0, 5)).toBe(0);
  });

  it('should multiply by one', () => {
    expect(multiply(5, 1)).toBe(5);
    expect(multiply(1, 5)).toBe(5);
  });

  it('should multiply by negative one', () => {
    expect(multiply(5, -1)).toBe(-5);
  });

  it('should handle decimal numbers', () => {
    expect(multiply(0.1, 0.2)).toBeCloseTo(0.02);
  });

  it('should handle Infinity', () => {
    expect(multiply(Infinity, 5)).toBe(Infinity);
    expect(multiply(5, Infinity)).toBe(Infinity);
    expect(multiply(Infinity, -5)).toBe(-Infinity);
  });

  it('should handle NaN', () => {
    expect(multiply(NaN, 5)).toBeNaN();
  });
});

describe('divide', () => {
  it('should divide two positive numbers', () => {
    expect(divide(10, 2)).toBe(5);
  });

  it('should divide two negative numbers', () => {
    expect(divide(-10, -2)).toBe(5);
  });

  it('should divide a positive by a negative number', () => {
    expect(divide(10, -2)).toBe(-5);
  });

  it('should divide by one', () => {
    expect(divide(5, 1)).toBe(5);
  });

  it('should divide zero by a non-zero number', () => {
    expect(divide(0, 5)).toBe(0);
  });

  it('should handle decimal division', () => {
    expect(divide(1, 3)).toBeCloseTo(0.333333);
  });

  it('should throw DivisionByZeroError when dividing by zero', () => {
    expect(() => divide(5, 0)).toThrow(DivisionByZeroError);
  });

  it('should throw error with correct message when dividing by zero', () => {
    expect(() => divide(5, 0)).toThrow('Division by zero is not allowed');
  });

  it('should throw when dividing zero by zero', () => {
    expect(() => divide(0, 0)).toThrow(DivisionByZeroError);
  });

  it('should handle Infinity', () => {
    expect(divide(Infinity, 5)).toBe(Infinity);
    expect(divide(5, Infinity)).toBe(0);
  });

  it('should handle NaN', () => {
    expect(divide(NaN, 5)).toBeNaN();
  });
});

describe('modulo', () => {
  it('should return remainder of two positive numbers', () => {
    expect(modulo(10, 3)).toBe(1);
  });

  it('should return zero when evenly divisible', () => {
    expect(modulo(10, 5)).toBe(0);
  });

  it('should handle negative dividend', () => {
    expect(modulo(-10, 3)).toBe(-1);
  });

  it('should handle negative divisor', () => {
    expect(modulo(10, -3)).toBe(1);
  });

  it('should handle both negative', () => {
    expect(modulo(-10, -3)).toBe(-1);
  });

  it('should return zero for modulo with same number', () => {
    expect(modulo(5, 5)).toBe(0);
  });

  it('should handle decimal numbers', () => {
    expect(modulo(5.5, 2)).toBeCloseTo(1.5);
  });

  it('should throw DivisionByZeroError when modulo by zero', () => {
    expect(() => modulo(5, 0)).toThrow(DivisionByZeroError);
  });

  it('should throw error with correct message when modulo by zero', () => {
    expect(() => modulo(5, 0)).toThrow('Division by zero is not allowed');
  });

  it('should handle NaN', () => {
    expect(modulo(NaN, 5)).toBeNaN();
  });
});

describe('power', () => {
  it('should raise a number to a positive power', () => {
    expect(power(2, 3)).toBe(8);
  });

  it('should raise a number to the power of zero', () => {
    expect(power(5, 0)).toBe(1);
  });

  it('should raise a number to the power of one', () => {
    expect(power(5, 1)).toBe(5);
  });

  it('should raise a number to a negative power', () => {
    expect(power(2, -2)).toBe(0.25);
  });

  it('should handle zero to a positive power', () => {
    expect(power(0, 5)).toBe(0);
  });

  it('should handle zero to the power of zero', () => {
    expect(power(0, 0)).toBe(1);
  });

  it('should handle negative base with even exponent', () => {
    expect(power(-2, 2)).toBe(4);
  });

  it('should handle negative base with odd exponent', () => {
    expect(power(-2, 3)).toBe(-8);
  });

  it('should handle decimal exponents', () => {
    expect(power(4, 0.5)).toBe(2);
  });

  it('should handle very large exponents', () => {
    expect(power(2, 10)).toBe(1024);
  });

  it('should handle Infinity', () => {
    expect(power(Infinity, 2)).toBe(Infinity);
    expect(power(2, Infinity)).toBe(Infinity);
  });

  it('should handle NaN', () => {
    expect(power(NaN, 2)).toBeNaN();
  });
});

describe('absolute', () => {
  it('should return absolute value of a positive number', () => {
    expect(absolute(5)).toBe(5);
  });

  it('should return absolute value of a negative number', () => {
    expect(absolute(-5)).toBe(5);
  });

  it('should return zero for zero', () => {
    expect(absolute(0)).toBe(0);
  });

  it('should return zero for negative zero', () => {
    expect(absolute(-0)).toBe(0);
  });

  it('should handle decimal numbers', () => {
    expect(absolute(-3.14)).toBe(3.14);
  });

  it('should handle very large negative numbers', () => {
    expect(absolute(Number.MIN_SAFE_INTEGER)).toBe(Math.abs(Number.MIN_SAFE_INTEGER));
  });

  it('should handle Infinity', () => {
    expect(absolute(Infinity)).toBe(Infinity);
    expect(absolute(-Infinity)).toBe(Infinity);
  });

  it('should handle NaN', () => {
    expect(absolute(NaN)).toBeNaN();
  });
});

describe('roundTo', () => {
  it('should round to zero decimal places', () => {
    expect(roundTo(3.7, 0)).toBe(4);
    expect(roundTo(3.4, 0)).toBe(3);
  });

  it('should round to one decimal place', () => {
    expect(roundTo(3.14159, 1)).toBe(3.1);
  });

  it('should round to two decimal places', () => {
    expect(roundTo(3.14159, 2)).toBe(3.14);
  });

  it('should round to three decimal places', () => {
    expect(roundTo(3.14159, 3)).toBe(3.142);
  });

  it('should handle negative numbers', () => {
    expect(roundTo(-3.14159, 2)).toBe(-3.14);
  });

  it('should handle zero', () => {
    expect(roundTo(0, 2)).toBe(0);
  });

  it('should handle numbers that do not need rounding', () => {
    expect(roundTo(3.5, 1)).toBe(3.5);
  });

  it('should handle rounding up at midpoint', () => {
    expect(roundTo(2.5, 0)).toBe(3);
    expect(roundTo(3.5, 0)).toBe(4);
  });

  it('should throw RangeError for negative decimals', () => {
    expect(() => roundTo(3.14, -1)).toThrow(RangeError);
  });

  it('should throw error with correct message for negative decimals', () => {
    expect(() => roundTo(3.14, -1)).toThrow('Decimals must be non-negative');
  });

  it('should handle very large decimal values', () => {
    expect(roundTo(3.14159, 10)).toBe(3.14159);
  });

  it('should handle Infinity', () => {
    expect(roundTo(Infinity, 2)).toBe(Infinity);
    expect(roundTo(-Infinity, 2)).toBe(-Infinity);
  });

  it('should handle NaN', () => {
    expect(roundTo(NaN, 2)).toBeNaN();
  });
});
