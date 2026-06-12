import React, { useState } from "react";
import DemoModal from "../../components/landing/DemoModal";
import "../../assets/css/LandingPage.css";
import "../../assets/css/NosotrosPage.css";

// 👈 Reemplaza con tus fotos reales
import foto1 from "../../assets/img/andre.webp";
import foto2 from "../../assets/img/daniel.webp";

const FOUNDERS = [
  {
    name: "Andre Ivann Herrera",
    role: "Co-CEO",
    bio: "Liderazgo en investigación y desarrollo. Apasionado por construir software que resuelva problemas reales del día a día.",
    initials: "AH",
    color: "linear-gradient(135deg, #012770 0%, #01369e 100%)",
    photo: foto1, // 👈 foto1
  },
  {
    name: "Daniel Herrera",
    role: "Co-CEO",
    bio: "Visión de negocio y experiencia operativa. El puente entre lo que el cliente necesita y lo que el software entrega.",
    initials: "DH",
    color: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)",
    photo: foto2, // 👈 foto2
    photoScale: 1.35,
  },
];

const VALORES = [
  {

    title: "Innovación constante",
    desc: "Investigamos, probamos y mejoramos. Cada actualización trae algo que vale la pena.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 00-4 12.7c.5.5 1 1.3 1 2.3v1h6v-1c0-1 .5-1.8 1-2.3A7 7 0 0012 2z"/>
      </svg>
    ),
  },
  {
    title: "Base científica",
    desc: "Decisiones basadas en datos y método. Nada de improvisar lo que afecta tu negocio.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 2v8.5L4 19c-.6 1 .1 2.5 1.3 2.5h13.4c1.2 0 1.9-1.5 1.3-2.5L14 10.5V2"/><line x1="8" y1="2" x2="16" y2="2"/><line x1="7" y1="15" x2="17" y2="15"/>
      </svg>
    ),
  },
  {
    title: "Liderazgo cercano",
    desc: "Los fundadores siguen al frente. No hay capas de intermediarios entre tú y nosotros.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15 8.5 22 9.3 17 14 18.2 21 12 17.8 5.8 21 7 14 2 9.3 9 8.5 12 2"/>
      </svg>
    ),
  },
  {
    title: "Confianza real",
    desc: "Sin contratos forzosos, sin letra chica. Lo que prometemos lo cumplimos.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>
      </svg>
    ),
  },
  {
    title: "Foco en el cliente",
    desc: "Tu feedback nutre el sistema. Lo que pides hoy puede estar en el software mañana.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2" fill="currentColor"/>
      </svg>
    ),
  },
  {
    title: "Simplicidad",
    desc: "Software que cualquiera puede usar desde el primer día, sin manuales ni cursos.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>
      </svg>
    ),
  },
  {
    title: "Tecnología sólida",
    desc: "Arquitectura escalable, datos seguros y un sistema que crece con tu negocio.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
      </svg>
    ),
  },
  {
    title: "Pasión por ayudar",
    desc: "No vendemos software, te acompañamos. Tu éxito es la mejor referencia que podemos tener.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
      </svg>
    ),
  },
];

export default function NosotrosPage() {
  const [showDemo, setShowDemo] = useState(false);

  return (
    <div className="nosotros-root">

      {/* ===== HERO ===== */}
      <section className="nosotros-hero">
        <span className="landing-features-badge">Quiénes Somos</span>
        <h1 className="nosotros-hero-title">
          Tecnología con propósito,<br />
          <span className="landing-hero-accent">construida con método</span>
        </h1>
        <p className="nosotros-hero-sub">
          Somos un equipo de desarrollo e investigación dedicado a crear software
          que realmente resuelve. Combinamos ingeniería, ciencia de datos y experiencia
          operativa para construir herramientas que los negocios necesitan.
        </p>
      </section>

      {/* ===== VIDEO ===== */}
      <section className="nosotros-video-section">
        <div className="nosotros-video-header">
          <span className="landing-features-badge">Conócenos</span>
          <h2 className="nosotros-section-title">
            ¿Qué es <span className="landing-hero-accent">Herrsoft</span>?
          </h2>
          <p className="nosotros-section-sub">
            Descubre cómo nuestra plataforma puede transformar la gestión de tu negocio.
          </p>
        </div>
        <div className="nosotros-video-wrap">
          <iframe
            src="https://www.youtube.com/embed/uO5uMrVHVt4?rel=0"
            title="¿Qué es Herrsoft?"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </section>

      {/* ===== FUNDADORES ===== */}
      <section className="nosotros-team-section">
        <div className="nosotros-team-header">
          <span className="landing-features-badge">Liderazgo</span>
          <h2 className="nosotros-section-title">
            Los que impulsan<br />
            <span className="landing-hero-accent">la visión</span>
          </h2>
          <p className="nosotros-section-sub">
            Co-fundadores que siguen al frente del proyecto, con visión técnica y de negocio.
          </p>
        </div>

        <div className="founders-grid">
          {FOUNDERS.map(({ name, role, bio, initials, color, photo, photoScale }, i) => (
            <div key={i} className="founder-card">
              <div className="founder-photo" style={{ background: color }}>
                {photo ? (
                  <img src={photo} alt={name} style={photoScale ? { transform: `scale(${photoScale})` } : undefined} />
                ) : (
                  <span className="founder-initials">{initials}</span>
                )}
                <span className="founder-num">{i + 1}</span>
              </div>
              <div className="founder-info">
                <h3 className="founder-name">{name}</h3>
                <span className="founder-role">{role}</span>
                <p className="founder-bio">{bio}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== MISIÓN Y VISIÓN ===== */}
      <section className="nosotros-mv-section">
        <div className="nosotros-mv-inner">

          <div className="mv-card mv-card--mision">
            <div className="mv-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2" fill="currentColor"/>
              </svg>
            </div>
            <h3 className="mv-title">Misión</h3>
            <p className="mv-desc">
              Ayudar a los negocios a operar con orden y crecer con confianza, a través
              de software accesible, seguro y siempre disponible.
            </p>
          </div>

          <div className="mv-card mv-card--vision">
            <div className="mv-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
              </svg>
            </div>
            <h3 className="mv-title">Visión</h3>
            <p className="mv-desc">
              Convertirnos en la plataforma de referencia para la gestión de negocios
              de eventos en México, impulsando su digitalización con tecnología
              innovadora y soporte humano excepcional.
            </p>
          </div>

        </div>
      </section>

      {/* ===== VALORES ===== */}
      <section className="nosotros-values-section">
        <div className="nosotros-values-inner">
          <div className="nosotros-values-header">
            <span className="landing-features-badge">Lo que nos mueve</span>
            <h2 className="nosotros-section-title">
              Principios que guían<br />
              <span className="landing-hero-accent">cada línea de código</span>
            </h2>
          </div>

          <div className="values-grid">
            {VALORES.map(({ title, desc, icon }, i) => (
              <div key={i} className="value-card">
                <div className="value-icon">{icon}</div>
                <h4 className="value-title">{title}</h4>
                <p className="value-desc">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA ÚNETE ===== */}
      <section className="nosotros-cta">
        <div className="nosotros-cta-inner">
          <svg className="nosotros-cta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
          </svg>
          <h2 className="nosotros-cta-title">¿Quieres formar parte del equipo?</h2>
          <p className="nosotros-cta-sub">
            Si construyes software con pasión y te interesa trabajar en problemas reales
            con impacto directo, queremos conocerte. Buscamos talento que comparta nuestra
            forma de pensar.
          </p>
          <a
            href="mailto:contacto@herrsoft.mx?subject=Quiero unirme al equipo Herrsoft"
            className="nosotros-cta-btn"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
            Enviar mi CV
          </a>
        </div>
      </section>

      <DemoModal open={showDemo} onClose={() => setShowDemo(false)} />
    </div>
  );
}
