import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import "dayjs/locale/es";
import {
  apiSesionesInstance,
  authHeaderSesiones,
} from "../../redux/actions/sesiones_fotos/sesiones_fotos";

import { Button, Modal, Spin, notification } from "antd";
import {
  ArrowLeftOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  CommentOutlined,
  FileTextOutlined,
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

export default function SesionDetallePage() {
  const { idSesion } = useParams();
  const navigate = useNavigate();

  const [sesion, setSesion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

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
          navigate("/sesiones");
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
          <div className="cd-loading-wrap">
            <Spin size="large" />
          </div>
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
          onClick={() => navigate("/sesiones")}
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
                onClick={() =>
                  navigate(`/sesiones/${sesion.id_sesion}/editar`, {
                    state: { sesion },
                  })
                }
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
            <button className="cd-tab-btn cd-tab-btn-active">
              <FileTextOutlined />
              Datos de la sesión
            </button>
          </div>
        </div>

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

      </div>
    </div>
  );
}
