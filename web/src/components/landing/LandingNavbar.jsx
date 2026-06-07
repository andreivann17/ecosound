import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import logo from "../../assets/img/logo_herrsoft_v2.webp";
import logoEvents from "../../assets/img/logo_hersom_event_2.webp";

const NAV_LINKS_BEFORE = [
  { label: "Inicio", href: "/", exact: true },
];

const NAV_LINKS_AFTER = [
  { label: "Quiénes Somos", href: "/nosotros",  exact: true },
  { label: "Contacto",      href: "/contacto",  exact: true },
  { label: "Contratar",     href: "/contratar", exact: true },
];

const PRODUCTS = [
  {
    label: "Events",
    desc: "Gestión de eventos, cotizaciones y producción",
    href: "/events",
    disabled: false,
    badge: "Disponible",
    icon: <img src={logoEvents} alt="Herrsoft Events" style={{ width: "100%", height: "100%", objectFit: "contain" }} />,
  },
  {
    label: "Restaurant",
    desc: "Mesas, órdenes y cocina digital en tiempo real",
    href: null,
    disabled: true,
    badge: "Próximamente",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2"/><line x1="7" y1="2" x2="7" y2="11"/><path d="M21 15V2a5 5 0 00-5 5v6h3v7a1 1 0 002 0V15z"/>
      </svg>
    ),
  },
];

export default function LandingNavbar() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  const isActive = (href, exact) =>
    exact ? pathname === href.split("#")[0] : false;

  const renderLinks = (links) =>
    links.map(({ label, href, exact }) => (
      <li key={label}>
        <Link to={href} className={isActive(href, exact) ? "lnk-active" : ""}>
          {label}
        </Link>
      </li>
    ));

  return (
    <nav className="landing-nav">
      <div className="landing-nav-inner">
        <div className="landing-nav-brand">
          <Link to="/">
            <img src={logo} alt="Herrsoft" className="landing-nav-logo" />
          </Link>
        </div>

        <ul className="landing-nav-links">
          {/* Inicio primero */}
          {renderLinks(NAV_LINKS_BEFORE)}

          {/* Productos dropdown — segundo lugar */}
          <li
            className="nav-dropdown-wrap"
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
          >
            <Link to="/productos" className={`nav-dropdown-trigger${pathname === "/productos" ? " lnk-active" : ""}`}>
              Productos
              <svg className={`nav-dropdown-chevron${open ? " nav-dropdown-chevron--open" : ""}`} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </Link>

            {/* Panel: padding-top en lugar de gap para que el hover sea continuo */}
            <div className={`nav-dropdown-panel${open ? " nav-dropdown-panel--open" : ""}`}>
              <div className="nav-dropdown-inner">
                {PRODUCTS.map(({ label, desc, href, disabled, badge, icon }) => {
                  const content = (
                    <>
                      <div className="nav-dropdown-icon">{icon}</div>
                      <div className="nav-dropdown-text">
                        <div className="nav-dropdown-item-title">
                          {label}
                          <span className={`nav-dropdown-badge${disabled ? "" : " nav-dropdown-badge--ok"}`}>{badge}</span>
                        </div>
                        <div className="nav-dropdown-item-desc">{desc}</div>
                      </div>
                    </>
                  );
                  return disabled ? (
                    <div key={label} className="nav-dropdown-item nav-dropdown-item--disabled">
                      {content}
                    </div>
                  ) : (
                    <Link key={label} to={href} className="nav-dropdown-item" onClick={() => setOpen(false)}>
                      {content}
                    </Link>
                  );
                })}
              </div>
            </div>
          </li>

          {/* Resto de links */}
          {renderLinks(NAV_LINKS_AFTER)}
        </ul>

        <Link to="/login" className="landing-nav-cta">
          Acceso a Clientes →
        </Link>
      </div>
    </nav>
  );
}
