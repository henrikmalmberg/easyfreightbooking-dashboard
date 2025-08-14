import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import ErrorBoundary from "./ErrorBoundary.jsx";
import App from "./Dashboard.jsx";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
