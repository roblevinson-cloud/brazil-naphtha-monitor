import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { NaphthaMonitor } from "../app/NaphthaMonitor";
import "../app/globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <NaphthaMonitor />
  </StrictMode>,
);
