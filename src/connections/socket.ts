import net from "net";
import { ReadlineParser } from "@serialport/parser-readline";
import EventEmitter from "events";

// Type definition for the configuration settings needed to set up the TCP connection.
type WriteAndResponseConfig = {
  responseValidation?: string | ((res: string) => boolean); // Optional validation for the response data.
  timeout?: number; // Optional timeout for waiting for a response.
};

// Type definition for possible connection statuses.
type ConnectionStatus = "connect" | "error" | "close" | "end";

// This class manages communication with a server via a TCP socket.
export default class SocketConnection {
  public type = "socket"; // Type of connection: socket.
  private configTCP: net.SocketConnectOpts; // Configuration settings for the TCP connection.
  private client: net.Socket; // TCP socket client to manage communication.
  private intervalConnect?: NodeJS.Timeout; // Timer for automatic reconnection attempts.
  private parser: ReadlineParser; // Parser to handle incoming data.
  private connectionEvent = new EventEmitter<{
    change: [status: ConnectionStatus, error?: Error]; // Event emitter to notify about connection status changes.
  }>();
  public connectionStatus: ConnectionStatus = "close"; // Current connection status.

  // Constructor to initialize the TCP client and data parser.
  constructor(config: net.SocketConnectOpts) {
    this.configTCP = config; // Save the configuration settings.
    this.client = new net.Socket(); // Create a new TCP socket client.
    this.intervalConnect = undefined; // Timer for reconnection attempts is initially not set.

    // Initialize the data parser with a newline delimiter.
    this.parser = new ReadlineParser({ delimiter: "\r" });
    // Connect the parser to the TCP client.
    this.client.pipe(this.parser);

    // Set up event listeners for various TCP client events.
    this.client.on("connect", this.handleConnect.bind(this)); // Handle successful connection.
    this.client.on("error", this.handleError.bind(this)); // Handle errors.
    this.client.on("close", () => {
      this.connectionStatus = "close"; // Update connection status to 'close'.
      this.connectionEvent.emit("change", "close"); // Notify listeners that the connection is closed.
      this.launchIntervalConnect(); // Start reconnection attempts.
    });
    this.client.on("end", () => {
      this.connectionStatus = "end"; // Update connection status to 'end'.
      this.connectionEvent.emit("change", "end"); // Notify listeners that the connection has ended.
      this.launchIntervalConnect(); // Start reconnection attempts.
    });

    // Optionally, you could automatically connect when the class is instantiated.
    // this.connect();
  }

  // Connect to the server using the provided TCP configuration.
  public connect() {
    console.log("Connect tcp run", this.configTCP); // Log the connection attempt details.
    this.client.connect({
      ...this.configTCP, // Apply the TCP configuration settings.
    });
  }

  // Start automatic reconnection attempts if not already started.
  private launchIntervalConnect() {
    if (this.intervalConnect) return; // Exit if reconnection attempts are already in progress.
    this.intervalConnect = setInterval(this.connect.bind(this), 3000); // Retry connecting every 3 seconds.
  }

  // Stop automatic reconnection attempts.
  private clearIntervalConnect() {
    if (!this.intervalConnect) return; // Exit if no reconnection attempts are in progress.
    clearInterval(this.intervalConnect); // Clear the timer.
    this.intervalConnect = undefined; // Reset the timer.
  }

  // Handle a successful connection to the server.
  private handleConnect() {
    this.connectionStatus = "connect"; // Update connection status to 'connect'.
    this.connectionEvent.emit("change", "connect"); // Notify listeners that the connection is established.
    this.clearIntervalConnect(); // Stop any ongoing reconnection attempts.
    console.log("connected to server", "TCP"); // Log successful connection.
  }

  // Handle errors that occur with the TCP connection.
  private handleError(err: Error) {
    console.log(err.message, "TCP ERROR"); // Log the error message.
    this.connectionStatus = "error"; // Update connection status to 'error'.
    this.connectionEvent.emit("change", "error", err); // Notify listeners of the error.
    this.launchIntervalConnect(); // Start reconnection attempts.
  }

  // Send data to the server and wait for a response.
  public async writeAndResponse(
    data: string,
    config?: WriteAndResponseConfig
  ): Promise<string | undefined> {
    if (!this.client) {
      console.log("TCP Client Unavailable"); // Log if the client is not available.
      return undefined;
    }
    const waitTimeout = config?.timeout ?? 5000; // Set the timeout for waiting for a response, defaulting to 5000 ms.
    const validation = config?.responseValidation; // Set the response validation criteria.

    return Promise.race([
      new Promise<string>((resolve) => {
        // Handler for processing incoming data.
        const readHandler = (val: Buffer) => {
          console.log("TCP Says", val.toString()); // Log the received data.
          const data = val.toString();
          if (!validation) {
            this.client.off("data", readHandler); // Remove the data handler.
            return resolve(data); // Return the received data.
          }
          if (typeof validation === "string") {
            if (data.includes(validation)) {
              this.client.off("data", readHandler); // Remove the data handler.
              return resolve(data); // Return the received data.
            }
            return;
          }
          if (validation(data)) {
            this.client.off("data", readHandler); // Remove the data handler.
            return resolve(data); // Return the received data.
          }
        };

        // Send the data to the server.
        this.client.write(data, (err) => {
          if (err) {
            console.log(err); // Log any errors while writing.
          } else {
            console.log(`Write to TCP`, { data }); // Log the sent data.
          }
        });

        // Set up the data handler to process the response.
        this.client.on("data", readHandler);
      }),
      new Promise<string>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Error timeout ${waitTimeout} ms exceeded`)), // Reject if timeout is exceeded.
          waitTimeout
        )
      ),
    ]);
  }

  // Send data to the server without waiting for a response.
  public write(data: string, cb?: (err?: Error | null) => void) {
    return this.client.write(data, cb); // Write data to the server and handle any errors with the callback.
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
