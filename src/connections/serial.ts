import { ReadlineOptions, SerialPort, SerialPortOpenOptions } from "serialport";
import { ReadlineParser } from "@serialport/parser-readline";
import { AutoDetectTypes } from "@serialport/bindings-cpp";
import EventEmitter from "events";

export type SerialConnectionParameterType = {
  portOptions: SerialPortOpenOptions<AutoDetectTypes>;
  parserOptions: ReadlineOptions;
};

type ConnectionStatus = "connect" | "error" | "close" | "end";

export default class SerialConnection {
  public type = "serial";
  private port: SerialPort;
  private parser: ReadlineParser;
  private intervalConnect: any;
  private timer: Date;
  private connectionEvent = new EventEmitter<{
    change: [status: ConnectionStatus, error?: Error];
  }>();
  public connectionStatus: ConnectionStatus = "close";

  constructor(config: SerialConnectionParameterType) {
    this.port = new SerialPort({
      ...config.portOptions,
      autoOpen: false,
    });
    this.parser = new ReadlineParser(config.parserOptions);
    this.port.pipe(this.parser);

    this.intervalConnect = undefined;
    this.timer = new Date();
  }

  private initializeEventListeners() {
    if (!this.port) return;

    this.port.on("error", (err) => {
      console.log(err, "Serial ERROR");
      this.connectionStatus = "error";
      this.connectionEvent.emit("change", "error", err);
      this.launchIntervalConnect();
    });

    this.port.on("close", () => {
      this.connectionStatus = "close";
      this.connectionEvent.emit("change", "close");
      return this.launchIntervalConnect.bind(this);
    });
    this.port.on("end", () => {
      this.connectionStatus = "end";
      this.connectionEvent.emit("change", "end");
      return this.launchIntervalConnect.bind(this);
    });

    if (this.parser) {
      this.parser.on("data", (data) => {
        const currentDate = new Date();
        const diff = currentDate.getTime() - this.timer.getTime();
        if (diff > 200) {
          console.log("Difference", `${diff} ms`);
        }
        this.timer = currentDate;
        console.log("Serial Port Parser Says", {
          source: data,
          string: data.toString(),
          length: data.length,
        });
      });
    }
  }

  public connect() {
    console.log("ConnecRun");
    this.port.open((err) => {
      if (err) {
        this.connectionStatus = "error";
        this.connectionEvent.emit("change", "error", err);
        this.launchIntervalConnect();
        return;
      }

      this.connectionStatus = "connect";
      this.connectionEvent.emit("change", "connect");
      this.clearIntervalConnect();
      console.log("connected to server", "Serial");
    });

    this.initializeEventListeners();
  }

  private launchIntervalConnect() {
    if (!!this.intervalConnect) return;
    this.intervalConnect = setInterval(() => this.connect(), 3000);
  }

  private clearIntervalConnect() {
    if (!this.intervalConnect) return;
    clearInterval(this.intervalConnect);
    this.intervalConnect = undefined;
  }

  public async writeAndResponse(
    data: string,
    config?: {
      responseValidation?: string | ((res: string) => boolean);
      timeout?: number;
    }
  ) {
    if (!this.port || !this.parser) {
      console.log("Serial Port Unavailable");
      return undefined;
    }
    const waitTimeout = config?.timeout ?? 5000;
    const validation = config?.responseValidation;

    return await Promise.race([
      new Promise<string>((resolve, reject) => {
        const readHandler = (data: any) => {
          console.log("Serial Port Parser Says", {
            source: data,
            string: data.toString(),
            length: data.length,
          });
          if (!validation) {
            this.parser?.off("data", readHandler);
            return resolve(data);
          }
          if (typeof validation === "string") {
            if (data.includes(validation)) {
              this.parser?.off("data", readHandler);
              return resolve(data);
            }
            return;
          }
          if (validation(data)) {
            this.parser?.off("data", readHandler);
            return resolve(data);
          }
        };

        this.port &&
          this.port.drain((err) => {
            if (err) {
              console.log("Error drain", err);
              return reject(err);
            }
            this.port &&
              this.port.write(data, (err) => {
                if (err) {
                  console.log("Error write response", err);
                  return reject(err);
                }
                console.log("Write to Serial", data);
                this.port &&
                  this.port.drain((err) => {
                    if (err) {
                      console.log("Error drain", err);
                      return reject(err);
                    }
                    this.parser && this.parser.on("data", readHandler);
                  });
              });
          });
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
    return this.port.write(data, undefined, cb);
  }

  public onData(listener: (data: any) => void) {
    this.parser.on("data", listener);
  }
  public offData(listener: (data: any) => void) {
    this.parser.off("data", listener);
  }

  public onConnectionChange(
    listener: (status: ConnectionStatus, error?: Error) => void
  ) {
    return this.connectionEvent.on("change", listener);
  }
  public offConnectionChange(
    listener: (status: ConnectionStatus, error?: Error) => void
  ) {
    return this.connectionEvent.off("change", listener);
  }
}
// const port = new SerialPort({
//   path: process.env.SERIAL_NAME ?? "/dev/cu.usbmodem1401",
//   baudRate: +(process.env.SERIAL_BAUD_RATE ?? 115200),
//   autoOpen: false,
// });
// const parser = new ReadlineParser({
//   delimiter: process.env.SERIAL_DELIMITER ?? "\r\n",
// });
// port.pipe(parser);

// let intervalConnect: NodeJS.Timeout | undefined = undefined;

// export function connect() {
//   // const port = new SerialPort({
//   //   path: process.env.SERIAL_NAME ?? "/dev/cu.usbmodem1401",
//   //   baudRate: +(process.env.SERIAL_BAUD_RATE ?? 115200),
//   //   autoOpen: false,
//   // });
//   // const parser = new ReadlineParser({
//   //   delimiter: process.env.SERIAL_DELIMITER ?? "\r\n",
//   // });
//   // port.pipe(parser);
//   console.log("ConnecRun");
//   port.open((err) => {
//     if (err) {
//       console.log(err, "Serial ERROR");
//       launchIntervalConnect();
//       return;
//     }

//     clearIntervalConnect();
//     console.log("connected to server", "Serial");
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

// port.on("error", (err) => {
//   console.log(err, "Serial ERROR");
//   launchIntervalConnect();
// });
// port.on("close", launchIntervalConnect);
// port.on("end", launchIntervalConnect);

// // connect();

// // let timer = new Date();
// // parser.on("data", (data) => {
// //   const currentDate = new Date();

// //   const diff = currentDate.getTime() - timer.getTime();
// //   if (diff > 200) {
// //     console.log("Difference", `${diff} ms`);
// //   }
// //   timer = currentDate;

// //   console.log("Serial Port Parser Says", {
// //     source: data,
// //     string: data.toString(),
// //     length: data.length,
// //   });
// // });

// async function writeAndResponse(
//   data: string,
//   config?: {
//     responseValidation?: string | ((res: string) => boolean);
//     timeout?: number;
//   }
// ) {
//   if (!port || !parser) {
//     console.log("Serial Port Unavailable");
//     return undefined;
//   }
//   const waitTimeout = config?.timeout ?? 5000;
//   const validation = config?.responseValidation;

//   return await Promise.race([
//     new Promise<string>((resolve, reject) => {
//       const readHandler = (data: any) => {
//         console.log("Serial Port Parser Says", {
//           source: data,
//           string: data.toString(),
//           length: data.length,
//         });
//         if (!validation) {
//           parser?.off("data", readHandler);
//           return resolve(data);
//         }
//         if (typeof validation === "string") {
//           if (data.includes(validation)) {
//             parser?.off("data", readHandler);
//             return resolve(data);
//           }
//           return;
//         }
//         if (validation(data)) {
//           parser?.off("data", readHandler);
//           return resolve(data);
//         }
//       };
//       port.drain((err) => {
//         if (err) {
//           console.log("Error drain", err);
//           return reject(err);
//         }
//         port.write(data, (err) => {
//           if (err) {
//             console.log("Error write response", err);
//             return reject(err);
//           }
//           console.log("Write to Serial", data);
//           port.drain((err) => {
//             if (err) {
//               console.log("Error drain", err);
//               return reject(err);
//             }
//             parser.on("data", readHandler);
//           });
//         });
//       });
//     }),
//     new Promise<string>((_, reject) =>
//       setTimeout(
//         () => reject(new Error(`Error timeout ${waitTimeout} ms exceded`)),
//         waitTimeout
//       )
//     ),
//   ]);
// }

// async function waitDataAndDrain() {
//   return await new Promise<void>((resolve, reject) => {
//     port.once("data", () => {
//       port.drain((err) => {
//         if (err) {
//           return reject(err);
//         }
//         resolve();
//       });
//     });
//   });
// }

// async function waitDrain() {
//   return await new Promise<void>((resolve, reject) => {
//     port.drain((err) => {
//       if (err) {
//         return reject(err);
//       }
//       resolve();
//     });
//   });
// }

// async function waitSendData(config?: { timeout?: number }) {
//   const timeout = config?.timeout ?? 3000;
//   return await Promise.race([
//     new Promise((resolve) => {
//       port.drain((err) => {
//         if (err) {
//           console.log("Error drain", err);
//           return resolve(err);
//         }
//         port.write("TEST", (err) => {
//           if (err) {
//             console.log("Error write response", err);
//             return resolve(err);
//           }
//           port.drain((err) => {
//             if (err) {
//               console.log("Error drain", err);
//               return resolve(err);
//             }
//             parser.once("data", (data) => {
//               resolve(data);
//             });
//           });
//         });
//       });
//     }),
//     new Promise<string>((resolve) => setTimeout(resolve, timeout)),
//   ]);
// }

// export default {
//   connect,
//   port,
//   parser,
//   writeAndResponse,
//   waitDataAndDrain,
//   waitDrain,
//   waitSendData,
// };
