import SocketConnection from "../connections/socket";
import SerialConnection, {
  SerialConnectionParameterType,
} from "../connections/serial";
import net from "net";

// Define the configuration type for different connection types
type Config =
  | {
      connectionType: "socket";
      connectionConfig: net.SocketConnectOpts;
    }
  | {
      connectionType: "serial";
      connectionConfig: SerialConnectionParameterType;
    };

// Main class for handling Liebinger printer operations
export default class LiebingerClass {
  private connection: SocketConnection | SerialConnection;

  // Initialize the class with the appropriate connection type
  constructor({ connectionType, connectionConfig }: Config) {
    this.connection =
      connectionType === "socket"
        ? new SocketConnection(connectionConfig)
        : new SerialConnection(connectionConfig);

    this.connection.connect();
  }

  // Private method to execute a command and validate the response
  private async executeCommand(command: string, responseCheck?: string) {
    try {
      const response = await this.connection.writeAndResponse(command, {
        responseValidation: responseCheck
          ? (res) => res.includes(responseCheck)
          : undefined,
      });
      if (!response) {
        console.log(`Failed request to ${this.connection.constructor.name}`);
        return;
      }
      return response;
    } catch (error: any) {
      console.log(error?.message ?? "Error Serial Process");
      return;
    }
  }

  public write(data: string, cb?: (err?: Error | null) => void) {
    return this.connection.write(data, cb);
  }

  public onData(listener: (data: any) => void) {
    this.connection.onData(listener);
  }
  public offData(listener: (data: any) => void) {
    this.connection.offData(listener);
  }

  // Method to check the printer status
  async checkPrinterStatus() {
    const command = `^0?RS\r\n`;
    const response = await this.executeCommand(command, `RS`);
    if (!response) return;

    // Parse the response
    const parts = response.split(/\s+/);
    return {
      response,
      nozzleState: parseInt(parts[0].slice(-1), 10),
      machineState: parseInt(parts[1], 10),
      errorState: parseInt(parts[2], 10),
      headCover: parseInt(parts[3], 10),
      actSpeed: parseInt(parts[5], 10),
    };
  }

  // Method to check mailing status
  async checkMailingStatus() {
    return this.executeCommand(`^0?SM\r\n`, "SM");
  }

  // Method to start printing
  async startPrint() {
    return this.executeCommand(`^0!GO\r\n`, "GO");
  }

  // Method to stop printing
  async stopPrint() {
    return this.executeCommand(`^0!ST\r\n`, "ST");
  }

  // Method to open the nozzle
  async openNozzle() {
    return this.executeCommand(`^0!NO\r\n`, "NO");
  }

  // Method to reset the counter
  async resetCounter() {
    return this.executeCommand(`^0=CC0\t0\t0\r\n`, "CC");
  }

  // Method to flush the FIFO buffer
  async flushFIFO() {
    return this.executeCommand(`^0!FF\r\n`, "FF");
  }

  // Method to show the display
  async showDisplay() {
    return this.executeCommand(`^0!W1\r\n`, "W1");
  }

  // Method to hide the display
  async hideDisplay() {
    return this.executeCommand(`^0!W0\r\n`, "W0");
  }

  // Method to close the error
  async closeError() {
    return this.executeCommand(`^0!EQ\r\n`, "EQ");
  }

  // Method to append to the FIFO with a counter and unique code
  async appendFifo(counter: number, uniquecode: string) {
    const command = `^0=MR${counter}\t${uniquecode}\r\n`;
    return this.executeCommand(command, "MR");
  }
}
