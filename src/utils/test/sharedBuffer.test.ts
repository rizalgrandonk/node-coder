import { SharedPrimitive, SharedQueue } from "../sharedBuffer";

describe("Shared Queue", () => {
  it("can add single item to the queue", () => {
    const queue = new SharedQueue(10);
    queue.push({ id: 1000000, uniquecode: "12345" });
    expect(queue.getAll()).toEqual([{ id: 1000000, uniquecode: "12345" }]);
  });
  it("can add multiple items to the queue", () => {
    const rawData = [
      { id: 1000001, uniquecode: "00001" },
      { id: 1000002, uniquecode: "00002" },
      { id: 1000003, uniquecode: "00003" },
      { id: 1000004, uniquecode: "00004" },
      { id: 1000005, uniquecode: "00005" },
    ];
    const queue = new SharedQueue(10);
    queue.push(...rawData);
    expect(queue.getAll()).toEqual(rawData);
  });
  it("can read all items in the queue", () => {
    const rawData = [
      { id: 1000001, uniquecode: "00001" },
      { id: 1000002, uniquecode: "00002" },
      { id: 1000003, uniquecode: "00003" },
      { id: 1000004, uniquecode: "00004" },
      { id: 1000005, uniquecode: "00005" },
    ];
    const queue = new SharedQueue(10);
    queue.push(...rawData);
    expect(queue.getAll()).toEqual(rawData);
  });
  it("can get length all items in the queue", () => {
    const rawData = [
      { id: 1000001, uniquecode: "00001" },
      { id: 1000002, uniquecode: "00002" },
      { id: 1000003, uniquecode: "00003" },
      { id: 1000004, uniquecode: "00004" },
      { id: 1000005, uniquecode: "00005" },
    ];
    const queue = new SharedQueue(10);
    queue.push(...rawData);
    expect(queue.size()).toEqual(rawData.length);
  });
  it("can shift the right data from the queue", () => {
    const rawData = [
      { id: 1000001, uniquecode: "00001" },
      { id: 1000002, uniquecode: "00002" },
      { id: 1000003, uniquecode: "00003" },
      { id: 1000004, uniquecode: "00004" },
      { id: 1000005, uniquecode: "00005" },
      { id: 1000006, uniquecode: "00006" },
      { id: 1000007, uniquecode: "00007" },
      { id: 1000008, uniquecode: "00008" },
      { id: 1000009, uniquecode: "00009" },
      { id: 1000010, uniquecode: "00010" },
    ];
    const queue = new SharedQueue(10);
    queue.push(...rawData);

    expect(queue.size()).toEqual(rawData.length);

    rawData.forEach((data) => {
      const item = queue.shift();
      expect(item).toEqual(data);
    });
  });

  it("can shift all the right data from the queue", () => {
    const rawData = [
      { id: 1000001, uniquecode: "00001" },
      { id: 1000002, uniquecode: "00002" },
      { id: 1000003, uniquecode: "00003" },
      { id: 1000004, uniquecode: "00004" },
      { id: 1000005, uniquecode: "00005" },
      { id: 1000006, uniquecode: "00006" },
      { id: 1000007, uniquecode: "00007" },
      { id: 1000008, uniquecode: "00008" },
      { id: 1000009, uniquecode: "00009" },
      { id: 1000010, uniquecode: "00010" },
    ];
    const queue = new SharedQueue(10);
    queue.push(...rawData);

    expect(queue.size()).toEqual(rawData.length);

    expect(queue.shiftAll()).toEqual(rawData);
    expect(queue.size()).toEqual(0);
  });

  it("can be re-initialize with the same refrence and should have the same value", () => {
    const rawData = [
      { id: 1000001, uniquecode: "00001" },
      { id: 1000002, uniquecode: "00002" },
      { id: 1000003, uniquecode: "00003" },
      { id: 1000004, uniquecode: "00004" },
    ];
    const queue1 = new SharedQueue(10);
    queue1.push(...rawData);

    expect(queue1.size()).toEqual(rawData.length);
    expect(queue1.getAll()).toEqual(rawData);

    const queue2 = new SharedQueue(queue1.getBuffer());
    expect(queue2.size()).toEqual(queue1.size());
    expect(queue2.getAll()).toEqual(queue1.getAll());
    expect(queue2.getBuffer()).toEqual(queue1.getBuffer());

    queue2.push({ id: 1000005, uniquecode: "00005" });

    expect(queue2.size()).toEqual(rawData.length + 1);
    expect(queue2.getAll()).toEqual([
      ...rawData,
      { id: 1000005, uniquecode: "00005" },
    ]);
    expect(queue1.size()).toEqual(rawData.length + 1);
    expect(queue1.getAll()).toEqual([
      ...rawData,
      { id: 1000005, uniquecode: "00005" },
    ]);
  });
});

describe("Shared Primitive", () => {
  it("can init with number value", () => {
    const sharedValue = new SharedPrimitive<number>(10);

    expect(sharedValue.get()).toBe(10);
  });
  it("can change number value", () => {
    const sharedValue = new SharedPrimitive<number>(10);
    expect(sharedValue.get()).toBe(10);

    sharedValue.set(100);
    expect(sharedValue.get()).toBe(100);
  });
  it("can share refrence number value", () => {
    const sharedValue1 = new SharedPrimitive<number>(10);
    expect(sharedValue1.get()).toBe(10);

    const sharedValue2 = new SharedPrimitive<number>(sharedValue1.getBuffer());
    expect(sharedValue2.get()).toBe(10);

    sharedValue2.set(15);
    expect(sharedValue2.get()).toBe(15);
    expect(sharedValue1.get()).toBe(15);
  });

  it("can init with string value", () => {
    const sharedValue = new SharedPrimitive<string>("TEST");

    expect(sharedValue.get()).toBe("TEST");
  });
  it("can change string value", () => {
    const sharedValue = new SharedPrimitive<string>("TEST");
    expect(sharedValue.get()).toBe("TEST");

    sharedValue.set("TOSS");
    expect(sharedValue.get()).toBe("TOSS");
  });
  it("can share refrence string value", () => {
    const sharedValue1 = new SharedPrimitive<string>("TEST");
    expect(sharedValue1.get()).toBe("TEST");

    const sharedValue2 = new SharedPrimitive<string>(sharedValue1.getBuffer());
    expect(sharedValue2.get()).toBe("TEST");

    sharedValue2.set("TIIS");
    expect(sharedValue2.get()).toBe("TIIS");
    expect(sharedValue1.get()).toBe("TIIS");
  });

  it("can init with boolean value", () => {
    const sharedValue = new SharedPrimitive<boolean>(false);

    expect(sharedValue.get()).toBe(false);
  });
  it("can change boolean value", () => {
    const sharedValue = new SharedPrimitive<boolean>(false);
    expect(sharedValue.get()).toBe(false);

    sharedValue.set(true);
    expect(sharedValue.get()).toBe(true);
  });
  it("can share refrence boolean value", () => {
    const sharedValue1 = new SharedPrimitive<boolean>(false);
    expect(sharedValue1.get()).toBe(false);

    const sharedValue2 = new SharedPrimitive<boolean>(sharedValue1.getBuffer());
    expect(sharedValue2.get()).toBe(false);

    sharedValue2.set(true);
    expect(sharedValue2.get()).toBe(true);
    expect(sharedValue1.get()).toBe(true);
  });

  it("can change between undefined and boolean value", () => {
    const sharedValue = new SharedPrimitive<boolean | undefined>(undefined);
    expect(sharedValue.get()).toBe(undefined);

    sharedValue.set(true);
    expect(sharedValue.get()).toBe(true);
  });
  it("can change between undefined and number value", () => {
    const sharedValue = new SharedPrimitive<number | undefined>(undefined);
    expect(sharedValue.get()).toBe(undefined);

    sharedValue.set(250);
    expect(sharedValue.get()).toBe(250);
  });
  it("can change between undefined and string value", () => {
    const sharedValue = new SharedPrimitive<string | undefined>(undefined);
    expect(sharedValue.get()).toBe(undefined);

    sharedValue.set("TEST");
    expect(sharedValue.get()).toBe("TEST");
  });
});
