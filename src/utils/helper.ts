import os from "os";

export const sleep = async (time: number) => {
  return await new Promise((res) => setTimeout(res, time));
};

export const getRandomInt = (min: number, max: number) => {
  const minCeiled = Math.ceil(min);
  const maxFloored = Math.floor(max);
  return Math.floor(Math.random() * (maxFloored - minCeiled + 1) + minCeiled); // The maximum is inclusive and the minimum is inclusive
};

export function chunkArray<T>(array: Array<T>, chunkSize: number) {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

export function parseIP(rawIP?: string) {
  if (!rawIP) {
    return undefined;
  }
  if (rawIP === "::1") {
    return getLocalIp() ?? "127.0.0.1";
  }

  if (rawIP.startsWith("::ffff:")) {
    return rawIP.split("::ffff:")[1];
  }

  return rawIP;
}

// Function to get local IP address
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const interfaceName in interfaces) {
    const addresses = interfaces[interfaceName];
    for (const address of addresses ?? []) {
      if (address.family === "IPv4" && !address.internal) {
        return address.address;
      }
    }
  }
  return null; // If no external IPv4 address is found
}
