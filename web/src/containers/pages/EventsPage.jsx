import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import DemoModal from "../../components/landing/DemoModal";
import CountUpStat from "../../components/landing/CountUpStat";
import img1 from "../../assets/img/imagen_muestra1.webp";
import img1_2 from "../../assets/img/imagen_muestra1-2.webp";
import img2 from "../../assets/img/imagen_muestra2.webp";
import img2_2 from "../../assets/img/imagen_muestra2-2.webp";
import img3 from "../../assets/img/imagen_muestra3.webp";
import img3_2 from "../../assets/img/imagen_muestra3-2.webp";
import img4 from "../../assets/img/imagen_muestra4-1.webp";
import "../../assets/css/LandingPage.css";
import "../../assets/css/EventsPage.css";

// ============================================================
// IMÁGENES POR SECCIÓN — agrega tus capturas de pantalla aquí
// ============================================================
const IMG_EVENTOS    = [img1, img1_2]; // 👈 eventos: agrega más si quieres
const IMG_AGENDA     = [img3, img3_2]; // 👈 reemplaza con tus capturas de agenda
const IMG_PAQUETES   = [img4];             // 👈 reemplaza con tu captura de paquetes
const IMG_STATS      = [img2, img2_2];       // 👈 reemplaza con tus capturas de estadísticas

const FEATURES = [
  {
    title: "Agenda de Eventos",
    desc: "Vista diaria, semanal y mensual. Todos tus eventos en un solo calendario, sin fechas cruzadas ni sorpresas.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="3"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><circle cx="8" cy="15" r="1" fill="currentColor"/><circle cx="12" cy="15" r="1" fill="currentColor"/><circle cx="16" cy="15" r="1" fill="currentColor"/>
      </svg>
    ),
  },
  {
    title: "Gestión de Eventos",
    desc: "Crea y da seguimiento a cada evento de principio a fin. Estado, detalles y todo en un solo lugar.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12l2 2 4-4"/>
      </svg>
    ),
  },
  {
    title: "Inventario en Tiempo Real",
    desc: "Sabe exactamente qué tienes, cuánto y dónde está. Conteos, equipos y recursos siempre actualizados.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
      </svg>
    ),
  },
  {
    title: "Paquetes y Cotizaciones",
    desc: "Diseña paquetes con lo que ofreces y genera cotizaciones para tus clientes en segundos.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/>
      </svg>
    ),
  },
  {
    title: "Pagos y Abonos",
    desc: "Registra abonos, lleva el saldo pendiente y sabe exactamente quién te debe y cuánto.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
      </svg>
    ),
  },
  {
    title: "Control de Gastos",
    desc: "Registra cada gasto por evento o área. Sabe en todo momento en qué va el dinero de tu negocio.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
      </svg>
    ),
  },
  {
    title: "Trabajadores",
    desc: "Administra a tu equipo, asigna responsabilidades y mantén a todos coordinados para cada evento.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
      </svg>
    ),
  },
  {
    title: "Estadísticas",
    desc: "Métricas reales de tu operación. Ingresos, eventos por mes y tendencias para tomar mejores decisiones.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
      </svg>
    ),
  },
  {
    title: "Reportes en PDF",
    desc: "Exporta reportes completos con gráficas desde cualquier módulo. Listos para imprimir o compartir.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="12" y2="17"/>
      </svg>
    ),
  },
  {
    title: "Historial de Actividad",
    desc: "Registro completo de todo lo que ocurre en el sistema. Quién hizo qué, cuándo y desde dónde.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="12 8 12 12 14 14"/><path d="M3.05 11a9 9 0 1 0 .5-4.5"/><polyline points="3 3 3 7 7 7"/>
      </svg>
    ),
  },
  {
    title: "Notificaciones y Avisos",
    desc: "Alertas en tiempo real dentro del sistema y avisos por correo para ti y tu equipo.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
      </svg>
    ),
  },
  {
    title: "Usuarios y Accesos",
    desc: "Crea usuarios con permisos específicos. Cada quien ve y hace solo lo que necesita.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
];

const STATS = [
  { num: "500+", label: "Eventos agendados" },
  { num: "12+",  label: "Módulos integrados" },
  { num: "99%",  label: "Satisfacción" },
  { num: "1 día", label: "Para estar operando" },
];

// Sección showcase reutilizable con carousel de imágenes
function ShowcaseSection({ badge, title, desc, images, reverse, interval = 3500 }) {
  const [current, setCurrent] = useState(0);
  const [visible, setVisible] = useState(true);
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (images.length <= 1) return;
    const t = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setCurrent(p => (p + 1) % images.length);
        setVisible(true);
      }, 400);
    }, interval);
    return () => clearInterval(t);
  }, [images.length, interval]);

  return (
    <div ref={ref} className={`showcase-section ${reverse ? "showcase-reverse" : ""} ${inView ? "showcase-visible" : ""}`}>
      <div className="showcase-img-col">
        <div className={`showcase-img-wrap ${visible ? "sc-visible" : ""}`}>
          <img src={images[current]} alt={title} className="showcase-img" />
        </div>
        {images.length > 1 && (
          <div className="showcase-dots">
            {images.map((_, i) => (
              <button
                key={i}
                className={`showcase-dot ${i === current ? "sc-dot-active" : ""}`}
                onClick={() => { setVisible(false); setTimeout(() => { setCurrent(i); setVisible(true); }, 300); }}
              />
            ))}
          </div>
        )}
      </div>
      <div className="showcase-text-col">
        <span className="showcase-badge">{badge}</span>
        <h2 className="showcase-title">{title}</h2>
        <p className="showcase-desc">{desc}</p>
      </div>
    </div>
  );
}

export default function EventsPage() {
  const navigate = useNavigate();
  const [showDemo, setShowDemo] = useState(false);

  return (
    <div className="events-root">

      {/* ===== HERO ===== */}
      <section className="events-hero">
        <div className="events-hero-inner">
          <span className="landing-features-badge" style={{ marginBottom: 20, display: "inline-block" }}>Herrsoft Events</span>
          <h1 className="events-hero-title">
            Gestiona cada evento<br />
            <span className="events-hero-accent">con todo bajo control</span>
          </h1>
          <p className="events-hero-sub">
            Una plataforma completa para organizadores de eventos. Desde la agenda
            hasta el cobro, todo conectado y todo en orden.
          </p>
          <div className="events-hero-actions">
            <button className="landing-btn-primary" onClick={() => setShowDemo(true)}>
              Solicitar Demo →
            </button>
          </div>
          <div className="events-stats">
            {STATS.map(({ num, label }, i) => (
              <CountUpStat
                key={i}
                num={num}
                label={label}
                className="events-stat"
              />
            ))}
          </div>
        </div>
      </section>

      {/* ===== SHOWCASES ===== */}
      <div className="showcases-wrapper">

        <ShowcaseSection
          badge="Gestión de Eventos"
          title="Cada evento, exactamente como lo planeaste"
          desc="Crea eventos, asigna todos los detalles, lleva el estado de cada uno y da seguimiento al cobro. Todo visible desde una sola pantalla, sin buscar información en otro lado ni depender de hojas de cálculo."
          images={IMG_EVENTOS}
          reverse={false}
        />

        <ShowcaseSection
          badge="Agenda"
          title="Tu operación completa en el calendario"
          desc="Visualiza todos tus eventos en vista mensual, semanal o por día. Identifica de un vistazo qué tienes confirmado, qué está pendiente y dónde hay espacio disponible para agendar más."
          images={IMG_AGENDA}
          reverse={true}
        />

        <ShowcaseSection
          badge="Paquetes y Cotizaciones"
          title="Cotiza y cierra más rápido"
          desc="Arma paquetes con lo que ofreces, personalízalos por evento y genera cotizaciones listas para compartir con tu cliente en segundos. Tu catálogo siempre actualizado, listo para usarse cuando lo necesites."
          images={IMG_PAQUETES}
          reverse={false}
        />

        <ShowcaseSection
          badge="Estadísticas y Reportes"
          title="Toma decisiones con datos reales"
          desc="Visualiza ingresos, eventos por mes, tipos de evento más contratados y el estado de tu operación de un solo vistazo. Genera reportes en PDF listos para imprimir o compartir con tu equipo."
          images={IMG_STATS}
          reverse={true}
        />

      </div>

      {/* ===== FUNCIONALIDADES ===== */}
      <section className="events-features-section">
        <div className="events-features-inner">
          <div className="events-features-header">
            <h2 className="events-features-title">
              Todo lo que incluye
            </h2>
            <p className="events-features-sub">
              12 módulos diseñados para quienes organizan eventos. Sin curvas de aprendizaje.
            </p>
          </div>
          <div className="events-features-grid">
            {FEATURES.map(({ title, desc, icon }, i) => (
              <div key={i} className="events-feature-card">
                <div className="events-feature-icon">{icon}</div>
                <h3 className="events-feature-title">{title}</h3>
                <p className="events-feature-desc">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA FINAL ===== */}
      <section className="events-cta">
        <h2 className="events-cta-title">¿Listo para empezar?</h2>
        <p className="events-cta-sub">
          Arranca el mismo día. Te acompañamos en cada paso.
        </p>
        <button className="events-cta-btn" onClick={() => setShowDemo(true)}>
          Solicitar Demo gratuita →
        </button>
      </section>

      <DemoModal open={showDemo} onClose={() => setShowDemo(false)} />
    </div>
  );
}
