import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useOutlet } from "react-router-dom";
import { MinusOutlined, BorderOutlined, CloseOutlined } from "@ant-design/icons";
import {
  clearEvaluationSession,
  getEvaluationEvaluator,
  getEvaluatorInitials,
} from "../../utils/evaluationAuth";
import "../../assets/css/Evaluation.css";

const NAV_ITEMS = [
  { to: "/evaluation", label: "Home" },
  { to: "/evaluation/evaluation", label: "Evaluation" },
];

export default function EvaluationLayout() {
  const outlet = useOutlet();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

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

  const isAuthPage = location.pathname === "/evaluation/login" || location.pathname === "/evaluation/signup";
  const evaluator = getEvaluationEvaluator();
  const showUserMenu = !isAuthPage && !!evaluator;

  const handleLogout = () => {
    clearEvaluationSession();
    setMenuOpen(false);
    navigate("/evaluation/login");
  };

  return (
    <div className="evaluation-shell">
      <div className="evaluation-titlebar">
        <div className="evaluation-titlebar-left electron-no-drag">
          <span className="evaluation-titlebar-title">Retinal Evaluation</span>
          {!isAuthPage && (
            <nav className="evaluation-titlebar-nav">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={location.pathname === item.to ? "active" : undefined}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          )}
        </div>

        <div className="evaluation-titlebar-right electron-no-drag">
          {showUserMenu && (
            <div className="evaluation-user-menu" ref={menuRef}>
              <button
                type="button"
                className="evaluation-avatar"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="Account"
              >
                {getEvaluatorInitials(evaluator.name)}
              </button>
              {menuOpen && (
                <div className="evaluation-user-dropdown">
                  <button type="button" onClick={handleLogout}>
                    Log out
                  </button>
                </div>
              )}
            </div>
          )}

          {showUserMenu && <span className="evaluation-titlebar-sep" />}

          <div className="evaluation-win-controls electron-no-drag">
            <button title="Minimize" onClick={() => window.electronAPI?.minimize?.()}>
              <MinusOutlined />
            </button>
            <button title="Maximize/Restore" onClick={() => window.electronAPI?.maximize?.()}>
              <BorderOutlined />
            </button>
            <button className="is-close" title="Close" onClick={() => window.electronAPI?.close?.()}>
              <CloseOutlined />
            </button>
          </div>
        </div>
      </div>

      <main className="evaluation-main">{outlet}</main>
    </div>
  );
}
