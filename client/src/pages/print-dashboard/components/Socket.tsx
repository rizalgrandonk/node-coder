import { useSocket } from "../../../context/socket";

const SocketCondition = () => {
  const socketCtx = useSocket();
  console.log("socketCtx.isConnected", socketCtx.isConnected);
  return (
    <>
      <p style={{ backgroundColor: socketCtx.isConnected ? "green" : "red" }}>
        Socket is {socketCtx.isConnected ? "Connected" : "Not Connected"} To {window.location.origin}
      </p>
    </>
  );
};

export default SocketCondition;
