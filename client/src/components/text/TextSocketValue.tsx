import { useEffect, useState } from "react";
import { useSocket } from "@/context/socket";

type TestSocketValueProps = {
  channel: string;
  textColor?: string;
};

const TextSocketValue: React.FC<TestSocketValueProps> = ({ channel, textColor }) => {
  const socketCtx = useSocket();
  const [socketData, setSocketData] = useState<number>(0);
  useEffect(() => {
    socketCtx.context.on(channel, (val) => {
      setSocketData(val);
    });
    return () => {
      socketCtx.context.off(channel);
    };
  }, [socketCtx, channel]);

  return <span className={`font-bold  ${textColor ?? "text-gray-900"}`}>{socketData}</span>;
};
export default TextSocketValue;
