import React, { useEffect } from "react";
import { createPortal } from "react-dom";

export default function VideoModal({ open, onClose, src, title = "Video" }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="demo-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="video-modal">
        <button className="demo-close video-modal-close" onClick={onClose} aria-label="Cerrar">✕</button>
        <div className="video-modal-frame">
          <iframe
            src={src}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    </div>,
    document.body
  );
}
