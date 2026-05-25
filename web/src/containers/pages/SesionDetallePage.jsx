import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import "dayjs/locale/es";
import {
  apiSesionesInstance,
  authHeaderSesiones,
} from "../../redux/actions/sesiones_fotos/sesiones_fotos";

import { Button, Modal, Spin, Empty, notification } from "antd";
import {
  ArrowLeftOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  HistoryOutlined,
} from "@ant-design/icons";

import "./EventoDetallePage.css";

dayjs.locale("es");

const fmtFecha = (v) => {
  if (!v) return "—";
  const d = dayjs(v);
  return d.isValid() ? d.format("D [de] MMMM [del] YYYY") : "—";
};

const fmtHora = (v) => {
  if (!v) return "—";
  const d = dayjs(v);
  return d.isValid() ? d.format("HH:mm") : "—";
};

const fmtFechaCorta = (v) => {
  if (!v) return "—";
  const d = dayjs(v);
  return d.isValid() ? d.format("D MMM YYYY") : "—";
};

const fmtDatetime = (v) => {
  if (!v) return "—";
  const d = dayjs(v);
  return d.isValid() ? d.format("DD/MM/YYYY, HH:mm") : "—";
};

const ACTION_CONFIG = {
  CREATE: { label: "Creación",     color: "#15803d", bg: "#dcfce7" },
  UPDATE: { label: "Actualización", color: "#1d4ed8", bg: "#dbeafe" },
  DELETE: { label: "Eliminación",  color: "#b91c1c", bg: "#fee2e2" },
};
const getActionConfig = (action) =>
  ACTION_CONFIG[action] || { label: action, color: "#595c5e", bg: "#f1f5f9" };

export default function SesionDetallePage() {
  const { idSesion } = useParams();
  const navigate = useNavigate();

  const [sesion, setSesion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState("datos");
  const [actividad, setActividad] = useState([]);
  const [loadingActividad, setLoadingActividad] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    apiSesionesInstance
      .get(`/sesiones-fotos/${idSesion}`, { headers: authHeaderSesiones() })
      .then(({ data }) => { if (mounted) setSesion(data); })
      .catch(() => notification.error({ message: "No se pudo cargar la sesión" }))
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [idSesion]);

  const fetchActividad = useCallback(async () => {
    setLoadingActividad(true);
    try {
      const { data } = await apiSesionesInstance.get(
        `/sesiones-fotos/${idSesion}/actividad`,
        { headers: authHeaderSesiones() }
      );
      setActividad(Array.isArray(data) ? data : data.items ?? []);
    } catch {
      setActividad([]);
    } finally {
      setLoadingActividad(false);
    }
  }, [idSesion]);

  useEffect(() => {
    if (activeTab === "actividad") fetchActividad();
  }, [activeTab, fetchActividad]);

  const handleDelete = () => {
    Modal.confirm({
      title: "Eliminar sesión",
      content: "¿Eliminar esta sesión de fotos? Esta acción no se puede deshacer.",
      okText: "Eliminar",
      okType: "danger",
      cancelText: "Cancelar",
      centered: true,
      onOk: async () => {
        try {
          setDeleting(true);
          await apiSesionesInstance.delete(`/sesiones-fotos/${idSesion}`, {
            headers: authHeaderSesiones(),
          });
          notification.success({ message: "Sesión eliminada" });
          navigate("/app/sesiones");
        } catch (err) {
          notification.error({
            message: "Error al eliminar",
            description: err?.response?.data?.detail || err.message,
          });
        } finally {
          setDeleting(false);
        }
      },
    });
  };

  if (loading) {
    return (
      <div className="cd-main">
        <div className="cd-content">
          <div className="cd-loading-wrap"><Spin size="large" /></div>
        </div>
      </div>
    );
  }

  if (!sesion) return null;

  const today = dayjs().startOf("day");
  const esProgramada = sesion.fecha_sesion && !dayjs(sesion.fecha_sesion).isBefore(today);
  const statusLabel = esProgramada ? "PROGRAMADA" : "REALIZADA";
  const statusCls = esProgramada ? "cd-status-active" : "cd-status-inactive";
  const dotCls = esProgramada ? "cd-dot-active" : "cd-dot-inactive";

  return (
    <div className="cd-main">
      <div className="cd-content">

        <Button
          type="link"
          icon={<ArrowLeftOutlined />}
          className="cd-back-btn"
          onClick={() => navigate("/app/sesiones")}
        >
          Volver a Sesiones
        </Button>

        <div className="cd-header-card">
          <div className="cd-header-top">
            <div>
              <div className="cd-header-name-row">
                <h1 className="cd-client-name">
                  {(sesion.nombre_cliente || "—").toUpperCase()}
                </h1>
                <span className={`cd-status-badge ${statusCls}`}>
                  <span className={`cd-status-dot ${dotCls}`} />
                  {statusLabel}
                </span>
              </div>
              <div className="cd-header-meta">
                {sesion.fecha_sesion && (
                  <span className="cd-meta-item">
                    <CalendarOutlined />
                    {fmtFechaCorta(sesion.fecha_sesion)}
                  </span>
                )}
              </div>
            </div>

            <div className="cd-header-actions">
              <Button
                icon={<EditOutlined />}
                className="cd-btn-edit"
                onClick={() => navigate(`/app/sesiones/${sesion.id_sesion}/editar`, { state: { sesion } })}
              >
                Editar
              </Button>
              <Button
                icon={<DeleteOutlined />}
                className="cd-btn-delete"
                loading={deleting}
                onClick={handleDelete}
              >
                Eliminar
              </Button>
            </div>
          </div>

          <div className="cd-header-tabs">
            <button
              className={`cd-tab-btn ${activeTab === "datos" ? "cd-tab-btn-active" : ""}`}
              onClick={() => setActiveTab("datos")}
            >
              <FileTextOutlined />
              Datos de la sesión
            </button>
            <button
              className={`cd-tab-btn ${activeTab === "actividad" ? "cd-tab-btn-active" : ""}`}
              onClick={() => setActiveTab("actividad")}
            >
              <HistoryOutlined />
              Actividad
              {actividad.length > 0 && (
                <span className="cd-actividad-count">{actividad.length}</span>
              )}
            </button>
          </div>
        </div>

        {activeTab === "datos" && (
          <div className="cd-bento-grid">
            <div className="cd-card cd-card-client">
              <div className="cd-card-header">
                <div className="cd-card-icon-wrap"><UserOutlined /></div>
                <h2 className="cd-card-title">Datos del cliente</h2>
              </div>
              <div className="cd-client-fields">
                <div>
                  <span className="cd-field-label">Nombre del cliente</span>
                  <span className="cd-field-value">{sesion.nombre_cliente || "—"}</span>
                </div>
                {sesion.comentarios && (
                  <div>
                    <span className="cd-field-label">Comentarios</span>
                    <span className="cd-field-value cd-field-value-muted" style={{ fontStyle: "italic" }}>
                      {sesion.comentarios}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="cd-card cd-card-event">
              <div className="cd-card-header">
                <div className="cd-card-icon-wrap"><CalendarOutlined /></div>
                <h2 className="cd-card-title">Datos de la sesión</h2>
              </div>
              <div className="cd-event-grid">
                <div>
                  <span className="cd-field-label">Ubicación</span>
                  <div className="cd-field-icon-row">
                    <EnvironmentOutlined className="cd-field-row-icon" />
                    <span className="cd-field-value">
                      {[sesion.nombre_ciudad, sesion.lugar].filter(Boolean).join(" - ") || "—"}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="cd-field-label">Fecha</span>
                  <div className="cd-field-icon-row">
                    <CalendarOutlined className="cd-field-row-icon" />
                    <span className="cd-field-value">{fmtFecha(sesion.fecha_sesion)}</span>
                  </div>
                </div>
                <div>
                  <span className="cd-field-label">Hora</span>
                  <div className="cd-field-icon-row">
                    <ClockCircleOutlined className="cd-field-row-icon" />
                    <span className="cd-field-value">{fmtHora(sesion.fecha_sesion)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "actividad" && (
          <div className="cd-card">
            <div className="cd-card-header">
              <div className="cd-card-icon-wrap"><HistoryOutlined /></div>
              <h2 className="cd-card-title">
                Actividad de la sesión
                {actividad.length > 0 && (
                  <span className="cd-actividad-count">{actividad.length}</span>
                )}
              </h2>
            </div>

            {loadingActividad ? (
              <div className="cd-loading-wrap"><Spin size="large" /></div>
            ) : actividad.length === 0 ? (
              <Empty description="Sin actividad registrada aún" style={{ margin: "40px 0" }} />
            ) : (
              <div className="cd-actividad-list">
                {actividad.map((item, idx) => {
                  const cfg = getActionConfig(item.action);
                  return (
                    <div key={item.id_audit_log || idx} className="cd-actividad-item">
                      <div className="cd-actividad-dot-col">
                        <div className="cd-actividad-dot" style={{ background: cfg.color }} />
                        {idx < actividad.length - 1 && <div className="cd-actividad-line" />}
                      </div>
                      <div className="cd-actividad-body">
                        <div className="cd-actividad-top-row">
                          <span className="cd-actividad-badge" style={{ color: cfg.color, background: cfg.bg }}>
                            {cfg.label}
                          </span>
                          <span className="cd-actividad-message">{item.message}</span>
                        </div>
                        <div className="cd-actividad-bottom-row">
                          <span className="cd-actividad-time">{fmtDatetime(item.datetime)}</span>
                          {item.user_name && (
                            <div className="cd-actividad-user">
                              <span>{item.user_name}</span>
                              {item.user_email && (
                                <span className="cd-actividad-email">{item.user_email}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
