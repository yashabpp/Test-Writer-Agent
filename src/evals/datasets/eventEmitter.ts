/**
 * eventEmitter.ts
 * Minimal, typed EventEmitter implementation.
 */

export type EventListener<T = unknown> = (data: T) => void;

export class EventEmitterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EventEmitterError';
  }
}

export class EventEmitter<Events extends Record<string, unknown> = Record<string, unknown>> {
  private listeners = new Map<string, EventListener[]>();
  private maxListeners: number;

  constructor(maxListeners = 10) {
    if (maxListeners <= 0) throw new EventEmitterError('maxListeners must be positive');
    this.maxListeners = maxListeners;
  }

  /**
   * Registers a listener for the given event.
   * @throws {EventEmitterError} if the max listeners limit is exceeded.
   */
  on<K extends keyof Events & string>(event: K, listener: EventListener<Events[K]>): this {
    const existing = this.listeners.get(event) ?? [];
    if (existing.length >= this.maxListeners) {
      throw new EventEmitterError(
        `Max listeners (${this.maxListeners}) exceeded for event "${event}"`
      );
    }
    existing.push(listener as EventListener);
    this.listeners.set(event, existing);
    return this;
  }

  /**
   * Registers a one-time listener that is removed after the first emit.
   */
  once<K extends keyof Events & string>(event: K, listener: EventListener<Events[K]>): this {
    const wrapper: EventListener = (data) => {
      listener(data as Events[K]);
      this.off(event, wrapper as EventListener<Events[K]>);
    };
    return this.on(event, wrapper as EventListener<Events[K]>);
  }

  /**
   * Removes a specific listener for the given event.
   */
  off<K extends keyof Events & string>(event: K, listener: EventListener<Events[K]>): this {
    const existing = this.listeners.get(event);
    if (existing) {
      this.listeners.set(
        event,
        existing.filter((l) => l !== (listener as EventListener))
      );
    }
    return this;
  }

  /**
   * Emits an event, calling all registered listeners synchronously.
   * @returns true if any listeners were called.
   */
  emit<K extends keyof Events & string>(event: K, data: Events[K]): boolean {
    const eventListeners = this.listeners.get(event);
    if (!eventListeners || eventListeners.length === 0) return false;
    for (const listener of [...eventListeners]) {
      listener(data);
    }
    return true;
  }

  /** Returns the number of listeners for the given event. */
  listenerCount(event: string): number {
    return this.listeners.get(event)?.length ?? 0;
  }

  /** Removes all listeners for the given event (or all events if not specified). */
  removeAllListeners(event?: string): this {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
    return this;
  }

  /** Returns a list of all registered event names. */
  eventNames(): string[] {
    return Array.from(this.listeners.keys());
  }
}
