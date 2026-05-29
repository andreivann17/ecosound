import React, { useEffect, useRef } from "react";
import { useLocation, useOutlet } from "react-router-dom";
import { CSSTransition, SwitchTransition } from "react-transition-group";
import LandingNavbar from "./LandingNavbar";
import LandingFooter from "./LandingFooter";

export default function LandingLayout() {
  const location = useLocation();
  const outlet = useOutlet();
  const nodeRef = useRef(null);

  // Libera el overflow:hidden global de la app SPA
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

  // Scroll al top al cambiar de ruta
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname]);

  return (
    <div className="landing-layout">
      <LandingNavbar />

      <main className="landing-layout-main">
        <SwitchTransition mode="out-in">
          <CSSTransition
            key={location.pathname}
            nodeRef={nodeRef}
            timeout={{ enter: 500, exit: 300 }}
            classNames="lp-route"
            unmountOnExit
          >
            <div ref={nodeRef} className="lp-route-wrap">
              {outlet}
            </div>
          </CSSTransition>
        </SwitchTransition>
      </main>

      <LandingFooter />
    </div>
  );
}
