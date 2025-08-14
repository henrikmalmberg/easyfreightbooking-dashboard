// src/main.jsx
import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import Dashboard from "./Dashboard.jsx";

const rootEl = document.getElementById("root");
createRoot(rootEl).render(
  <React.StrictMode>
    <Dashboard />
  </React.StrictMode>
);
