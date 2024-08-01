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

export const NOZZLE_STATE = {
  INVALID: 0,
  OPENING: 1,
  OPENED: 2,
  CLOSING: 3,
  CLOSED: 4,
  INBETWEEN: 5,
};

export const MACHINE_STATE = {
  INVALID_NOZZLE: 1,
  INITIALIZING: 2,
  INTERVAL: 3,
  NEED_OPEN_NOZZLE: 4,
  AVAILABLE_TO_START: 5,
  STARTED: 6,
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

  // Method to execute a command and validate the response
  public async executeCommand(command: string) {
    try {
      const response = this.connection.write(command, (err) => {
        if (err) return;
        return true;
      });
      return response;
    } catch (error: any) {
      console.log(error?.message ?? "Error Serial Process");
      return;
    }
  }

  public write(data: string, cb?: (err?: Error | null) => void) {
    return this.connection.write(data, cb);
  }

  public onData(listener: (data: string) => void) {
    this.connection.onData(listener);
  }
  public offData(listener: (data: any) => void) {
    this.connection.offData(listener);
  }

  // Method to check the printer status
  async checkPrinterStatus() {
    return this.executeCommand(`^0?RS\r\n`);
  }

  // Method to check mailing status
  async checkMailingStatus() {
    return this.executeCommand(`^0?SM\r\n`);
  }

  // Method to start printing
  async startPrint() {
    return this.executeCommand(`^0!GO\r\n`);
  }

  // Method to stop printing
  async stopPrint() {
    return this.executeCommand(`^0!ST\r\n`);
  }

  // Method to open the nozzle
  async openNozzle() {
    return this.executeCommand(`^0!NO\r\n`);
  }

  // Method to reset the counter
  async resetCounter() {
    return this.executeCommand(`^0=CC0\t0\t0\r\n`);
  }

  // Method to flush the FIFO buffer
  async flushFIFO() {
    return this.executeCommand(`^0!FF\r\n`);
  }

  // Method to show the display
  async showDisplay() {
    return this.executeCommand(`^0!W1\r\n`);
  }

  // Method to hide the display
  async hideDisplay() {
    return this.executeCommand(`^0!W0\r\n`);
  }

  // Method to close the error
  async closeError() {
    return this.executeCommand(`^0!EQ\r\n`);
  }

  // Method to append to the FIFO with a counter and unique code
  async appendFifo(counter: number, uniquecode: string) {
    const command = `^0=MR${counter}\t${uniquecode}\r\n`;
    return this.executeCommand(command);
  }
}

// Helper method to parse the check printer status response
export const parseCheckPrinterStatus = (response: string) => {
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
};

// Helper method to parse the check mailing status response
export const parseCheckMailingStatus = (response: string) => {
  // Description of responses
  // FifoDepth                      = Available batch depth of the Mailing Fifos. (Normally 256 records)
  // FifoEntrys                     = Number of mail records which are available in the mailing Fifo
  // LastStartedPrintNo             = No.of the mail record which’s print has already started (0 =if no one is available)
  // StopAtNo                       = Record number where a print stop is generated (=Value which has been set before with ^0=CM )
  // LastStartedPrintNoWasFinished  = Flag (If = 0, the last print was started, but not finished, if >0, the last print was finished, but the next one for sure not started)

  // Parse the response
  const parts = response.split(/\s+/);
  return {
    response,
    fifoDepth: parseInt(parts[0].slice(-1), 10),
    fifoEntries: parseInt(parts[1], 10),
    lastStartedPrintNo: parseInt(parts[2], 10),
    stopAtNo: parseInt(parts[3], 10),
    lastStartedPrintNoWasFinished: parseInt(parts[5], 10),
  };
};
