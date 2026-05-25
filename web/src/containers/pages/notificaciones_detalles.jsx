import React, { useEffect, useMemo, useState } from "react";
import "../../assets/css/notificationDetail.css";
import { useNavigate, useParams } from "react-router-dom";
import { actionNotificacionesGetById } from "../../redux/actions/notificaciones/notificaciones";
import { useDispatch } from "react-redux";
import { usePermisos } from "../../context/PermisosContext";

const ACTION_LABEL = { CREATE: "Creado", UPDATE: "Actualizado", DELETE: "Eliminado", VIEW: "Visto" };
const MODULE_LABEL = { 2: "Eventos", 4: "Paquetes", 5: "Trabajadores", 6: "Inventario", 7: "Gastos" };

// Mapa de id_modulo → función que construye la ruta al registro
const MODULE_ROUTE = {
  1: (idKey) => idKey ? `/app/materias/laboral/centro-conciliacion/${idKey}` : `/app/materias/laboral/centro-conciliacion`,
  2: (idKey) => idKey ? `/app/eventos/${idKey}` : `/app/eventos`,
  3: (idKey) => idKey ? `/app/sesiones/${idKey}` : `/app/sesiones`,
  4: (idKey) => idKey ? `/app/paquetes/${idKey}` : `/app/paquetes`,
  5: (idKey) => idKey ? `/app/trabajadores/${idKey}` : `/app/trabajadores`,
  6: (idKey) => idKey ? `/app/inventario/equipo/${idKey}` : `/app/inventario`,
  7: (idKey) => `/app/usuarios`,
};

function NotificationDetail() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { idNotificacion } = useParams();
  const { perm } = usePermisos() || { perm: () => true };
  const canConsultar = perm("notificaciones", "consultar");

  const [notificacion, setNotificacion] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchNotificacion = async () => {
      try {
        setLoading(true);
        const resp = await dispatch(actionNotificacionesGetById(idNotificacion));
        if (mounted) setNotificacion(resp || null);
      } catch {
        if (mounted) setNotificacion(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    if (idNotificacion) fetchNotificacion();
    return () => { mounted = false; };
  }, [dispatch, idNotificacion]);

  const fechaFormateada = useMemo(() => {
    const raw = notificacion?.datetime;
    if (!raw) return "-";
    const fecha = new Date(raw);
    if (Number.isNaN(fecha.getTime())) return raw;
    return fecha.toLocaleString("es-MX", {
      day: "numeric", month: "numeric", year: "numeric",
      hour: "numeric", minute: "2-digit", second: "2-digit",
    });
  }, [notificacion]);

  const changesData = useMemo(() => {
    const raw = notificacion?.changes;
    if (!raw) return null;
    if (typeof raw === "object") return raw;
    try { return JSON.parse(raw); } catch { return raw; }
  }, [notificacion]);

  const tituloNotificacion = notificacion?.action
    ? (ACTION_LABEL[notificacion.action] || notificacion.action)
    : "Sin tipo";
  const descripcionNotificacion = notificacion?.message || "Sin descripción disponible.";
  const nombreModulo = notificacion?.id_modulo
    ? (MODULE_LABEL[notificacion.id_modulo] || `Módulo ${notificacion.id_modulo}`)
    : "Sin módulo";
  const nombreUsuario = notificacion?.user_name || `Usuario ${notificacion?.id_user || "?"}`;
  const idVisual = notificacion?.id_audit_log
    ? `#AUD-${String(notificacion.id_audit_log).padStart(4, "0")}`
    : "-";

  const handleIrAlRegistro = () => {
    const idModulo = notificacion?.id_modulo;
    const idKey = notificacion?.id_key;
    const routeFn = MODULE_ROUTE[idModulo];
    if (routeFn) {
      navigate(routeFn(idKey));
    }
  };

  const tieneRuta = notificacion?.id_modulo && MODULE_ROUTE[notificacion.id_modulo];

  return (
    <div className="notification-page">
      <div className="layout">
        <main className="main-content">
          <div className="detail-content-wrapper">
            <div className="back-link-row">
              <button
                type="button"
                onClick={() => navigate("/app/notificaciones")}
                className="back-link btn"
              >
                <svg className="back-link-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
                <span>Regresar</span>
              </button>
            </div>

            <div className="page-header">
              <h1>Detalle de Notificación</h1>
              <p>Actividad registrada en el sistema HerrSoft Events</p>
            </div>

            <section className="notification-detail-card">
              <div className="card-topbar">
                <div className="card-topbar-left">
                  <span className="module-chip">{nombreModulo}</span>
                  <span className="notification-id">ID Notificación: {idVisual}</span>
                </div>

                <div className="card-topbar-right">
                  <div className="date-block">
                    <svg className="date-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
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
                    <h4>Cambios Registrados</h4>
                    <div className="read-by-list">
                      {changesData ? (
                        typeof changesData === "string" ? (
                          <span className="read-pill">{changesData}</span>
                        ) : (
                          Object.entries(changesData).map(([k, v]) => (
                            <span className="read-pill" key={k}>
                              <div className="read-dot" />
                              <strong>{k}:</strong>&nbsp;
                              {typeof v === "object" ? JSON.stringify(v) : String(v)}
                            </span>
                          ))
                        )
                      ) : (
                        <span className="read-pill more">Sin cambios detallados</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="description-box">
                  <h4>Descripción detallada</h4>
                  <p>{descripcionNotificacion}</p>
                </div>

                <div className="actions-row">
                  {tieneRuta && (
                    <button className="primary-btn" type="button" onClick={handleIrAlRegistro}>
                      <span>Ir al registro</span>
                      <svg className="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          d="M14 5l7 7m0 0l-7 7m7-7H3"
                          strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                        />
                      </svg>
                    </button>
                  )}

                  <button
                    className="secondary-btn"
                    type="button"
                    onClick={() => navigate("/app/notificaciones")}
                  >
                    <svg className="share-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        d="M15 19l-7-7 7-7"
                        strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                      />
                    </svg>
                    Volver al listado
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
