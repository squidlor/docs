import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/global.css";
import "./styles/squid-loader.css";
import { SplashDismiss } from "./components/brand-loader";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
    <SplashDismiss />
  </StrictMode>,
);
