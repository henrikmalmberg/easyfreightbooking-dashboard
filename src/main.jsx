import React from "react";
import { createRoot } from "react-dom/client";

// OBS: filnamnet och case måste stämma exakt med din komponentfil.
// Du skrev att filen heter Dashboard.jsx i src/
import Dashboard from "./Dashboard.jsx";

createRoot(document.getElementById("root")).render(<Dashboard />);
