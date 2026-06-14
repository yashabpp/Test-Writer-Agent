/**
 * cacheManager.ts
 * TTL-based in-memory cache with LRU eviction.
 */

export interface CacheEntry<T> {
  value: T;
  expiresAt: number;   // Unix timestamp (ms)
  createdAt: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;  // 0–1
}

export class CacheError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CacheError';
  }
}

export class CacheManager<T = unknown> {
  private store = new Map<string, CacheEntry<T>>();
  private stats = { hits: 0, misses: 0 };
  private readonly defaultTtl: number;
  private readonly maxSize: number;

  constructor(defaultTtlMs = 60_000, maxSize = 1000) {
    if (defaultTtlMs <= 0) throw new CacheError('defaultTtlMs must be positive');
    if (maxSize <= 0) throw new CacheError('maxSize must be positive');
    this.defaultTtl = defaultTtlMs;
    this.maxSize = maxSize;
  }

  /**
   * Stores a value with an optional TTL.
   * @param ttlMs Time-to-live in ms. Uses the default if not provided.
   * @throws {CacheError} if the key is empty.
   */
  set(key: string, value: T, ttlMs?: number): void {
    if (!key) throw new CacheError('Cache key must be a non-empty string');
    const ttl = ttlMs ?? this.defaultTtl;
    if (ttl <= 0) throw new CacheError('TTL must be positive');

    // Evict oldest entry if at capacity
    if (!this.store.has(key) && this.store.size >= this.maxSize) {
      const firstKey = this.store.keys().next().value as string;
      this.store.delete(firstKey);
    }

    const now = Date.now();
    this.store.set(key, { value, expiresAt: now + ttl, createdAt: now });
  }

  /**
   * Retrieves a value by key.
   * @returns The value, or undefined if not found or expired.
   */
  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      this.stats.misses++;
      return undefined;
    }
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.stats.misses++;
      return undefined;
    }
    this.stats.hits++;
    return entry.value;
  }

  /**
   * Returns true if the key exists and has not expired.
   */
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * Removes a key from the cache.
   * @returns true if the key existed and was removed.
   */
  delete(key: string): boolean {
    return this.store.delete(key);
  }

  /** Removes all entries from the cache. */
  clear(): void {
    this.store.clear();
    this.stats = { hits: 0, misses: 0 };
  }

  /** Removes all expired entries and returns the count of removed entries. */
  prune(): number {
    const now = Date.now();
    let count = 0;
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
        count++;
      }
    }
    return count;
  }

  /** Returns cache statistics. */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: this.store.size,
      hitRate: total === 0 ? 0 : this.stats.hits / total,
    };
  }

  /** Returns all non-expired keys. */
  keys(): string[] {
    const now = Date.now();
    return Array.from(this.store.entries())
      .filter(([, entry]) => entry.expiresAt > now)
      .map(([key]) => key);
  }
}
