import { ReadlineOptions, SerialPort, SerialPortOpenOptions } from "serialport";
import { ReadlineParser } from "@serialport/parser-readline";
import { AutoDetectTypes } from "@serialport/bindings-cpp";
import EventEmitter from "events";

// Type definition for the configuration settings needed to set up the serial connection.
export type SerialConnectionParameterType = {
  portOptions: SerialPortOpenOptions<AutoDetectTypes>; // Settings for opening the serial port.
  parserOptions: ReadlineOptions; // Settings for parsing the data from the serial port.
};

// Type definition for possible connection statuses.
type ConnectionStatus = "connect" | "error" | "close" | "end";

// This class manages communication with a device via a serial port.
export default class SerialConnection {
  public type = "serial"; // Type of connection: serial.
  private port: SerialPort; // Serial port object to manage communication.
  private parser: ReadlineParser; // Parser to handle incoming data.
  private intervalConnect: any; // Timer to attempt reconnection if needed.
  private timer: Date; // Timer to track the time between received data.
  private connectionEvent = new EventEmitter<{
    change: [status: ConnectionStatus, error?: Error]; // Event emitter to notify about connection status changes.
  }>();
  public connectionStatus: ConnectionStatus = "close"; // Current connection status.

  // Constructor to initialize the serial port and data parser.
  constructor(config: SerialConnectionParameterType) {
    // Initialize the serial port with provided settings and prevent automatic opening.
    this.port = new SerialPort({
      ...config.portOptions,
      autoOpen: false,
    });
    // Initialize the data parser with provided settings.
    this.parser = new ReadlineParser(config.parserOptions);
    // Connect the parser to the serial port.
    this.port.pipe(this.parser);

    this.intervalConnect = undefined; // Timer for reconnection attempts is initially not set.
    this.timer = new Date(); // Initialize the timer for measuring data arrival intervals.
  }

  // Set up event listeners for various port and parser events.
  private initializeEventListeners() {
    if (!this.port) return; // Exit if the port is not initialized.

    // Handle errors from the serial port.
    this.port.on("error", (err) => {
      console.log(err, "Serial ERROR"); // Log the error.
      this.connectionStatus = "error"; // Update connection status to 'error'.
      this.connectionEvent.emit("change", "error", err); // Notify listeners of the error.
      this.launchIntervalConnect(); // Start reconnection attempts.
    });

    // Handle the port closing.
    this.port.on("close", () => {
      this.connectionStatus = "close"; // Update connection status to 'close'.
      this.connectionEvent.emit("change", "close"); // Notify listeners that the connection is closed.
      this.launchIntervalConnect(); // Start reconnection attempts.
    });

    // Handle the end of the connection.
    this.port.on("end", () => {
      this.connectionStatus = "end"; // Update connection status to 'end'.
      this.connectionEvent.emit("change", "end"); // Notify listeners that the connection has ended.
      this.launchIntervalConnect(); // Start reconnection attempts.
    });

    // Handle incoming data from the device.
    if (this.parser) {
      this.parser.on("data", (data) => {
        const currentDate = new Date();
        const diff = currentDate.getTime() - this.timer.getTime();
        if (diff > 200) {
          console.log("Difference", `${diff} ms`); // Log the time difference between data arrivals.
        }
        this.timer = currentDate; // Update the timer.
        console.log("Serial Port Parser Says", {
          source: data,
          string: data.toString(),
          length: data.length,
        }); // Log the received data.
      });
    }
  }

  // Connect to the device and start listening for events.
  public connect() {
    console.log("ConnecRun"); // Log the connection attempt.
    this.port.open((err) => {
      if (err) {
        this.connectionStatus = "error"; // Update connection status to 'error'.
        this.connectionEvent.emit("change", "error", err); // Notify listeners of the error.
        this.launchIntervalConnect(); // Start reconnection attempts.
        return;
      }

      this.connectionStatus = "connect"; // Update connection status to 'connect'.
      this.connectionEvent.emit("change", "connect"); // Notify listeners that the connection is established.
      this.clearIntervalConnect(); // Stop any ongoing reconnection attempts.
      console.log("connected to server", "Serial"); // Log successful connection.
    });

    this.initializeEventListeners(); // Set up event listeners.
  }

  // Start automatic reconnection attempts if not already started.
  private launchIntervalConnect() {
    if (!!this.intervalConnect) return; // Exit if reconnection attempts are already in progress.
    this.intervalConnect = setInterval(() => this.connect(), 3000); // Retry connecting every 3 seconds.
  }

  // Stop automatic reconnection attempts.
  private clearIntervalConnect() {
    if (!this.intervalConnect) return; // Exit if no reconnection attempts are in progress.
    clearInterval(this.intervalConnect); // Clear the timer.
    this.intervalConnect = undefined; // Reset the timer.
  }

  // Send data to the device and wait for a response.
  public async writeAndResponse(
    data: string,
    config?: {
      responseValidation?: string | ((res: string) => boolean); // Optional validation for the response.
      timeout?: number; // Optional timeout for waiting for a response.
    }
  ) {
    if (!this.port || !this.parser) {
      console.log("Serial Port Unavailable"); // Log if the port or parser is not available.
      return undefined;
    }
    const waitTimeout = config?.timeout ?? 5000; // Set the timeout, defaulting to 5000 ms.
    const validation = config?.responseValidation; // Set the response validation criteria.

    return await Promise.race([
      new Promise<string>((resolve, reject) => {
        // Handler for processing incoming data.
        const readHandler = (data: any) => {
          console.log("Serial Port Parser Says", {
            source: data,
            string: data.toString(),
            length: data.length,
          }); // Log the received data.
          if (!validation) {
            this.parser?.off("data", readHandler); // Remove the data handler.
            return resolve(data); // Return the received data.
          }
          if (typeof validation === "string") {
            if (data.includes(validation)) {
              this.parser?.off("data", readHandler); // Remove the data handler.
              return resolve(data); // Return the received data.
            }
            return;
          }
          if (validation(data)) {
            this.parser?.off("data", readHandler); // Remove the data handler.
            return resolve(data); // Return the received data.
          }
        };

        // Send the data to the device and wait for the response.
        this.port &&
          this.port.drain((err) => {
            if (err) {
              console.log("Error drain", err); // Log any errors while draining.
              return reject(err); // Reject the promise with the error.
            }
            this.port &&
              this.port.write(data, (err) => {
                if (err) {
                  console.log("Error write response", err); // Log any errors while writing.
                  return reject(err); // Reject the promise with the error.
                }
                console.log("Write to Serial", data); // Log the sent data.
                this.port &&
                  this.port.drain((err) => {
                    if (err) {
                      console.log("Error drain", err); // Log any errors while draining.
                      return reject(err); // Reject the promise with the error.
                    }
                    this.parser && this.parser.on("data", readHandler); // Set up the data handler.
                  });
              });
          });
      }),
      new Promise<string>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Error timeout ${waitTimeout} ms exceeded`)), // Reject if timeout is exceeded.
          waitTimeout
        )
      ),
    ]);
  }

  // Send data to the device without waiting for a response.
  public write(data: string, cb?: (err?: Error | null) => void) {
    return this.port.write(data, undefined, cb); // Write data to the device and handle any errors with the callback.
  }

  // Register a function to handle incoming data.
  public onData(listener: (data: any) => void) {
    this.parser.on("data", listener); // Add the data handler function.
  }

  // Remove a function that was handling incoming data.
  public offData(listener: (data: any) => void) {
    this.parser.off("data", listener); // Remove the data handler function.
  }

  // Register a function to handle changes in connection status.
  public onConnectionChange(
    listener: (status: ConnectionStatus, error?: Error) => void
  ) {
    return this.connectionEvent.on("change", listener); // Add the connection status change handler function.
  }

  // Remove a function that was handling changes in connection status.
  public offConnectionChange(
    listener: (status: ConnectionStatus, error?: Error) => void
  ) {
    return this.connectionEvent.off("change", listener); // Remove the connection status change handler function.
  }
}
