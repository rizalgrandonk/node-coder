import "dotenv/config";
import "./db";
import { getUniquecodes } from "./actions/uniquecodes";
import EventEmitter from "events";

import { spawn, Worker as ThreadWorker, Thread } from "threads";
import type { SocketWorker } from "./socketProcess";
import type { SerialWorker } from "./serialProcess";
import path from "path";
import ChildWorker from "./utils/childProcess";
import { sleep } from "./utils/helper";
import prisma from "./db";

(async () => {
  const MAX_QUEUE = 10000;
  const GOALS_LENGTH = 10000;

  console.log("START");
  const timeBefore = performance.now();

  const serialWorker = new ChildWorker<SerialWorker>(
    path.resolve(__dirname, "./serialProcess")
  );

  const socketWorker = await spawn<SocketWorker>(
    new ThreadWorker("./socketProcess")
  );

  // const UniquecodeEvent = new EventEmitter();

  const resultUniquecodes = await getUniquecodes(MAX_QUEUE);
  if (!resultUniquecodes) {
    console.log("Failed to get uniquecodes");
    return;
  }

  const uniquecodes = resultUniquecodes.map((result) => result.uniquecode);
  // let serialBuffer = [...uniquecodes];

  let socketBuffer = [...uniquecodes];
  let printedBuffer: string[] = [];
  let updatedBufer: string[] = [];
  await socketWorker.add(socketBuffer);

  socketWorker.observe().subscribe((code: string) => {
    console.log(`${code} Complete`);
    printedBuffer.push(code);
    socketBuffer.shift();
  });
  socketWorker.run();

  serialWorker.run("0");

  while (true) {
    const toUpdate = printedBuffer;
    printedBuffer = [];
    updatedBufer.push(...toUpdate);

    console.log("MAIN LOOP", {
      socketBuffer: socketBuffer.length,
      printedBuffer: printedBuffer.length,
      updatedBufer: updatedBufer.length,
    });

    await prisma.uniquecode.updateMany({
      where: {
        uniquecode: {
          in: toUpdate,
        },
      },
      data: {
        coderstatus: "COK",
        printed: new Date(),
      },
    });

    if (updatedBufer.length >= GOALS_LENGTH) {
      await onCompleteHandler();
    }

    const fromGoals = GOALS_LENGTH - updatedBufer.length;
    console.log({ toUpdate: toUpdate.length, fromGoals });

    const toQueueCount = Math.min(toUpdate.length, fromGoals);

    if (MAX_QUEUE < GOALS_LENGTH && toQueueCount > 0) {
      const newUniquecodes = (await getUniquecodes(toQueueCount))?.map(
        (record) => record.uniquecode
      );
      if (newUniquecodes) {
        socketBuffer.push(...newUniquecodes);
        await socketWorker.add(newUniquecodes);
      } else {
        console.log("Failed get new uniquecodes");
      }
    }

    await sleep(1000);
  }

  async function onCompleteHandler() {
    const timeAffter = performance.now();
    const timeDiff = timeAffter - timeBefore;
    console.log(`SOCKET process complete in ${timeDiff} ms`);
    console.log({ socketBuffer });

    // if (socketBuffer.length <= 0) {
    console.log(
      `Finished processing ${updatedBufer.length} uniquecodes in ${timeDiff} ms`
    );
    await Thread.terminate(socketWorker);
    serialWorker.kill();
    process.exit(0);
    // }
  }

  // UniquecodeEvent.on("serialcomplete", onCompleteHandler);

  // UniquecodeEvent.on("socketcomplete", onCompleteHandler);

  // async function serialHandler() {
  //   while (true) {
  //     // const selected = uniquecodes[0];

  //     const result = await serialWorker.run("0");

  //     console.log("Result Serial", { result });
  //     // if (result) {
  //     //   uniquecodes.shift();
  //     // }
  //   }

  //   // serialWorker.kill();

  //   // UniquecodeEvent.emit("serialcomplete");
  // }
  // async function socketHandler() {
  //   while (updatedBufer.length < GOALS_LENGTH) {
  //     if (socketBuffer.length > 0) {
  //       const selected = socketBuffer[0];
  //       const result = await socketWorker(selected);
  //       console.log({ result });

  //       if (result) {
  //         socketBuffer.shift();
  //         printedBuffer.push(selected);
  //       }
  //     } else {
  //       await sleep(0);
  //     }
  //   }

  //   // await Thread.terminate(socketWorker);

  //   // UniquecodeEvent.emit("socketcomplete");
  // }
})();

// const app = express();
// const port = 8585;

// app.use(mainRoutes);

// app.listen(port, () => {
//   console.log(`Server is Fire at http://localhost:${port}`);
// });
