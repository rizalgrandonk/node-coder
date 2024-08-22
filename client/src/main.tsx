import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { SocketProvider } from "./context/socket.tsx";
import { PrintDataProvider } from "./context/print";
import { BrowserRouter as Router } from "react-router-dom";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <SocketProvider>
      <Router>
        <PrintDataProvider>
          <App />
        </PrintDataProvider>
      </Router>
    </SocketProvider>
  </React.StrictMode>
);
