//import React from "react";
import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";


if (typeof window !== "undefined") {
  window.React = window.React || React;

}

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
