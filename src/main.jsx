import React from "react";
import { createRoot } from "react-dom/client";
import Dashboard from "./Dashboard.jsx"; // case och namn måste matcha exakt

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Dashboard />
  </React.StrictMode>
);
