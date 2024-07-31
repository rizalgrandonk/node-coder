import SocketConnection from "../connections/socket";
import SerialConnection, {
  SerialConnectionParameterType,
} from "../connections/serial";
import net from "net";

// const CONNECTION_MAP = {
//   socket: SocketConnection,
//   serial: SerialConnection,
// };

type Config =
  | {
      connectionType: "socket";
      connectionConfig: net.SocketConnectOpts;
    }
  | {
      connectionType: "serial";
      connectionConfig: SerialConnectionParameterType;
    };

export default class LiebingerClass {
  private connection: SocketConnection | SerialConnection;
  constructor({ connectionType, connectionConfig }: Config) {
    this.connection =
      connectionType === "socket"
        ? new SocketConnection(connectionConfig)
        : new SerialConnection(connectionConfig);
  }

  async checkPrinterStatus() {
    const command = `^0?RS\r\n`;
    try {
      const response = await this.connection.writeAndResponse(command, {
        responseValidation: (res) => res.includes(command),
      });
      if (!response) {
        console.log("Failed request to socket connection");
        return;
      }

      //^0=RS2 6       0       0       80      0
      const parts = response.split(/\s+/);
      const responseType = parts[0].slice(0, -1);
      const nozzleState = parseInt(parts[0].slice(-1), 10);
      const machineState = parseInt(parts[1], 10);
      const errorCode = parseInt(parts[2], 10);
      const headCover = parseInt(parts[3], 10);
      const actSpeed = parseInt(parts[5], 10);
      return {
        responseType,
        nozzleState,
        machineState,
        errorCode,
        headCover,
        actSpeed,
      };
      // return {
      //   responseType: "^0=RS",
      //   nozzleState: 2,
      //   machineState: 6,
      //   errorCode: 0,
      //   headCover: 0,
      //   actSpeed: 0
      // }
    } catch (error: any) {
      console.log(error?.message ?? "Error Serial Process");
      return;
    }
  }

  async checkMailingStatus() {
    const command = `^0?SM\r\n`;
    try {
      const response = await this.connection.writeAndResponse(command, {
        // responseValidation: (res) => res.includes(command),
      });
      if (!response) {
        console.log("Failed request to socket connection");
        return;
      }
      return response;
    } catch (error: any) {
      console.log(error?.message ?? "Error Serial Process");
      return;
    }
  }

  async startPrint() {
    const command = `^0!GO\r\n`;
    try {
      const response = await this.connection.writeAndResponse(command, {
        // responseValidation: (res) => res.includes(command),
      });
      if (!response) {
        console.log("Failed request to socket connection");
        return;
      }
      return response;
    } catch (error: any) {
      console.log(error?.message ?? "Error Serial Process");
      return;
    }
  }

  async stopPrint() {
    const command = `^0!ST\r\n`;
    try {
      const response = await this.connection.writeAndResponse(command, {
        // responseValidation: (res) => res.includes(command),
      });
      if (!response) {
        console.log("Failed request to socket connection");
        return;
      }
      return response;
    } catch (error: any) {
      console.log(error?.message ?? "Error Serial Process");
      return;
    }
  }

  async openNozzle() {
    const command = `^0!NO\r\n`;
    try {
      const response = await this.connection.writeAndResponse(command, {
        // responseValidation: (res) => res.includes(command),
      });
      if (!response) {
        console.log("Failed request to socket connection");
        return;
      }
      return response;
    } catch (error: any) {
      console.log(error?.message ?? "Error Serial Process");
      return;
    }
  }

  async resetCounter() {
    const command = `^0=CC0\t0\t0\r\n`;
    try {
      const response = await this.connection.writeAndResponse(command, {
        // responseValidation: (res) => res.includes(command),
      });
      if (!response) {
        console.log("Failed request to socket connection");
        return;
      }
      return response;
    } catch (error: any) {
      console.log(error?.message ?? "Error Serial Process");
      return;
    }
  }

  async flushFIFO() {
    const command = `^0!FF\r\n`;
    try {
      const response = await this.connection.writeAndResponse(command, {
        // responseValidation: (res) => res.includes(command),
      });
      if (!response) {
        console.log("Failed request to socket connection");
        return;
      }
      return response;
    } catch (error: any) {
      console.log(error?.message ?? "Error Serial Process");
      return;
    }
  }

  async showDisplay() {
    const command = `^0!W1\r\n`;
    try {
      const response = await this.connection.writeAndResponse(command, {
        // responseValidation: (res) => res.includes(command),
      });
      if (!response) {
        console.log("Failed request to socket connection");
        return;
      }
      return response;
    } catch (error: any) {
      console.log(error?.message ?? "Error Serial Process");
      return;
    }
  }

  async hideDisplay() {
    const command = `^0!W0\r\n`;
    try {
      const response = await this.connection.writeAndResponse(command, {
        // responseValidation: (res) => res.includes(command),
      });
      if (!response) {
        console.log("Failed request to socket connection");
        return;
      }
      return response;
    } catch (error: any) {
      console.log(error?.message ?? "Error Serial Process");
      return;
    }
  }

  async closeError() {
    const command = `^0!EQ\r\n`;
    try {
      const response = await this.connection.writeAndResponse(command, {
        // responseValidation: (res) => res.includes(command),
      });
      if (!response) {
        console.log("Failed request to socket connection");
        return;
      }
      return response;
    } catch (error: any) {
      console.log(error?.message ?? "Error Serial Process");
      return;
    }
  }
}
