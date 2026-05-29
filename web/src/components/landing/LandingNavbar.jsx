import React from "react";
import { Link, useLocation } from "react-router-dom";
import logo from "../../assets/img/logo_herrsoft.jpeg";

const NAV_LINKS = [
  { label: "Inicio",        href: "/",          exact: true },
  { label: "Quiénes Somos", href: "/nosotros",  exact: true },
  { label: "Productos",     href: "/productos", exact: true },
  { label: "Contacto",      href: "/contacto",  exact: true },
];

export default function LandingNavbar() {
  const { pathname } = useLocation();

  const isActive = (href, exact) => {
    if (exact) return pathname === href.split("#")[0];
    return false;
  };

  return (
    <nav className="landing-nav">
      <div className="landing-nav-inner">
        <div className="landing-nav-brand">
          <Link to="/">
            <img src={logo} alt="Herrsoft" className="landing-nav-logo" />
          </Link>
        </div>

        <ul className="landing-nav-links">
          {NAV_LINKS.map(({ label, href, exact }) => {
            const active = isActive(href, exact);
            // Si es un anchor (#) usamos <a>, si es una ruta usamos <Link>
            if (href.startsWith("#") || href.includes("#")) {
              return (
                <li key={label}>
                  <a href={href} className={active ? "lnk-active" : ""}>
                    {label}
                  </a>
                </li>
              );
            }
            return (
              <li key={label}>
                <Link to={href} className={active ? "lnk-active" : ""}>
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>

        <Link to="/login" className="landing-nav-cta">
          Acceso a Clientes →
        </Link>
      </div>
    </nav>
  );
}
