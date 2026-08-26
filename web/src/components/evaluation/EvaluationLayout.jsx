import React, { useEffect } from "react";
import { useOutlet } from "react-router-dom";
import "../../assets/css/Evaluation.css";

export default function EvaluationLayout() {
  const outlet = useOutlet();

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById("root");
    html.style.overflow = "auto"; html.style.height = "auto";
    body.style.overflow = "auto"; body.style.height = "auto";
    if (root) { root.style.overflow = "auto"; root.style.height = "auto"; }
    return () => {
      html.style.overflow = ""; html.style.height = "";
      body.style.overflow = ""; body.style.height = "";
      if (root) { root.style.overflow = ""; root.style.height = ""; }
    };
  }, []);

  return (
    <div className="evaluation-shell">
      <div className="evaluation-titlebar">
        <div className="win-controls electron-no-drag">
          <button className="electron-btn" title="Minimize" onClick={() => window.electronAPI?.minimize?.()}>🗕</button>
          <button className="electron-btn" title="Maximize/Restore" onClick={() => window.electronAPI?.maximize?.()}>🗖</button>
          <button className="electron-btn electron-btn-close" title="Close" onClick={() => window.electronAPI?.close?.()}>✕</button>
        </div>
      </div>

      <main className="evaluation-main">{outlet}</main>
    </div>
  );
}
