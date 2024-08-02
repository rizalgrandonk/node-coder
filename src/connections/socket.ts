import net from "net";
import { ReadlineParser } from "@serialport/parser-readline";

type WriteAndResponseConfig = {
  responseValidation?: string | ((res: string) => boolean);
  timeout?: number;
};

export default class SocketConnection {
  public type = "socket";
  private configTCP: net.SocketConnectOpts;
  private client: net.Socket;
  private intervalConnect?: NodeJS.Timeout;
  private parser: ReadlineParser;

  constructor(config: net.SocketConnectOpts) {
    this.configTCP = config;
    this.client = new net.Socket();
    this.intervalConnect = undefined;

    this.parser = new ReadlineParser({ delimiter: "\r" });
    this.client.pipe(this.parser);

    this.client.on("connect", this.handleConnect.bind(this));
    this.client.on("error", this.handleError.bind(this));
    this.client.on("close", this.launchIntervalConnect.bind(this));
    this.client.on("end", this.launchIntervalConnect.bind(this));

    // this.connect();
  }

  public connect() {
    console.log("Connect tcp run", this.configTCP);
    this.client.connect({
      ...this.configTCP,
    });
  }

  private launchIntervalConnect() {
    if (this.intervalConnect) return;
    this.intervalConnect = setInterval(this.connect.bind(this), 3000);
  }

  private clearIntervalConnect() {
    if (!this.intervalConnect) return;
    clearInterval(this.intervalConnect);
    this.intervalConnect = undefined;
  }

  private handleConnect() {
    this.clearIntervalConnect();
    console.log("connected to server", "TCP");
  }

  private handleError(err: Error) {
    console.log(err.message, "TCP ERROR");
    this.launchIntervalConnect();
  }

  public async writeAndResponse(
    data: string,
    config?: WriteAndResponseConfig
  ): Promise<string | undefined> {
    if (!this.client) {
      console.log("Serial Port Unavailable");
      return undefined;
    }
    const waitTimeout = config?.timeout ?? 5000;
    const validation = config?.responseValidation;

    return Promise.race([
      new Promise<string>((resolve) => {
        const readHandler = (val: Buffer) => {
          console.log("TCP Says", val.toString());
          const data = val.toString();
          if (!validation) {
            this.client.off("data", readHandler);
            return resolve(data);
          }
          if (typeof validation === "string") {
            if (data.includes(validation)) {
              this.client.off("data", readHandler);
              return resolve(data);
            }
            return;
          }
          if (validation(data)) {
            this.client.off("data", readHandler);
            return resolve(data);
          }
        };

        this.client.write(data, (err) => {
          if (err) {
            console.log(err);
          } else {
            console.log(`Write to TCP`, { data });
          }
        });

        this.client.on("data", readHandler);
      }),
      new Promise<string>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Error timeout ${waitTimeout} ms exceeded`)),
          waitTimeout
        )
      ),
    ]);
  }

  public write(data: string, cb?: (err?: Error | null) => void) {
    return this.client.write(data, cb);
  }

  public onData(listener: (data: string) => void) {
    return this.parser.on("data", (val: Buffer) => {
      listener(val.toString());
    });
  }
  public offData(listener: (data: any) => void) {
    this.client.on("data", listener);
  }
}

// const configTCP = {
//   port: +(process.env.SOCKET_PORT ?? 515),
//   host: process.env.SOCKET_HOST ?? "0.0.0.0",
// };

// const client = new net.Socket();
// let intervalConnect: NodeJS.Timeout | undefined = undefined;

// function connect() {
//   console.log("Connect tcp run", configTCP);
//   client.connect({
//     ...configTCP,
//   });
// }

// function launchIntervalConnect() {
//   if (!!intervalConnect) return;
//   intervalConnect = setInterval(connect, 3000);
// }

// function clearIntervalConnect() {
//   if (!intervalConnect) return;
//   clearInterval(intervalConnect);
//   intervalConnect = undefined;
// }

// client.on("connect", () => {
//   clearIntervalConnect();
//   console.log("connected to server", "TCP");
// });

// client.on("data", (data) => {
//   console.log("TCP Data", {
//     rawData: data,
//     toString: data.toString(),
//   });
// });

// client.on("error", (err) => {
//   console.log(err.message, "TCP ERROR");
//   launchIntervalConnect();
// });
// client.on("close", launchIntervalConnect);
// client.on("end", launchIntervalConnect);

// connect();

// export const socketClient =
//   client.writable && client.readable ? client : undefined;

// export async function writeAndResponse(
//   data: string,
//   config?: {
//     responseValidation?: string | ((res: string) => boolean);
//     timeout?: number;
//   }
// ) {
//   if (!client) {
//     console.log("Serial Port Unavailable");
//     return undefined;
//   }
//   const waitTimeout = config?.timeout ?? 5000;
//   const validation = config?.responseValidation;

//   return Promise.race([
//     new Promise<string>((resolve) => {
//       const readHandler = (val: Buffer) => {
//         console.log("TCP Says", val.toString());
//         const data = val.toString();
//         if (!validation) {
//           client?.off("data", readHandler);
//           return resolve(data);
//         }
//         if (typeof validation === "string") {
//           if (data.includes(validation)) {
//             client?.off("data", readHandler);
//             return resolve(data);
//           }
//           return;
//         }
//         if (validation(data)) {
//           client?.off("data", readHandler);
//           return resolve(data);
//         }
//       };

//       client.write(data, (err) => {
//         if (err) {
//           console.log(err);
//         } else {
//           console.log(`Write to TCP`, {
//             data,
//           });
//         }
//       });

//       client.on("data", readHandler);
//     }),
//     new Promise<string>((_, reject) =>
//       setTimeout(
//         () => reject(new Error(`Error timeout ${waitTimeout} ms exceded`)),
//         waitTimeout
//       )
//     ),
//   ]);
// }

// export default {
//   socketClient,
//   writeAndResponse,
// };
