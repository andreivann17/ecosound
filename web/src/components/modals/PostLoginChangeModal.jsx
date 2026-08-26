import React, { useEffect, useState } from "react";
import axios from "axios";
import logo from "../../assets/img/logo_hersoft_event.webp";
import { PATH } from "../../redux/utils";

const FLAG_KEY = "hs_show_change_modal";

export function markShowChangeModal() {
  sessionStorage.setItem(FLAG_KEY, "1");
}

export default function PostLoginChangeModal() {
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(FLAG_KEY) === "1") {
      sessionStorage.removeItem(FLAG_KEY);
      setVisible(true);

      const token = localStorage.getItem("token");
      if (token) {
        axios
          .post(`${PATH}/users/me/mensaje-show`, {}, { headers: { Authorization: `Bearer ${token}` } })
          .catch(() => {});
      }
    }
  }, []);

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => {
      setVisible(false);
      setClosing(false);
    }, 220);
  };

  if (!visible) return null;

  return (
    <div
      className={`plcm-overlay${closing ? " plcm-overlay--closing" : ""}`}
      onClick={handleClose}
    >
      <div className="plcm-card" onClick={(e) => e.stopPropagation()}>
        <img src={logo} alt="HerrSoft Events" className="plcm-logo" />
        <h2 className="plcm-title">¡Hola de nuevo!</h2>
        <p className="plcm-text">
          Le dedicamos tiempo a HerrSoft Events con algunas mejoras pensadas
          para ti. Explora el sistema y descúbrelas a tu ritmo.
        </p>
        <button type="button" className="plcm-btn" onClick={handleClose}>
          ¡Vamos!
        </button>
      </div>

      <style>{`
        .plcm-overlay {
          position: fixed;
          inset: 0;
          z-index: 1900;
          background: rgba(8, 12, 20, 0.82);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
          animation: plcm-fade-in 0.28s ease-out;
        }
        .plcm-overlay--closing {
          animation: plcm-fade-out 0.22s ease-in forwards;
        }
        .plcm-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          max-width: 440px;
          padding: 40px 36px;
          animation: plcm-pop-in 0.32s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .plcm-logo {
          width: 92px;
          height: 92px;
          object-fit: contain;
          margin-bottom: 22px;
          filter: drop-shadow(0 4px 18px rgba(255, 255, 255, 0.15));
        }
        .plcm-title {
          color: #ffffff;
          font-size: 27px;
          font-weight: 700;
          margin: 0 0 12px;
          letter-spacing: -0.2px;
        }
        .plcm-text {
          color: rgba(255, 255, 255, 0.78);
          font-size: 17px;
          line-height: 1.6;
          margin: 0 0 28px;
        }
        .plcm-btn {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.22);
          color: #ffffff;
          font-size: 13px;
          font-weight: 600;
          padding: 10px 26px;
          border-radius: 999px;
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s;
        }
        .plcm-btn:hover {
          background: rgba(255, 255, 255, 0.18);
          border-color: rgba(255, 255, 255, 0.35);
        }
        @keyframes plcm-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes plcm-fade-out {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes plcm-pop-in {
          from { opacity: 0; transform: scale(0.94) translateY(6px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
