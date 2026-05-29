import React, { useEffect, useRef } from "react";
import { useLocation, useOutlet } from "react-router-dom";
import { CSSTransition, SwitchTransition } from "react-transition-group";
import LandingNavbar from "./LandingNavbar";
import LandingFooter from "./LandingFooter";

export default function LandingLayout() {
  const location = useLocation();
  const outlet = useOutlet();

  // Un nodeRef por pathname: la transición de salida y la de entrada no
  // pueden compartir el mismo nodo o React falla con insertBefore al
  // intentar mover/desmontar el nodo viejo.
  const refsByPath = useRef(new Map());
  if (!refsByPath.current.has(location.pathname)) {
    refsByPath.current.set(location.pathname, React.createRef());
  }
  const nodeRef = refsByPath.current.get(location.pathname);

  // Congela el outlet por ruta para que la transición de salida siga
  // mostrando el contenido viejo mientras useOutlet ya devuelve el nuevo.
  const outletsByPath = useRef(new Map());
  outletsByPath.current.set(location.pathname, outlet);
  const currentOutlet = outletsByPath.current.get(location.pathname);

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
              {currentOutlet}
            </div>
          </CSSTransition>
        </SwitchTransition>
      </main>

      <LandingFooter />
    </div>
  );
}
