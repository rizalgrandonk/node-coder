import { SerialPort } from "serialport";
import { ReadlineParser } from "@serialport/parser-readline";

const port = new SerialPort({
  path: "/dev/cu.usbmodem1401",
  baudRate: 115200,
  autoOpen: false,
});
const parser = new ReadlineParser({
  delimiter: "\r\n",
});
port.pipe(parser);

async function connect() {
  console.log("ConnectRun");
  return await new Promise<void>((resolve, reject) => {
    port.open((err) => {
      if (err) {
        console.log("Serial Port Connection Error", err);
        return reject(err);
      }

      console.log("connected to server", "Serial Port");
      resolve();
    });
  });
}

port.on("error", (err) => {
  console.log("Serial Port Connection Error", err);
  connect();
});

// let timer = new Date();
// parser.on("data", (data) => {
//   const currentDate = new Date();

//   const diff = currentDate.getTime() - timer.getTime();
//   if (diff > 200) {
//     console.log("Difference", `${diff} ms`);
//   }
//   timer = currentDate;

//   console.log("Serial Port Parser Says", {
//     source: data,
//     string: data.toString(),
//     length: data.length,
//   });
// });

async function writeAndResponse(
  data: string,
  config?: {
    responseValidation?: string | ((res: string) => boolean);
    timeout?: number;
  }
) {
  if (!port || !parser) {
    console.log("Serial Port Unavailable");
    return undefined;
  }
  const waitTimeout = config?.timeout ?? 5000;
  const validation = config?.responseValidation;

  return Promise.race([
    new Promise<string>((resolve, reject) => {
      function readHandler(data: any) {
        console.log("Serial Port Parser Says", {
          source: data,
          string: data.toString(),
          length: data.length,
        });
        if (!validation) {
          parser?.off("data", readHandler);
          return resolve(data);
        }
        if (typeof validation === "string") {
          if (data.includes(validation)) {
            parser?.off("data", readHandler);
            return resolve(data);
          }
          return;
        }
        if (validation(data)) {
          parser?.off("data", readHandler);
          return resolve(data);
        }
      }
      port.drain((err) => {
        if (err) {
          console.log("Error drain", err);
          return reject(err);
        }
        port.write(data, (err) => {
          if (err) {
            console.log("Error write response", err);
            return reject(err);
          }
          console.log("Write to Serial", data);
        });
      });
      port.drain((err) => {
        if (err) {
          console.log("Error drain", err);
          return reject(err);
        }
        parser.on("data", readHandler);
      });
    }),
    new Promise<string>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Error timeout ${waitTimeout} ms exceded`)),
        waitTimeout
      )
    ),
  ]);
}

async function waitDataAndDrain() {
  return await new Promise<void>((resolve, reject) => {
    port.once("data", () => {
      port.drain((err) => {
        if (err) {
          return reject(err);
        }
        resolve();
      });
    });
  });
}

async function waitDrain() {
  return await new Promise<void>((resolve, reject) => {
    port.drain((err) => {
      if (err) {
        return reject(err);
      }
      resolve();
    });
  });
}

export default {
  connect,
  port,
  parser,
  writeAndResponse,
  waitDataAndDrain,
  waitDrain,
};
