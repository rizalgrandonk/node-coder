import SerialConnection from "../connections/serial";
import { insertSerialUniquecode } from "./codererrorlogs";

export const serialProcess = async (uniquecode: string) => {
  console.log("Start Serial Process", uniquecode);
  try {
    const response = await SerialConnection.writeAndResponse(uniquecode, {
      responseValidation: (res) => typeof res === "string",
      timeout: 2000,
    });
    if (!response) {
      console.log("Failed request to serial connection");
      return false;
    }
    const result = await insertSerialUniquecode(response, new Date());
    console.log(`Complete processing serial update ${response}`, result.id);

    return true;
  } catch (error: any) {
    console.log(error?.message ?? "Error Serial Process");
    return false;
  }
};
