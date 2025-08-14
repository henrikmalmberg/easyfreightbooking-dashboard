// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import Dashboard from "./Dashboard.jsx";

// 👇 TEMP: logga alla fel så vi ser dem i Console även i prod
console.log("🟢 main.jsx loaded");
window.onerror = function (msg, url, line, col, err) {
  console.error("window.onerror:", { msg, url, line, col, err });
};
window.addEventListener("unhandledrejection", (e) => {
  console.error("unhandledrejection:", e.reason);
});

// En enkel ErrorBoundary så att sidan inte blir helt vit
class ErrorBoundary extends React.Component {
  constructor(p){ super(p); this.state = { hasError:false }; }
  static getDerivedStateFromError(){ return { hasError:true }; }
  componentDidCatch(err, info){ console.error("🛑 React boundary:", err, info); }
  render(){ return this.state.hasError ? <div style={{padding:16}}>Something went wrong – se Console.</div> : this.props.children; }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
