import SocketConnection from "../connections/socket";
import { updateSocketUniquecode } from "./uniquecodes";

export const socketProcess = async (uniquecode: string) => {
  console.log("Start Socket Process", uniquecode);
  try {
    const response = await SocketConnection.writeAndResponse(uniquecode, {
      responseValidation: (res) => res.includes(uniquecode),
    });
    if (!response) {
      console.log("Failed request to socket connection");
      return false;
    }
    const result = await updateSocketUniquecode(uniquecode, new Date());
    console.log(`Complete processing socket update ${uniquecode}`, result);

    if (result <= 0) {
      console.log(`Process socket update affecting ${result} rows`);
      return false;
    }

    return true;
  } catch (error: any) {
    console.log(error?.message ?? "Error Serial Process");
    return false;
  }
};
