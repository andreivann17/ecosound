// src/containers/pages/ContratoDetallePage.jsx
import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import "dayjs/locale/es";
import {
  apiContratosInstance,
  authHeaderContratos,
} from "../../redux/actions/contratos/contratos";

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

import "./ContratoDetallePage.css";

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

export default function ContratoDetallePage() {
  const { idContrato } = useParams();
  const navigate = useNavigate();

  // ── Core state ────────────────────────────────────────────
  const [contrato, setContrato] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [pagos, setPagos] = useState([]);
  const [pagoModalOpen, setPagoModalOpen] = useState(false);
  const [savingPago, setSavingPago] = useState(false);
  const [pagoForm] = Form.useForm();
  const [activeTab, setActiveTab] = useState("datos");

  // ── Actividad state ───────────────────────────────────────
  const [actividad, setActividad] = useState([]);
  const [loadingActividad, setLoadingActividad] = useState(false);

  // ── Documentos state ──────────────────────────────────────
  const [contratoPdfs, setContratoPdfs] = useState([]);   // tipo 1
  const [documentos, setDocumentos] = useState([]);        // tipo 2
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [viewerDoc, setViewerDoc] = useState(null);        // doc abierto en visor

  const pdfInputRef = useRef(null);
  const docInputRef = useRef(null);

  // ── Fetch contrato ────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    apiContratosInstance
      .get(`/contratos/${idContrato}`, { headers: authHeaderContratos() })
      .then(({ data }) => { if (mounted) setContrato(data); })
      .catch(() => notification.error({ message: "No se pudo cargar el contrato" }))
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [idContrato]);

  // ── Fetch abonos adicionales ──────────────────────────────
  const fetchPagos = useCallback(async () => {
    try {
      const { data } = await apiContratosInstance.get(
        `/contratos/${idContrato}/pagos`,
        { headers: authHeaderContratos() }
      );
      setPagos(Array.isArray(data) ? data : data.items ?? []);
    } catch {
      setPagos([]);
    }
  }, [idContrato]);

  useEffect(() => { fetchPagos(); }, [fetchPagos]);

  // ── Fetch actividad ───────────────────────────────────────
  const fetchActividad = useCallback(async () => {
    setLoadingActividad(true);
    try {
      const { data } = await apiContratosInstance.get(
        `/contratos/${idContrato}/actividad`,
        { headers: authHeaderContratos() }
      );
      setActividad(Array.isArray(data) ? data : data.items ?? []);
    } catch {
      setActividad([]);
    } finally {
      setLoadingActividad(false);
    }
  }, [idContrato]);

  // ── Fetch documentos ──────────────────────────────────────
  const fetchDocumentos = useCallback(async () => {
    setLoadingDocs(true);
    try {
      const { data } = await apiContratosInstance.get(
        `/contratos/${idContrato}/documentos`,
        { headers: authHeaderContratos() }
      );
      const docs = Array.isArray(data) ? data : [];
      setContratoPdfs(docs.filter((d) => d.id_tipo_documento === 1));
      setDocumentos(docs.filter((d) => d.id_tipo_documento !== 1));
    } catch {
      setContratoPdfs([]);
      setDocumentos([]);
    } finally {
      setLoadingDocs(false);
    }
  }, [idContrato]);

  // Cargar actividad y documentos al cambiar de tab
  useEffect(() => {
    if (activeTab === "actividad") fetchActividad();
    if (activeTab === "contrato-pdf" || activeTab === "documentos") fetchDocumentos();
  }, [activeTab, fetchActividad, fetchDocumentos]);

  // ── Eliminar contrato ─────────────────────────────────────
  const handleDelete = () => {
    Modal.confirm({
      title: "Eliminar contrato",
      content: "El contrato se marcará como inactivo. Esta acción se puede revertir.",
      okText: "Eliminar",
      okType: "danger",
      cancelText: "Cancelar",
      centered: true,
      onOk: async () => {
        try {
          setDeleting(true);
          await apiContratosInstance.delete(`/contratos/${idContrato}`, {
            headers: authHeaderContratos(),
          });
          notification.success({ message: "Contrato eliminado" });
          navigate("/contratos");
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

  // ── Agregar abono ─────────────────────────────────────────
  const handleAddPago = async () => {
    let values;
    try { values = await pagoForm.validateFields(); } catch { return; }
    setSavingPago(true);
    try {
      await apiContratosInstance.post(
        `/contratos/${idContrato}/pagos`,
        {
          monto: String(values.monto),
          fecha: dayjs(values.fecha).format("YYYY-MM-DDTHH:mm:ss"),
          descripcion: values.descripcion?.trim() || null,
        },
        { headers: authHeaderContratos() }
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

  // ── Upload contrato PDF (tipo 1) ──────────────────────────
  const handleUploadPdf = async (file) => {
    if (!file) return;
    if (getFileType(file.name) !== "pdf") {
      notification.error({ message: "Solo se permiten archivos PDF para el contrato" });
      return;
    }
    setUploadingPdf(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      await apiContratosInstance.post(
        `/contratos/${idContrato}/documentos?id_tipo_documento=1`,
        fd,
        { headers: { ...authHeaderContratos(), "Content-Type": "multipart/form-data" } }
      );
      notification.success({ message: "Contrato PDF subido correctamente" });
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

  // ── Upload documento adicional (tipo 2) ───────────────────
  const handleUploadDoc = async (file) => {
    if (!file) return;
    setUploadingDoc(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      await apiContratosInstance.post(
        `/contratos/${idContrato}/documentos?id_tipo_documento=2`,
        fd,
        { headers: { ...authHeaderContratos(), "Content-Type": "multipart/form-data" } }
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

  // ── Eliminar documento ────────────────────────────────────
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
          await apiContratosInstance.delete(
            `/contratos/${idContrato}/documentos/${doc.id}`,
            { headers: authHeaderContratos() }
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

  // ── URL del archivo ───────────────────────────────────────
  const getDocUrl = (doc) => `${API_BASE}/${doc.path}`;

  // ── Loading ───────────────────────────────────────────────
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

  if (!contrato) return null;

  // ── Cálculos ──────────────────────────────────────────────
  const totalPagosAdicionales = pagos.reduce((a, p) => a + parseNum(p.monto), 0);
  const resta = (() => {
    if (!contrato.importe) return null;
    const total = parseNum(contrato.importe);
    const anticipo = parseNum(contrato.importe_anticipo);
    return total - anticipo - totalPagosAdicionales;
  })();

  const tipoLabel = TIPO_EVENTO_MAP[contrato.id_tipo_evento] || "—";
  const ciudadLabel = CIUDAD_MAP[contrato.id_ciudad] || "—";
  const horaInicio = fmtHora(contrato.hora_inicio);
  const horaFinal = fmtHora(contrato.hora_final);

  // ── Construir timeline historial ──────────────────────────
  const timelineEvents = [];
  const createdAt = contrato.datetime || contrato.created_at || contrato.fecha_creacion;
  const fechaElaboracion = contrato.fecha_anticipo || createdAt;
  if (fechaElaboracion) {
    timelineEvents.push({
      key: "creation",
      fecha: fechaElaboracion,
      titulo: "Contrato elaborado",
      descripcion: `Contrato registrado para ${contrato.cliente_nombre}`,
      tipo: "contrato",
      monto: null,
    });
  }
  if (contrato.fecha_anticipo && parseNum(contrato.importe_anticipo) > 0) {
    timelineEvents.push({
      key: "anticipo",
      fecha: contrato.fecha_anticipo,
      titulo: "Anticipo recibido",
      descripcion: `Se recibió un anticipo de ${fmtMoney(contrato.importe_anticipo)}`,
      tipo: "pago",
      monto: contrato.importe_anticipo,
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
  if (contrato.fecha_evento) {
    timelineEvents.push({
      key: "evento",
      fecha: contrato.fecha_evento,
      titulo: "Fecha del evento",
      descripcion: `${tipoLabel} · ${contrato.lugar_evento || ciudadLabel}`,
      tipo: "evento",
      monto: null,
    });
  }
  timelineEvents.sort((a, b) => dayjs(a.fecha).valueOf() - dayjs(b.fecha).valueOf());

  const mainPdf = contratoPdfs[0] ?? null;

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="cd-main">
      <div className="cd-content">

        {/* Botón volver */}
        <Button
          type="link"
          icon={<ArrowLeftOutlined />}
          className="cd-back-btn"
          onClick={() => navigate("/contratos")}
        >
          Volver a Contratos
        </Button>

        {/* ── Header card ── */}
        <div className="cd-header-card">
          <div className="cd-header-top">
            <div>
              <div className="cd-header-name-row">
                <h1 className="cd-client-name">
                  {(contrato.cliente_nombre + " - " + tipoLabel || "—").toUpperCase()}
                </h1>
                <span className={`cd-status-badge ${contrato.active ? "cd-status-active" : "cd-status-inactive"}`}>
                  <span className={`cd-status-dot ${contrato.active ? "cd-dot-active" : "cd-dot-inactive"}`} />
                  {contrato.active ? "ACTIVO" : "INACTIVO"}
                </span>
              </div>
              <div className="cd-header-meta">
                {createdAt && (
                  <span className="cd-meta-item">
                    <CalendarOutlined />
                    Creado: {fmtFechaCorta(createdAt)}
                  </span>
                )}
                {contrato.created_by_nombre && (
                  <span className="cd-meta-item">
                    <UserOutlined />
                    {contrato.created_by_nombre}
                  </span>
                )}
              </div>
            </div>

            <div className="cd-header-actions">
              <Button
                icon={<EditOutlined />}
                className="cd-btn-edit"
                onClick={() =>
                  navigate(`/contratos/${contrato.id_contrato}/editar`, {
                    state: { contrato },
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

          {/* Tabs */}
          <div className="cd-header-tabs">
            <button
              className={`cd-tab-btn ${activeTab === "datos" ? "cd-tab-btn-active" : ""}`}
              onClick={() => setActiveTab("datos")}
            >
              <FileTextOutlined />
              Datos del contrato
            </button>
            <button
              className={`cd-tab-btn ${activeTab === "contrato-pdf" ? "cd-tab-btn-active" : ""}`}
              onClick={() => setActiveTab("contrato-pdf")}
            >
              <FilePdfOutlined />
              Contrato Visor
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

        {/* ══════════════════════════════════════════════════════ */}
        {/* Tab 1: Datos del contrato                             */}
        {/* ══════════════════════════════════════════════════════ */}
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
                  <span className="cd-field-value">{contrato.cliente_nombre || "—"}</span>
                </div>
                {contrato.celular && (
                  <div>
                    <span className="cd-field-label">Teléfono Móvil</span>
                    <div className="cd-field-phone">
                      <PhoneOutlined className="cd-phone-icon" />
                      <span className="cd-field-value cd-field-value-primary">
                        {contrato.celular}
                      </span>
                    </div>
                  </div>
                )}
                <div>
                  <span className="cd-field-label">Domicilio</span>
                  <span className="cd-field-value cd-field-value-muted">
                    {contrato.domicilio || "—"}
                  </span>
                </div>
                <div>
                  <span className="cd-field-label">Comentarios</span>
                  <span className="cd-field-value cd-field-value-muted">
                    {contrato.comentarios || "—"}
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
                    <span className="cd-field-value">{fmtFecha(contrato.fecha_evento)}</span>
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
                    {contrato.lugar_evento
                      ? `${contrato.lugar_evento} — ${ciudadLabel}`
                      : ciudadLabel}
                  </p>
                </div>
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
                    {fmtMoney(contrato.importe)}
                  </p>
                  <span className="cd-financial-note">
                    Incluye todos los servicios contratados
                  </span>
                </div>
                <div className="cd-financial-item cd-financial-bordered">
                  <span className="cd-field-label">Anticipo Recibido</span>
                  <p className="cd-financial-value">
                    {parseNum(contrato.importe_anticipo) > 0
                      ? fmtMoney(contrato.importe_anticipo)
                      : "—"}
                  </p>
                  {contrato.fecha_anticipo && (
                    <span className="cd-financial-note">
                      Pago realizado el {fmtFechaCorta(contrato.fecha_anticipo)}
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
                  {resta !== null && resta > 0 && contrato.fecha_evento && (
                    <div className="cd-financial-alert">
                      <ExclamationCircleOutlined />
                      Liquidar antes del {fmtFechaCorta(contrato.fecha_evento)}
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

        {/* ══════════════════════════════════════════════════════ */}
        {/* Tab 2: Historial / Timeline                           */}
        {/* ══════════════════════════════════════════════════════ */}
        {activeTab === "historial" && (
          <div className="cd-card">
            <div className="cd-card-header">
              <div className="cd-card-icon-wrap"><ClockCircleOutlined /></div>
              <h2 className="cd-card-title">Historial del contrato</h2>
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

        {/* ══════════════════════════════════════════════════════ */}
        {/* Tab 3: Abonos y pagos                                 */}
        {/* ══════════════════════════════════════════════════════ */}
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
                <span className="cd-pagos-summary-val">{fmtMoney(contrato.importe)}</span>
              </div>
              <div className="cd-pagos-summary-item">
                <span className="cd-field-label">Abono recibido</span>
                <span className="cd-pagos-summary-val">
                  {fmtMoney(contrato.importe_anticipo)}
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
              </div>
              {parseNum(contrato.importe_anticipo) > 0 && (
                <div className="cd-pagos-row cd-pagos-row-anticipo">
                  <span>
                    <DollarOutlined style={{ marginRight: 6, color: "#595c5e" }} />
                    Abono recibido
                  </span>
                  <span>{fmtFechaCorta(contrato.fecha_anticipo)}</span>
                  <span className="cd-pagos-monto">
                    {fmtMoney(contrato.importe_anticipo)}
                  </span>
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
                </div>
              ))}
              {pagos.length === 0 && parseNum(contrato.importe_anticipo) === 0 && (
                <Empty description="Sin pagos registrados" style={{ margin: "32px 0" }} />
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════ */}
        {/* Tab 4: Contrato PDF                                   */}
        {/* ══════════════════════════════════════════════════════ */}
        {activeTab === "contrato-pdf" && (
          <div className="cd-card">
            <div className="cd-pagos-header">
              <div className="cd-pagos-header-left">
                <div className="cd-card-icon-wrap"><FilePdfOutlined /></div>
                <h2 className="cd-card-title">Contrato PDF</h2>
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
                      {mainPdf ? "Reemplazar PDF" : "Subir contrato PDF"}
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
                  title="Contrato PDF"
                  className="cd-pdf-iframe"
                />
              </div>
            ) : (
              <div className="cd-empty-doc">
                <FilePdfOutlined className="cd-empty-doc-icon" />
                <p className="cd-empty-doc-title">Sin contrato PDF</p>
                <p className="cd-empty-doc-sub">
                  Sube el PDF del contrato para visualizarlo aquí.
                </p>
                <Button
                  icon={<UploadOutlined />}
                  loading={uploadingPdf}
                  onClick={() => pdfInputRef.current?.click()}
                  className="cd-btn-upload"
                >
                  Subir contrato PDF
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════ */}
        {/* Tab 5: Actividad                                      */}
        {/* ══════════════════════════════════════════════════════ */}
        {activeTab === "actividad" && (
          <div className="cd-card">
            <div className="cd-card-header">
              <div className="cd-card-icon-wrap"><HistoryOutlined /></div>
              <h2 className="cd-card-title">
                Actividad del contrato
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

        {/* ══════════════════════════════════════════════════════ */}
        {/* Tab 6: Documentos                                     */}
        {/* ══════════════════════════════════════════════════════ */}
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
                  Sube documentos adjuntos al contrato: fotos, archivos, etc.
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

      {/* ── Modal: Agregar abono ── */}
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

      {/* ── Modal: Visor de documento ── */}
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
