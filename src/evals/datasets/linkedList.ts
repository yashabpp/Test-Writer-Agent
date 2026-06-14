/**
 * linkedList.ts
 * Singly linked list with standard operations.
 */

class ListNode<T> {
  constructor(
    public value: T,
    public next: ListNode<T> | null = null
  ) {}
}

export class LinkedListError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LinkedListError';
  }
}

export class LinkedList<T> {
  private head: ListNode<T> | null = null;
  private _size = 0;

  /** Returns the number of nodes. */
  get size(): number {
    return this._size;
  }

  /** Returns true if the list is empty. */
  isEmpty(): boolean {
    return this._size === 0;
  }

  /** Inserts a value at the end of the list. */
  append(value: T): void {
    const node = new ListNode(value);
    if (!this.head) {
      this.head = node;
    } else {
      let curr = this.head;
      while (curr.next) curr = curr.next;
      curr.next = node;
    }
    this._size++;
  }

  /**
   * Inserts a value at a specific index (0-based).
   * @throws {LinkedListError} if index is out of bounds.
   */
  insertAt(index: number, value: T): void {
    if (index < 0 || index > this._size) {
      throw new LinkedListError(`Index ${index} out of bounds (size: ${this._size})`);
    }
    const node = new ListNode(value);
    if (index === 0) {
      node.next = this.head;
      this.head = node;
    } else {
      let curr = this.head!;
      for (let i = 0; i < index - 1; i++) curr = curr.next!;
      node.next = curr.next;
      curr.next = node;
    }
    this._size++;
  }

  /**
   * Removes and returns the value at the specified index.
   * @throws {LinkedListError} if index is out of bounds or list is empty.
   */
  removeAt(index: number): T {
    if (this.isEmpty()) throw new LinkedListError('Cannot remove from empty list');
    if (index < 0 || index >= this._size) {
      throw new LinkedListError(`Index ${index} out of bounds (size: ${this._size})`);
    }
    let removed: ListNode<T>;
    if (index === 0) {
      removed = this.head!;
      this.head = this.head!.next;
    } else {
      let curr = this.head!;
      for (let i = 0; i < index - 1; i++) curr = curr.next!;
      removed = curr.next!;
      curr.next = removed.next;
    }
    this._size--;
    return removed.value;
  }

  /**
   * Returns the value at the specified index.
   * @throws {LinkedListError} if index is out of bounds.
   */
  get(index: number): T {
    if (index < 0 || index >= this._size) {
      throw new LinkedListError(`Index ${index} out of bounds (size: ${this._size})`);
    }
    let curr = this.head!;
    for (let i = 0; i < index; i++) curr = curr.next!;
    return curr.value;
  }

  /** Returns the index of the first occurrence of the value, or -1 if not found. */
  find(value: T): number {
    let curr = this.head;
    let index = 0;
    while (curr) {
      if (curr.value === value) return index;
      curr = curr.next;
      index++;
    }
    return -1;
  }

  /** Reverses the list in place. */
  reverse(): void {
    let prev: ListNode<T> | null = null;
    let curr = this.head;
    while (curr) {
      const next = curr.next;
      curr.next = prev;
      prev = curr;
      curr = next;
    }
    this.head = prev;
  }

  /** Returns all values as an array. */
  toArray(): T[] {
    const result: T[] = [];
    let curr = this.head;
    while (curr) {
      result.push(curr.value);
      curr = curr.next;
    }
    return result;
  }

  /** Removes all nodes. */
  clear(): void {
    this.head = null;
    this._size = 0;
  }
}
