import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import DemoModal from "../../components/landing/DemoModal";
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
                <svg viewBox="0 0 48 48" fill="none">
                  <rect width="48" height="48" rx="14" fill="rgba(255,255,255,0.15)"/>
                  <rect x="10" y="14" width="28" height="26" rx="4" stroke="white" strokeWidth="2"/>
                  <line x1="10" y1="22" x2="38" y2="22" stroke="white" strokeWidth="2"/>
                  <line x1="18" y1="10" x2="18" y2="18" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                  <line x1="30" y1="10" x2="30" y2="18" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                  <circle cx="18" cy="30" r="2" fill="white"/>
                  <circle cx="24" cy="30" r="2" fill="white"/>
                  <circle cx="30" cy="30" r="2" fill="white"/>
                </svg>
              </div>
              <h2 className="producto-name">Herrsoft Events</h2>
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
                <button className="producto-btn-primary" onClick={() => setShowDemo(true)}>
                  Solicitar Demo →
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
                <svg viewBox="0 0 48 48" fill="none">
                  <rect width="48" height="48" rx="14" fill="rgba(255,255,255,0.15)"/>
                  <path d="M16 12v8c0 3.31 2.69 6 6 6v8" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M22 26v8" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M28 12c0 0 4 3 4 8s-4 8-4 8v8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="14" y1="36" x2="34" y2="36" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <h2 className="producto-name">Herrsoft Restaurantes</h2>
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
