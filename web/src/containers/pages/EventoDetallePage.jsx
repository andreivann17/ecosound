import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePermisos } from "../../context/PermisosContext";
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
  AppstoreOutlined,
  MinusOutlined,
  TeamOutlined,
} from "@ant-design/icons";

import "./EventoDetallePage.css";
import { PATH as API_BASE } from "../../redux/utils";

dayjs.locale("es");

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
  const { perm } = usePermisos() || { perm: () => true };
  const canEditar   = perm("eventos", "editar");
  const canEliminar = perm("eventos", "eliminar");

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

  const [equipoEvento, setEquipoEvento] = useState([]);
  const [loadingEquipo, setLoadingEquipo] = useState(false);
  const [catalogoEquipo, setCatalogoEquipo] = useState([]);
  const [loadingCatalogo, setLoadingCatalogo] = useState(false);
  const [equipoModalOpen, setEquipoModalOpen] = useState(false);
  const [equipoSearch, setEquipoSearch] = useState("");
  const [equipoCantidades, setEquipoCantidades] = useState({});
  const [savingEquipoId, setSavingEquipoId] = useState(null);

  const [trabajadoresEvento, setTrabajadoresEvento] = useState([]);
  const [loadingTrabajadores, setLoadingTrabajadores] = useState(false);
  const [catalogoTrabajadores, setCatalogoTrabajadores] = useState([]);
  const [puestosEvento, setPuestosEvento] = useState([]);
  const [trabajadoresModalOpen, setTrabajadoresModalOpen] = useState(false);
  const [trabSearch, setTrabSearch] = useState("");
  const [trabSelectedId, setTrabSelectedId] = useState(null);
  const [trabSelectedPuesto, setTrabSelectedPuesto] = useState(null);
  const [savingTrab, setSavingTrab] = useState(false);

  const [eventoPdfs, setEventoPdfs] = useState([]);
  const [documentos, setDocumentos] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [viewerDoc, setViewerDoc] = useState(null);

  const [paquetesSonido, setPaquetesSonido] = useState([]);
  const [paquetesFoto, setPaquetesFoto] = useState([]);

  const pdfInputRef = useRef(null);
  const docInputRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.all([
      apiEventosInstance.get(`/eventos/${idEvento}`, { headers: authHeaderEventos() }),
      apiEventosInstance.get("/eventos/config/paquetes-sonido", { headers: authHeaderEventos() }),
      apiEventosInstance.get("/eventos/config/paquetes-fotografia", { headers: authHeaderEventos() }),
    ])
      .then(([evRes, psRes, pfRes]) => {
        if (mounted) {
          setEvento(evRes.data);
          setPaquetesSonido(Array.isArray(psRes.data) ? psRes.data : []);
          setPaquetesFoto(Array.isArray(pfRes.data) ? pfRes.data : []);
        }
      })
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

  const fetchEquipoEvento = useCallback(async () => {
    setLoadingEquipo(true);
    try {
      const { data } = await apiEventosInstance.get(
        `/eventos/${idEvento}/equipo`,
        { headers: authHeaderEventos() }
      );
      setEquipoEvento(Array.isArray(data) ? data : []);
    } catch {
      setEquipoEvento([]);
    } finally {
      setLoadingEquipo(false);
    }
  }, [idEvento]);

  const fetchCatalogo = useCallback(async () => {
    setLoadingCatalogo(true);
    try {
      const { data } = await apiEventosInstance.get(
        `/eventos/${idEvento}/equipo-catalogo`,
        { headers: authHeaderEventos() }
      );
      setCatalogoEquipo(Array.isArray(data) ? data : []);
    } catch {
      setCatalogoEquipo([]);
    } finally {
      setLoadingCatalogo(false);
    }
  }, [idEvento]);

  const fetchTrabajadoresEvento = useCallback(async () => {
    setLoadingTrabajadores(true);
    try {
      const { data } = await apiEventosInstance.get(
        `/eventos/${idEvento}/trabajadores`,
        { headers: authHeaderEventos() }
      );
      setTrabajadoresEvento(Array.isArray(data) ? data : []);
    } catch {
      setTrabajadoresEvento([]);
    } finally {
      setLoadingTrabajadores(false);
    }
  }, [idEvento]);

  const fetchCatalogoTrabajadores = useCallback(async () => {
    try {
      const [resTrab, resPuestos] = await Promise.all([
        apiEventosInstance.get("/trabajadores", { headers: authHeaderEventos() }),
        apiEventosInstance.get("/trabajadores/puestos", { headers: authHeaderEventos() }),
      ]);
      setCatalogoTrabajadores(Array.isArray(resTrab.data) ? resTrab.data : []);
      setPuestosEvento(Array.isArray(resPuestos.data) ? resPuestos.data : []);
    } catch {
      setCatalogoTrabajadores([]);
      setPuestosEvento([]);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "actividad") fetchActividad();
    if (activeTab === "evento-pdf" || activeTab === "documentos") fetchDocumentos();
    if (activeTab === "equipo") fetchEquipoEvento();
    if (activeTab === "trabajadores") fetchTrabajadoresEvento();
  }, [activeTab, fetchActividad, fetchDocumentos, fetchEquipoEvento, fetchTrabajadoresEvento]);

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
              {canEditar && (
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
              )}
              {canEliminar && (
                <Button
                  icon={<DeleteOutlined />}
                  className="cd-btn-delete"
                  loading={deleting}
                  onClick={handleDelete}
                >
                  Eliminar
                </Button>
              )}
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
              className={`cd-tab-btn ${activeTab === "pagos" ? "cd-tab-btn-active" : ""}`}
              onClick={() => setActiveTab("pagos")}
            >
              <DollarOutlined />
              Abonos y Pagos
            </button>
              <button
              className={`cd-tab-btn ${activeTab === "equipo" ? "cd-tab-btn-active" : ""}`}
              onClick={() => setActiveTab("equipo")}
            >
              <AppstoreOutlined />
              Equipo
            </button>
            <button
              className={`cd-tab-btn ${activeTab === "trabajadores" ? "cd-tab-btn-active" : ""}`}
              onClick={() => setActiveTab("trabajadores")}
            >
              <TeamOutlined />
              Trabajadores
            </button>
            <button
              className={`cd-tab-btn ${activeTab === "historial" ? "cd-tab-btn-active" : ""}`}
              onClick={() => setActiveTab("historial")}
            >
              <ClockCircleOutlined />
              Historial
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

              {(evento.id_paquete_sonido || evento.id_paquete_fotografia) && (
                <div className="cd-misa-block">
                  <div className="cd-misa-title">
                    <GiftOutlined style={{ fontSize: 13, color: "#6b7280" }} />
                    Paquetes contratados
                  </div>
                  <div className="cd-misa-fields">
                    {evento.id_paquete_sonido && (
                      <div>
                        <span className="cd-field-label">Paquete Sonido</span>
                        <span className="cd-field-value">
                          {paquetesSonido.find(p => p.id_paquete_sonido === evento.id_paquete_sonido)?.nombre || `Paquete #${evento.id_paquete_sonido}`}
                        </span>
                      </div>
                    )}
                    {evento.id_paquete_fotografia && (
                      <div>
                        <span className="cd-field-label">Paquete Fotografía</span>
                        <span className="cd-field-value">
                          {paquetesFoto.find(p => p.id_paquete_fotografia === evento.id_paquete_fotografia)?.nombre || `Paquete #${evento.id_paquete_fotografia}`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
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
        {/* Tab 7: Equipo */}
        {activeTab === "equipo" && (
          <div className="cd-card">
            <div className="cd-pagos-header">
              <div className="cd-pagos-header-left">
                <div className="cd-card-icon-wrap"><AppstoreOutlined /></div>
                <h2 className="cd-card-title">Equipo del evento</h2>
              </div>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                className="cd-btn-add-pago"
                onClick={() => {
                  setEquipoSearch("");
                  setEquipoCantidades({});
                  fetchCatalogo();
                  setEquipoModalOpen(true);
                }}
              >
                Agregar equipo
              </Button>
            </div>

            {loadingEquipo ? (
              <div className="cd-loading-wrap"><Spin size="large" /></div>
            ) : equipoEvento.length === 0 ? (
              <Empty description="Sin equipo asignado a este evento" style={{ margin: "32px 0" }} />
            ) : (
              <div className="cd-ev-card-grid">
                {equipoEvento.map((ee) => (
                  <div key={ee.id_contrato_equipo} className="cd-ev-card">
                    <div className="cd-ev-card-image">
                      {ee.path_equipo ? (
                        <img src={`${API_BASE}/${ee.path_equipo}`} alt={ee.nombre_equipo} className="cd-ev-card-img" />
                      ) : (
                        <div className="cd-ev-card-no-img">
                          <span className="cd-ev-no-img-icon">📷</span>
                          <span className="cd-ev-no-img-text">Sin imagen</span>
                        </div>
                      )}
                    </div>
                    <div className="cd-ev-card-body">
                      <div className="cd-ev-card-name">{ee.nombre_equipo || "—"}</div>
                      {ee.nombre_categoria && (
                        <span className="cd-ev-badge">{ee.nombre_categoria}</span>
                      )}
                      <div className="cd-ev-card-meta">
                        <span className="cd-ev-meta-label">Cantidad</span>
                        <span className="cd-ev-meta-val cd-ev-meta-qty">{ee.cantidad}</span>
                      </div>
                    </div>
                    <button
                      className="cd-ev-card-remove"
                      title="Quitar del evento"
                      onClick={() => {
                        Modal.confirm({
                          title: "Quitar equipo",
                          content: `¿Quitar "${ee.nombre_equipo}" del evento?`,
                          okText: "Quitar",
                          okType: "danger",
                          cancelText: "Cancelar",
                          centered: true,
                          onOk: async () => {
                            try {
                              await apiEventosInstance.delete(
                                `/eventos/${idEvento}/equipo/${ee.id_contrato_equipo}`,
                                { headers: authHeaderEventos() }
                              );
                              notification.success({ message: "Equipo quitado del evento" });
                              fetchEquipoEvento();
                            } catch (err) {
                              notification.error({
                                message: "Error al quitar equipo",
                                description: err?.response?.data?.detail || err.message,
                              });
                            }
                          },
                        });
                      }}
                    >
                      <MinusOutlined />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 8: Trabajadores */}
        {activeTab === "trabajadores" && (
          <div className="cd-card">
            <div className="cd-pagos-header">
              <div className="cd-pagos-header-left">
                <div className="cd-card-icon-wrap"><TeamOutlined /></div>
                <h2 className="cd-card-title">Trabajadores del evento</h2>
              </div>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                className="cd-btn-add-pago"
                onClick={() => {
                  setTrabSearch("");
                  setTrabSelectedId(null);
                  setTrabSelectedPuesto(null);
                  fetchCatalogoTrabajadores();
                  setTrabajadoresModalOpen(true);
                }}
              >
                Agregar trabajador
              </Button>
            </div>

            {loadingTrabajadores ? (
              <div className="cd-loading-wrap"><Spin size="large" /></div>
            ) : trabajadoresEvento.length === 0 ? (
              <Empty description="Sin trabajadores asignados a este evento" style={{ margin: "32px 0" }} />
            ) : (
              <div className="cd-ev-card-grid">
                {trabajadoresEvento.map((ct) => (
                  <div key={ct.id_contrato_trabajador} className="cd-ev-card">
                    <div className="cd-ev-card-image">
                      {ct.path_trabajador ? (
                        <img src={`${API_BASE}/${ct.path_trabajador}`} alt={ct.nombre_trabajador} className="cd-ev-card-img" />
                      ) : (
                        <div className="cd-ev-card-no-img">
                          <div className="cd-ev-avatar">
                            {((ct.nombre_trabajador || " ")[0] || "").toUpperCase()}
                            {((ct.apellido_trabajador || " ")[0] || "").toUpperCase()}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="cd-ev-card-body">
                      <div className="cd-ev-card-name" style={{ textTransform: "capitalize" }}>
                        {ct.nombre_trabajador} {ct.apellido_trabajador}
                      </div>
                      {ct.nombre_puesto && (
                        <span className="cd-ev-badge">{ct.nombre_puesto}</span>
                      )}
                    </div>
                    <button
                      className="cd-ev-card-remove"
                      title="Quitar del evento"
                      onClick={() => {
                        Modal.confirm({
                          title: "Quitar trabajador",
                          content: `¿Quitar a "${ct.nombre_trabajador} ${ct.apellido_trabajador}" del evento?`,
                          okText: "Quitar",
                          okType: "danger",
                          cancelText: "Cancelar",
                          centered: true,
                          onOk: async () => {
                            try {
                              await apiEventosInstance.delete(
                                `/eventos/${idEvento}/trabajadores/${ct.id_contrato_trabajador}`,
                                { headers: authHeaderEventos() }
                              );
                              notification.success({ message: "Trabajador quitado del evento" });
                              fetchTrabajadoresEvento();
                            } catch (err) {
                              notification.error({
                                message: "Error al quitar trabajador",
                                description: err?.response?.data?.detail || err.message,
                              });
                            }
                          },
                        });
                      }}
                    >
                      <MinusOutlined />
                    </button>
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

      {/* Modal: Agregar equipo */}
      <Modal
        open={equipoModalOpen}
        onCancel={() => setEquipoModalOpen(false)}
        footer={null}
        title={
          <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
            Agregar equipo al evento
          </div>
        }
        centered
        width={700}
        destroyOnClose
        styles={{ body: { padding: "20px 24px 24px" } }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          <Input
            placeholder="Buscar por nombre o categoría..."
            value={equipoSearch}
            onChange={(e) => setEquipoSearch(e.target.value)}
            allowClear
            style={{ borderRadius: 10, height: 40 }}
          />

          {loadingCatalogo ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
              <Spin size="large" />
            </div>
          ) : (() => {
            const busqueda = equipoSearch.trim().toLowerCase();
            const filtrado = catalogoEquipo.filter((eq) =>
              !busqueda ||
              eq.nombre.toLowerCase().includes(busqueda) ||
              (eq.nombre_categoria || "").toLowerCase().includes(busqueda)
            );

            const grupos = {};
            for (const eq of filtrado) {
              const cat = eq.nombre_categoria || "Sin categoría";
              if (!grupos[cat]) grupos[cat] = [];
              grupos[cat].push(eq);
            }

            if (filtrado.length === 0) {
              return <Empty description="Sin resultados" style={{ margin: "32px 0" }} />;
            }

            return (
              <div style={{
                maxHeight: 460,
                overflowY: "auto",
                border: "1px solid #e2e8f0",
                borderRadius: 12,
                background: "#fafbfc",
              }}>
                {Object.entries(grupos).sort(([a], [b]) => a.localeCompare(b)).map(([cat, items]) => (
                  <div key={cat}>
                    {/* Category header */}
                    <div style={{
                      position: "sticky", top: 0, zIndex: 1,
                      fontSize: 10, fontWeight: 800, textTransform: "uppercase",
                      letterSpacing: "0.09em", color: "#94a3b8",
                      padding: "10px 16px 8px",
                      background: "#f1f5f9",
                      borderBottom: "1px solid #e2e8f0",
                    }}>
                      {cat}
                    </div>

                    {items.map((eq, idx) => {
                      const disponible = eq.cantidad_disponible ?? 0;
                      const cantVal = equipoCantidades[eq.id_equipo] ?? 1;
                      const sinStock = disponible <= 0;
                      const excede = cantVal > disponible;

                      return (
                        <div
                          key={eq.id_equipo}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "auto 1fr auto auto",
                            alignItems: "center",
                            gap: 14,
                            padding: "12px 16px",
                            borderBottom: idx < items.length - 1 ? "1px solid #f1f5f9" : "none",
                            opacity: sinStock ? 0.5 : 1,
                            background: "transparent",
                          }}
                        >
                          {/* Thumbnail */}
                          <div style={{
                            width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                            overflow: "hidden", background: "#e2e8f0",
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            {eq.path ? (
                              <img
                                src={`${API_BASE}/${eq.path}`}
                                alt={eq.nombre}
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                              />
                            ) : (
                              <AppstoreOutlined style={{ fontSize: 18, color: "#94a3b8" }} />
                            )}
                          </div>

                          {/* Info */}
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a", textTransform: "capitalize" }}>
                              {eq.nombre}
                            </div>
                            <div style={{ marginTop: 3 }}>
                              {sinStock ? (
                                <span style={{
                                  display: "inline-block", fontSize: 11, fontWeight: 700,
                                  color: "#b91c1c", background: "#fee2e2",
                                  borderRadius: 6, padding: "1px 8px",
                                }}>
                                  Sin stock
                                </span>
                              ) : (
                                <span style={{
                                  display: "inline-block", fontSize: 11, fontWeight: 700,
                                  color: "#15803d", background: "#dcfce7",
                                  borderRadius: 6, padding: "1px 8px",
                                }}>
                                  {disponible} disponible{disponible !== 1 ? "s" : ""}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Quantity input */}
                          <Input
                            type="number"
                            min={1}
                            max={disponible}
                            value={cantVal}
                            disabled={sinStock}
                            onChange={(e) => {
                              const v = parseInt(e.target.value, 10);
                              setEquipoCantidades((prev) => ({
                                ...prev,
                                [eq.id_equipo]: isNaN(v) ? 1 : Math.max(1, v),
                              }));
                            }}
                            style={{
                              width: 72, textAlign: "center",
                              borderRadius: 8, height: 36,
                            }}
                          />

                          {/* Add button */}
                          <Button
                            type="primary"
                            disabled={sinStock || excede}
                            loading={savingEquipoId === eq.id_equipo}
                            style={
                              sinStock || excede
                                ? { borderRadius: 8, height: 36, minWidth: 80 }
                                : { background: "#05060a", borderColor: "#05060a", borderRadius: 8, height: 36, minWidth: 80, fontWeight: 700 }
                            }
                            onClick={async () => {
                              setSavingEquipoId(eq.id_equipo);
                              try {
                                await apiEventosInstance.post(
                                  `/eventos/${idEvento}/equipo`,
                                  { id_equipo: eq.id_equipo, cantidad: cantVal },
                                  { headers: authHeaderEventos() }
                                );
                                notification.success({ message: `${eq.nombre} agregado al evento` });
                                fetchEquipoEvento();
                                fetchCatalogo();
                              } catch (err) {
                                notification.error({
                                  message: "No se pudo agregar",
                                  description: err?.response?.data?.detail || err.message,
                                });
                              } finally {
                                setSavingEquipoId(null);
                              }
                            }}
                          >
                            Agregar
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </Modal>

      {/* Modal: Agregar trabajador */}
      <Modal
        open={trabajadoresModalOpen}
        onCancel={() => setTrabajadoresModalOpen(false)}
        footer={null}
        title={
          <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
            Agregar trabajador al evento
          </div>
        }
        centered
        width={660}
        destroyOnClose
        styles={{ body: { padding: "20px 24px 24px" } }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Search */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "#64748b", marginBottom: 8 }}>
              Selecciona un trabajador
            </div>
            <Input
              placeholder="Buscar por nombre, apellido o puesto..."
              value={trabSearch}
              onChange={(e) => setTrabSearch(e.target.value)}
              allowClear
              style={{ marginBottom: 10, borderRadius: 10 }}
            />
            <div style={{
              maxHeight: 260,
              overflowY: "auto",
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              background: "#fafbfc",
            }}>
              {(() => {
                const q = trabSearch.trim().toLowerCase();
                const filtered = catalogoTrabajadores.filter((t) =>
                  !q ||
                  (t.nombre || "").toLowerCase().includes(q) ||
                  (t.apellido || "").toLowerCase().includes(q) ||
                  (t.nombre_puesto || "").toLowerCase().includes(q)
                );
                if (filtered.length === 0) {
                  return (
                    <div style={{ padding: "28px 16px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
                      Sin resultados
                    </div>
                  );
                }
                const asignadosIds = new Set(trabajadoresEvento.map((ct) => ct.id_trabajador));
                return filtered.map((t, idx) => {
                  const isSelected = trabSelectedId === t.id_trabajador;
                  const yaAsignado = asignadosIds.has(t.id_trabajador);
                  return (
                    <div
                      key={t.id_trabajador}
                      onClick={() => !yaAsignado && setTrabSelectedId(t.id_trabajador)}
                      style={{
                        padding: "12px 16px",
                        cursor: yaAsignado ? "not-allowed" : "pointer",
                        background: yaAsignado ? "#f8fafc" : isSelected ? "#f0f9ff" : "transparent",
                        borderBottom: idx < filtered.length - 1 ? "1px solid #f1f5f9" : "none",
                        borderLeft: isSelected ? "3px solid #0ea5e9" : "3px solid transparent",
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        opacity: yaAsignado ? 0.5 : 1,
                        transition: "background 0.12s",
                      }}
                    >
                      {/* Avatar or photo */}
                      <div style={{
                        width: 40, height: 40, borderRadius: "50%",
                        background: t.path
                          ? `url(${API_BASE}/${t.path}) center/cover no-repeat`
                          : "linear-gradient(140deg,#1e293b,#475569)",
                        color: "#fff", display: "flex", alignItems: "center",
                        justifyContent: "center", fontWeight: 800, fontSize: 13,
                        flexShrink: 0, border: isSelected ? "2px solid #0ea5e9" : "2px solid transparent",
                      }}>
                        {!t.path && (
                          <>
                            {((t.nombre || " ")[0] || "").toUpperCase()}
                            {((t.apellido || " ")[0] || "").toUpperCase()}
                          </>
                        )}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a", textTransform: "capitalize" }}>
                          {t.nombre} {t.apellido}
                        </div>
                        {yaAsignado ? (
                          <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginTop: 1 }}>
                            Ya asignado al evento
                          </div>
                        ) : t.nombre_puesto && (
                          <div style={{ fontSize: 12, color: "#64748b", fontWeight: 500, marginTop: 1 }}>
                            {t.nombre_puesto}
                          </div>
                        )}
                      </div>

                      {isSelected && (
                        <div style={{
                          width: 20, height: 20, borderRadius: "50%",
                          background: "#0ea5e9", display: "flex",
                          alignItems: "center", justifyContent: "center", flexShrink: 0,
                        }}>
                          <CheckCircleOutlined style={{ color: "#fff", fontSize: 12 }} />
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
              {catalogoTrabajadores.length === 0 && (
                <div style={{ padding: "28px 16px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
                  Sin trabajadores registrados
                </div>
              )}
            </div>
          </div>

          {/* Puesto */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "#64748b", marginBottom: 8 }}>
              Puesto en este evento
            </div>
            <select
              value={trabSelectedPuesto ?? ""}
              onChange={(e) => setTrabSelectedPuesto(e.target.value ? Number(e.target.value) : null)}
              style={{
                width: "100%", padding: "10px 14px", borderRadius: 10,
                border: "1px solid #e2e8f0", fontSize: 14, background: "#f8fafc",
                outline: "none", color: "#0f172a", appearance: "auto",
              }}
            >
              <option value="">Sin puesto específico</option>
              {puestosEvento.map((p) => (
                <option key={p.id_puesto} value={p.id_puesto}>{p.nombre}</option>
              ))}
            </select>
          </div>

          {/* Action button */}
          <Button
            type="primary"
            block
            loading={savingTrab}
            style={{
              background: "#05060a",
              borderColor: "#05060a",
              height: 44,
              borderRadius: 12,
              fontWeight: 700,
              fontSize: 14,
              color: "#fff",
            }}
            onClick={async () => {
              if (!trabSelectedId) {
                notification.warning({ message: "Selecciona un trabajador primero" });
                return;
              }
              setSavingTrab(true);
              try {
                await apiEventosInstance.post(
                  `/eventos/${idEvento}/trabajadores`,
                  { id_trabajador: trabSelectedId, id_puesto: trabSelectedPuesto },
                  { headers: authHeaderEventos() }
                );
                const selected = catalogoTrabajadores.find((t) => t.id_trabajador === trabSelectedId);
                notification.success({ message: `${selected?.nombre || "Trabajador"} agregado al evento` });
                fetchTrabajadoresEvento();
                setTrabajadoresModalOpen(false);
              } catch (err) {
                notification.error({
                  message: "No se pudo agregar",
                  description: err?.response?.data?.detail || err.message,
                });
              } finally {
                setSavingTrab(false);
              }
            }}
          >
            Agregar al evento
          </Button>
        </div>
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
