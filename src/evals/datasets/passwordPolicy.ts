/**
 * passwordPolicy.ts
 * Password strength evaluation and policy enforcement.
 */

export interface PasswordValidationResult {
  valid: boolean;
  score: number; // 0–100
  strength: 'very-weak' | 'weak' | 'fair' | 'strong' | 'very-strong';
  violations: string[];
}

export interface PasswordPolicy {
  minLength?: number;
  maxLength?: number;
  requireUppercase?: boolean;
  requireLowercase?: boolean;
  requireDigits?: boolean;
  requireSpecial?: boolean;
  disallowSpaces?: boolean;
}

const DEFAULT_POLICY: Required<PasswordPolicy> = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireDigits: true,
  requireSpecial: true,
  disallowSpaces: true,
};

/**
 * Validates a password against the given policy and returns detailed results.
 */
export function validatePassword(
  password: string,
  policy: PasswordPolicy = DEFAULT_POLICY
): PasswordValidationResult {
  const p = { ...DEFAULT_POLICY, ...policy };
  const violations: string[] = [];

  if (!password || typeof password !== 'string') {
    return {
      valid: false,
      score: 0,
      strength: 'very-weak',
      violations: ['Password must be a non-empty string'],
    };
  }

  if (password.length < p.minLength) violations.push(`Minimum length is ${p.minLength}`);
  if (password.length > p.maxLength) violations.push(`Maximum length is ${p.maxLength}`);
  if (p.requireUppercase && !/[A-Z]/.test(password)) violations.push('Must contain at least one uppercase letter');
  if (p.requireLowercase && !/[a-z]/.test(password)) violations.push('Must contain at least one lowercase letter');
  if (p.requireDigits && !/\d/.test(password)) violations.push('Must contain at least one digit');
  if (p.requireSpecial && !/[!@#$%^&*(),.?":{}|<>\-_=+]/.test(password)) violations.push('Must contain at least one special character');
  if (p.disallowSpaces && /\s/.test(password)) violations.push('Must not contain spaces');

  const score = computeStrengthScore(password);

  return {
    valid: violations.length === 0,
    score,
    strength: scoreToStrength(score),
    violations,
  };
}

/**
 * Computes a password strength score from 0–100.
 */
export function computeStrengthScore(password: string): number {
  if (!password) return 0;
  let score = 0;
  score += Math.min(40, password.length * 2.5); // length up to 40 points
  if (/[a-z]/.test(password)) score += 10;
  if (/[A-Z]/.test(password)) score += 10;
  if (/\d/.test(password)) score += 10;
  if (/[!@#$%^&*(),.?":{}|<>\-_=+]/.test(password)) score += 15;
  if (/(.)\1{2,}/.test(password)) score -= 10; // repeated characters penalty
  if (/^[a-zA-Z]+$/.test(password)) score -= 10; // only letters penalty
  return Math.max(0, Math.min(100, Math.round(score)));
}

function scoreToStrength(score: number): PasswordValidationResult['strength'] {
  if (score < 20) return 'very-weak';
  if (score < 40) return 'weak';
  if (score < 60) return 'fair';
  if (score < 80) return 'strong';
  return 'very-strong';
}

/** Returns true if the password meets the default policy. */
export function isStrongPassword(password: string): boolean {
  return validatePassword(password).valid;
}
