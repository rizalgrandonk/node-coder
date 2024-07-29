import React, {
  useEffect,
  useState,
  createContext,
  useContext,
  ReactNode,
} from "react";
import { io } from "socket.io-client";

// Create a socket instance
export let socket = io(window.location.origin, {
  autoConnect: false,
});

// Define the shape of our context
interface SocketContextType {
  isConnected: boolean;
  context: typeof socket;
}

// Create the context with a default value
const SocketContext = createContext<SocketContextType>({
  isConnected: false,
  context: socket,
});

// Custom hook to use the SocketContext
export const useSocket = () => useContext(SocketContext);

// SocketProvider component
export const SocketProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  console.log("Re RenderingSocketProvider");
  const [isConnected, setIsConnected] = useState(socket.connected);

  useEffect(() => {
    socket.connect();

    function onConnect() {
      setIsConnected(true);
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ isConnected, context: socket }}>
      {children}
    </SocketContext.Provider>
  );
};
