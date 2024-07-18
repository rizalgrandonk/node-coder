import net from "net";

const configTCP = {
  port: +(process.env.SOCKET_PORT ?? 515),
  host: process.env.SOCKET_HOST ?? "0.0.0.0",
};

const client = new net.Socket();
let intervalConnect: NodeJS.Timeout | undefined = undefined;

function connect() {
  client.connect(configTCP);
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

client.on("connect", () => {
  clearIntervalConnect();
  console.log("connected to server", "TCP");
});

client.on("error", (err) => {
  console.log(err.message, "TCP ERROR");
  launchIntervalConnect();
});
client.on("close", launchIntervalConnect);
client.on("end", launchIntervalConnect);

connect();

export const socketClient =
  client.writable && client.readable ? client : undefined;

export async function writeAndResponse(
  data: string,
  config?: {
    responseValidation?: string | ((res: string) => boolean);
    timeout?: number;
  }
) {
  if (!client) {
    console.log("Serial Port Unavailable");
    return undefined;
  }
  const waitTimeout = config?.timeout ?? 5000;
  const validation = config?.responseValidation;

  return Promise.race([
    new Promise<string>((resolve) => {
      const readHandler = (data: any) => {
        console.log("TCP Says", {
          source: data,
          string: data.toString(),
          length: data.length,
        });
        if (!validation) {
          client?.off("data", readHandler);
          return resolve(data);
        }
        if (typeof validation === "string") {
          if (data.includes(validation)) {
            client?.off("data", readHandler);
            return resolve(data);
          }
          return;
        }
        if (validation(data)) {
          client?.off("data", readHandler);
          return resolve(data);
        }
      };

      client.write(data);

      client.on("data", readHandler);
    }),
    new Promise<string>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Error timeout ${waitTimeout} ms exceded`)),
        waitTimeout
      )
    ),
  ]);
}

export default {
  socketClient,
  writeAndResponse,
};
