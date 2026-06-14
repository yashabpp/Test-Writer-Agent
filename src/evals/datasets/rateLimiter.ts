/**
 * rateLimiter.ts
 * Token bucket rate limiting implementation.
 */

export interface RateLimiterOptions {
  maxTokens: number;        // Maximum tokens (burst capacity)
  refillRate: number;       // Tokens added per second
  refillInterval?: number;  // Milliseconds between refills (default: 1000)
}

export interface ConsumeResult {
  allowed: boolean;
  remainingTokens: number;
  retryAfterMs?: number;    // Milliseconds to wait if denied
}

export class RateLimiterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimiterError';
  }
}

export class RateLimiter {
  private tokens: number;
  private lastRefillTime: number;
  private readonly options: Required<RateLimiterOptions>;

  constructor(options: RateLimiterOptions) {
    if (options.maxTokens <= 0) throw new RateLimiterError('maxTokens must be positive');
    if (options.refillRate <= 0) throw new RateLimiterError('refillRate must be positive');

    this.options = {
      refillInterval: 1000,
      ...options,
    };
    this.tokens = options.maxTokens;
    this.lastRefillTime = Date.now();
  }

  /** Refills tokens based on elapsed time. */
  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefillTime;
    const intervals = Math.floor(elapsed / this.options.refillInterval);
    if (intervals > 0) {
      this.tokens = Math.min(
        this.options.maxTokens,
        this.tokens + intervals * this.options.refillRate
      );
      this.lastRefillTime += intervals * this.options.refillInterval;
    }
  }

  /**
   * Attempts to consume `count` tokens.
   * @param count Number of tokens to consume (default: 1).
   */
  consume(count = 1): ConsumeResult {
    if (count <= 0) throw new RateLimiterError('count must be positive');
    this.refill();

    if (this.tokens >= count) {
      this.tokens -= count;
      return { allowed: true, remainingTokens: this.tokens };
    }

    const needed = count - this.tokens;
    const refillsNeeded = Math.ceil(needed / this.options.refillRate);
    const retryAfterMs = refillsNeeded * this.options.refillInterval;

    return { allowed: false, remainingTokens: this.tokens, retryAfterMs };
  }

  /** Returns the current number of available tokens. */
  getTokens(): number {
    this.refill();
    return this.tokens;
  }

  /** Resets the limiter to full capacity. */
  reset(): void {
    this.tokens = this.options.maxTokens;
    this.lastRefillTime = Date.now();
  }

  /** Returns the limiter configuration. */
  getOptions(): Required<RateLimiterOptions> {
    return { ...this.options };
  }
}
