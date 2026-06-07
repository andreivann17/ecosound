import React from "react";
import { Link } from "react-router-dom";
import logo from "../../assets/img/logo_herrsoft.webp";

const WHATSAPP_NUMBER = "526532091200";

export default function LandingFooter() {
  return (
    <footer className="landing-footer">

      {/* Pre-footer CTA */}
      <div className="footer-prefooter">
        <p className="footer-prefooter-text">¿No encontraste lo que buscabas?</p>
        <Link to="/contacto" className="footer-prefooter-link">
          Contáctanos directamente →
        </Link>
      </div>

      {/* Cuerpo */}
      <div className="footer-body">
        <div className="footer-body-inner">

          {/* Brand */}
          <div className="footer-brand-col">
            <img src={logo} alt="Herrsoft" className="footer-logo" />
            <p className="footer-brand-desc">
              Sistema de gestión diseñado para quienes organizan eventos.
              Todo en un solo lugar, sin complicaciones.
            </p>
            <div className="footer-social">
              <a href="https://www.facebook.com/profile.php?id=61590346480534" target="_blank" rel="noreferrer" className="footer-social-icon" aria-label="Facebook">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/>
                </svg>
              </a>
              <a href="https://www.youtube.com/@HerrSoft" target="_blank" rel="noreferrer" className="footer-social-icon" aria-label="YouTube">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 00-1.95 1.96A29 29 0 001 12a29 29 0 00.46 5.58 2.78 2.78 0 001.95 1.95C5.12 20 12 20 12 20s6.88 0 8.59-.47a2.78 2.78 0 001.95-1.95A29 29 0 0023 12a29 29 0 00-.46-5.58z"/>
                  <polygon fill="#0d1224" points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/>
                </svg>
              </a>
              <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noreferrer" className="footer-social-icon" aria-label="WhatsApp">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Columnas */}
          <div className="footer-links-col">
            <span className="footer-col-title">Productos</span>
            <Link to="/productos" className="footer-link">Nuestros productos</Link>
            <Link to="/events" className="footer-link">Herrsoft Events</Link>
            <Link to="/contratar" className="footer-link">Contratar</Link>
          </div>

          <div className="footer-links-col">
            <span className="footer-col-title">Empresa</span>
            <Link to="/nosotros" className="footer-link">Quiénes Somos</Link>
            <Link to="/contacto" className="footer-link">Contacto</Link>
            <Link to="/nosotros" className="footer-link">Equipo</Link>
          </div>

          <div className="footer-links-col">
            <span className="footer-col-title">Soporte</span>
            <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noreferrer" className="footer-link">WhatsApp</a>
            <Link to="/contacto" className="footer-link">Preguntas frecuentes</Link>
            <Link to="/contacto" className="footer-link">Contáctanos</Link>
          </div>

          <div className="footer-links-col">
            <span className="footer-col-title">Legal</span>
            <Link to="/terminos" className="footer-link">Términos y condiciones</Link>
            <Link to="/privacidad" className="footer-link">Política de privacidad</Link>
          </div>

        </div>
      </div>

      {/* Barra inferior */}
      <div className="footer-bottom">
        <div className="footer-bottom-inner">
          <span className="footer-copy">© 2026 Herrsoft. Todos los derechos reservados.</span>
          <div className="footer-legal-links">
            <Link to="/terminos" className="footer-legal-link">Términos de Uso</Link>
            <span className="footer-legal-sep">·</span>
            <Link to="/privacidad" className="footer-legal-link">Privacidad</Link>
          </div>
          <span className="footer-made">Hecho en México 🇲🇽</span>
        </div>
      </div>

    </footer>
  );
}
