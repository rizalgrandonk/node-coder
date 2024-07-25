export class SharedQueue {
  private buffer: SharedArrayBuffer;
  private view: Uint8Array;
  private indexView: Uint16Array;

  private readonly headIndex = 0; // Offset for head index in Uint16Array
  private readonly tailIndex = 1; // Offset for tail index in Uint16Array
  private readonly lockIndex = 2; // Offset for lock index in Uint16Array

  private readonly maxStringLength: number;
  private readonly itemSize: number;
  private readonly capacity: number;

  constructor(
    bufferOrCapacity: SharedArrayBuffer | number,
    maxStringLength?: number
  ) {
    if (typeof bufferOrCapacity === "number") {
      // Initialize with new buffer
      this.capacity = bufferOrCapacity;
      this.maxStringLength = maxStringLength!;
      this.itemSize = this.maxStringLength;

      // Calculate total buffer size: (capacity * itemSize) + overhead (6 bytes for indices)
      this.buffer = new SharedArrayBuffer(
        Uint16Array.BYTES_PER_ELEMENT * 3 +
          Uint8Array.BYTES_PER_ELEMENT * this.capacity * this.itemSize
      );
      this.indexView = new Uint16Array(this.buffer, 0, 3);
      this.view = new Uint8Array(
        this.buffer,
        Uint16Array.BYTES_PER_ELEMENT * 3
      );

      // Initialize indices
      Atomics.store(this.indexView, this.headIndex, 0);
      Atomics.store(this.indexView, this.tailIndex, 0);
      Atomics.store(this.indexView, this.lockIndex, 0);
    } else {
      // Initialize with existing buffer
      this.buffer = bufferOrCapacity;
      this.indexView = new Uint16Array(this.buffer, 0, 3);
      this.view = new Uint8Array(
        this.buffer,
        Uint16Array.BYTES_PER_ELEMENT * 3
      );
      this.maxStringLength = maxStringLength!;
      this.itemSize = this.maxStringLength;
      this.capacity = this.view.length / this.itemSize;
    }
  }

  private acquireLock(): boolean {
    return Atomics.compareExchange(this.indexView, this.lockIndex, 0, 1) === 0;
  }

  private releaseLock(): void {
    Atomics.store(this.indexView, this.lockIndex, 0);
  }

  getBuffer(): SharedArrayBuffer {
    return this.buffer;
  }

  push(...values: string[]): boolean {
    const encoder = new TextEncoder();
    let enqueueCount = 0;

    while (!this.acquireLock());

    let head = Atomics.load(this.indexView, this.headIndex);
    let tail = Atomics.load(this.indexView, this.tailIndex);

    for (const value of values) {
      enqueueCount++;
      const encodedValue = encoder.encode(value);

      if (encodedValue.length > this.maxStringLength) {
        this.releaseLock();
        throw new Error(
          `String "${value}" exceeds maximum length of ${this.maxStringLength} bytes`
        );
      }

      const nextTail = (tail + 1) % this.capacity;

      if (nextTail === head) {
        this.releaseLock();
        console.log("Queue is full");
        return false;
      }

      const start = tail * this.itemSize;

      // Clear existing data
      this.view.fill(0, start, start + this.itemSize);
      this.view.set(encodedValue, start);

      // Update tail index
      tail = nextTail;
    }

    // Use atomic store to ensure correct update
    Atomics.store(this.indexView, this.tailIndex, tail);
    this.releaseLock();
    return true;
  }

  size(): number {
    while (!this.acquireLock());
    const head = Atomics.load(this.indexView, this.headIndex);
    const tail = Atomics.load(this.indexView, this.tailIndex);
    const size = tail >= head ? tail - head : this.capacity - head + tail;
    this.releaseLock();
    return size;
  }

  getAll(): string[] {
    while (!this.acquireLock());

    const head = Atomics.load(this.indexView, this.headIndex);
    const tail = Atomics.load(this.indexView, this.tailIndex);
    const items: string[] = [];

    for (let i = head; i !== tail; i = (i + 1) % this.capacity) {
      const start = i * this.itemSize;
      const encodedValue = this.view.slice(start, start + this.maxStringLength);

      // Decode the string
      const decoder = new TextDecoder();
      const value = decoder.decode(encodedValue).replace(/\0/g, "");
      items.push(value);
    }

    this.releaseLock();

    return items;
  }

  shift(): string | null {
    while (!this.acquireLock());

    const head = Atomics.load(this.indexView, this.headIndex);
    let tail = Atomics.load(this.indexView, this.tailIndex);

    if (head === tail) {
      this.releaseLock();
      return null; // Queue is empty
    }

    const start = head * this.itemSize;
    const encodedValue = this.view.slice(start, start + this.itemSize);
    const value = new TextDecoder().decode(encodedValue).replace(/\0/g, "");

    Atomics.store(this.indexView, this.headIndex, (head + 1) % this.capacity);
    this.releaseLock();

    return value;
  }
}
