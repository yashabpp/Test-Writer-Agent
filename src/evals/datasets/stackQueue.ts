/**
 * stackQueue.ts
 * Generic Stack and Queue data structures.
 */

export class StackUnderflowError extends Error {
  constructor() {
    super('Stack underflow: cannot pop from an empty stack');
    this.name = 'StackUnderflowError';
  }
}

export class QueueUnderflowError extends Error {
  constructor() {
    super('Queue underflow: cannot dequeue from an empty queue');
    this.name = 'QueueUnderflowError';
  }
}

// ---------------------------------------------------------------------------
// Stack
// ---------------------------------------------------------------------------

export class Stack<T> {
  private items: T[] = [];

  /** Pushes an item onto the stack. */
  push(item: T): void {
    this.items.push(item);
  }

  /**
   * Removes and returns the top item.
   * @throws {StackUnderflowError} if the stack is empty.
   */
  pop(): T {
    if (this.isEmpty()) throw new StackUnderflowError();
    return this.items.pop() as T;
  }

  /**
   * Returns the top item without removing it.
   * @throws {StackUnderflowError} if the stack is empty.
   */
  peek(): T {
    if (this.isEmpty()) throw new StackUnderflowError();
    return this.items[this.items.length - 1] as T;
  }

  /** Returns true if the stack has no items. */
  isEmpty(): boolean {
    return this.items.length === 0;
  }

  /** Returns the number of items in the stack. */
  size(): number {
    return this.items.length;
  }

  /** Removes all items from the stack. */
  clear(): void {
    this.items = [];
  }

  /** Returns a shallow copy of all items (bottom to top). */
  toArray(): T[] {
    return [...this.items];
  }
}

// ---------------------------------------------------------------------------
// Queue
// ---------------------------------------------------------------------------

export class Queue<T> {
  private items: T[] = [];

  /** Adds an item to the back of the queue. */
  enqueue(item: T): void {
    this.items.push(item);
  }

  /**
   * Removes and returns the front item.
   * @throws {QueueUnderflowError} if the queue is empty.
   */
  dequeue(): T {
    if (this.isEmpty()) throw new QueueUnderflowError();
    return this.items.shift() as T;
  }

  /**
   * Returns the front item without removing it.
   * @throws {QueueUnderflowError} if the queue is empty.
   */
  front(): T {
    if (this.isEmpty()) throw new QueueUnderflowError();
    return this.items[0] as T;
  }

  /** Returns true if the queue has no items. */
  isEmpty(): boolean {
    return this.items.length === 0;
  }

  /** Returns the number of items in the queue. */
  size(): number {
    return this.items.length;
  }

  /** Removes all items from the queue. */
  clear(): void {
    this.items = [];
  }

  /** Returns a shallow copy of all items (front to back). */
  toArray(): T[] {
    return [...this.items];
  }
}
