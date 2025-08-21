//import React from "react";
import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";

export default class ErrorBoundary extends React.Component {
  constructor(p){ super(p); this.state = { hasError: false, err: null }; }
  static getDerivedStateFromError(err){ return { hasError: true, err }; }
  componentDidCatch(err, info){ console.error("App crashed:", err, info); }
  render(){
    if(this.state.hasError){
      return (
        <div style={{padding:24,fontFamily:"system-ui"}}>
          <h1>Something broke 💥</h1>
          <pre style={{whiteSpace:"pre-wrap"}}>{String(this.state.err?.stack || this.state.err)}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}
