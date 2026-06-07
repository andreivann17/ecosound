import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import DemoModal from "../../components/landing/DemoModal";
import logoEvents from "../../assets/img/logo_hersoft_event.webp";
import "../../assets/css/LandingPage.css";
import "../../assets/css/ProductosPage.css";

const EVENTS_FEATURES = [
  "Agenda y calendario de eventos",
  "Gestión completa de eventos",
  "Inventario en tiempo real",
  "Paquetes y cotizaciones",
  "Control de pagos y abonos",
  "Trabajadores y asignación",
  "Estadísticas y reportes en PDF",
  "Notificaciones y avisos por correo",
  "Historial de actividad",
  "Usuarios con permisos específicos",
];

const RESTAURANT_FEATURES = [
  "Gestión de mesas y reservaciones",
  "Órdenes por mesa en tiempo real",
  "Pantalla de cocina digital",
  "Inventario de ingredientes",
  "Menú digital personalizable",
  "Caja y cobros integrados",
  "Reportes de ventas y consumo",
  "Gestión de personal",
];

export default function ProductosPage() {
  const navigate = useNavigate();
  const [showDemo, setShowDemo] = useState(false);

  return (
    <div className="productos-root">

      {/* ===== HERO ===== */}
      <section className="productos-hero">
        <span className="landing-features-badge">Nuestros Productos</span>
        <h1 className="productos-hero-title">
          Software hecho para<br />
          <span className="landing-hero-accent">negocios que no improvisan</span>
        </h1>
        <p className="productos-hero-sub">
          Cada producto está diseñado para un giro específico. Elige el tuyo,
          arranca el mismo día y empieza a operar con orden.
        </p>
      </section>

      {/* ===== CARDS ===== */}
      <section className="productos-grid-section">
        <div className="productos-grid">

          {/* ---- EVENTS ---- */}
          <div className="producto-card">
            <div className="producto-card-top producto-card-top--events">
              <div className="producto-card-badge-avail">Disponible</div>
              <div className="producto-icon-wrap">
                <img src={logoEvents} alt="Herrsoft Events" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              </div>
              <h2 className="producto-name">HerrSoft Events</h2>
              <p className="producto-tagline">
                Todo lo que necesitas para gestionar eventos sin perder el hilo.
              </p>
            </div>

            <div className="producto-card-body">
              <p className="producto-target">
                Para organizadores de eventos, salones y empresas que necesitan controlar
                agenda, inventario, cobros y equipo desde un solo sistema.
              </p>
              <ul className="producto-features">
                {EVENTS_FEATURES.map((f, i) => (
                  <li key={i} className="producto-feature-item">
                    <svg className="pf-check" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="8" fill="#e8edf8"/>
                      <path d="M4.5 8l2.5 2.5 4.5-5" stroke="#012770" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <div className="producto-card-actions">
                <button className="producto-btn-primary" onClick={() => navigate("/contratar")}>
                  Contratar →
                </button>
                <Link to="/events" className="producto-btn-secondary">
                  Ver funcionalidades
                </Link>
              </div>
            </div>
          </div>

          {/* ---- RESTAURANTES ---- */}
          <div className="producto-card producto-card--soon">
            <div className="producto-card-top producto-card-top--restaurant">
              <div className="producto-card-badge-soon">Próximamente</div>
              <div className="producto-icon-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2"/><line x1="7" y1="2" x2="7" y2="11"/><path d="M21 15V2a5 5 0 00-5 5v6h3v7a1 1 0 002 0V15z"/>
                </svg>
              </div>
              <h2 className="producto-name">HerrSoft Restaurantes</h2>
              <p className="producto-tagline">
                Sistema completo para restaurantes que quieren operar sin caos.
              </p>
            </div>

            <div className="producto-card-body">
              <p className="producto-target">
                Para restaurantes, cafeterías y fondas que necesitan gestionar
                mesas, órdenes, cocina e inventario desde un solo lugar.
              </p>
              <ul className="producto-features">
                {RESTAURANT_FEATURES.map((f, i) => (
                  <li key={i} className="producto-feature-item producto-feature-item--soon">
                    <svg className="pf-check pf-check--soon" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="8" fill="#f3f4f6"/>
                      <path d="M5.5 8h5M8 5.5v5" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round"/>
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <div className="producto-card-actions">
                <span className="producto-wip-badge">En desarrollo activo</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      <DemoModal open={showDemo} onClose={() => setShowDemo(false)} />
    </div>
  );
}
