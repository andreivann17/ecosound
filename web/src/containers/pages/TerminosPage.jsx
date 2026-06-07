import React from "react";
import { Link } from "react-router-dom";
import "../../assets/css/LandingPage.css";
import "../../assets/css/TerminosPage.css";

const CLAUSULAS = [
  {
    num: 1,
    titulo: "Servicio contratado",
    texto: "Herrsoft Events es un sistema de gestión de eventos y servicios de sonido en modalidad SaaS, accesible vía navegador web o aplicación de escritorio. El acceso es inmediato tras la activación de la cuenta.",
  },
  {
    num: 2,
    titulo: "Período de prueba",
    texto: "Todo nuevo cliente recibe un período de prueba gratuito conforme al plan contratado: 30 días para el Plan Mensual y 60 días para el Plan Anual. Durante este período no se realizará ningún cargo. Al concluir el período de prueba, se efectuará automáticamente el primer cobro según el plan seleccionado.",
  },
  {
    num: 3,
    titulo: "Política de cobro y cancelación",
    texto: "Al proporcionar sus datos de tarjeta, usted autoriza expresamente a HERRSOFT a realizar cobros recurrentes conforme al plan contratado. El período contratado, ya sea mensual o anual, se cobra en su totalidad una vez iniciado, sin reembolso proporcional por cancelación anticipada. Si cancela su suscripción, conservará acceso al sistema hasta el fin del período ya cobrado, pero no se realizarán cargos futuros.",
  },
  {
    num: 4,
    titulo: "Renovación automática",
    texto: "La suscripción se renueva automáticamente al inicio de cada nuevo período con cargo a la tarjeta registrada. Se enviará un aviso por correo electrónico con al menos 3 días de anticipación antes de cada cobro. Usted puede cancelar en cualquier momento desde su panel de cuenta o contactando a soporte.",
  },
  {
    num: 5,
    titulo: "Cobro fallido",
    texto: "En caso de que un cobro no pueda procesarse, HERRSOFT notificará al cliente por correo electrónico. Se realizarán hasta 3 intentos de cobro en un período de 7 días. Si ningún intento es exitoso, el acceso al sistema podrá ser suspendido hasta regularizar el pago.",
  },
  {
    num: 6,
    titulo: "Datos de tarjeta",
    texto: "HERRSOFT no almacena datos de tarjeta de crédito o débito en sus servidores. El procesamiento de pagos es realizado por Stripe, Inc. bajo sus propios estándares de seguridad PCI-DSS. Para más información consulte la política de privacidad de Stripe en stripe.com.",
  },
  {
    num: 7,
    titulo: "Modificaciones al servicio y precios",
    texto: "HERRSOFT se reserva el derecho de modificar las tarifas del servicio con un aviso mínimo de 30 días por correo electrónico. El cliente podrá cancelar su suscripción sin penalización si no acepta los nuevos términos antes de la fecha de entrada en vigor.",
  },
  {
    num: 8,
    titulo: "Soporte",
    texto: "El soporte incluido cubre dudas de uso del sistema, reportes de errores y asistencia general, disponible vía WhatsApp y correo electrónico en días hábiles. No incluye desarrollo de funcionalidades adicionales ni personalizaciones fuera del sistema estándar.",
  },
  {
    num: 9,
    titulo: "Limitación de responsabilidad",
    texto: "HERRSOFT no será responsable por pérdidas económicas, daños indirectos o lucro cesante derivados del uso o imposibilidad de uso del sistema. La responsabilidad máxima de HERRSOFT ante el cliente se limita al monto del último cobro realizado.",
  },
  {
    num: 10,
    titulo: "Disponibilidad del servicio",
    parrafos: [
      "HERRSOFT realizará sus mejores esfuerzos para mantener el sistema disponible de manera continua. Sin embargo, no se garantiza una disponibilidad del 100% y no se asume responsabilidad por interrupciones temporales derivadas de mantenimiento programado, actualizaciones del sistema, fallas de infraestructura, ataques informáticos, fallas en servicios de terceros, causas de fuerza mayor o cualquier otro factor fuera del control razonable de HERRSOFT.",
      "En caso de interrupción del servicio igual o mayor a 72 horas continuas debidamente documentada, el cliente podrá solicitar una compensación proporcional equivalente a los días sin servicio, descontada del siguiente cobro. Dicha solicitud deberá realizarse dentro de los 15 días naturales siguientes a la interrupción escribiendo a soporte@herrsoft.com.",
      "Las interrupciones menores a 72 horas no generan derecho a compensación o reembolso de ningún tipo.",
    ],
  },
  {
    num: 11,
    titulo: "Jurisdicción",
    texto: "Este contrato se rige por las leyes vigentes en los Estados Unidos Mexicanos. Para cualquier controversia, las partes se someten a la jurisdicción de los tribunales competentes de San Luis Río Colorado, Sonora, México, renunciando a cualquier otro fuero que pudiera corresponderles.",
  },
];

export default function TerminosPage() {
  return (
    <div className="terminos-root">

      {/* HERO */}
      <section className="terminos-hero">
        <span className="landing-features-badge">Legal</span>
        <h1 className="terminos-hero-title">Términos de Uso</h1>
        <p className="terminos-hero-meta">
          Herrsoft Events &nbsp;·&nbsp; herrsoft.com &nbsp;·&nbsp;{" "}
          <span className="terminos-fecha">Última actualización: junio 2025</span>
        </p>
        <p className="terminos-hero-aviso">
          Al marcar <strong>"Estoy de acuerdo"</strong> durante el proceso de registro,
          usted acepta todos los términos aquí descritos.
        </p>
      </section>

      {/* CUERPO */}
      <section className="terminos-body">
        <div className="terminos-inner">

          {/* índice */}
          <nav className="terminos-indice">
            <p className="terminos-indice-titulo">Contenido</p>
            <ol className="terminos-indice-lista">
              {CLAUSULAS.map(({ num, titulo }) => (
                <li key={num}>
                  <a href={`#clausula-${num}`} className="terminos-indice-link">
                    {num}. {titulo}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          {/* cláusulas */}
          <div className="terminos-clausulas">
            {CLAUSULAS.map(({ num, titulo, texto, parrafos }) => (
              <div key={num} id={`clausula-${num}`} className="terminos-clausula">
                <div className="terminos-clausula-header">
                  <span className="terminos-clausula-num">{num}</span>
                  <h2 className="terminos-clausula-titulo">{titulo}</h2>
                </div>
                <div className="terminos-clausula-body">
                  {parrafos
                    ? parrafos.map((p, i) => <p key={i}>{p}</p>)
                    : <p>{texto}</p>
                  }
                </div>
              </div>
            ))}

            {/* Contacto */}
            <div className="terminos-contacto">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              <div>
                <p className="terminos-contacto-label">¿Dudas sobre estos términos? Contáctanos antes de contratar:</p>
                <a href="mailto:soporte@herrsoft.com" className="terminos-contacto-email">
                  soporte@herrsoft.com
                </a>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* CTA */}
      <section className="terminos-cta">
        <div className="terminos-cta-inner">
          <h2 className="terminos-cta-title">¿Listo para comenzar?</h2>
          <p className="terminos-cta-sub">
            Inicia tu período de prueba gratuito. Sin pagos hasta que decidas continuar.
          </p>
          <Link to="/contratar" className="terminos-cta-btn">
            Ver planes y contratar
          </Link>
        </div>
      </section>

    </div>
  );
}
