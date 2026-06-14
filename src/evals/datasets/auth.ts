/**
 * auth.ts
 * Authentication utilities: password hashing, token generation, and validation.
 * Uses Node.js crypto module (no external dependencies).
 */

import { createHash, createHmac, randomBytes } from 'node:crypto';

const TOKEN_SECRET = process.env['TOKEN_SECRET'] ?? 'default-secret-change-in-production';
const HASH_ITERATIONS = 10_000;
const SALT_LENGTH = 16;

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Hashes a password with a random salt using PBKDF2-like SHA-256 iteration.
 * Returns a string in the format: salt:hash
 */
export function hashPassword(password: string): string {
  if (!password || password.trim().length === 0) {
    throw new AuthError('Password must not be empty');
  }
  const salt = randomBytes(SALT_LENGTH).toString('hex');
  let hash = password;
  for (let i = 0; i < HASH_ITERATIONS; i++) {
    hash = createHash('sha256').update(hash + salt).digest('hex');
  }
  return `${salt}:${hash}`;
}

/**
 * Verifies a plain-text password against a stored hash.
 * @returns true if password matches, false otherwise.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!password || !storedHash) return false;
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, expectedHash] = parts as [string, string];
  let hash = password;
  for (let i = 0; i < HASH_ITERATIONS; i++) {
    hash = createHash('sha256').update(hash + salt).digest('hex');
  }
  return hash === expectedHash;
}

/**
 * Generates a signed token in the format: payload.signature
 * Payload is base64-encoded JSON.
 */
export function generateToken(payload: Record<string, unknown>, expiresInSeconds = 3600): string {
  const data = {
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
  };
  const encoded = Buffer.from(JSON.stringify(data)).toString('base64url');
  const signature = createHmac('sha256', TOKEN_SECRET).update(encoded).digest('hex');
  return `${encoded}.${signature}`;
}

/**
 * Validates and decodes a token.
 * @throws {AuthError} if token is malformed, signature is invalid, or expired.
 */
export function validateToken(token: string): Record<string, unknown> {
  if (!token) throw new AuthError('Token is required');
  const parts = token.split('.');
  if (parts.length !== 2) throw new AuthError('Malformed token');
  const [encoded, signature] = parts as [string, string];
  const expectedSig = createHmac('sha256', TOKEN_SECRET).update(encoded).digest('hex');
  if (expectedSig !== signature) throw new AuthError('Invalid token signature');
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf-8')) as Record<string, unknown>;
  } catch {
    throw new AuthError('Token payload is not valid JSON');
  }
  if (typeof data['exp'] === 'number' && data['exp'] < Math.floor(Date.now() / 1000)) {
    throw new AuthError('Token has expired');
  }
  return data;
}
