import { fork, ForkOptions, ChildProcess } from "child_process";

type ExposedFunction = (...args: any[]) => any;
type ExposedModule = Record<string, ExposedFunction>;

class ChildWorker<M extends ExposedModule> {
  private worker: ChildProcess;

  constructor(workerPath: string, options?: ForkOptions) {
    this.worker = fork(workerPath, options);
  }

  // Method to add data to the worker process
  // add(channel: keyof M, data: Parameters<M[keyof M]>[0]) {
  //   this.run({ channel, data });
  // }

  // Method to subscribe to the worker process
  subscribe(channel: keyof M, callback: (...args: any[]) => void) {
    this.worker.on("message", (message: { channel: string; data: any }) => {
      console.log("Subscribe Message", { message });
      if (message.channel === channel) {
        callback(message.data);
      }
    });
  }

  // Generic method to run the worker process
  async runProcess(args: {
    channel: keyof M;
    data: Parameters<M[keyof M]>[0];
  }): Promise<ReturnType<M[keyof M]>> {
    return new Promise<ReturnType<M[keyof M]>>((resolve, reject) => {
      this.worker.send(args);

      const messageHandler = (result: ReturnType<M[keyof M]>) => {
        this.worker.off("message", messageHandler);
        this.worker.off("error", errorHandler);
        resolve(result);
      };

      const errorHandler = (err: Error) => {
        console.error(err);
        this.worker.off("error", errorHandler);
        this.worker.off("message", messageHandler);
        reject(err);
      };

      this.worker.on("message", messageHandler);
      this.worker.on("error", errorHandler);
    }) as Promise<ReturnType<M[keyof M]>>;
  }

  // Method to kill the worker process
  kill() {
    this.worker.kill();
  }
}

// export const expose = (func: Function) => {
//   if (!process.send) {
//     throw new Error("Call 'expose' outside child process");
//   }

//   process.on("message", async (message) => {
//     console.log("Message serialProcess", { message });
//     if (typeof message !== "string") {
//       return;
//     }
//     const result = await func(message);
//     process.send && process.send(result);
//   });
// };

export const expose = (module: ExposedModule) => {
  if (!process.send) {
    throw new Error("Call 'expose' outside child process");
  }

  // console.log("expose", { channel });
  // process.on(channel, async (message) => {
  //   const result = await func(message);
  //   const channelName: any = channel;
  //   console.log("expose-message", { channelName, result });
  //   process.emit(channelName, result);
  // });

  process.on("message", async (message: { channel: string; data: any }) => {
    console.log("Message serialProcess", { message });
    // if (typeof message !== "string") {
    //   return;
    // }
    if (module.hasOwnProperty(message.channel)) {
      const channel = message.channel;
      const func = module[message.channel];
      console.log("expose-message", { channel, data: message.data });
      const result = await func(message.data);
      // process.send && process.send({ channel, data: result });
    }
  });
};

export default ChildWorker;
