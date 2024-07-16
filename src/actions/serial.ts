import SerialConnection from "../connections/serial";
import { insertSerialUniquecode } from "./codererrorlogs";

export const serialProcess = async (uniquecode: string) => {
  console.log("Start Serial Process", uniquecode);
  try {
    const response = await SerialConnection.writeAndResponse(uniquecode, {
      responseValidation: (res) => res.includes(uniquecode),
    });
    if (!response) {
      console.log("Failed request to serial connection");
      return false;
    }
    const result = await insertSerialUniquecode(uniquecode, new Date());
    console.log(`Complete processing serial update ${uniquecode}`, result.id);

    return true;
  } catch (error: any) {
    console.log(error?.message ?? "Error Serial Process");
    return false;
  }
};
