export type QueueItem = {
  id: number;
  uniquecode: string;
};

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
    maxStringLength: number = 100
  ) {
    if (typeof bufferOrCapacity === "number") {
      // Initialize with new buffer
      this.capacity = bufferOrCapacity + 100;
      this.maxStringLength = maxStringLength;
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
      this.maxStringLength = maxStringLength;
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

  private exists(value: string): boolean {
    const encoder = new TextEncoder();
    const encodedValue = encoder.encode(value);

    const head = Atomics.load(this.indexView, this.headIndex);
    const tail = Atomics.load(this.indexView, this.tailIndex);

    for (let i = head; i !== tail; i = (i + 1) % this.capacity) {
      const start = i * this.itemSize;
      const encodedItem = this.view.slice(start, start + this.maxStringLength);
      const itemValue = new TextDecoder()
        .decode(encodedItem)
        .replace(/\0/g, "");
      if (itemValue === value) {
        return true;
      }
    }

    return false;
  }

  getBuffer(): SharedArrayBuffer {
    return this.buffer;
  }

  push(...values: QueueItem[]): boolean {
    const encoder = new TextEncoder();
    let enqueueCount = 0;

    while (!this.acquireLock());

    let head = Atomics.load(this.indexView, this.headIndex);
    let tail = Atomics.load(this.indexView, this.tailIndex);

    for (const value of values) {
      const item = `${value.id}:${value.uniquecode}`;

      if (this.exists(item)) {
        continue; // Skip if the item already exists
      }

      enqueueCount++;
      const encodedValue = encoder.encode(item);

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

  getAll(): QueueItem[] {
    while (!this.acquireLock());

    const head = Atomics.load(this.indexView, this.headIndex);
    const tail = Atomics.load(this.indexView, this.tailIndex);
    const items: QueueItem[] = [];

    for (let i = head; i !== tail; i = (i + 1) % this.capacity) {
      const start = i * this.itemSize;
      const encodedValue = this.view.slice(start, start + this.maxStringLength);

      // Decode the string
      const decoder = new TextDecoder();
      const value = decoder.decode(encodedValue).replace(/\0/g, "");
      const [id, uniquecode] = value.split(":");
      items.push({ id: Number(id), uniquecode });
    }

    this.releaseLock();

    return items;
  }

  shift(): QueueItem | null {
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

    const [id, uniquecode] = value.split(":");
    return { id: Number(id), uniquecode };
  }

  shiftAll(): QueueItem[] {
    while (!this.acquireLock());

    const head = Atomics.load(this.indexView, this.headIndex);
    const tail = Atomics.load(this.indexView, this.tailIndex);
    const items: QueueItem[] = [];

    if (head !== tail) {
      let current = head;
      do {
        const start = current * this.itemSize;
        const encodedValue = this.view.slice(
          start,
          start + this.maxStringLength
        );
        const value = new TextDecoder().decode(encodedValue).replace(/\0/g, "");

        const [id, uniquecode] = value.split(":");
        items.push({ id: Number(id), uniquecode });

        current = (current + 1) % this.capacity;
      } while (current !== tail);

      // Reset the queue
      Atomics.store(this.indexView, this.headIndex, tail);
    }

    this.releaseLock();
    return items;
  }
}

export class SharedPrimitive<
  T extends number | boolean | string | undefined | null | bigint
> {
  private buffer: SharedArrayBuffer;
  private view: DataView;
  private stringView: Uint8Array;

  private readonly typeOffset = 0;
  private readonly valueOffset = 4;
  private readonly maxStringLength: number;

  constructor(
    initialValueOrBuffer: T | SharedArrayBuffer,
    maxStringLength: number = 100
  ) {
    this.maxStringLength = maxStringLength;
    const bufferSize = 4 + 8 + maxStringLength; // 4 bytes for type, 8 bytes for number/bigint, rest for string

    if (initialValueOrBuffer instanceof SharedArrayBuffer) {
      if (initialValueOrBuffer.byteLength < bufferSize) {
        throw new Error("Provided buffer is too small");
      }
      this.buffer = initialValueOrBuffer;
    } else {
      this.buffer = new SharedArrayBuffer(bufferSize);
    }

    this.view = new DataView(this.buffer);
    this.stringView = new Uint8Array(this.buffer, this.valueOffset);

    if (!(initialValueOrBuffer instanceof SharedArrayBuffer)) {
      this.set(initialValueOrBuffer);
    }
  }

  getBuffer(): SharedArrayBuffer {
    return this.buffer;
  }

  set(value: T): void {
    if (typeof value === "number") {
      this.view.setUint32(this.typeOffset, 1, true);
      this.view.setFloat64(this.valueOffset, value, true);
    } else if (typeof value === "boolean") {
      this.view.setUint32(this.typeOffset, 2, true);
      this.view.setUint8(this.valueOffset, value ? 1 : 0);
    } else if (typeof value === "string") {
      this.view.setUint32(this.typeOffset, 3, true);
      const encoder = new TextEncoder();
      const encoded = encoder.encode(value.slice(0, this.maxStringLength));
      this.stringView.set(encoded);
      this.stringView.fill(0, encoded.length);
    } else if (value === undefined) {
      this.view.setUint32(this.typeOffset, 4, true);
    } else if (value === null) {
      this.view.setUint32(this.typeOffset, 5, true);
    } else if (typeof value === "bigint") {
      this.view.setUint32(this.typeOffset, 6, true);
      this.view.setBigInt64(this.valueOffset, value, true);
    } else {
      throw new Error("Unsupported type");
    }
  }

  get(): T {
    const type = this.view.getUint32(this.typeOffset, true);
    switch (type) {
      case 1: // number
        return this.view.getFloat64(this.valueOffset, true) as T;
      case 2: // boolean
        return (this.view.getUint8(this.valueOffset) === 1) as T;
      case 3: // string
        const decoder = new TextDecoder();
        return decoder.decode(this.stringView).replace(/\0/g, "") as T;
      case 4: // undefined
        return undefined as T;
      case 5: // null
        return null as T;
      case 6: // bigint
        return this.view.getBigInt64(this.valueOffset, true) as T;
      default:
        throw new Error("Invalid type stored");
    }
  }
}
