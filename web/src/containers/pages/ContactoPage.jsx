import React, { useState, useRef } from "react";
import axios from "axios";
import { API_URL } from "../../api";
import "../../assets/css/LandingPage.css";
import "../../assets/css/ContactoPage.css";

const WHATSAPP_NUMBER = "521XXXXXXXXXX"; // 👈 mismo número que en LandingPage y LandingFooter

const CONTACT_INFO = {
  email: "soporte.herrsoft@gmail.com",
  telefono: "(55) XXXX-XXXX",          // 👈 actualiza con tu número real
  ubicacion: "Av. Puebla y 30, San Luis Río Colorado, Sonora, México",
};


const SUPPORT_CARDS = [
  {
    title: "Sin tiempos de espera",
    desc: "Mandas un mensaje y alguien real te contesta. Sin tickets, sin filas, sin frustraciones.",
    bg: "linear-gradient(135deg, #012770 0%, #01369e 100%)",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
  },
  {
    title: "A tu ritmo",
    desc: "Cada negocio es distinto. Nos ajustamos a cómo trabajas tú, no al revés.",
    bg: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
      </svg>
    ),
  },
  {
    title: "Siempre hay alguien",
    desc: "No hablas con un bot ni un formulario. Una persona que conoce tu caso te da seguimiento.",
    bg: "linear-gradient(135deg, #2e5f4d 0%, #3d7a62 100%)",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
      </svg>
    ),
  },
  {
    title: "Tu voz cuenta",
    desc: "Lo que nos dices hoy forma parte del sistema mañana. Tus necesidades son nuestra hoja de ruta.",
    bg: "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
      </svg>
    ),
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
      <div className="faq-answer-wrap" style={{ maxHeight: open ? bodyRef.current?.scrollHeight + "px" : "0px" }}>
        <p className="faq-answer" ref={bodyRef}>{answer}</p>
      </div>
    </div>
  );
}

const EMPTY = { nombre: "", email: "", telefono: "", negocio: "", mensaje: "" };

export default function ContactoPage() {
  const [form, setForm] = useState(EMPTY);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const validate = () => {
    const { nombre, email, telefono } = form;
    if (!nombre.trim() || !email.trim() || !telefono.trim()) {
      alert("Por favor completa los campos requeridos.");
      return false;
    }
    return true;
  };

  const saveContacto = async (via) => {
    const { nombre, email, telefono, negocio, mensaje } = form;
    await axios.post(`${API_URL}/contacto/demo`, {
      responsable: nombre,
      empresa: negocio,
      correo: email,
      celular: telefono,
      direccion: "",
      mensaje,
      zona: "",
      via,
    });
  };

  const handleSubmitWhatsapp = async () => {
    if (!validate() || sending) return;
    setSending(true);
    try {
      await saveContacto("whatsapp");
    } catch (_) { /* abre WA aunque falle el guardado */ }
    const { nombre, email, telefono, negocio, mensaje } = form;
    const msg = [
      "Hola, me contacto desde la página de Contacto.",
      "",
      `Nombre: ${nombre}`,
      `Email: ${email}`,
      `Teléfono: ${telefono}`,
      negocio ? `Negocio: ${negocio}` : null,
      mensaje ? `Mensaje: ${mensaje}` : null,
    ].filter(Boolean).join("\n");
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, "_blank");
    setSent(true);
    setSending(false);
    setTimeout(() => { setForm(EMPTY); setSent(false); }, 3000);
  };

  const handleSubmitEmail = async () => {
    if (!validate() || sending) return;
    setSending(true);
    try {
      await saveContacto("correo");
      setSent(true);
      setTimeout(() => { setForm(EMPTY); setSent(false); }, 3000);
    } catch (_) {
      alert("No se pudo enviar la solicitud. Inténtalo de nuevo.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="contacto-root">

      {/* ===== SECCIÓN CONTACTO ===== */}
      <main className="contacto-main">
        <div className="contacto-inner">

          <div className="contacto-left">
            <span className="landing-features-badge">Contacto</span>
            <h1 className="contacto-title">
              Hablemos y veamos<br />
              <span className="landing-hero-accent">cómo podemos ayudarte</span>
            </h1>
            <p className="contacto-desc">
              Sin presiones ni compromisos. Cuéntanos qué necesitas y armamos
              una demo a tu medida, sin costo y sin letra chica.
            </p>
            <div className="contacto-info-list">
              <div className="contacto-info-item">
                <div className="contacto-info-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                  </svg>
                </div>
                <div>
                  <span className="contacto-info-label">Email</span>
                  <span className="contacto-info-value">{CONTACT_INFO.email}</span>
                </div>
              </div>
              <div className="contacto-info-item">
                <div className="contacto-info-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8a19.79 19.79 0 01-3.07-8.72A2 2 0 012.18 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.72 6.72l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                  </svg>
                </div>
                <div>
                  <span className="contacto-info-label">Teléfono / WhatsApp</span>
                  <span className="contacto-info-value">{CONTACT_INFO.telefono}</span>
                </div>
              </div>
              <div className="contacto-info-item">
                <div className="contacto-info-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                  </svg>
                </div>
                <div>
                  <span className="contacto-info-label">Ubicación</span>
                  <span className="contacto-info-value">{CONTACT_INFO.ubicacion}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="contacto-card">
            <h2 className="contacto-card-title">Solicita tu demo gratuita</h2>
            <div className="contacto-form">
              <div className="contacto-row">
                <div className="demo-field">
                  <label className="demo-label">Nombre <span className="contacto-req">*</span></label>
                  <input className="demo-input" type="text" name="nombre" placeholder="Tu nombre" value={form.nombre} onChange={handleChange} />
                </div>
                <div className="demo-field">
                  <label className="demo-label">Email <span className="contacto-req">*</span></label>
                  <input className="demo-input" type="email" name="email" placeholder="tu@email.com" value={form.email} onChange={handleChange} />
                </div>
              </div>
              <div className="contacto-row">
                <div className="demo-field">
                  <label className="demo-label">Teléfono <span className="contacto-req">*</span></label>
                  <input className="demo-input" type="tel" name="telefono" placeholder="(55) 1234-5678" value={form.telefono} onChange={handleChange} />
                </div>
                <div className="demo-field">
                  <label className="demo-label">Nombre de tu negocio</label>
                  <input className="demo-input" type="text" name="negocio" placeholder="Tu empresa o salón" value={form.negocio} onChange={handleChange} />
                </div>
              </div>
              <div className="demo-field">
                <label className="demo-label">Mensaje</label>
                <textarea className="demo-input contacto-textarea" name="mensaje" placeholder="¿Cómo podemos ayudarte?" value={form.mensaje} onChange={handleChange} rows={4} />
              </div>
            </div>
            <button className="demo-btn-email" onClick={handleSubmitEmail} disabled={sent || sending}>
              {sent ? "¡Mensaje enviado!" : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                  </svg>
                  Enviar solicitud por correo
                </>
              )}
            </button>
            <button className="demo-btn-whatsapp" onClick={handleSubmitWhatsapp} disabled={sent || sending}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Enviar solicitud por WhatsApp
            </button>
            <p className="demo-privacy">Al enviar este formulario, aceptas nuestra política de privacidad.</p>
          </div>

        </div>
      </main>

      {/* ===== TARJETAS DE SOPORTE ===== */}
      <section className="contacto-support">
        <div className="contacto-support-inner">
          <div className="contacto-support-header">
            <span className="landing-features-badge">Por qué elegirnos</span>
            <h2 className="contacto-support-title">
              No solo vendemos software,<br />
              <span className="landing-hero-accent">te acompañamos</span>
            </h2>
          </div>
          <div className="contacto-support-grid">
            {SUPPORT_CARDS.map(({ title, desc, bg, icon }, i) => (
              <div key={i} className="support-card">
                <div className="support-icon" style={{ background: bg }}>{icon}</div>
                <h3 className="support-card-title">{title}</h3>
                <p className="support-card-desc">{desc}</p>
              </div>
            ))}
          </div>
          <div className="contacto-wa-wrap">
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}`}
              target="_blank"
              rel="noreferrer"
              className="contacto-wa-btn"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Contáctanos por WhatsApp
            </a>
            <span className="contacto-wa-hint">Respuesta inmediata de nuestro equipo</span>
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section className="contacto-faq">
        <div className="contacto-faq-inner">
          <div className="landing-faq-header">
            <span className="landing-features-badge">Preguntas Frecuentes</span>
            <h2 className="landing-features-title">
              ¿Tienes dudas?<br />
              <span className="landing-hero-accent">Aquí las resolvemos</span>
            </h2>
          </div>
          <div className="landing-faq-list">
            {FAQS.map(({ q, a }, i) => (
              <FaqItem key={i} question={q} answer={a} />
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
