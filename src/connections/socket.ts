import net from "net";

const TCP_PORT = 515;
const TCP_HOST = "0.0.0.0";
const configTCP = { port: TCP_PORT, host: TCP_HOST };

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

client.on("data", (data) => {
  console.log("TCP Says", {
    source: data,
    string: data.toString(),
    length: data.length,
  });
});

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
  if (!socketClient) {
    console.log("Serial Port Unavailable");
    return undefined;
  }
  const waitTimeout = config?.timeout ?? 5000;
  const validation = config?.responseValidation;

  return Promise.race([
    new Promise<string>((resolve) => {
      socketClient.write(data);

      socketClient.on("data", (data) => {
        const result = data.toString().trim();
        if (!validation) {
          return resolve(result);
        }
        if (typeof validation === "string") {
          if (result.includes(validation)) {
            return resolve(result);
          }
          return;
        }
        if (validation(result)) {
          return resolve(result);
        }
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

export default {
  socketClient,
  writeAndResponse,
};
