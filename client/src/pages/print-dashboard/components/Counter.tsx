import { useEffect, useState } from "react";
import { useSocket } from "../../../context/socket";

const Counter = () => {
  const socketCtx = useSocket();
  const [count, setCount] = useState(0);
  const [socketData, setSocketData] = useState<number[]>([]);
  console.log("Rendering Counter");
  useEffect(() => {
    console.log("useEffect Called Count", count);
    socketCtx.context.on("increment", (val) => {
      console.log("Incremented Count", val);
      setCount(val);
      setSocketData((prev) => [...prev, val]);
    });

    return () => {
      socketCtx.context.off("increment");
    };
  }, [socketCtx]);
  return (
    <button onClick={() => setCount((count) => count + 1)}>
      count is {count} and socket data transfered is {isStrictlyIncreasing(socketData) ? "Valid" : "Invalid"} {socketData.length}
      {/* count is {count} */}
    </button>
  );
};

function isStrictlyIncreasing(numbers: number[]): boolean {
  for (let i = 1; i < numbers.length; i++) {
    if (numbers[i] <= numbers[i - 1]) {
      return false;
    }
  }
  return true;
}

export default Counter;
