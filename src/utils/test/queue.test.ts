import { SharedQueue } from "../queue";

describe("Shared Queue", () => {
  it("can add single item to the queue", () => {
    const queue = new SharedQueue(10, 5);
    queue.push("12345");
    expect(queue.getAll()).toEqual(["12345"]);
  });
  it("can add multiple items to the queue", () => {
    const queue = new SharedQueue(10, 5);
    queue.push("12345", "ABCDE", "QWERT", "WASDX", "ZXCVB");
    expect(queue.getAll()).toEqual([
      "12345",
      "ABCDE",
      "QWERT",
      "WASDX",
      "ZXCVB",
    ]);
  });
  it("can read all items in the queue", () => {
    const queue = new SharedQueue(10, 5);
    queue.push("00001", "00002", "00003", "00004", "00005");
    expect(queue.getAll()).toEqual([
      "00001",
      "00002",
      "00003",
      "00004",
      "00005",
    ]);
  });
  it("can get length all items in the queue", () => {
    const queue = new SharedQueue(10, 5);
    queue.push("00001", "00002", "00003", "00004");
    expect(queue.size()).toEqual(4);
  });
  it("can shift the right data from the queue", () => {
    const rawData = [
      "00001",
      "00002",
      "00003",
      "00004",
      "00005",
      "00006",
      "00007",
      "00008",
      "00009",
      "00010",
    ];
    const queue = new SharedQueue(10, 5);
    queue.push(...rawData);

    expect(queue.size()).toEqual(rawData.length);

    rawData.forEach((data) => {
      const item = queue.shift();
      expect(item).toBe(data);
    });
  });

  it("can be re-initialize with the same refrence and should have the same value", () => {
    const rawData = ["00001", "00002", "00003", "00004"];
    const queue1 = new SharedQueue(10, 5);
    queue1.push(...rawData);

    expect(queue1.size()).toEqual(rawData.length);
    expect(queue1.getAll()).toEqual(rawData);

    const queue2 = new SharedQueue(queue1.getBuffer(), 5);
    expect(queue2.size()).toEqual(queue1.size());
    expect(queue2.getAll()).toEqual(queue1.getAll());
    expect(queue2.getBuffer()).toEqual(queue1.getBuffer());

    queue2.push("00005");

    expect(queue2.size()).toEqual(rawData.length + 1);
    expect(queue2.getAll()).toEqual([...rawData, "00005"]);
    expect(queue1.size()).toEqual(rawData.length + 1);
    expect(queue1.getAll()).toEqual([...rawData, "00005"]);
  });
});
