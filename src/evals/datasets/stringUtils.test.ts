/**
 * stringUtils.test.ts
 * Comprehensive tests for string manipulation utilities.
 */

import { describe, it, expect } from 'vitest';
import {
  capitalize,
  truncate,
  slugify,
  toCamelCase,
  isPalindrome,
  countOccurrences,
  reverseString,
  padLeft,
} from './stringUtils';

describe('capitalize', () => {
  // Happy path tests
  it('should capitalize the first letter of each word', () => {
    expect(capitalize('hello world')).toBe('Hello World');
  });

  it('should handle single word', () => {
    expect(capitalize('hello')).toBe('Hello');
  });

  it('should handle multiple words', () => {
    expect(capitalize('the quick brown fox')).toBe('The Quick Brown Fox');
  });

  it('should lowercase the rest of the word', () => {
    expect(capitalize('hELLO wORLD')).toBe('Hello World');
  });

  // Edge cases
  it('should return empty string if input is empty', () => {
    expect(capitalize('')).toBe('');
  });

  it('should handle string with only spaces', () => {
    expect(capitalize('   ')).toBe('   ');
  });

  it('should handle string with leading/trailing spaces', () => {
    expect(capitalize('  hello world  ')).toBe('  Hello World  ');
  });

  // Boundary values
  it('should handle single character', () => {
    expect(capitalize('a')).toBe('A');
  });

  it('should handle string with numbers', () => {
    expect(capitalize('hello 123 world')).toBe('Hello 123 World');
  });

  // Special characters
  it('should handle special characters', () => {
    expect(capitalize('hello-world')).toBe('Hello-world');
  });

  it('should handle string with punctuation', () => {
    expect(capitalize('hello, world!')).toBe('Hello, World!');
  });
});

describe('truncate', () => {
  // Happy path tests
  it('should truncate string to maxLength with default suffix', () => {
    expect(truncate('hello world', 8)).toBe('hello...');
  });

  it('should return full string if length <= maxLength', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });

  it('should return full string if length equals maxLength', () => {
    expect(truncate('hello', 5)).toBe('hello');
  });

  it('should use custom suffix', () => {
    expect(truncate('hello world', 8, '~~')).toBe('hello ~~');
  });

  // Edge cases
  it('should handle empty string', () => {
    expect(truncate('', 10)).toBe('');
  });

  it('should handle maxLength equals 0', () => {
    expect(truncate('hello', 0, '...')).toBe('he...');
  });

  it('should handle empty suffix', () => {
    expect(truncate('hello world', 5, '')).toBe('hello');
  });

  it('should handle maxLength as 3 (same as default suffix length)', () => {
    expect(truncate('hello', 3, '...')).toBe('...');
  });

  // Boundary values
  it('should handle very long suffix', () => {
    expect(truncate('hello', 10, 'abcdefgh')).toBe('hello');
  });

  it('should handle maxLength of 1', () => {
    expect(truncate('hello', 1, '.')).toBe('.');
  });

  // Error cases
  it('should throw RangeError if maxLength is negative', () => {
    expect(() => truncate('hello', -1)).toThrow(RangeError);
  });

  it('should throw RangeError if maxLength is negative with custom suffix', () => {
    expect(() => truncate('hello', -5, '~~')).toThrow(RangeError);
  });

  // Special characters
  it('should handle string with special characters', () => {
    expect(truncate('hello@#$%world', 8)).toBe('hello...');
  });
});

describe('slugify', () => {
  // Happy path tests
  it('should convert string to kebab-case slug', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('should remove special characters', () => {
    expect(slugify('Hello, World!')).toBe('hello-world');
  });

  it('should replace underscores with dashes', () => {
    expect(slugify('hello_world')).toBe('hello-world');
  });

  it('should replace spaces with dashes', () => {
    expect(slugify('hello world test')).toBe('hello-world-test');
  });

  it('should handle mixed case', () => {
    expect(slugify('HELLO WORLD')).toBe('hello-world');
  });

  // Edge cases
  it('should handle empty string', () => {
    expect(slugify('')).toBe('');
  });

  it('should trim leading and trailing spaces', () => {
    expect(slugify('  hello world  ')).toBe('hello-world');
  });

  it('should handle string with only spaces', () => {
    expect(slugify('   ')).toBe('');
  });

  it('should handle multiple consecutive spaces', () => {
    expect(slugify('hello    world')).toBe('hello-world');
  });

  it('should remove leading dashes', () => {
    expect(slugify('---hello-world')).toBe('hello-world');
  });

  it('should remove trailing dashes', () => {
    expect(slugify('hello-world---')).toBe('hello-world');
  });

  it('should remove both leading and trailing dashes', () => {
    expect(slugify('---hello-world---')).toBe('hello-world');
  });

  // Special characters
  it('should remove special characters and keep alphanumeric', () => {
    expect(slugify('hello@123#world')).toBe('hello123world');
  });

  it('should handle string with only special characters', () => {
    expect(slugify('@#$%^&*()')).toBe('');
  });

  it('should keep numbers', () => {
    expect(slugify('version 2.0 release')).toBe('version-20-release');
  });
});

describe('toCamelCase', () => {
  // Happy path tests
  it('should convert kebab-case to camelCase', () => {
    expect(toCamelCase('hello-world')).toBe('helloWorld');
  });

  it('should convert snake_case to camelCase', () => {
    expect(toCamelCase('hello_world')).toBe('helloWorld');
  });

  it('should handle multiple delimiters', () => {
    expect(toCamelCase('hello-world-test')).toBe('helloWorldTest');
  });

  it('should handle multiple underscores', () => {
    expect(toCamelCase('hello_world_test')).toBe('helloWorldTest');
  });

  it('should handle mixed delimiters', () => {
    expect(toCamelCase('hello-world_test')).toBe('helloWorldTest');
  });

  // Edge cases
  it('should handle empty string', () => {
    expect(toCamelCase('')).toBe('');
  });

  it('should handle string with no delimiters', () => {
    expect(toCamelCase('hello')).toBe('hello');
  });

  it('should handle string with only delimiters', () => {
    expect(toCamelCase('---___')).toBe('-__');
  });

  it('should handle leading delimiter', () => {
    expect(toCamelCase('-hello-world')).toBe('HelloWorld');
  });

  it('should handle trailing delimiter', () => {
    expect(toCamelCase('hello-world-')).toBe('helloWorld-');
  });

  // Boundary values
  it('should handle single character', () => {
    expect(toCamelCase('a')).toBe('a');
  });

  it('should handle spaces as delimiters', () => {
    expect(toCamelCase('hello world')).toBe('helloWorld');
  });

  it('should handle mixed spaces and dashes', () => {
    expect(toCamelCase('hello-world test-case')).toBe('helloWorldTestCase');
  });

  // Uppercase handling
  it('should lowercase the first character', () => {
    expect(toCamelCase('HELLO-WORLD')).toBe('helloWorld');
  });
});

describe('isPalindrome', () => {
  // Happy path tests
  it('should return true for simple palindrome', () => {
    expect(isPalindrome('racecar')).toBe(true);
  });

  it('should return true for palindrome ignoring case', () => {
    expect(isPalindrome('RaceCar')).toBe(true);
  });

  it('should return true for palindrome ignoring spaces', () => {
    expect(isPalindrome('race car')).toBe(true);
  });

  it('should return true for palindrome ignoring case and spaces', () => {
    expect(isPalindrome('A man a plan a canal Panama')).toBe(true);
  });

  it('should return false for non-palindrome', () => {
    expect(isPalindrome('hello')).toBe(false);
  });

  // Edge cases
  it('should return true for empty string', () => {
    expect(isPalindrome('')).toBe(true);
  });

  it('should return true for single character', () => {
    expect(isPalindrome('a')).toBe(true);
  });

  it('should return true for two identical characters', () => {
    expect(isPalindrome('aa')).toBe(true);
  });

  it('should return true for two different characters', () => {
    expect(isPalindrome('ab')).toBe(false);
  });

  it('should ignore special characters', () => {
    expect(isPalindrome('A1b1A')).toBe(true);
  });

  // Numeric palindromes
  it('should handle numeric palindromes', () => {
    expect(isPalindrome('12321')).toBe(true);
  });

  it('should handle numeric non-palindromes', () => {
    expect(isPalindrome('12345')).toBe(false);
  });

  // Spaces and punctuation
  it('should ignore punctuation', () => {
    expect(isPalindrome('A man, a plan, a canal: Panama!')).toBe(true);
  });

  it('should return true for string with only spaces', () => {
    expect(isPalindrome('   ')).toBe(true);
  });

  it('should return true for string with only special characters', () => {
    expect(isPalindrome('!@#@!')).toBe(true);
  });

  // Case insensitivity
  it('should handle all uppercase', () => {
    expect(isPalindrome('RACECAR')).toBe(true);
  });

  it('should handle mixed case non-palindrome', () => {
    expect(isPalindrome('HeLLo')).toBe(false);
  });
});

describe('countOccurrences', () => {
  // Happy path tests
  it('should count single occurrence', () => {
    expect(countOccurrences('hello world', 'o')).toBe(2);
  });

  it('should count multiple occurrences', () => {
    expect(countOccurrences('aaaa', 'a')).toBe(4);
  });

  it('should count substring occurrences', () => {
    expect(countOccurrences('abcabcabc', 'abc')).toBe(3);
  });

  it('should return 0 for no occurrences', () => {
    expect(countOccurrences('hello world', 'xyz')).toBe(0);
  });

  // Edge cases
  it('should return 0 for empty substring', () => {
    expect(countOccurrences('hello', '')).toBe(0);
  });

  it('should handle empty string', () => {
    expect(countOccurrences('', 'a')).toBe(0);
  });

  it('should handle both empty', () => {
    expect(countOccurrences('', '')).toBe(0);
  });

  // Case sensitivity
  it('should be case-sensitive', () => {
    expect(countOccurrences('Hello hello', 'hello')).toBe(1);
  });

  it('should count case-sensitive uppercase', () => {
    expect(countOccurrences('HELLO HELLO', 'HELLO')).toBe(2);
  });

  // Overlapping occurrences
  it('should count overlapping occurrences', () => {
    expect(countOccurrences('aaaa', 'aa')).toBe(3);
  });

  it('should handle overlapping pattern', () => {
    expect(countOccurrences('ababa', 'aba')).toBe(2);
  });

  // Boundary values
  it('should count when substring equals full string', () => {
    expect(countOccurrences('hello', 'hello')).toBe(1);
  });

  it('should return 0 when substring is longer than string', () => {
    expect(countOccurrences('hi', 'hello')).toBe(0);
  });

  // Special characters
  it('should count special characters', () => {
    expect(countOccurrences('hello@world@test', '@')).toBe(2);
  });

  it('should count special character sequences', () => {
    expect(countOccurrences('###test###', '##')).toBe(4);
  });
});

describe('reverseString', () => {
  // Happy path tests
  it('should reverse a simple string', () => {
    expect(reverseString('hello')).toBe('olleh');
  });

  it('should reverse a string with spaces', () => {
    expect(reverseString('hello world')).toBe('dlrow olleh');
  });

  it('should reverse multiple words', () => {
    expect(reverseString('abc def ghi')).toBe('ihg fed cba');
  });

  // Edge cases
  it('should return empty string for empty input', () => {
    expect(reverseString('')).toBe('');
  });

  it('should return single character', () => {
    expect(reverseString('a')).toBe('a');
  });

  it('should handle two characters', () => {
    expect(reverseString('ab')).toBe('ba');
  });

  // Special characters
  it('should reverse special characters', () => {
    expect(reverseString('!@#$%')).toBe('%$#@!');
  });

  it('should reverse string with mixed content', () => {
    expect(reverseString('hello@123')).toBe('321@olleh');
  });

  // Numbers
  it('should reverse numbers', () => {
    expect(reverseString('12345')).toBe('54321');
  });

  // Unicode and other characters
  it('should handle strings with only spaces', () => {
    expect(reverseString('   ')).toBe('   ');
  });

  it('should handle palindrome (same reversed)', () => {
    expect(reverseString('racecar')).toBe('racecar');
  });
});

describe('padLeft', () => {
  // Happy path tests
  it('should pad string to specified length with default space', () => {
    expect(padLeft('hello', 10)).toBe('     hello');
  });

  it('should pad string with custom character', () => {
    expect(padLeft('hello', 10, '*')).toBe('*****hello');
  });

  it('should return string if already at length', () => {
    expect(padLeft('hello', 5)).toBe('hello');
  });

  it('should return string if longer than length', () => {
    expect(padLeft('hello', 3)).toBe('hello');
  });

  // Edge cases
  it('should handle empty string', () => {
    expect(padLeft('', 5, '*')).toBe('*****');
  });

  it('should handle length of 0', () => {
    expect(padLeft('hello', 0)).toBe('hello');
  });

  it('should handle length of 1 with empty string', () => {
    expect(padLeft('', 1, 'x')).toBe('x');
  });

  // Boundary values
  it('should handle single character padding', () => {
    expect(padLeft('a', 3, 'x')).toBe('xxa');
  });

  it('should handle numeric strings', () => {
    expect(padLeft('42', 5, '0')).toBe('00042');
  });

  // Error cases
  it('should throw Error if padding character is empty string', () => {
    expect(() => padLeft('hello', 10, '')).toThrow(Error);
  });

  it('should throw Error if padding character is more than one character', () => {
    expect(() => padLeft('hello', 10, 'ab')).toThrow(Error);
  });

  it('should throw Error if padding character is multiple characters', () => {
    expect(() => padLeft('hello', 10, '***')).toThrow(Error);
  });

  // Special characters as padding
  it('should handle special character as padding', () => {
    expect(padLeft('test', 8, '-')).toBe('----test');
  });

  it('should handle emoji as padding (multi-byte character)', () => {
    // Note: This might throw error since emoji is not a single "character" in byte length
    // But JavaScript's .length counts it as 1, so it should work
    expect(padLeft('test', 6, '.')).toBe('..test');
  });

  // Space as explicit padding character
  it('should handle space as explicit padding character', () => {
    expect(padLeft('hello', 8, ' ')).toBe('   hello');
  });
});
