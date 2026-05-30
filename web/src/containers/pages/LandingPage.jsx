import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import DemoModal from "../../components/landing/DemoModal";
import VideoModal from "../../components/landing/VideoModal";
import CountUpStat from "../../components/landing/CountUpStat";
import Reveal from "../../components/landing/Reveal";
import logoEvents from "../../assets/img/logo_hersom_event_2.webp";

import img1 from "../../assets/img/imagen_muestra1.webp";
import img2 from "../../assets/img/imagen_muestra2.webp";
import img3 from "../../assets/img/imagen_muestra3.webp";
import cliente1 from "../../assets/img/clientes/cliente_1.webp";
import cliente2 from "../../assets/img/clientes/cliente_2.webp";
import cliente3 from "../../assets/img/clientes/cliente_3.webp";
import cliente4 from "../../assets/img/clientes/cliente_4.webp";
import "../../assets/css/LandingPage.css";

// ============================================================
// 👈 Cambia este número por tu WhatsApp (con código de país, sin +)
// ============================================================
const WHATSAPP_NUMBER = "521XXXXXXXXXX";

const HERO_IMAGES = [img1, img2, img3];

const CLIENTS = [
  { logo: cliente1, name: "Cliente 1", slug: "cliente-1" },
  { logo: cliente2, name: "Cliente 2", slug: "cliente-2" },
  { logo: cliente3, name: "Cliente 3", slug: "cliente-3" },
  { logo: cliente4, name: "Cliente 4", slug: "cliente-4" },
];

const FEATURES = [
  {
    title: "Agenda de Eventos",
    desc: "Visualiza toda tu operación en un calendario. Día, semana o mes, sin fechas cruzadas ni sorpresas.",
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
    title: "Paquetes y Servicios",
    desc: "Diseña paquetes con lo que ofreces y genera cotizaciones para tus clientes en segundos.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/>
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
    title: "Usuarios y Accesos",
    desc: "Crea usuarios con permisos específicos. Cada quien ve y hace solo lo que necesita dentro del sistema.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/><rect x="14" y="11" width="8" height="6" rx="1"/><line x1="18" y1="11" x2="18" y2="10"/><path d="M17 14h.01"/>
      </svg>
    ),
  },
  {
    title: "Pagos y Abonos",
    desc: "Registra abonos, lleva el saldo pendiente de cada cliente y sabe exactamente quién te debe y cuánto.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/><line x1="6" y1="15" x2="10" y2="15"/><line x1="14" y1="15" x2="18" y2="15"/>
      </svg>
    ),
  },
  {
    title: "Reportes en PDF",
    desc: "Exporta reportes completos con gráficas desde cualquier módulo. Listos para imprimir o compartir al instante.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="12" y2="17"/><polyline points="10 9 9 9 8 9"/>
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
    desc: "Alertas en tiempo real dentro del sistema y avisos por correo para ti y tu equipo. Nada se queda sin atender.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/><circle cx="19" cy="5" r="3" fill="#012770" stroke="none"/>
      </svg>
    ),
  },
];

const NAV_LINKS = [
  { label: "Inicio", href: "#inicio" },
  { label: "Nosotros", href: "#nosotros" },
  { label: "Funcionalidades", href: "#funcionalidades" },
  { label: "Paquetes", href: "#paquetes" },
  { label: "Contacto", href: "#contacto" },
];

const TESTIMONIALS = [
  {
    quote: "Antes manejábamos todo en hojas de Excel y siempre había algo que se nos escapaba. Desde que usamos el sistema, la agenda y el inventario están siempre en orden. El soporte es rápido y nos resolvieron todo desde el primer día.",
    name: "Marco A. Reyes",
    role: "Director de Operaciones",
    initials: "MR",
    color: "#012770",
  },
  {
    quote: "Lo que más me gustó fue que desde el primer día pudimos ver exactamente qué teníamos disponible, qué eventos estaban confirmados y cuánto nos debían los clientes. Le da un nivel de control a tu negocio que antes no teníamos.",
    name: "Sofía Herrera",
    role: "Coordinadora de Eventos",
    initials: "SH",
    color: "#2e5f4d",
  },
];

const FAQS = [
  {
    q: "¿Qué es este sistema y cómo puede ayudar a mi negocio?",
    a: "Es una plataforma de gestión diseñada para organizadores de eventos. Centraliza tu agenda, inventario, paquetes, pagos, trabajadores y más en un solo lugar. Olvídate de las hojas de cálculo y la información dispersa. Todo lo que necesitas para operar está aquí, organizado y siempre disponible.",
  },
  {
    q: "¿Cuánto tiempo toma implementar el sistema?",
    a: "La implementación es muy rápida. En la mayoría de los casos el sistema queda configurado y listo para usar el mismo día, incluso en cuestión de horas. Te acompañamos en todo momento para que el arranque sea fluido desde el primer minuto.",
  },
  {
    q: "¿Puedo acceder desde mi celular o tablet?",
    a: "El sistema no está disponible en App Store ni Google Play, pero podemos ayudarte a que aparezca como app en la pantalla de tu celular o tablet, tal como si fuera una aplicación normal. Te orientamos sin ningún costo para dejártelo listo.",
  },
  {
    q: "¿Qué tipo de soporte técnico ofrecen?",
    a: "Contamos con soporte directo vía WhatsApp y correo electrónico. Respondemos en tiempos cortos y te acompañamos ante cualquier duda o situación que se presente. No te dejamos solo.",
  },
  {
    q: "¿Puedo migrar mis datos actuales al sistema?",
    a: "Sí. Si tienes información en hojas de Excel, Google Sheets u otro formato, podemos ayudarte a importarla para que no empieces desde cero. El objetivo es que la transición sea lo menos disruptiva posible para tu operación.",
  },
  {
    q: "¿Hay algún contrato de permanencia?",
    a: "No manejamos contratos forzosos. Creemos que la mejor forma de que te quedes es ofreciéndote un buen servicio, no atándote con cláusulas. Puedes cancelar cuando lo consideres necesario.",
  },
  {
    q: "¿Cómo garantizan la seguridad de mis datos?",
    a: "Tu información se almacena en servidores seguros con acceso restringido por usuario y contraseña. Además, el sistema cuenta con historial de actividad para que sepas en todo momento qué ocurrió, quién lo hizo y cuándo.",
  },
];

function FaqItem({ question, answer }) {
  const [open, setOpen] = useState(false);
  const bodyRef = useRef(null);

  return (
    <div className={`faq-item ${open ? "faq-open" : ""}`}>
      <button className="faq-question" onClick={() => setOpen(!open)}>
        <span>{question}</span>
        <svg className="faq-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      <div
        className="faq-answer-wrap"
        style={{ maxHeight: open ? bodyRef.current?.scrollHeight + "px" : "0px" }}
      >
        <p className="faq-answer" ref={bodyRef}>{answer}</p>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();

  const [currentImage, setCurrentImage] = useState(0);
  const [imageVisible, setImageVisible] = useState(true);
  const [clientsVisible, setClientsVisible] = useState(false);
  const [featuresVisible, setFeaturesVisible] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showVideo, setShowVideo] = useState(false);

  const openModal = () => setShowModal(true);

  const clientsRef = useRef(null);
  const featuresRef = useRef(null);

  // Carousel de imágenes — cambia cada 3 segundos
  useEffect(() => {
    const timer = setInterval(() => {
      setImageVisible(false);
      setTimeout(() => {
        setCurrentImage((prev) => (prev + 1) % HERO_IMAGES.length);
        setImageVisible(true);
      }, 450);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  // Animación de clientes al entrar al viewport
  useEffect(() => {
    const el = clientsRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) { setClientsVisible(true); observer.disconnect(); }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Animación de funcionalidades al entrar al viewport
  useEffect(() => {
    const el = featuresRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setFeaturesVisible(true); observer.disconnect(); } },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Cerrar modals con ESC y bloquear scroll
  useEffect(() => {
    const isOpen = showModal || showVideo;
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") { setShowModal(false); setShowVideo(false); }
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [showModal, showVideo]);

  const imgSrc = HERO_IMAGES[currentImage];

  return (
    <div className="landing-root">

      {/* ===================== HERO ===================== */}
      <section className="landing-hero" id="inicio">
        <div className="landing-hero-inner">

          <div className="landing-hero-text">
            <h1 className="landing-hero-title">
              Organiza cada evento<br />
              <span className="landing-hero-accent">con todo bajo control</span>
            </h1>
            <p className="landing-hero-subtitle">
              Para los que hacen que cada evento sea memorable. Maneja tu agenda,
              inventario, paquetes y cobros desde un solo lugar, sin complicaciones.
            </p>
            <div className="landing-hero-buttons">
              <button className="landing-btn-primary" onClick={openModal}>
                Solicitar Demo →
              </button>
              <button
                className="landing-btn-secondary"
                onClick={() => setShowVideo(true)}
              >
                ▷ Ver cómo funciona
              </button>
            </div>
            <div className="landing-hero-stats">
              <CountUpStat num="500+" label="Eventos agendados" />
              <CountUpStat num="12+" label="Módulos integrados" />
              <CountUpStat num="99%" label="Satisfacción" />
            </div>
          </div>

          {/* Carousel de imágenes */}
          <div className="landing-carousel">
            <div className={`landing-carousel-slide ${imageVisible ? "lp-visible" : ""}`}>
              {imgSrc ? (
                <img src={imgSrc} alt={`Vista ${currentImage + 1}`} className="landing-carousel-img" />
              ) : (
                <div className="landing-carousel-placeholder">
                  <div className="landing-carousel-placeholder-inner">
                    <span>Imagen {currentImage + 1}</span>
                    <small>Agrega la ruta en HERO_IMAGES</small>
                  </div>
                </div>
              )}
            </div>
            <div className="landing-carousel-dots">
              {HERO_IMAGES.map((_, i) => (
                <button
                  key={i}
                  className={`landing-carousel-dot ${i === currentImage ? "lp-dot-active" : ""}`}
                  onClick={() => { setImageVisible(false); setTimeout(() => { setCurrentImage(i); setImageVisible(true); }, 300); }}
                  aria-label={`Imagen ${i + 1}`}
                />
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ===================== CLIENTES — sección azul ===================== */}
      <section
        ref={clientsRef}
        className={`landing-clients-blue ${clientsVisible ? "lp-clients-visible" : ""}`}
        id="clientes"
      >
        <p className="landing-clients-blue-label">Los que ya van un paso adelante</p>
        <div className="landing-clients-blue-row">
          {CLIENTS.map(({ logo: clientLogo, name, slug }, i) => (
            <div key={i} className={`landing-client-blue-card lcb-${slug}`} style={{ transitionDelay: `${i * 0.22}s` }}>
              {clientLogo ? (
                <div className={`landing-client-blue-logo-wrap lcb-wrap-${slug}`}>
                  <img src={clientLogo} alt={name} className={`landing-client-blue-logo lcb-logo-${slug}`} />
                </div>
              ) : (
                <div className="landing-client-blue-placeholder"><span>{name}</span></div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ===================== FUNCIONALIDADES ===================== */}
      <section
        ref={featuresRef}
        className={`landing-features ${featuresVisible ? "lp-features-visible" : ""}`}
        id="funcionalidades"
      >
        <div className="landing-features-inner">
          <div className="landing-features-header">
            <img src={logoEvents} alt="Herrsoft" className="lf-section-logo" />
            <span className="landing-features-badge">Funcionalidades</span>
            <h2 className="landing-features-title">
              El sistema que trabaja<br />
              <span className="landing-hero-accent">mientras tú organizas</span>
            </h2>
            <p className="landing-features-sub">
              Módulos diseñados para quienes organizan eventos. Sin curvas de aprendizaje, sin complicaciones.
            </p>
          </div>

          <div className="landing-features-grid">
            {FEATURES.map(({ title, desc, icon }, i) => (
              <div
                key={i}
                className="landing-feature-card"
                style={{ transitionDelay: `${(i % 4) * 0.08}s` }}
              >
                <div className="landing-feature-icon">{icon}</div>
                <h3 className="landing-feature-title">{title}</h3>
                <p className="landing-feature-desc">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== TESTIMONIOS ===================== */}
      <section className="landing-testimonials">
        <div className="landing-testimonials-inner">
          <Reveal variant="fade-up" className="landing-faq-header">
            <span className="landing-features-badge">Testimonios</span>
            <h2 className="landing-features-title">
              Lo que dicen<br />
              <span className="landing-hero-accent">quienes ya lo usan</span>
            </h2>
          </Reveal>
          <div className="landing-testimonials-grid">
            {TESTIMONIALS.map(({ quote, name, role, initials, color }, i) => (
              <Reveal key={i} variant="fade-up" delay={i * 120} className="testimonial-card">
                <svg className="testimonial-quote-icon" viewBox="0 0 40 30" fill="currentColor">
                  <path d="M0 30V18.5Q0 12 3.5 7T13 0l2 3Q10 4.5 7.5 8T5 18h7v12H0zm22 0V18.5Q22 12 25.5 7T35 0l2 3Q32 4.5 29.5 8T27 18h7v12H22z"/>
                </svg>
                <p className="testimonial-text">{quote}</p>
                <div className="testimonial-stars">
                  {[...Array(5)].map((_, s) => (
                    <svg key={s} viewBox="0 0 24 24" fill="#f59e0b" width="16" height="16">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                  ))}
                </div>
                <div className="testimonial-author">
                  <div className="testimonial-avatar" style={{ background: color }}>
                    {initials}
                  </div>
                  <div>
                    <span className="testimonial-name">{name}</span>
                    <span className="testimonial-role">{role}</span>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== FAQ ===================== */}
      <section className="landing-faq">
        <div className="landing-faq-inner">
          <Reveal variant="fade-up" className="landing-faq-header">
            <span className="landing-features-badge">Preguntas Frecuentes</span>
            <h2 className="landing-features-title">
              ¿Tienes dudas?<br />
              <span className="landing-hero-accent">Aquí las resolvemos</span>
            </h2>
          </Reveal>
          <div className="landing-faq-list">
            {FAQS.map(({ q, a }, i) => (
              <FaqItem key={i} question={q} answer={a} />
            ))}
          </div>
        </div>
      </section>

      <VideoModal
        open={showVideo}
        onClose={() => setShowVideo(false)}
        src="https://www.youtube.com/embed/uO5uMrVHVt4?autoplay=1&rel=0"
        title="Cómo funciona"
      />

      <DemoModal open={showModal} onClose={() => setShowModal(false)} />

    </div>
  );
}
