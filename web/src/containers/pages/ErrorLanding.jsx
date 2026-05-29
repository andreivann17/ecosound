import React from "react";
import { Link, useLocation } from "react-router-dom";
import "../../assets/css/LandingPage.css";
import "../../assets/css/ErrorLanding.css";

const ERRORS = {
  404: {
    code: "404",
    badge: "Página no encontrada",
    title: "Esta página se nos perdió",
    desc: "El enlace que seguiste podría estar roto o la página fue movida. Pero no te preocupes, te ayudamos a encontrar lo que buscas.",
    illu: "search",
  },
  401: {
    code: "401",
    badge: "Acceso no autorizado",
    title: "Necesitas iniciar sesión",
    desc: "Esta sección está reservada para clientes con sesión activa. Inicia sesión para continuar o vuelve al inicio.",
    illu: "lock",
  },
  403: {
    code: "403",
    badge: "Acceso restringido",
    title: "No tienes permisos para ver esto",
    desc: "Tu cuenta no cuenta con los accesos necesarios para esta sección. Si crees que es un error, contáctanos.",
    illu: "lock",
  },
  500: {
    code: "500",
    badge: "Error del servidor",
    title: "Algo salió mal de nuestro lado",
    desc: "Hubo un problema en nuestros servidores. Estamos en eso. Intenta de nuevo en unos minutos o contáctanos si persiste.",
    illu: "bug",
  },
  503: {
    code: "503",
    badge: "Servicio no disponible",
    title: "Estamos en mantenimiento",
    desc: "Estamos haciendo mejoras al sistema. Volvemos en muy poco. Gracias por tu paciencia.",
    illu: "tools",
  },
};

const Illustration = ({ kind }) => {
  switch (kind) {
    case "lock":
      return (
        <svg viewBox="0 0 200 200" fill="none">
          <circle cx="100" cy="100" r="90" fill="#e8edf8"/>
          <rect x="65" y="90" width="70" height="60" rx="8" fill="#012770"/>
          <path d="M75 90V70a25 25 0 0150 0v20" stroke="#012770" strokeWidth="8" strokeLinecap="round"/>
          <circle cx="100" cy="118" r="6" fill="#fff"/>
          <line x1="100" y1="118" x2="100" y2="132" stroke="#fff" strokeWidth="4" strokeLinecap="round"/>
        </svg>
      );
    case "bug":
      return (
        <svg viewBox="0 0 200 200" fill="none">
          <circle cx="100" cy="100" r="90" fill="#fef3c7"/>
          <ellipse cx="100" cy="110" rx="32" ry="40" fill="#012770"/>
          <circle cx="92" cy="100" r="4" fill="#fff"/>
          <circle cx="108" cy="100" r="4" fill="#fff"/>
          <path d="M75 80l-12-10M125 80l12-10M70 110l-15 5M130 110l15 5M75 140l-10 15M125 140l10 15" stroke="#012770" strokeWidth="4" strokeLinecap="round"/>
          <path d="M90 70a10 10 0 0120 0" stroke="#012770" strokeWidth="4" strokeLinecap="round" fill="none"/>
        </svg>
      );
    case "tools":
      return (
        <svg viewBox="0 0 200 200" fill="none">
          <circle cx="100" cy="100" r="90" fill="#fef3c7"/>
          <path d="M70 130l30-30 12 12-30 30a8 8 0 11-12-12z" fill="#012770"/>
          <circle cx="120" cy="80" r="22" fill="none" stroke="#012770" strokeWidth="8"/>
          <path d="M105 65l-15-15M135 95l15 15" stroke="#012770" strokeWidth="6" strokeLinecap="round"/>
        </svg>
      );
    case "search":
    default:
      return (
        <svg viewBox="0 0 200 200" fill="none">
          <circle cx="100" cy="100" r="90" fill="#e8edf8"/>
          <circle cx="92" cy="92" r="35" fill="none" stroke="#012770" strokeWidth="8"/>
          <line x1="117" y1="117" x2="140" y2="140" stroke="#012770" strokeWidth="8" strokeLinecap="round"/>
          <line x1="78" y1="92" x2="106" y2="92" stroke="#012770" strokeWidth="5" strokeLinecap="round"/>
        </svg>
      );
  }
};

export default function ErrorLanding({ code: codeProp }) {
  const location = useLocation();

  // Detecta el código a mostrar
  // Prioridad: prop > path (/401, /403, /500, /503) > 404
  let code = codeProp;
  if (!code) {
    const m = location.pathname.match(/^\/(\d{3})\/?$/);
    code = m ? m[1] : "404";
  }

  const data = ERRORS[code] || ERRORS["404"];

  return (
    <div className="error-landing-root">
      <div className="error-landing-inner">

        {/* Código gigante decorativo */}
        <div className="error-code-bg" aria-hidden="true">{data.code}</div>

        <div className="error-illu">
          <Illustration kind={data.illu} />
        </div>

        <span className="landing-features-badge">{data.badge}</span>

        <h1 className="error-title">{data.title}</h1>
        <p className="error-desc">{data.desc}</p>

        <div className="error-actions">
          <Link to="/" className="landing-btn-primary">
            ← Volver al inicio
          </Link>
          <Link to="/contacto" className="landing-btn-secondary">
            Contáctanos
          </Link>
        </div>

        <div className="error-suggest">
          <span className="error-suggest-label">¿Tal vez buscabas?</span>
          <div className="error-suggest-links">
            <Link to="/productos" className="error-suggest-link">Productos</Link>
            <Link to="/nosotros" className="error-suggest-link">Quiénes Somos</Link>
            <Link to="/events" className="error-suggest-link">Herrsoft Events</Link>
            <Link to="/contacto" className="error-suggest-link">Contacto</Link>
          </div>
        </div>

      </div>
    </div>
  );
}
