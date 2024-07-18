import "dotenv/config";
import "./db";
import { getUniquecodes } from "./actions/uniquecodes";
import EventEmitter from "events";

import { spawn, Worker as ThreadWorker, Thread } from "threads";
import type { SocketProcess } from "./socketProcess";
import type { SerialProcess } from "./serialProcess";
import path from "path";
import ChildWorker from "./utils/childProcess";

const serialWorker = new ChildWorker<SerialProcess>(
  path.resolve(__dirname, "./serialProcess")
);

const UniquecodeEvent = new EventEmitter();

const startUniquecodeTransaction = async () => {
  await serialWorker.run("INIT");

  console.log("START");
  const timeBefore = performance.now();

  const resultUniquecodes = await getUniquecodes(5);
  if (!resultUniquecodes) {
    console.log("Failed to get uniquecodes");
    return;
  }

  const uniquecodes = resultUniquecodes.map((result) => result.uniquecode);
  const serialBuffer = [...uniquecodes];
  const socketBuffer = [...uniquecodes];

  socketHandler(socketBuffer).catch(console.error);

  serialHandler(serialBuffer).catch(console.error);

  const onCompleteHandler = () => {
    const timeAffter = performance.now();
    const timeDiff = timeAffter - timeBefore;
    console.log(`Serial process complete in ${timeDiff} ms`);
    console.log({ serialBuffer, socketBuffer });

    if (serialBuffer.length <= 0 && socketBuffer.length <= 0) {
      console.log(
        `Finished processing ${uniquecodes.length} uniquecodes in ${timeDiff} ms`
      );
      process.exit(0);
    }
  };

  UniquecodeEvent.on("serialcomplete", onCompleteHandler);

  UniquecodeEvent.on("socketcomplete", onCompleteHandler);
};

async function serialHandler(uniquecodes: string[]) {
  // const serialWorker = await spawn<SerialProcess>(
  //   new ThreadWorker("./serialProcess")
  // );

  while (uniquecodes.length > 0) {
    const selected = uniquecodes[0];
    // const result = await serialProcess(selected);
    // const result = await serialWorker(selected);

    const result = await serialWorker.run(selected);

    console.log("Result Serial", { result, selected });
    if (result) {
      uniquecodes.shift();
    }
  }

  serialWorker.kill();

  UniquecodeEvent.emit("serialcomplete");
}
async function socketHandler(uniquecodes: string[]) {
  const socketProcess = await spawn<SocketProcess>(
    new ThreadWorker("./socketProcess")
  );

  while (uniquecodes.length > 0) {
    const selected = uniquecodes[0];
    const result = await socketProcess(selected);
    console.log({ result });

    if (result) {
      uniquecodes.shift();
    }
  }

  await Thread.terminate(socketProcess);

  UniquecodeEvent.emit("socketcomplete");
}

startUniquecodeTransaction();

// const app = express();
// const port = 8585;

// app.use(mainRoutes);

// app.listen(port, () => {
//   console.log(`Server is Fire at http://localhost:${port}`);
// });
