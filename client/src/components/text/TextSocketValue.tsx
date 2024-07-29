import { useEffect, useState } from "react";
import { useSocket } from "@/context/socket";

type TestSocketValueProps = {
  channel: string;
};

const TextSocketValue: React.FC<TestSocketValueProps> = ({ channel }) => {
  const socketCtx = useSocket();
  const [socketData, setSocketData] = useState<number>(0);
  console.log("socketCtx.isConnected", socketCtx.isConnected);
  useEffect(() => {
    socketCtx.context.on(channel, (val) => {
      setSocketData(val);
    });
    return () => {
      socketCtx.context.off(channel);
    };
  }, [socketCtx, channel]);

  return <span className="font-bold text-gray-900">{socketData}</span>;
};
export default TextSocketValue;
