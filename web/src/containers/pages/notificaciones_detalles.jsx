import React, { useEffect, useMemo, useState } from "react";
import "../../assets/css/notificationDetail.css";
import { useNavigate, useParams } from "react-router-dom";
import { actionNotificacionesGetById } from "../../redux/actions/notificaciones/notificaciones";
import { useDispatch } from "react-redux";

function NotificationDetail() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { idNotificacion } = useParams();

  const [notificacion, setNotificacion] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchNotificacion = async () => {
      try {
        setLoading(true);
        const resp = await dispatch(actionNotificacionesGetById(idNotificacion));

        if (mounted) {
          setNotificacion(resp || null);
        }
      } catch (error) {
        console.error("Error al obtener notificación:", error);
        if (mounted) {
          setNotificacion(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    if (idNotificacion) {
      fetchNotificacion();
    }

    return () => {
      mounted = false;
    };
  }, [dispatch, idNotificacion]);

  const fechaFormateada = useMemo(() => {
    if (!notificacion?.fecha_notificacion) return "-";

    const fecha = new Date(notificacion.fecha_notificacion);
    if (Number.isNaN(fecha.getTime())) return notificacion.fecha_notificacion;

    return fecha.toLocaleString("es-MX", {
      day: "numeric",
      month: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
    });
  }, [notificacion]);

  const usuariosLeyeron = useMemo(() => {
    if (!Array.isArray(notificacion?.usuarios_leyeron)) return [];
    return notificacion.usuarios_leyeron;
  }, [notificacion]);

  const tituloNotificacion = useMemo(() => {
    return notificacion?.nombre_tipo_notificacion || "Sin título";
  }, [notificacion]);

  const descripcionNotificacion = useMemo(() => {
    return notificacion?.descripcion || "Sin descripción disponible.";
  }, [notificacion]);

  const nombreModulo = useMemo(() => {
    return notificacion?.nombre_modulo || "Sin módulo";
  }, [notificacion]);

  const nombreUsuario = useMemo(() => {
    return notificacion?.nombre_usuario || "Usuario desconocido";
  }, [notificacion]);

  const idVisual = useMemo(() => {
    if (!notificacion?.id) return "-";
    return `#NOT-${String(notificacion.id).padStart(4, "0")}`;
  }, [notificacion]);

  return (
    <div className="notification-page">
      <div className="layout">
        <main className="main-content">
          <div className="detail-content-wrapper">
            <div className="back-link-row">
            <button
  type="button"
  onClick={() => navigate("/notificaciones")}
  className="back-link btn"
>
                <svg
                  className="back-link-icon"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M15 19l-7-7 7-7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
                <span>Regresar</span>
              </button>
            </div>

            <div className="page-header">
              <h1>Detalle de Notificación</h1>
              <p>Gestión integral de avisos procesales y términos legales</p>
            </div>

            <section className="notification-detail-card">
              <div className="card-topbar">
                <div className="card-topbar-left">
                  <span className="module-chip">{nombreModulo}</span>
                  <span className="notification-id">
                    ID Notificación: {idVisual}
                  </span>
                </div>

                <div className="card-topbar-right">
                  <div className="date-block">
                    <svg
                      className="date-icon"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                      />
                    </svg>
                    <span>{fechaFormateada}</span>
                  </div>
                </div>
              </div>

              <div className="card-body">
                <div className="notification-heading">
                  <h2>{tituloNotificacion}</h2>
                  <p>
                    {loading
                      ? "Cargando información de la notificación..."
                      : descripcionNotificacion}
                  </p>
                </div>

                <div className="info-grid">
                  <div className="info-section">
                    <h4>Información del Emisor</h4>

                    <div className="issuer-row">
                      <div className="issuer-avatar">
                        <svg fill="currentColor" viewBox="0 0 20 20">
                          <path
                            clipRule="evenodd"
                            fillRule="evenodd"
                            d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                          />
                        </svg>
                      </div>

                      <div>
                        <p className="issuer-name">{nombreUsuario}</p>
                        <p className="issuer-role">{nombreModulo}</p>
                      </div>
                    </div>
                  </div>

                  <div className="info-section">
                    <h4>Leído por</h4>

                    <div className="read-by-list">
                      {usuariosLeyeron.length > 0 ? (
                        usuariosLeyeron.map((usuario) => (
                          <span
                            className="read-pill"
                            key={`${usuario.id_user}-${usuario.nombre}`}
                          >
                            <div className="read-dot" />
                            {usuario.nombre}
                          </span>
                        ))
                      ) : (
                        <span className="read-pill more">Sin lecturas registradas</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="description-box">
                  <h4>Descripción detallada</h4>
                  <p>{descripcionNotificacion}</p>
                </div>

                <div className="actions-row">
                  <button className="primary-btn" type="button">
                    <span>Ir al expediente</span>
                    <svg
                      className="action-icon"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M14 5l7 7m0 0l-7 7m7-7H3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                      />
                    </svg>
                  </button>

                  <button className="secondary-btn" type="button">
                    <svg
                      className="share-icon"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                      />
                    </svg>
                    Compartir
                  </button>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

export default NotificationDetail;