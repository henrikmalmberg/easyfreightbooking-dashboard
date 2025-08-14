import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css"; // om du har tailwind
import ErrorBoundary from "./ErrorBoundary.jsx";
import Dashboard from "./Dashboard.jsx"; // din toppkomponent (default export i filen)

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <Dashboard />
    </ErrorBoundary>
  </React.StrictMode>
);
