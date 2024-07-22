import "dotenv/config";
import "./db";
import { getUniquecodes } from "./actions/uniquecodes";

import { spawn, Worker as ThreadWorker, Thread } from "threads";
import type { SocketWorker } from "./socketProcess";
import type { SerialWorker } from "./serialProcess";
import path from "path";
import ChildWorker from "./utils/childProcess";
import prisma from "./db";

(async () => {
  const MAX_QUEUE = 250;
  const GOALS_LENGTH = 10000;

  console.log("START");
  const timeBefore = performance.now();

  const serialWorker = new ChildWorker<SerialWorker>(
    path.resolve(__dirname, "./serialProcess")
  );

  const socketWorker = await spawn<SocketWorker>(
    new ThreadWorker("./socketProcess")
  );

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
    printedBuffer.push(code);
    socketBuffer.shift();
  });
  socketWorker.run();

  serialWorker.run("0");

  setInterval(updateBuffer, 1000);

  setInterval(populateBufer, 100);

  async function updateBuffer() {
    const toUpdate = printedBuffer;
    printedBuffer = [];

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

    updatedBufer.push(...toUpdate);

    console.log("UPDATE LOOP", {
      socketBuffer: socketBuffer.length,
      printedBuffer: printedBuffer.length,
      updatedBufer: updatedBufer.length,
      toUpdate: toUpdate.length,
    });

    if (updatedBufer.length >= GOALS_LENGTH) {
      console.log("COMPLETE");
      await onCompleteHandler();
    }
  }

  async function populateBufer() {
    if (updatedBufer.length >= GOALS_LENGTH) {
      console.log("COMPLETE");
      await onCompleteHandler();
      return;
    }
    const fromGoals =
      GOALS_LENGTH - (updatedBufer.length + printedBuffer.length);
    const emptySlot = MAX_QUEUE - socketBuffer.length;
    console.log("GET LOOP", {
      emptySlot,
      fromGoals,
      updatedBufer: updatedBufer.length,
      socketBuffer: socketBuffer.length,
      printedBuffer: printedBuffer.length,
    });

    const toQueueCount = Math.min(emptySlot, fromGoals);

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
  }

  async function onCompleteHandler() {
    const timeAffter = performance.now();
    const timeDiff = timeAffter - timeBefore;
    console.log(`SOCKET process complete in ${timeDiff} ms`);
    console.log({ socketBuffer: socketBuffer.length });

    // if (socketBuffer.length <= 0) {
    console.log(
      `Finished processing ${updatedBufer.length} uniquecodes in ${timeDiff} ms`
    );
    await Thread.terminate(socketWorker);
    serialWorker.kill();
    process.exit(0);
    // }
  }
})();

// const app = express();
// const port = 8585;

// app.use(mainRoutes);

// app.listen(port, () => {
//   console.log(`Server is Fire at http://localhost:${port}`);
// });
