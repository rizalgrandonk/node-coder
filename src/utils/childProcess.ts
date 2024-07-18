import { fork, ForkOptions, ChildProcess } from "child_process";

class ChildWorker<F extends (...args: any[]) => Promise<any>> {
  private worker: ChildProcess;

  constructor(workerPath: string, options?: ForkOptions) {
    this.worker = fork(workerPath, options);
  }

  // Generic method to run the worker process
  async run(args: Parameters<F>[0]): Promise<ReturnType<F>> {
    return new Promise<ReturnType<F>>((resolve, reject) => {
      this.worker.send(args);

      const messageHandler = (result: ReturnType<F>) => {
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
    }) as Promise<ReturnType<F>>;
  }

  // Method to kill the worker process
  kill() {
    this.worker.kill();
  }
}

export const expose = (func: Function) => {
  if (!process.send) {
    throw new Error("Call 'expose' outside child process");
  }
  process.on("message", async (message) => {
    console.log("Message serialProcess", { message });
    if (typeof message !== "string") {
      return;
    }
    const result = await func(message);
    process.send && process.send(result);
  });
};

export default ChildWorker;
