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

let intervalConnect: NodeJS.Timeout | undefined = undefined;

function connect() {
  console.log("ConnecRun");
  port.open((err) => {
    if (err) {
      console.log(err, "Serial ERROR");
      launchIntervalConnect();
      return;
    }

    clearIntervalConnect();
    console.log("connected to server", "Serial");
  });
}

function launchIntervalConnect() {
  if (!!intervalConnect) return;
  intervalConnect = setInterval(connect, 3000);
}

function clearIntervalConnect() {
  if (!intervalConnect) return;
  clearInterval(intervalConnect);
  intervalConnect = undefined;
}

port.on("error", (err) => {
  console.log(err, "Serial ERROR");
  launchIntervalConnect();
});
port.on("close", launchIntervalConnect);
port.on("end", launchIntervalConnect);

connect();

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

  return await Promise.race([
    new Promise<string>((resolve, reject) => {
      const readHandler = (data: any) => {
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
      };
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
          port.drain((err) => {
            if (err) {
              console.log("Error drain", err);
              return reject(err);
            }
            parser.on("data", readHandler);
          });
        });
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

async function waitSendData(timeout: number = 3000) {
  return await Promise.race([
    new Promise((resolve) => {
      port.drain((err) => {
        if (err) {
          console.log("Error drain", err);
          return resolve(err);
        }
        port.write("TEST", (err) => {
          if (err) {
            console.log("Error write response", err);
            return resolve(err);
          }
          port.drain((err) => {
            if (err) {
              console.log("Error drain", err);
              return resolve(err);
            }
            parser.once("data", (data) => {
              resolve(data);
            });
          });
        });
      });
    }),
    new Promise<string>((resolve) => setTimeout(resolve, timeout)),
  ]);
}

export default {
  connect,
  port,
  parser,
  writeAndResponse,
  waitDataAndDrain,
  waitDrain,
  waitSendData,
};
