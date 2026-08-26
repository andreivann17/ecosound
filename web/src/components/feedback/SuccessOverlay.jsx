import { useEffect } from "react";
import "./SuccessOverlay.css";

export default function SuccessOverlay({ show, title, subtitle, onDone, duration = 1800 }) {
  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => onDone?.(), duration);
    return () => clearTimeout(t);
  }, [show, duration, onDone]);

  if (!show) return null;

  return (
    <div className="succ-overlay" role="status" aria-live="polite">
      <div className="succ-card">
        <svg className="succ-check" viewBox="0 0 64 64" fill="none">
          <circle className="succ-check-circle" cx="32" cy="32" r="28" />
          <path className="succ-check-mark" d="M20 33.5 28 41.5 45 23.5" />
        </svg>
        <div className="succ-title">{title}</div>
        {subtitle && <div className="succ-subtitle">{subtitle}</div>}
      </div>
    </div>
  );
}
