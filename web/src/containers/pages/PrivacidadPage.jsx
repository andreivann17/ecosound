import React from "react";
import "../../assets/css/PrivacidadPage.css";

const SECCIONES = [
  {
    id: "responsable",
    titulo: "Responsable del tratamiento de datos",
    cuerpo: (
      <p>
        <strong>HERRSOFT</strong>, con domicilio en San Luis Río Colorado, Sonora, México,
        es responsable del tratamiento de sus datos personales recabados a través del sitio{" "}
        <strong>herrsoft.com</strong> y del sistema <strong>Herrsoft Events</strong>.
      </p>
    ),
  },
  {
    id: "datos",
    titulo: "Datos personales que recabamos",
    cuerpo: (
      <>
        <p>
          Recabamos los siguientes datos personales directamente de usted al momento de crear
          su cuenta o contratar nuestros servicios:
        </p>
        <ul className="privacidad-data-list">
          <li>Nombre completo</li>
          <li>Correo electrónico</li>
          <li>Nombre de su empresa o negocio</li>
          <li>Datos de método de pago</li>
        </ul>
        <div className="privacidad-highlight">
          <p>
            Los datos de tarjeta de crédito o débito son procesados directamente por{" "}
            <strong>Stripe, Inc.</strong> y no son almacenados en nuestros servidores.
          </p>
        </div>
      </>
    ),
  },
  {
    id: "finalidades",
    titulo: "Finalidades del tratamiento",
    cuerpo: (
      <>
        <p>Sus datos personales son utilizados para:</p>
        <ul className="privacidad-data-list">
          <li>Crear y administrar su cuenta en Herrsoft Events</li>
          <li>Procesar los cobros de su suscripción</li>
          <li>Enviarle avisos relacionados con su cuenta (renovaciones, cobros y actualizaciones del servicio)</li>
          <li>Brindarle soporte técnico</li>
          <li>Cumplir con obligaciones legales aplicables</li>
        </ul>
        <p style={{ marginTop: 12 }}>
          De manera secundaria, y solo si usted lo autorizó expresamente al momento del
          registro, también utilizamos su correo para enviarle comunicaciones sobre novedades,
          promociones y actualizaciones de Herrsoft. Puede revocar esta autorización en cualquier
          momento escribiéndonos a{" "}
          <a href="mailto:soporte@herrsoft.com" className="privacidad-email-link">
            soporte@herrsoft.com
          </a>
          .
        </p>
      </>
    ),
  },
  {
    id: "transferencia",
    titulo: "Transferencia de datos",
    cuerpo: (
      <>
        <p>
          Sus datos personales no serán compartidos con terceros, salvo en los siguientes casos:
        </p>
        <ul className="privacidad-data-list">
          <li>
            <strong>Stripe, Inc.</strong> para el procesamiento de pagos
          </li>
          <li>Autoridades competentes cuando sea requerido por ley</li>
          <li>
            Proveedores de infraestructura tecnológica estrictamente necesarios para la operación
            del servicio, quienes están obligados contractualmente a mantener la confidencialidad
            de sus datos
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "arco",
    titulo: "Derechos ARCO",
    cuerpo: (
      <>
        <p>Usted tiene derecho a:</p>
        <ul className="privacidad-data-list">
          <li><strong>Acceder</strong> a sus datos personales</li>
          <li><strong>Rectificarlos</strong> si son incorrectos</li>
          <li><strong>Cancelar</strong> su tratamiento</li>
          <li><strong>Oponerse</strong> al uso de sus datos para finalidades secundarias</li>
        </ul>
        <div className="privacidad-highlight">
          <p>
            Para ejercer cualquiera de estos derechos, envíe un correo a{" "}
            <a href="mailto:soporte@herrsoft.com" className="privacidad-email-link">
              soporte@herrsoft.com
            </a>{" "}
            indicando su nombre completo, correo registrado y el derecho que desea ejercer.
            Responderemos en un plazo máximo de <strong>20 días hábiles</strong>.
          </p>
        </div>
      </>
    ),
  },
  {
    id: "cookies",
    titulo: "Cookies y tecnologías de rastreo",
    cuerpo: (
      <p>
        Nuestro sitio web puede utilizar cookies propias para mantener su sesión activa y mejorar
        su experiencia de navegación. No utilizamos cookies de terceros con fines publicitarios.
      </p>
    ),
  },
  {
    id: "cambios",
    titulo: "Cambios a este aviso",
    cuerpo: (
      <p>
        Herrsoft se reserva el derecho de modificar este aviso de privacidad en cualquier momento.
        Cualquier cambio será publicado en esta página con la fecha de actualización correspondiente.
        El uso continuado del servicio después de dicha publicación implica la aceptación de los cambios.
      </p>
    ),
  },
  {
    id: "contacto",
    titulo: "Contacto",
    cuerpo: (
      <p>
        Para cualquier duda relacionada con el tratamiento de sus datos personales, puede
        contactarnos en{" "}
        <a href="mailto:soporte@herrsoft.com" className="privacidad-email-link">
          soporte@herrsoft.com
        </a>
        .
      </p>
    ),
  },
];

export default function PrivacidadPage() {
  return (
    <div className="privacidad-root">

      {/* ===== HERO ===== */}
      <section className="privacidad-hero">
        <span className="privacidad-hero-badge">Legal</span>
        <h1 className="privacidad-hero-title">Aviso de Privacidad</h1>
        <p className="privacidad-hero-sub">
          Herrsoft — herrsoft.com &nbsp;·&nbsp; Última actualización: junio 2025
        </p>
      </section>

      {/* ===== BODY ===== */}
      <div className="privacidad-body">

        {/* Tabla de contenidos */}
        <nav className="privacidad-index">
          <p className="privacidad-index-title">Contenido</p>
          <ol className="privacidad-index-list">
            {SECCIONES.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`}>
                  {i + 1}. {s.titulo}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {/* Secciones */}
        {SECCIONES.map((s, i) => (
          <React.Fragment key={s.id}>
            <section id={s.id} className="privacidad-section">
              <div className="privacidad-section-header">
                <span className="privacidad-section-num">{i + 1}</span>
                <h2 className="privacidad-section-title">{s.titulo}</h2>
              </div>
              <div className="privacidad-section-body">{s.cuerpo}</div>
            </section>
            {i < SECCIONES.length - 1 && <hr className="privacidad-divider" />}
          </React.Fragment>
        ))}

        {/* Nota final */}
        <div className="privacidad-footer-note">
          <p>
            Este aviso de privacidad fue elaborado conforme a lo establecido en la{" "}
            <strong>Ley Federal de Protección de Datos Personales en Posesión de los Particulares</strong>{" "}
            y demás normatividad aplicable en México.
          </p>
        </div>

      </div>
    </div>
  );
}
