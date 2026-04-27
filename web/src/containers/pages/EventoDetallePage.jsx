import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import "dayjs/locale/es";
import {
  apiEventosInstance,
  authHeaderEventos,
} from "../../redux/actions/eventos/eventos";

import {
  Button,
  Modal,
  Form,
  Input,
  DatePicker,
  notification,
  Spin,
  Timeline,
  Empty,
  Divider,
  Tooltip,
} from "antd";
import {
  ArrowLeftOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  PhoneOutlined,
  DollarOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  PlusOutlined,
  GiftOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  FilePdfOutlined,
  HistoryOutlined,
  FolderOpenOutlined,
  UploadOutlined,
  EyeOutlined,
  FileImageOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FileUnknownOutlined,
  LoadingOutlined,
} from "@ant-design/icons";

import "./EventoDetallePage.css";

dayjs.locale("es");

const API_BASE = `http://${window.location.hostname}:8000`;

const TIPO_EVENTO_MAP = {
  1: "Bodas",
  2: "XV",
  3: "Graduación",
  4: "Corporativo",
  5: "Cumpleaños",
  6: "Otro",
};

const CIUDAD_MAP = {
  1: "San Luis Rio Colorado",
  2: "Mexicali",
  3: "Puerto Peñasco",
};

const fmtMoney = (val) => {
  if (!val && val !== 0) return "—";
  const n = parseFloat(String(val).replace(/,/g, ""));
  if (isNaN(n)) return String(val);
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
};

const fmtFecha = (v) => {
  if (!v) return "—";
  const d = dayjs(v);
  return d.isValid() ? d.format("D [de] MMMM [del] YYYY") : "—";
};

const fmtFechaCorta = (v) => {
  if (!v) return "—";
  const d = dayjs(v);
  return d.isValid() ? d.format("D MMM YYYY") : "—";
};

const fmtHora = (v) => {
  if (!v) return "—";
  if (String(v).length <= 5) return v;
  const d = dayjs(v);
  return d.isValid() ? d.format("HH:mm") : v;
};

const fmtDatetime = (v) => {
  if (!v) return "—";
  const d = dayjs(v);
  return d.isValid() ? d.format("DD/MM/YYYY, HH:mm") : "—";
};

const parseNum = (v) => {
  const n = parseFloat(String(v || "").replace(/,/g, ""));
  return isNaN(n) ? 0 : n;
};

const getFileExt = (filename) =>
  (filename || "").split(".").pop().toLowerCase();

const getFileType = (filename) => {
  const ext = getFileExt(filename);
  if (["pdf"].includes(ext)) return "pdf";
  if (["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(ext)) return "image";
  if (["doc", "docx"].includes(ext)) return "word";
  if (["xls", "xlsx", "csv"].includes(ext)) return "excel";
  return "other";
};

const FileIcon = ({ filename, size = 24 }) => {
  const type = getFileType(filename);
  const style = { fontSize: size };
  if (type === "pdf") return <FilePdfOutlined style={{ ...style, color: "#e53e3e" }} />;
  if (type === "image") return <FileImageOutlined style={{ ...style, color: "#3182ce" }} />;
  if (type === "word") return <FileWordOutlined style={{ ...style, color: "#2b6cb0" }} />;
  if (type === "excel") return <FileExcelOutlined style={{ ...style, color: "#276749" }} />;
  return <FileUnknownOutlined style={{ ...style, color: "#718096" }} />;
};

const ACTION_CONFIG = {
  CREATE:           { label: "Creación",           color: "#15803d", bg: "#dcfce7" },
  UPDATE:           { label: "Actualización",       color: "#1d4ed8", bg: "#dbeafe" },
  DELETE:           { label: "Eliminación",         color: "#b91c1c", bg: "#fee2e2" },
  DOCUMENTO_ADD:    { label: "Documento agregado",  color: "#7c3aed", bg: "#ede9fe" },
  DOCUMENTO_DELETE: { label: "Documento eliminado", color: "#c2410c", bg: "#ffedd5" },
  ABONO_ADD:        { label: "Abono registrado",    color: "#0e7490", bg: "#cffafe" },
};

const getActionConfig = (action) =>
  ACTION_CONFIG[action] || { label: action, color: "#595c5e", bg: "#f1f5f9" };

export default function EventoDetallePage() {
  const { idEvento } = useParams();
  const navigate = useNavigate();

  const [evento, setEvento] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [pagos, setPagos] = useState([]);
  const [pagoModalOpen, setPagoModalOpen] = useState(false);
  const [savingPago, setSavingPago] = useState(false);
  const [pagoForm] = Form.useForm();
  const [activeTab, setActiveTab] = useState("datos");

  const [actividad, setActividad] = useState([]);
  const [loadingActividad, setLoadingActividad] = useState(false);

  const [eventoPdfs, setEventoPdfs] = useState([]);
  const [documentos, setDocumentos] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [viewerDoc, setViewerDoc] = useState(null);

  const pdfInputRef = useRef(null);
  const docInputRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    apiEventosInstance
      .get(`/eventos/${idEvento}`, { headers: authHeaderEventos() })
      .then(({ data }) => { if (mounted) setEvento(data); })
      .catch(() => notification.error({ message: "No se pudo cargar el evento" }))
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [idEvento]);

  const fetchPagos = useCallback(async () => {
    try {
      const { data } = await apiEventosInstance.get(
        `/eventos/${idEvento}/pagos`,
        { headers: authHeaderEventos() }
      );
      setPagos(Array.isArray(data) ? data : data.items ?? []);
    } catch {
      setPagos([]);
    }
  }, [idEvento]);

  useEffect(() => { fetchPagos(); }, [fetchPagos]);

  const fetchActividad = useCallback(async () => {
    setLoadingActividad(true);
    try {
      const { data } = await apiEventosInstance.get(
        `/eventos/${idEvento}/actividad`,
        { headers: authHeaderEventos() }
      );
      setActividad(Array.isArray(data) ? data : data.items ?? []);
    } catch {
      setActividad([]);
    } finally {
      setLoadingActividad(false);
    }
  }, [idEvento]);

  const fetchDocumentos = useCallback(async () => {
    setLoadingDocs(true);
    try {
      const { data } = await apiEventosInstance.get(
        `/eventos/${idEvento}/documentos`,
        { headers: authHeaderEventos() }
      );
      const docs = Array.isArray(data) ? data : [];
      setEventoPdfs(docs.filter((d) => d.id_tipo_documento === 1));
      setDocumentos(docs.filter((d) => d.id_tipo_documento !== 1));
    } catch {
      setEventoPdfs([]);
      setDocumentos([]);
    } finally {
      setLoadingDocs(false);
    }
  }, [idEvento]);

  useEffect(() => {
    if (activeTab === "actividad") fetchActividad();
    if (activeTab === "evento-pdf" || activeTab === "documentos") fetchDocumentos();
  }, [activeTab, fetchActividad, fetchDocumentos]);

  const handleDelete = () => {
    Modal.confirm({
      title: "Eliminar evento",
      content: "El evento se marcará como inactivo. Esta acción se puede revertir.",
      okText: "Eliminar",
      okType: "danger",
      cancelText: "Cancelar",
      centered: true,
      onOk: async () => {
        try {
          setDeleting(true);
          await apiEventosInstance.delete(`/eventos/${idEvento}`, {
            headers: authHeaderEventos(),
          });
          notification.success({ message: "Evento eliminado" });
          navigate("/eventos");
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

  const handleDeleteAbono = (pago) => {
    Modal.confirm({
      title: "Eliminar abono",
      content: `¿Eliminar el abono de ${fmtMoney(pago.monto)}? Esta acción no se puede deshacer.`,
      okText: "Eliminar",
      okType: "danger",
      cancelText: "Cancelar",
      centered: true,
      onOk: async () => {
        try {
          await apiEventosInstance.delete(
            `/eventos/${idEvento}/pagos/${pago.id || pago.id_pago}`,
            { headers: authHeaderEventos() }
          );
          notification.success({ message: "Abono eliminado" });
          fetchPagos();
        } catch (err) {
          notification.error({
            message: "Error al eliminar abono",
            description: err?.response?.data?.detail || err.message,
          });
        }
      },
    });
  };

  const handleAddPago = async () => {
    let values;
    try { values = await pagoForm.validateFields(); } catch { return; }
    setSavingPago(true);
    try {
      await apiEventosInstance.post(
        `/eventos/${idEvento}/pagos`,
        {
          monto: String(values.monto),
          fecha: dayjs(values.fecha).format("YYYY-MM-DDTHH:mm:ss"),
          descripcion: values.descripcion?.trim() || null,
        },
        { headers: authHeaderEventos() }
      );
      notification.success({ message: "Abono registrado exitosamente" });
      pagoForm.resetFields();
      setPagoModalOpen(false);
      fetchPagos();
    } catch (err) {
      notification.error({
        message: "Error al guardar abono",
        description: err?.response?.data?.detail || err.message,
      });
    } finally {
      setSavingPago(false);
    }
  };

  const handleUploadPdf = async (file) => {
    if (!file) return;
    if (getFileType(file.name) !== "pdf") {
      notification.error({ message: "Solo se permiten archivos PDF para el evento" });
      return;
    }
    setUploadingPdf(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      await apiEventosInstance.post(
        `/eventos/${idEvento}/documentos?id_tipo_documento=1`,
        fd,
        { headers: { ...authHeaderEventos(), "Content-Type": "multipart/form-data" } }
      );
      notification.success({ message: "Evento PDF subido correctamente" });
      fetchDocumentos();
    } catch (err) {
      notification.error({
        message: "Error al subir el PDF",
        description: err?.response?.data?.detail || err.message,
      });
    } finally {
      setUploadingPdf(false);
      if (pdfInputRef.current) pdfInputRef.current.value = "";
    }
  };

  const handleUploadDoc = async (file) => {
    if (!file) return;
    setUploadingDoc(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      await apiEventosInstance.post(
        `/eventos/${idEvento}/documentos?id_tipo_documento=2`,
        fd,
        { headers: { ...authHeaderEventos(), "Content-Type": "multipart/form-data" } }
      );
      notification.success({ message: "Documento subido correctamente" });
      fetchDocumentos();
    } catch (err) {
      notification.error({
        message: "Error al subir el documento",
        description: err?.response?.data?.detail || err.message,
      });
    } finally {
      setUploadingDoc(false);
      if (docInputRef.current) docInputRef.current.value = "";
    }
  };

  const handleDeleteDoc = (doc) => {
    Modal.confirm({
      title: "Eliminar documento",
      content: `¿Eliminar "${doc.filename}"? Esta acción es reversible.`,
      okText: "Eliminar",
      okType: "danger",
      cancelText: "Cancelar",
      centered: true,
      onOk: async () => {
        try {
          await apiEventosInstance.delete(
            `/eventos/${idEvento}/documentos/${doc.id}`,
            { headers: authHeaderEventos() }
          );
          notification.success({ message: "Documento eliminado" });
          fetchDocumentos();
        } catch (err) {
          notification.error({
            message: "Error al eliminar",
            description: err?.response?.data?.detail || err.message,
          });
        }
      },
    });
  };

  const getDocUrl = (doc) => `${API_BASE}/${doc.path}`;

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

  if (!evento) return null;

  const totalPagosAdicionales = pagos.reduce((a, p) => a + parseNum(p.monto), 0);
  const resta = (() => {
    if (!evento.importe) return null;
    const total = parseNum(evento.importe);
    const anticipo = parseNum(evento.importe_anticipo);
    return total - anticipo - totalPagosAdicionales;
  })();

  const tipoLabel = TIPO_EVENTO_MAP[evento.id_tipo_evento] || "—";
  const ciudadLabel = CIUDAD_MAP[evento.id_ciudad] || "—";
  const horaInicio = fmtHora(evento.hora_inicio);
  const horaFinal = fmtHora(evento.hora_final);

  const timelineEvents = [];
  const createdAt = evento.datetime || evento.created_at || evento.fecha_creacion;
  const fechaElaboracion = evento.fecha_anticipo || createdAt;
  if (fechaElaboracion) {
    timelineEvents.push({
      key: "creation",
      fecha: fechaElaboracion,
      titulo: "Evento elaborado",
      descripcion: `Evento registrado para ${evento.cliente_nombre}`,
      tipo: "evento",
      monto: null,
    });
  }
  if (evento.fecha_anticipo && parseNum(evento.importe_anticipo) > 0) {
    timelineEvents.push({
      key: "anticipo",
      fecha: evento.fecha_anticipo,
      titulo: "Anticipo recibido",
      descripcion: `Se recibió un anticipo de ${fmtMoney(evento.importe_anticipo)}`,
      tipo: "pago",
      monto: evento.importe_anticipo,
    });
  }
  pagos.forEach((p) => {
    timelineEvents.push({
      key: `pago-${p.id}`,
      fecha: p.fecha,
      titulo: "Abono registrado",
      descripcion: p.descripcion || `Abono adicional`,
      tipo: "pago",
      monto: p.monto,
    });
  });
  if (evento.fecha_evento) {
    timelineEvents.push({
      key: "fecha_evento",
      fecha: evento.fecha_evento,
      titulo: "Fecha del evento",
      descripcion: `${tipoLabel} · ${evento.lugar_evento || ciudadLabel}`,
      tipo: "evento",
      monto: null,
    });
  }
  timelineEvents.sort((a, b) => dayjs(a.fecha).valueOf() - dayjs(b.fecha).valueOf());

  const mainPdf = eventoPdfs[0] ?? null;

  return (
    <div className="cd-main">
      <div className="cd-content">

        <Button
          type="link"
          icon={<ArrowLeftOutlined />}
          className="cd-back-btn"
          onClick={() => navigate("/eventos")}
        >
          Volver a Eventos
        </Button>

        <div className="cd-header-card">
          <div className="cd-header-top">
            <div>
              <div className="cd-header-name-row">
                <h1 className="cd-client-name">
                  {(evento.cliente_nombre + " - " + tipoLabel || "—").toUpperCase()}
                </h1>
                <span className={`cd-status-badge ${evento.active ? "cd-status-active" : "cd-status-inactive"}`}>
                  <span className={`cd-status-dot ${evento.active ? "cd-dot-active" : "cd-dot-inactive"}`} />
                  {evento.active ? "ACTIVO" : "INACTIVO"}
                </span>
              </div>
              <div className="cd-header-meta">
                {createdAt && (
                  <span className="cd-meta-item">
                    <CalendarOutlined />
                    Creado: {fmtFechaCorta(createdAt)}
                  </span>
                )}
                {evento.created_by_nombre && (
                  <span className="cd-meta-item">
                    <UserOutlined />
                    {evento.created_by_nombre}
                  </span>
                )}
              </div>
            </div>

            <div className="cd-header-actions">
              <Button
                icon={<EditOutlined />}
                className="cd-btn-edit"
                onClick={() =>
                  navigate(`/eventos/${evento.id_evento}/editar`, {
                    state: { evento },
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
            <button
              className={`cd-tab-btn ${activeTab === "datos" ? "cd-tab-btn-active" : ""}`}
              onClick={() => setActiveTab("datos")}
            >
              <FileTextOutlined />
              Datos del evento
            </button>
            <button
              className={`cd-tab-btn ${activeTab === "evento-pdf" ? "cd-tab-btn-active" : ""}`}
              onClick={() => setActiveTab("evento-pdf")}
            >
              <FilePdfOutlined />
              Evento Visor
            </button>
            <button
              className={`cd-tab-btn ${activeTab === "historial" ? "cd-tab-btn-active" : ""}`}
              onClick={() => setActiveTab("historial")}
            >
              <ClockCircleOutlined />
              Historial
            </button>
            <button
              className={`cd-tab-btn ${activeTab === "pagos" ? "cd-tab-btn-active" : ""}`}
              onClick={() => setActiveTab("pagos")}
            >
              <DollarOutlined />
              Abonos y Pagos
            </button>
            <button
              className={`cd-tab-btn ${activeTab === "documentos" ? "cd-tab-btn-active" : ""}`}
              onClick={() => setActiveTab("documentos")}
            >
              <FolderOpenOutlined />
              Documentos
            </button>
            <button
              className={`cd-tab-btn ${activeTab === "actividad" ? "cd-tab-btn-active" : ""}`}
              onClick={() => setActiveTab("actividad")}
            >
              <HistoryOutlined />
              Actividad
            </button>
          </div>
        </div>

        {/* Tab 1: Datos del evento */}
        {activeTab === "datos" && (
          <div className="cd-bento-grid">
            <div className="cd-card cd-card-client">
              <div className="cd-card-header">
                <div className="cd-card-icon-wrap"><UserOutlined /></div>
                <h2 className="cd-card-title">Datos del cliente</h2>
              </div>
              <div className="cd-client-fields">
                <div>
                  <span className="cd-field-label">Nombre Completo</span>
                  <span className="cd-field-value">{evento.cliente_nombre || "—"}</span>
                </div>
                {evento.celular && (
                  <div>
                    <span className="cd-field-label">Teléfono Móvil</span>
                    <div className="cd-field-phone">
                      <PhoneOutlined className="cd-phone-icon" />
                      <span className="cd-field-value cd-field-value-primary">
                        {evento.celular}
                      </span>
                    </div>
                  </div>
                )}
                <div>
                  <span className="cd-field-label">Domicilio</span>
                  <span className="cd-field-value cd-field-value-muted">
                    {evento.domicilio || "—"}
                  </span>
                </div>
                <div>
                  <span className="cd-field-label">Comentarios</span>
                  <span className="cd-field-value cd-field-value-muted">
                    {evento.comentarios || "—"}
                  </span>
                </div>
              </div>
            </div>

            <div className="cd-card cd-card-event">
              <div className="cd-card-header">
                <div className="cd-card-icon-wrap"><CalendarOutlined /></div>
                <h2 className="cd-card-title">Datos del evento</h2>
              </div>
              <div className="cd-event-grid">
                <div>
                  <span className="cd-field-label">Tipo de Evento</span>
                  <div className="cd-field-icon-row">
                    <GiftOutlined className="cd-field-row-icon" />
                    <span className="cd-field-value">{tipoLabel}</span>
                  </div>
                </div>
                <div>
                  <span className="cd-field-label">Fecha del Evento</span>
                  <div className="cd-field-icon-row">
                    <CalendarOutlined className="cd-field-row-icon" />
                    <span className="cd-field-value">{fmtFecha(evento.fecha_evento)}</span>
                  </div>
                </div>
                <div>
                  <span className="cd-field-label">Hora Inicio</span>
                  <div className="cd-field-icon-row">
                    <ClockCircleOutlined className="cd-field-row-icon" />
                    <span className="cd-field-value">{horaInicio}</span>
                  </div>
                </div>
                <div>
                  <span className="cd-field-label">Hora Fin</span>
                  <div className="cd-field-icon-row">
                    <ClockCircleOutlined className="cd-field-row-icon" />
                    <span className="cd-field-value">{horaFinal}</span>
                  </div>
                </div>
              </div>
              <div className="cd-event-location">
                <EnvironmentOutlined className="cd-location-icon" />
                <div>
                  <span className="cd-field-label">Ubicación del Evento</span>
                  <p className="cd-location-text">
                    {[evento.nombre_ciudad || ciudadLabel, evento.lugar_evento].filter(Boolean).join(" - ")}
                  </p>
                </div>
              </div>

              <div className="cd-misa-block">
                <div className="cd-misa-title">
                  <EnvironmentOutlined style={{ fontSize: 13, color: "#6b7280" }} />
                  Información de Misa
                </div>
                {evento.direccion_misa || evento.hora_misa ? (
                  <div className="cd-misa-fields">
                    {evento.direccion_misa && (
                      <div>
                        <span className="cd-field-label">Dirección de la Misa</span>
                        <span className="cd-field-value">{evento.direccion_misa}</span>
                      </div>
                    )}
                    {evento.hora_misa && (
                      <div>
                        <span className="cd-field-label">Hora de la Misa</span>
                        <div className="cd-field-icon-row">
                          <ClockCircleOutlined className="cd-field-row-icon" />
                          <span className="cd-field-value">{fmtHora(evento.hora_misa)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="cd-misa-none">
                    <span>No se registró misa para este evento</span>
                  </div>
                )}
              </div>
            </div>

            <div className="cd-card cd-card-financial">
              <div className="cd-card-header">
                <div className="cd-card-icon-wrap"><DollarOutlined /></div>
                <h2 className="cd-card-title">Resumen de Importes</h2>
              </div>
              <div className="cd-financial-grid">
                <div className="cd-financial-item">
                  <span className="cd-field-label">Importe Total</span>
                  <p className="cd-financial-value cd-financial-primary">
                    {fmtMoney(evento.importe)}
                  </p>
                  <span className="cd-financial-note">
                    Incluye todos los servicios
                  </span>
                </div>
                <div className="cd-financial-item cd-financial-bordered">
                  <span className="cd-field-label">Anticipo Recibido</span>
                  <p className="cd-financial-value">
                    {parseNum(evento.importe_anticipo) > 0
                      ? fmtMoney(evento.importe_anticipo)
                      : "—"}
                  </p>
                  {evento.fecha_anticipo && (
                    <span className="cd-financial-note">
                      Pago realizado el {fmtFechaCorta(evento.fecha_anticipo)}
                    </span>
                  )}
                </div>
                <div className="cd-financial-item">
                  <span className="cd-field-label">Saldo Pendiente</span>
                  <p className={`cd-financial-value ${
                    resta === null ? "" : resta > 0 ? "cd-financial-error" : "cd-financial-ok"
                  }`}>
                    {resta !== null ? fmtMoney(String(resta)) : "—"}
                  </p>
                  {resta !== null && resta > 0 && evento.fecha_evento && (
                    <div className="cd-financial-alert">
                      <ExclamationCircleOutlined />
                      Liquidar antes del {fmtFechaCorta(evento.fecha_evento)}
                    </div>
                  )}
                  {resta !== null && resta <= 0 && (
                    <div className="cd-financial-paid">
                      <CheckCircleOutlined />
                      Liquidado
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Historial */}
        {activeTab === "historial" && (
          <div className="cd-card">
            <div className="cd-card-header">
              <div className="cd-card-icon-wrap"><ClockCircleOutlined /></div>
              <h2 className="cd-card-title">Historial del evento</h2>
            </div>
            {timelineEvents.length === 0 ? (
              <Empty description="Sin eventos registrados aún" style={{ margin: "40px 0" }} />
            ) : (
              <Timeline
                className="cd-timeline"
                mode="left"
                items={timelineEvents.map((ev) => {
                  const hora = dayjs(ev.fecha).format("HH:mm");
                  return {
                    label: (
                      <div className="cd-tl-label">
                        <div className="cd-tl-date">{fmtFechaCorta(ev.fecha)}</div>
                        {hora !== "00:00" && (
                          <div className="cd-tl-time">{hora} hrs</div>
                        )}
                      </div>
                    ),
                    dot:
                      ev.tipo === "pago" ? (
                        <div className="cd-tl-dot cd-tl-dot-pago"><DollarOutlined /></div>
                      ) : ev.tipo === "evento" ? (
                        <div className="cd-tl-dot cd-tl-dot-evento"><CalendarOutlined /></div>
                      ) : (
                        <div className="cd-tl-dot cd-tl-dot-contrato"><FileTextOutlined /></div>
                      ),
                    children: (
                      <div className="cd-tl-item">
                        <div className="cd-tl-title">{ev.titulo}</div>
                        <div className="cd-tl-desc">{ev.descripcion}</div>
                        {ev.monto && (
                          <div className="cd-tl-monto">{fmtMoney(ev.monto)}</div>
                        )}
                      </div>
                    ),
                  };
                })}
              />
            )}
          </div>
        )}

        {/* Tab 3: Pagos */}
        {activeTab === "pagos" && (
          <div className="cd-card">
            <div className="cd-pagos-header">
              <div className="cd-pagos-header-left">
                <div className="cd-card-icon-wrap"><DollarOutlined /></div>
                <h2 className="cd-card-title">Abonos y pagos</h2>
              </div>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                className="cd-btn-add-pago"
                onClick={() => setPagoModalOpen(true)}
              >
                Agregar abono
              </Button>
            </div>
            <div className="cd-pagos-summary">
              <div className="cd-pagos-summary-item">
                <span className="cd-field-label">Importe total</span>
                <span className="cd-pagos-summary-val">{fmtMoney(evento.importe)}</span>
              </div>
              <div className="cd-pagos-summary-item">
                <span className="cd-field-label">Abono recibido</span>
                <span className="cd-pagos-summary-val">
                  {fmtMoney(evento.importe_anticipo)}
                </span>
              </div>
              {totalPagosAdicionales > 0 && (
                <div className="cd-pagos-summary-item">
                  <span className="cd-field-label">Abonos adicionales</span>
                  <span className="cd-pagos-summary-val">
                    {fmtMoney(String(totalPagosAdicionales))}
                  </span>
                </div>
              )}
              <div className="cd-pagos-summary-item">
                <span className="cd-field-label">Saldo pendiente</span>
                <span className={`cd-pagos-summary-val ${
                  resta === null ? "" : resta > 0 ? "cd-financial-error" : "cd-financial-ok"
                }`}>
                  {resta !== null ? fmtMoney(String(resta)) : "—"}
                </span>
              </div>
            </div>
            <Divider style={{ margin: "4px 0 16px" }} />
            <div className="cd-pagos-list">
              <div className="cd-pagos-list-header">
                <span>Concepto</span>
                <span>Fecha</span>
                <span>Monto</span>
                <span />
              </div>
              {parseNum(evento.importe_anticipo) > 0 && (
                <div className="cd-pagos-row cd-pagos-row-anticipo">
                  <span>
                    <DollarOutlined style={{ marginRight: 6, color: "#595c5e" }} />
                    Abono recibido
                  </span>
                  <span>{fmtFechaCorta(evento.fecha_anticipo)}</span>
                  <span className="cd-pagos-monto">
                    {fmtMoney(evento.importe_anticipo)}
                  </span>
                  <span />
                </div>
              )}
              {pagos.map((p) => (
                <div key={p.id || p.id_pago} className="cd-pagos-row">
                  <span>
                    <DollarOutlined style={{ marginRight: 6, color: "#595c5e" }} />
                    {p.descripcion || "Abono"}
                  </span>
                  <span>{fmtFechaCorta(p.fecha)}</span>
                  <span className="cd-pagos-monto">{fmtMoney(p.monto)}</span>
                  <button
                    className="cd-doc-delete-btn"
                    onClick={() => handleDeleteAbono(p)}
                    title="Eliminar abono"
                  >
                    <DeleteOutlined />
                  </button>
                </div>
              ))}
              {pagos.length === 0 && parseNum(evento.importe_anticipo) === 0 && (
                <Empty description="Sin pagos registrados" style={{ margin: "32px 0" }} />
              )}
            </div>
          </div>
        )}

        {/* Tab 4: PDF */}
        {activeTab === "evento-pdf" && (
          <div className="cd-card">
            <div className="cd-pagos-header">
              <div className="cd-pagos-header-left">
                <div className="cd-card-icon-wrap"><FilePdfOutlined /></div>
                <h2 className="cd-card-title">Evento PDF</h2>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                {loadingDocs ? (
                  <Spin indicator={<LoadingOutlined />} />
                ) : (
                  <>
                    <input
                      ref={pdfInputRef}
                      type="file"
                      accept=".pdf"
                      style={{ display: "none" }}
                      onChange={(e) => handleUploadPdf(e.target.files[0])}
                    />
                    <Button
                      icon={<UploadOutlined />}
                      loading={uploadingPdf}
                      onClick={() => pdfInputRef.current?.click()}
                      className="cd-btn-upload"
                    >
                      {mainPdf ? "Reemplazar PDF" : "Subir evento PDF"}
                    </Button>
                  </>
                )}
              </div>
            </div>

            {loadingDocs ? (
              <div className="cd-loading-wrap"><Spin size="large" /></div>
            ) : mainPdf ? (
              <div className="cd-pdf-viewer-wrap">
                <iframe
                  src={getDocUrl(mainPdf)}
                  title="Evento PDF"
                  className="cd-pdf-iframe"
                />
              </div>
            ) : (
              <div className="cd-empty-doc">
                <FilePdfOutlined className="cd-empty-doc-icon" />
                <p className="cd-empty-doc-title">Sin evento PDF</p>
                <p className="cd-empty-doc-sub">
                  Sube el PDF del evento para visualizarlo aquí.
                </p>
                <Button
                  icon={<UploadOutlined />}
                  loading={uploadingPdf}
                  onClick={() => pdfInputRef.current?.click()}
                  className="cd-btn-upload"
                >
                  Subir evento PDF
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Actividad */}
        {activeTab === "actividad" && (
          <div className="cd-card">
            <div className="cd-card-header">
              <div className="cd-card-icon-wrap"><HistoryOutlined /></div>
              <h2 className="cd-card-title">
                Actividad del evento
                {actividad.length > 0 && (
                  <span className="cd-actividad-count">{actividad.length}</span>
                )}
              </h2>
            </div>

            {loadingActividad ? (
              <div className="cd-loading-wrap"><Spin size="large" /></div>
            ) : actividad.length === 0 ? (
              <Empty
                description="Sin actividad registrada aún"
                style={{ margin: "40px 0" }}
              />
            ) : (
              <div className="cd-actividad-list">
                {actividad.map((item, idx) => {
                  const cfg = getActionConfig(item.action);
                  return (
                    <div key={item.id_audit_log || idx} className="cd-actividad-item">
                      <div className="cd-actividad-dot-col">
                        <div
                          className="cd-actividad-dot"
                          style={{ background: cfg.color }}
                        />
                        {idx < actividad.length - 1 && (
                          <div className="cd-actividad-line" />
                        )}
                      </div>
                      <div className="cd-actividad-body">
                        <div className="cd-actividad-top-row">
                          <span
                            className="cd-actividad-badge"
                            style={{ color: cfg.color, background: cfg.bg }}
                          >
                            {cfg.label}
                          </span>
                          <span className="cd-actividad-message">{item.message}</span>
                        </div>
                        <div className="cd-actividad-bottom-row">
                          <span className="cd-actividad-time">
                            {fmtDatetime(item.datetime)}
                          </span>
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

        {/* Tab 6: Documentos */}
        {activeTab === "documentos" && (
          <div className="cd-card">
            <div className="cd-pagos-header">
              <div className="cd-pagos-header-left">
                <div className="cd-card-icon-wrap"><FolderOpenOutlined /></div>
                <h2 className="cd-card-title">Documentos</h2>
              </div>
              <div>
                <input
                  ref={docInputRef}
                  type="file"
                  accept="*"
                  style={{ display: "none" }}
                  onChange={(e) => handleUploadDoc(e.target.files[0])}
                />
                <Button
                  type="primary"
                  icon={<UploadOutlined />}
                  loading={uploadingDoc}
                  onClick={() => docInputRef.current?.click()}
                  className="cd-btn-add-pago"
                >
                  Subir documento
                </Button>
              </div>
            </div>

            {loadingDocs ? (
              <div className="cd-loading-wrap"><Spin size="large" /></div>
            ) : documentos.length === 0 ? (
              <div className="cd-empty-doc">
                <FolderOpenOutlined className="cd-empty-doc-icon" />
                <p className="cd-empty-doc-title">Sin documentos</p>
                <p className="cd-empty-doc-sub">
                  Sube documentos adjuntos al evento: fotos, archivos, etc.
                </p>
              </div>
            ) : (
              <div className="cd-docs-grid">
                {documentos.map((doc) => (
                  <div key={doc.id} className="cd-doc-card">
                    <div
                      className="cd-doc-card-preview"
                      onClick={() => setViewerDoc(doc)}
                    >
                      {getFileType(doc.filename) === "image" ? (
                        <img
                          src={getDocUrl(doc)}
                          alt={doc.filename}
                          className="cd-doc-thumb"
                        />
                      ) : (
                        <div className="cd-doc-icon-wrap">
                          <FileIcon filename={doc.filename} size={40} />
                        </div>
                      )}
                      <div className="cd-doc-overlay">
                        <EyeOutlined />
                        <span>Ver</span>
                      </div>
                    </div>
                    <div className="cd-doc-card-footer">
                      <Tooltip title={doc.filename}>
                        <span className="cd-doc-name">{doc.filename}</span>
                      </Tooltip>
                      <button
                        className="cd-doc-delete-btn"
                        onClick={() => handleDeleteDoc(doc)}
                      >
                        <DeleteOutlined />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal: Agregar abono */}
      <Modal
        open={pagoModalOpen}
        onCancel={() => {
          setPagoModalOpen(false);
          pagoForm.resetFields();
        }}
        onOk={handleAddPago}
        okText="Guardar abono"
        cancelText="Cancelar"
        title="Registrar abono"
        confirmLoading={savingPago}
        centered
        okButtonProps={{ style: { background: "#05060a", borderColor: "#05060a" } }}
      >
        <Form form={pagoForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="monto"
            label="Monto del abono"
            rules={[{ required: true, message: "Requerido" }]}
          >
            <Input prefix="$" suffix="MXN" placeholder="5000" />
          </Form.Item>
          <Form.Item
            name="fecha"
            label="Fecha del pago"
            rules={[{ required: true, message: "Requerido" }]}
          >
            <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="descripcion" label="Descripción (opcional)">
            <Input placeholder="Ej: Abono por transferencia bancaria" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal: Visor de documento */}
      <Modal
        open={!!viewerDoc}
        onCancel={() => setViewerDoc(null)}
        footer={null}
        title={viewerDoc?.filename}
        centered
        width="90vw"
        style={{ maxWidth: 1100 }}
        bodyStyle={{ padding: 0, height: "82vh" }}
        destroyOnClose
      >
        {viewerDoc && (() => {
          const type = getFileType(viewerDoc.filename);
          const url = getDocUrl(viewerDoc);
          if (type === "pdf") {
            return (
              <iframe
                src={url}
                title={viewerDoc.filename}
                style={{ width: "100%", height: "100%", border: "none" }}
              />
            );
          }
          if (type === "image") {
            return (
              <div style={{
                height: "100%", display: "flex",
                alignItems: "center", justifyContent: "center",
                background: "#111", overflow: "auto",
              }}>
                <img
                  src={url}
                  alt={viewerDoc.filename}
                  style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                />
              </div>
            );
          }
          return (
            <div style={{
              height: "100%", display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 16,
            }}>
              <FileIcon filename={viewerDoc.filename} size={64} />
              <p style={{ color: "#595c5e", fontSize: 14 }}>
                Vista previa no disponible para este tipo de archivo.
              </p>
              <a href={url} download={viewerDoc.filename}>
                <Button type="primary" style={{ background: "#05060a", borderColor: "#05060a" }}>
                  Descargar archivo
                </Button>
              </a>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
