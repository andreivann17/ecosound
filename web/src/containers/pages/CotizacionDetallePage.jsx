import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePermisos } from "../../context/PermisosContext";
import dayjs from "dayjs";
import "dayjs/locale/es";
import {
  apiCotizacionesInstance,
  authHeaderCotizaciones,
} from "../../redux/actions/cotizaciones/cotizaciones";
import { previewCotizacionPdf, printCotizacionPdf } from "../../components/utils/printCotizacionPdf";
import logoImg from "../../assets/img/logo_hersoft_event.webp";

import {
  Button,
  Modal,
  Form,
  Input,
  DatePicker,
  TimePicker,
  Select,
  Spin,
  Timeline,
  Empty,
  Divider,
  Tooltip,
  Dropdown,
} from "antd";
import {
  EditOutlined,
  EllipsisOutlined,
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
  CheckOutlined,
  CloseOutlined,
} from "@ant-design/icons";

import Toast from "../../components/toasts/toast";
import SuccessOverlay from "../../components/feedback/SuccessOverlay";
import "./EventoDetallePage.css";
import "./CotizacionDetallePage.css";
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

// Íconos estilo Tabler (outlined) consistentes con el formulario "Nuevo evento".
const _SVG_PROPS = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};
const SERVICE_ICONS = {
  1: (
    <svg {..._SVG_PROPS}>
      <path d="M18 8a3 3 0 0 1 0 6" />
      <path d="M10 8v11a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-5" />
      <path d="M12 8h0l4.524-3.77a.9.9 0 0 1 1.476.692v10.156a.9.9 0 0 1-1.476.692L12 12H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
    </svg>
  ),
  2: (
    <svg {..._SVG_PROPS}>
      <path d="M5 7h2a2 2 0 0 0 2-2 1 1 0 0 1 1-1h4a1 1 0 0 1 1 1 2 2 0 0 0 2 2h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  ),
  3: (
    <svg {..._SVG_PROPS}>
      <path d="M4 3v6a3 3 0 0 0 3 3v9" />
      <path d="M7 3v9" />
      <path d="M17 3v8c0 1.5-1 3-3 3v6" />
      <path d="M14 11h6" />
    </svg>
  ),
  4: (
    <svg {..._SVG_PROPS}>
      <path d="M8 21h8" />
      <path d="M12 15v6" />
      <path d="M17 3l1 5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4l1-5z" />
      <path d="M7 8h10" />
    </svg>
  ),
};
const SERVICIO_LABEL = {
  1: "Sonido",
  2: "Fotografía",
  3: "Banquete",
  4: "Barra",
};

// Misma paleta de colores distintos usada en el chip de "tipo de evento" (EventosPage.jsx),
// aquí aplicada al pill de "Paquete" para que cada paquete se distinga de reojo por su tono.
const CHIP_PALETTE = [
  { bg: "#d8e2ff", text: "#0b3f9e", darkBg: "rgba(59, 130, 246, 0.22)",  darkText: "#93c5fd" }, // azul
  { bg: "#ffdad6", text: "#93000a", darkBg: "rgba(239, 68, 68, 0.22)",   darkText: "#fca5a5" }, // rojo
  { bg: "#c8f5c8", text: "#004d00", darkBg: "rgba(34, 197, 94, 0.22)",   darkText: "#86efac" }, // verde
  { bg: "#ffddb5", text: "#5c3600", darkBg: "rgba(245, 158, 11, 0.22)",  darkText: "#fbbf24" }, // ámbar
  { bg: "#ede9fe", text: "#5b21b6", darkBg: "rgba(139, 92, 246, 0.22)",  darkText: "#c4b5fd" }, // morado
  { bg: "#93f2f2", text: "#003030", darkBg: "rgba(20, 184, 166, 0.22)",  darkText: "#5eead4" }, // teal
  { bg: "#ffd6e8", text: "#9d174d", darkBg: "rgba(236, 72, 153, 0.22)",  darkText: "#f9a8d4" }, // rosa
  { bg: "#ffe4c7", text: "#7c2d12", darkBg: "rgba(249, 115, 22, 0.22)",  darkText: "#fdba74" }, // naranja
  { bg: "#e8eaed", text: "#44474e", darkBg: "rgba(148, 163, 184, 0.18)", darkText: "#cbd5e1" }, // gris
  { bg: "#e0e7ff", text: "#3730a3", darkBg: "rgba(99, 102, 241, 0.22)",  darkText: "#a5b4fc" }, // índigo
];

const hashKey = (str) => {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
};

const getChipColors = (key) => {
  const n = CHIP_PALETTE.length;
  const h = hashKey(String(key));
  const idx = h % n;
  const cycle = Math.floor(h / n) % 5;
  const base = CHIP_PALETTE[idx];
  if (cycle <= 0) return base;
  const hueShift = (cycle * 37) % 360;
  const satAdj = cycle % 2 === 0 ? 1.15 : 0.85;
  return { ...base, filter: `hue-rotate(${hueShift}deg) saturate(${satAdj})` };
};

// Tipo numérico que usa el módulo de Paquetes (0=Fotografía,1=Sonido,2=Decoraciones,3=Barra),
// distinto al id_servicio (1=Sonido,2=Fotografía,3=Banquete,4=Barra) de eventos/cotizaciones_servicios.
const SERVICIO_TO_PAQUETE_TIPO = { 1: 1, 2: 0, 3: 2, 4: 3 };

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

export default function CotizacionDetallePage() {
  const { idCotizacion } = useParams();
  const navigate = useNavigate();
  const { perm } = usePermisos() || { perm: () => true };
  const canEditar   = true;
  const canEliminar = true;
  const canConsultarUsuarios = perm("usuarios", "consultar");
  const canConsultarPaquetes = perm("paquetes", "consultar");

  const [evento, setEvento] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const toast = (msg) => { setToastMsg(msg); setShowToast(true); };
  const [success, setSuccess] = useState({ show: false, title: "", subtitle: "" });
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
  const [estadoSaving, setEstadoSaving] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportHtml, setReportHtml] = useState("");

  const [paquetesSonido, setPaquetesSonido] = useState([]);
  const [paquetesFoto, setPaquetesFoto] = useState([]);
  const [paquetesDecoracion, setPaquetesDecoracion] = useState([]);
  const [paquetesBarra, setPaquetesBarra] = useState([]);

  // Edición inline por card
  const [editingClientCard, setEditingClientCard] = useState(false);
  const [editingClientForm, setEditingClientForm] = useState({});
  const [savingClientCard, setSavingClientCard] = useState(false);

  const [editingCotCard, setEditingCotCard] = useState(false);
  const [editingCotForm, setEditingCotForm] = useState({});
  const [savingCotCard, setSavingCotCard] = useState(false);

  const [editingServiceKey, setEditingServiceKey] = useState(null);
  const [editingServiceForm, setEditingServiceForm] = useState({});
  const [savingService, setSavingService] = useState(false);

  const [servicioModalOpen, setServicioModalOpen] = useState(false);
  const [nuevoServicioTipo, setNuevoServicioTipo] = useState(null);
  const [savingServicio, setSavingServicio] = useState(false);
  const [servicioForm] = Form.useForm();

  const pdfInputRef = useRef(null);
  const docInputRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.all([
      apiCotizacionesInstance.get(`/cotizaciones/${idCotizacion}`, { headers: authHeaderCotizaciones() }),
      apiCotizacionesInstance.get("/cotizaciones/config/paquetes-sonido",     { headers: authHeaderCotizaciones() }),
      apiCotizacionesInstance.get("/cotizaciones/config/paquetes-fotografia", { headers: authHeaderCotizaciones() }),
      apiCotizacionesInstance.get("/cotizaciones/config/paquetes-decoracion",  { headers: authHeaderCotizaciones() }).catch(() => ({ data: [] })),
      apiCotizacionesInstance.get("/cotizaciones/config/paquetes-barra",      { headers: authHeaderCotizaciones() }).catch(() => ({ data: [] })),
    ])
      .then(([evRes, psRes, pfRes, pbqRes, pbrRes]) => {
        if (mounted) {
          setEvento(evRes.data);
          setPaquetesSonido(Array.isArray(psRes.data)   ? psRes.data   : []);
          setPaquetesFoto(Array.isArray(pfRes.data)     ? pfRes.data   : []);
          setPaquetesDecoracion(Array.isArray(pbqRes.data) ? pbqRes.data : []);
          setPaquetesBarra(Array.isArray(pbrRes.data)    ? pbrRes.data : []);
        }
      })
      .catch(() => toast("No se pudo cargar la cotización"))
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [idCotizacion]);

  // Aceptar / Rechazar cotización — actualiza el estado en el backend
  const handleSetEstado = async (nuevoEstado) => {
    setEstadoSaving(true);
    try {
      await apiCotizacionesInstance.patch(
        `/cotizaciones/${idCotizacion}`,
        { estado: nuevoEstado },
        { headers: authHeaderCotizaciones() }
      );
      setEvento((prev) => (prev ? { ...prev, estado: nuevoEstado } : prev));
      toast(nuevoEstado === "aceptada" ? "Cotización aceptada" : "Cotización rechazada");
    } catch (err) {
      toast(err?.response?.data?.detail || err.message || "No se pudo actualizar el estado");
    } finally {
      setEstadoSaving(false);
    }
  };

  const refetchCotizacion = useCallback(async () => {
    try {
      const { data } = await apiCotizacionesInstance.get(
        `/cotizaciones/${idCotizacion}`,
        { headers: authHeaderCotizaciones() }
      );
      if (data) setEvento(data);
    } catch { /* ignore */ }
  }, [idCotizacion]);

  const handleSaveClientCard = async () => {
    setSavingClientCard(true);
    try {
      await apiCotizacionesInstance.patch(
        `/cotizaciones/${idCotizacion}`,
        {
          cliente_nombre: editingClientForm.cliente_nombre,
          celular: editingClientForm.celular,
          domicilio: editingClientForm.domicilio,
          comentarios: editingClientForm.comentarios,
        },
        { headers: authHeaderCotizaciones() }
      );
      await refetchCotizacion();
      setEditingClientCard(false);
      toast("Datos del cliente actualizados");
    } catch (err) {
      toast(err?.response?.data?.detail || err.message || "Error al guardar");
    } finally {
      setSavingClientCard(false);
    }
  };

  const handleSaveCotCard = async () => {
    setSavingCotCard(true);
    try {
      await apiCotizacionesInstance.patch(
        `/cotizaciones/${idCotizacion}`,
        {
          id_tipo_evento: editingCotForm.id_tipo_evento,
          importe: editingCotForm.importe,
        },
        { headers: authHeaderCotizaciones() }
      );
      await refetchCotizacion();
      setEditingCotCard(false);
      toast("Cotización actualizada");
    } catch (err) {
      toast(err?.response?.data?.detail || err.message || "Error al guardar");
    } finally {
      setSavingCotCard(false);
    }
  };

  const startEditService = (sv, idx) => {
    setEditingServiceKey(idx);
    setEditingServiceForm({
      fecha: sv.fecha ? dayjs(sv.fecha) : null,
      hora_inicio: sv.hora_inicio || "",
      hora_final: sv.hora_final || "",
      id_ciudad: sv.id_ciudad || null,
      lugar: sv.lugar || "",
      id_paquete: sv.id_paquete || null,
      comentarios: sv.comentarios || "",
    });
  };

  const handleSaveService = async (sv) => {
    const updatedServicios = (evento.servicios || []).map((s) => {
      if (s.id_cotizacion_servicio !== sv.id_cotizacion_servicio) return s;
      return {
        ...s,
        fecha: editingServiceForm.fecha
          ? dayjs(editingServiceForm.fecha).format("YYYY-MM-DD")
          : s.fecha,
        hora_inicio: editingServiceForm.hora_inicio || s.hora_inicio,
        hora_final: editingServiceForm.hora_final || s.hora_final,
        id_ciudad: editingServiceForm.id_ciudad ?? s.id_ciudad,
        lugar: editingServiceForm.lugar ?? s.lugar,
        id_paquete: editingServiceForm.id_paquete ?? s.id_paquete,
        comentarios: editingServiceForm.comentarios ?? s.comentarios,
      };
    });
    setSavingService(true);
    try {
      await apiCotizacionesInstance.patch(
        `/cotizaciones/${idCotizacion}`,
        { servicios: updatedServicios },
        { headers: authHeaderCotizaciones() }
      );
      await refetchCotizacion();
      setEditingServiceKey(null);
      toast("Servicio actualizado");
    } catch (err) {
      toast(err?.response?.data?.detail || err.message || "Error al guardar");
    } finally {
      setSavingService(false);
    }
  };

  const handleDeleteService = (sv) => {
    Modal.confirm({
      title: "Eliminar servicio",
      content: `¿Eliminar "${SERVICIO_LABEL[sv.id_servicio] || "este servicio"}" de la cotización?`,
      okText: "Eliminar",
      okType: "danger",
      cancelText: "Cancelar",
      centered: true,
      onOk: async () => {
        const updatedServicios = (evento.servicios || []).filter(
          (s) => s.id_cotizacion_servicio !== sv.id_cotizacion_servicio
        );
        try {
          await apiCotizacionesInstance.patch(
            `/cotizaciones/${idCotizacion}`,
            { servicios: updatedServicios },
            { headers: authHeaderCotizaciones() }
          );
          await refetchCotizacion();
          toast("Servicio eliminado");
        } catch (err) {
          toast(err?.response?.data?.detail || err.message || "Error al eliminar");
        }
      },
    });
  };

  const handleOpenAddServicio = () => {
    setNuevoServicioTipo(null);
    servicioForm.resetFields();
    setServicioModalOpen(true);
  };

  const handleAddServicio = async () => {
    if (!nuevoServicioTipo) {
      toast("Selecciona un tipo de servicio");
      return;
    }
    let values;
    try {
      values = await servicioForm.validateFields();
    } catch {
      return;
    }
    const nuevoServicio = {
      id_servicio: nuevoServicioTipo,
      fecha: values.fecha ? dayjs(values.fecha).format("YYYY-MM-DD") : null,
      hora_inicio: values.hora_inicio ? dayjs(values.hora_inicio).format("HH:mm") : null,
      hora_final: values.hora_final ? dayjs(values.hora_final).format("HH:mm") : null,
      id_ciudad: values.id_ciudad || null,
      lugar: values.lugar || null,
      id_paquete: values.id_paquete || null,
      comentarios: values.comentarios || null,
    };
    const updatedServicios = [...(evento.servicios || []), nuevoServicio];
    setSavingServicio(true);
    try {
      await apiCotizacionesInstance.patch(
        `/cotizaciones/${idCotizacion}`,
        { servicios: updatedServicios },
        { headers: authHeaderCotizaciones() }
      );
      await refetchCotizacion();
      setServicioModalOpen(false);
      servicioForm.resetFields();
      setNuevoServicioTipo(null);
      toast("Servicio agregado");
    } catch (err) {
      toast(err?.response?.data?.detail || err.message || "Error al agregar");
    } finally {
      setSavingServicio(false);
    }
  };

  const fetchPagos = useCallback(async () => {
    try {
      const { data } = await apiCotizacionesInstance.get(
        `/cotizaciones/${idCotizacion}/pagos`,
        { headers: authHeaderCotizaciones() }
      );
      setPagos(Array.isArray(data) ? data : data.items ?? []);
    } catch {
      setPagos([]);
    }
  }, [idCotizacion]);

  useEffect(() => { fetchPagos(); }, [fetchPagos]);

  const fetchActividad = useCallback(async () => {
    setLoadingActividad(true);
    try {
      const { data } = await apiCotizacionesInstance.get(
        `/cotizaciones/${idCotizacion}/actividad`,
        { headers: authHeaderCotizaciones() }
      );
      setActividad(Array.isArray(data) ? data : data.items ?? []);
    } catch {
      setActividad([]);
    } finally {
      setLoadingActividad(false);
    }
  }, [idCotizacion]);

  const fetchDocumentos = useCallback(async () => {
    setLoadingDocs(true);
    try {
      const { data } = await apiCotizacionesInstance.get(
        `/cotizaciones/${idCotizacion}/documentos`,
        { headers: authHeaderCotizaciones() }
      );
      const docs = Array.isArray(data) ? data : [];
      const pdfs = docs.filter((d) => d.id_tipo_documento === 1);
      const validPdfs = (
        await Promise.all(
          pdfs.map(async (d) => {
            try {
              const res = await fetch(`${API_BASE}/${d.path}`, { method: "HEAD" });
              return res.ok ? d : null;
            } catch {
              return null;
            }
          })
        )
      ).filter(Boolean);
      setEventoPdfs(validPdfs);
      setDocumentos(docs.filter((d) => d.id_tipo_documento !== 1));
    } catch {
      setEventoPdfs([]);
      setDocumentos([]);
    } finally {
      setLoadingDocs(false);
    }
  }, [idCotizacion]);

  const fetchEquipoEvento = useCallback(async () => {
    setLoadingEquipo(true);
    try {
      const { data } = await apiCotizacionesInstance.get(
        `/cotizaciones/${idCotizacion}/equipo`,
        { headers: authHeaderCotizaciones() }
      );
      setEquipoEvento(Array.isArray(data) ? data : []);
    } catch {
      setEquipoEvento([]);
    } finally {
      setLoadingEquipo(false);
    }
  }, [idCotizacion]);

  const fetchCatalogo = useCallback(async () => {
    setLoadingCatalogo(true);
    try {
      const { data } = await apiCotizacionesInstance.get(
        `/cotizaciones/${idCotizacion}/equipo-catalogo`,
        { headers: authHeaderCotizaciones() }
      );
      setCatalogoEquipo(Array.isArray(data) ? data : []);
    } catch {
      setCatalogoEquipo([]);
    } finally {
      setLoadingCatalogo(false);
    }
  }, [idCotizacion]);

  const fetchTrabajadoresEvento = useCallback(async () => {
    setLoadingTrabajadores(true);
    try {
      const { data } = await apiCotizacionesInstance.get(
        `/cotizaciones/${idCotizacion}/trabajadores`,
        { headers: authHeaderCotizaciones() }
      );
      setTrabajadoresEvento(Array.isArray(data) ? data : []);
    } catch {
      setTrabajadoresEvento([]);
    } finally {
      setLoadingTrabajadores(false);
    }
  }, [idCotizacion]);

  const fetchCatalogoTrabajadores = useCallback(async () => {
    try {
      const [resTrab, resPuestos] = await Promise.all([
        apiCotizacionesInstance.get("/trabajadores", { headers: authHeaderCotizaciones() }),
        apiCotizacionesInstance.get("/trabajadores/puestos", { headers: authHeaderCotizaciones() }),
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
      title: "Eliminar cotización",
      content: "La cotización se marcará como inactiva. Esta acción se puede revertir.",
      okText: "Eliminar",
      okType: "danger",
      cancelText: "Cancelar",
      centered: true,
      onOk: async () => {
        try {
          setDeleting(true);
          await apiCotizacionesInstance.delete(`/cotizaciones/${idCotizacion}`, {
            headers: authHeaderCotizaciones(),
          });
          setSuccess({
            show: true,
            title: "¡Cotización eliminada!",
            subtitle: `La cotización de "${evento?.cliente_nombre || ""}" se eliminó correctamente.`,
          });
        } catch (err) {
          toast(err?.response?.data?.detail || err.message || "Error al eliminar");
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
          await apiCotizacionesInstance.delete(
            `/cotizaciones/${idCotizacion}/pagos/${pago.id || pago.id_pago}`,
            { headers: authHeaderCotizaciones() }
          );
          toast("Abono eliminado");
          fetchPagos();
        } catch (err) {
          toast(err?.response?.data?.detail || err.message || "Error al eliminar abono");
        }
      },
    });
  };

  const handleAddPago = async () => {
    let values;
    try { values = await pagoForm.validateFields(); } catch { return; }
    setSavingPago(true);
    try {
      await apiCotizacionesInstance.post(
        `/cotizaciones/${idCotizacion}/pagos`,
        {
          monto: String(values.monto),
          fecha: dayjs(values.fecha).format("YYYY-MM-DDTHH:mm:ss"),
          descripcion: values.descripcion?.trim() || null,
        },
        { headers: authHeaderCotizaciones() }
      );
      toast("Abono registrado exitosamente");
      pagoForm.resetFields();
      setPagoModalOpen(false);
      fetchPagos();
    } catch (err) {
      toast(err?.response?.data?.detail || err.message || "Error al guardar abono");
    } finally {
      setSavingPago(false);
    }
  };

  const handleUploadPdf = async (file) => {
    if (!file) return;
    if (getFileType(file.name) !== "pdf") {
      toast("Solo se permiten archivos PDF para el evento");
      return;
    }
    setUploadingPdf(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      await apiCotizacionesInstance.post(
        `/cotizaciones/${idCotizacion}/documentos?id_tipo_documento=1`,
        fd,
        { headers: { ...authHeaderCotizaciones(), "Content-Type": "multipart/form-data" } }
      );
      toast("Evento PDF subido correctamente");
      fetchDocumentos();
    } catch (err) {
      toast(err?.response?.data?.detail || err.message || "Error al subir el PDF");
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
      await apiCotizacionesInstance.post(
        `/cotizaciones/${idCotizacion}/documentos?id_tipo_documento=2`,
        fd,
        { headers: { ...authHeaderCotizaciones(), "Content-Type": "multipart/form-data" } }
      );
      toast("Documento subido correctamente");
      fetchDocumentos();
    } catch (err) {
      toast(err?.response?.data?.detail || err.message || "Error al subir el documento");
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
          await apiCotizacionesInstance.delete(
            `/cotizaciones/${idCotizacion}/documentos/${doc.id}`,
            { headers: authHeaderCotizaciones() }
          );
          toast("Documento eliminado");
          fetchDocumentos();
        } catch (err) {
          toast(err?.response?.data?.detail || err.message || "Error al eliminar");
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

  const ESTADO_LABEL = { pendiente: "Pendiente", aceptada: "Aceptada", rechazada: "Rechazada" };
  const estadoCot = (() => {
    const e = String(evento.estado || "pendiente").toLowerCase();
    return ESTADO_LABEL[e] ? e : "pendiente";
  })();

  // Arma los datos del documento PDF de la cotización (para el cliente)
  const buildReportData = () => {
    const arr = Array.isArray(evento.servicios) ? evento.servicios : [];
    const base = arr.length > 0 ? arr : [
      (evento.fecha_evento || evento.lugar_evento) ? {
        id_servicio: 1, fecha: evento.fecha_evento,
        hora_inicio: evento.hora_inicio ? fmtHora(evento.hora_inicio) : null,
        hora_final: evento.hora_final ? fmtHora(evento.hora_final) : null,
        id_ciudad: evento.id_ciudad, lugar: evento.lugar_evento, id_paquete: evento.id_paquete_sonido,
      } : null,
      (evento.datetime_fotografia || evento.lugar_fotografia) ? {
        id_servicio: 2, fecha: evento.datetime_fotografia,
        hora_inicio: evento.datetime_fotografia ? dayjs(evento.datetime_fotografia).format("HH:mm") : null,
        hora_final: null,
        id_ciudad: evento.id_ciudad_fotografia, lugar: evento.lugar_fotografia, id_paquete: evento.id_paquete_fotografia,
      } : null,
    ].filter(Boolean);

    const servicios = base.map((sv) => {
      const hi = sv.hora_inicio || null;
      const hf = sv.hora_final || null;
      const horario = hi && hf ? `${hi} — ${hf}` : (hi || hf || "—");
      let paquete = "Sin paquete";
      if (sv.id_paquete) {
        if (sv.id_servicio === 1) paquete = paquetesSonido.find((p) => p.id_paquete_sonido === sv.id_paquete)?.nombre || `Paquete #${sv.id_paquete}`;
        else if (sv.id_servicio === 2) paquete = paquetesFoto.find((p) => p.id_paquete_fotografia === sv.id_paquete)?.nombre || `Paquete #${sv.id_paquete}`;
        else if (sv.id_servicio === 3) paquete = paquetesDecoracion.find((p) => p.id_paquete_decoracion === sv.id_paquete)?.nombre || `Paquete #${sv.id_paquete}`;
        else if (sv.id_servicio === 4) paquete = paquetesBarra.find((p) => p.id_paquete_barra === sv.id_paquete)?.nombre || `Paquete #${sv.id_paquete}`;
        else paquete = `Paquete #${sv.id_paquete}`;
      }
      return {
        label: SERVICIO_LABEL[sv.id_servicio] || "Servicio",
        fecha: fmtFechaCorta(sv.fecha),
        ciudad: CIUDAD_MAP[sv.id_ciudad] || "—",
        lugar: sv.lugar || "—",
        horario,
        paquete,
      };
    });

    return {
      folio: evento.folio,
      estado: estadoCot,
      estadoLabel: ESTADO_LABEL[estadoCot],
      cliente: evento.cliente_nombre,
      celular: evento.celular,
      domicilio: evento.domicilio,
      comentarios: evento.comentarios,
      tipoLabel,
      importe: evento.importe,
      vendedor: evento.created_by_nombre,
      validezDias: evento.dias_validez || 15,
      logo: logoImg,
      servicios,
    };
  };

  const handleOpenReport = async () => {
    const html = await previewCotizacionPdf(buildReportData());
    setReportHtml(html);
    setReportOpen(true);
  };

  const totalPagosAdicionales = pagos.reduce((a, p) => a + parseNum(p.monto), 0);
  const resta = (() => {
    if (!evento.importe) return null;
    const total = parseNum(evento.importe);
    const anticipo = parseNum(evento.importe_anticipo);
    return total - anticipo - totalPagosAdicionales;
  })();

  const tipoLabel = TIPO_EVENTO_MAP[evento.id_tipo_evento] ||
    (evento.id_paquete_fotografia || evento.lugar_fotografia || evento.datetime_fotografia
      ? "Fotografía"
      : "Sesión");
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
    <div className="cd-main cd-cotizacion-detalle">
      <div className="cd-content">


        <Modal
          open={reportOpen}
          onCancel={() => setReportOpen(false)}
          title="Cotización para el cliente"
          width={900}
          centered
          destroyOnClose
          footer={
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <Button onClick={() => setReportOpen(false)}>Cerrar</Button>
              <Button
                type="primary"
                icon={<FileTextOutlined />}
                style={{ background: "var(--eh-primary-btn)", borderColor: "var(--eh-primary-btn)" }}
                onClick={() => printCotizacionPdf(buildReportData())}
              >
                Descargar PDF
              </Button>
            </div>
          }
        >
          <div style={{ height: "72vh", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
            <iframe
              title="preview-cotizacion"
              style={{ width: "100%", height: "100%", border: 0, background: "#fff" }}
              srcDoc={reportHtml}
            />
          </div>
        </Modal>

        <div className="cd-header-card">
          <div className="cd-header-top">
            <div>
              <div className="cd-header-name-row">
                <h1 className="cd-client-name">
                  {(evento.cliente_nombre + " - " + tipoLabel || "—").toUpperCase()}
                </h1>
                <span className={`cd-estado-badge cd-estado-${estadoCot}`}>
                  <span className={`cd-estado-dot cd-estado-dot-${estadoCot}`} />
                  {ESTADO_LABEL[estadoCot]}
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
                  <span
                    className={`cd-meta-item${evento.created_by_code && canConsultarUsuarios ? " cd-meta-link" : ""}`}
                    onClick={() => {
                      if (evento.created_by_code && canConsultarUsuarios) {
                        navigate(`/app/usuarios/${evento.created_by_code}`);
                      }
                    }}
                    title={evento.created_by_code && !canConsultarUsuarios ? "Sin permiso de consulta" : undefined}
                  >
                    <UserOutlined />
                    {evento.created_by_nombre}
                  </span>
                )}
              </div>
            </div>

            <div className="cd-header-actions">
              <Button
                icon={<FileTextOutlined />}
                className="cd-btn-report"
                onClick={handleOpenReport}
              >
                Cotización PDF
              </Button>
              {canEliminar && (
                <Button
                  icon={<DeleteOutlined />}
                  className="cd-btn-delete"
                  loading={deleting}
                  disabled={success.show}
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
              Datos de la cotización
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

        {/* Tab 1: Datos de la cotización */}
        {activeTab === "datos" && (() => {
          // Resolución de servicios — usa el array nuevo del backend; si está vacío
          // (eventos antiguos), reconstruye desde los campos planos legacy.
          const serviciosArr = Array.isArray(evento.servicios) ? evento.servicios : [];
          const serviciosShown = serviciosArr.length > 0
            ? serviciosArr
            : [
                evento.fecha_evento || evento.lugar_evento ? {
                  id_servicio: 1,
                  fecha: evento.fecha_evento,
                  hora_inicio: evento.hora_inicio ? fmtHora(evento.hora_inicio) : null,
                  hora_final:  evento.hora_final  ? fmtHora(evento.hora_final)  : null,
                  id_ciudad: evento.id_ciudad,
                  lugar: evento.lugar_evento,
                  id_paquete: evento.id_paquete_sonido,
                  comentarios: evento.comentarios,
                } : null,
                evento.datetime_fotografia || evento.lugar_fotografia ? {
                  id_servicio: 2,
                  fecha: evento.datetime_fotografia,
                  hora_inicio: evento.datetime_fotografia ? dayjs(evento.datetime_fotografia).format("HH:mm") : null,
                  hora_final: null,
                  id_ciudad: evento.id_ciudad_fotografia,
                  lugar: evento.lugar_fotografia,
                  id_paquete: evento.id_paquete_fotografia,
                  comentarios: evento.comentarios_fotografia,
                } : null,
              ].filter(Boolean);

          const paqueteName = (sv) => {
            if (!sv.id_paquete) return null;
            // 1=Sonido, 2=Fotografía, 3=Banquete, 4=Barra
            if (sv.id_servicio === 1) {
              return paquetesSonido.find((p) => p.id_paquete_sonido === sv.id_paquete)?.nombre
                || `Paquete #${sv.id_paquete}`;
            }
            if (sv.id_servicio === 2) {
              return paquetesFoto.find((p) => p.id_paquete_fotografia === sv.id_paquete)?.nombre
                || `Paquete #${sv.id_paquete}`;
            }
            if (sv.id_servicio === 3) {
              return paquetesDecoracion.find((p) => p.id_paquete_decoracion === sv.id_paquete)?.nombre
                || `Paquete #${sv.id_paquete}`;
            }
            if (sv.id_servicio === 4) {
              return paquetesBarra.find((p) => p.id_paquete_barra === sv.id_paquete)?.nombre
                || `Paquete #${sv.id_paquete}`;
            }
            return `Paquete #${sv.id_paquete}`;
          };

          return (
          <div className="cd-bento-grid">
            <div className="cd-card cd-card-client">
              <div className="cd-card-header">
                <div className="cd-card-icon-wrap"><UserOutlined /></div>
                <h2 className="cd-card-title">Datos del cliente</h2>
                {canEditar && !editingClientCard && (
                  <Dropdown
                    trigger={["click"]}
                    menu={{
                      items: [
                        {
                          key: "editar", icon: <EditOutlined />, label: "Editar",
                          onClick: () => {
                            setEditingClientForm({
                              cliente_nombre: evento.cliente_nombre || "",
                              celular: evento.celular || "",
                              domicilio: evento.domicilio || "",
                              comentarios: evento.comentarios || "",
                            });
                            setEditingClientCard(true);
                          },
                        },
                      ],
                    }}
                  >
                    <Button type="text" icon={<EllipsisOutlined />} size="small" style={{ marginLeft: "auto" }} />
                  </Dropdown>
                )}
              </div>
              {editingClientCard ? (
                <div className="cd-edit-form">
                  <div className="cd-edit-field">
                    <span className="cd-field-label">Nombre Completo</span>
                    <Input value={editingClientForm.cliente_nombre}
                      onChange={(e) => setEditingClientForm((f) => ({ ...f, cliente_nombre: e.target.value }))} />
                  </div>
                  <div className="cd-edit-field">
                    <span className="cd-field-label">Teléfono Móvil</span>
                    <Input value={editingClientForm.celular}
                      onChange={(e) => setEditingClientForm((f) => ({ ...f, celular: e.target.value }))} />
                  </div>
                  <div className="cd-edit-field">
                    <span className="cd-field-label">Domicilio</span>
                    <Input value={editingClientForm.domicilio}
                      onChange={(e) => setEditingClientForm((f) => ({ ...f, domicilio: e.target.value }))} />
                  </div>
                  <div className="cd-edit-field">
                    <span className="cd-field-label">Comentarios</span>
                    <Input.TextArea rows={2} value={editingClientForm.comentarios}
                      onChange={(e) => setEditingClientForm((f) => ({ ...f, comentarios: e.target.value }))} />
                  </div>
                  <div className="cd-edit-form-actions">
                    <Button onClick={() => setEditingClientCard(false)}>Cancelar</Button>
                    <Button type="primary" loading={savingClientCard} onClick={handleSaveClientCard} style={{ background: "var(--eh-primary-btn)", borderColor: "var(--eh-primary-btn)" }}>Guardar</Button>
                  </div>
                </div>
              ) : (
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
              )}
            </div>

            <div className="cd-card cd-card-event">
              <div className="cd-card-header">
                <div className="cd-card-icon-wrap"><CalendarOutlined /></div>
                <h2 className="cd-card-title">Datos de la cotización</h2>
                {canEditar && !editingCotCard && (
                  <Dropdown
                    trigger={["click"]}
                    menu={{
                      items: [
                        {
                          key: "editar", icon: <EditOutlined />, label: "Editar",
                          onClick: () => {
                            setEditingCotForm({
                              id_tipo_evento: evento.id_tipo_evento || null,
                              importe: evento.importe || "",
                            });
                            setEditingCotCard(true);
                          },
                        },
                      ],
                    }}
                  >
                    <Button type="text" icon={<EllipsisOutlined />} size="small" style={{ marginLeft: "auto" }} />
                  </Dropdown>
                )}
              </div>

              <div className="cd-estado-folio">
                <div>
                  <span className="cd-field-label">Estado</span>
                  <span className={`cd-estado-chip cd-estado-${estadoCot}`}>{ESTADO_LABEL[estadoCot]}</span>
                </div>
                <div className="cd-estado-folio-right">
                  <span className="cd-field-label">Folio</span>
                  <span className="cd-folio-val">#{evento.folio || "—"}</span>
                </div>
              </div>

              {editingCotCard ? (
                <div className="cd-edit-form">
                  <div className="cd-edit-field">
                    <span className="cd-field-label">Tipo de evento</span>
                    <Select
                      value={editingCotForm.id_tipo_evento}
                      onChange={(v) => setEditingCotForm((f) => ({ ...f, id_tipo_evento: v }))}
                      options={Object.entries(TIPO_EVENTO_MAP).map(([value, label]) => ({ value: Number(value), label }))}
                      allowClear
                      placeholder="Seleccionar tipo"
                    />
                  </div>
                  <div className="cd-edit-field">
                    <span className="cd-field-label">Importe total</span>
                    <Input
                      value={editingCotForm.importe}
                      onChange={(e) => setEditingCotForm((f) => ({ ...f, importe: e.target.value }))}
                      prefix="$"
                    />
                  </div>
                  <div className="cd-edit-form-actions">
                    <Button onClick={() => setEditingCotCard(false)}>Cancelar</Button>
                    <Button type="primary" loading={savingCotCard} onClick={handleSaveCotCard} style={{ background: "var(--eh-primary-btn)", borderColor: "var(--eh-primary-btn)" }}>Guardar</Button>
                  </div>
                </div>
              ) : (
                <div className="cd-cot-resumen">
                  <div className="cd-cot-tile">
                    <span className="cd-field-label">Tipo de evento</span>
                    <span className="cd-pill">{tipoLabel || "—"}</span>
                  </div>
                  <div className="cd-cot-tile cd-cot-tile-importe">
                    <span className="cd-field-label">Importe total</span>
                    <span className="cd-cot-importe-val">
                      <DollarOutlined className="cd-cot-importe-icon" />
                      {fmtMoney(evento.importe)}
                    </span>
                  </div>
                </div>
              )}

              <div className="cd-estado-actions">
                <button
                  type="button"
                  className={`cd-btn-aceptar ${estadoCot === "aceptada" ? "is-active" : ""}`}
                  disabled={estadoSaving || editingCotCard || estadoCot === "aceptada"}
                  onClick={() => handleSetEstado("aceptada")}
                >
                  <CheckOutlined /> Aceptar cotización
                </button>
                <button
                  type="button"
                  className={`cd-btn-rechazar ${estadoCot === "rechazada" ? "is-active" : ""}`}
                  disabled={estadoSaving || editingCotCard || estadoCot === "rechazada"}
                  onClick={() => handleSetEstado("rechazada")}
                >
                  <CloseOutlined /> Rechazar
                </button>
              </div>
            </div>

            {/* Encabezado amigable que introduce los servicios */}
            <div className="cd-servicios-banner">
              <div className="cd-servicios-banner-icon"><AppstoreOutlined /></div>
              <div className="cd-servicios-banner-text">
                <h3 className="cd-servicios-banner-title">Servicios de la cotización</h3>
                <p className="cd-servicios-banner-sub">
                  Esto es lo que incluye la cotización: fecha, lugar y horario de cada servicio.
                </p>
              </div>
              {serviciosShown.length > 0 && (
                <span className="cd-servicios-banner-count">
                  {serviciosShown.length} {serviciosShown.length === 1 ? "servicio" : "servicios"}
                </span>
              )}
              <Button
                icon={<PlusOutlined />}
                onClick={handleOpenAddServicio}
                className="cd-btn-add-servicio"
              >
                Agregar servicio
              </Button>
            </div>

            {/* Servicios contratados — un card por servicio */}
            {serviciosShown.map((sv, idx) => {
                  const horaIni = sv.hora_inicio || null;
                  const horaFin = sv.hora_final  || null;
                  const horasLabel = horaIni && horaFin
                    ? `${horaIni} — ${horaFin}`
                    : (horaIni || horaFin || "—");
                  const pname = paqueteName(sv);
                  const isEditing = editingServiceKey === idx;

                  const paqueteOptions = (() => {
                    if (sv.id_servicio === 1) return paquetesSonido.map((p) => ({ value: p.id_paquete_sonido, label: p.nombre }));
                    if (sv.id_servicio === 2) return paquetesFoto.map((p) => ({ value: p.id_paquete_fotografia, label: p.nombre }));
                    if (sv.id_servicio === 3) return paquetesDecoracion.map((p) => ({ value: p.id_paquete_decoracion, label: p.nombre }));
                    if (sv.id_servicio === 4) return paquetesBarra.map((p) => ({ value: p.id_paquete_barra, label: p.nombre }));
                    return [];
                  })();

                  return (
                    <div key={`${sv.id_servicio}-${sv.id_cotizacion_servicio || ""}`} className="cd-card cd-card-servicio">
                      <div className="cd-card-header">
                        <div className="cd-card-icon-wrap cd-icon-tabler">
                          {SERVICE_ICONS[sv.id_servicio]}
                        </div>
                        <h2 className="cd-card-title">{SERVICIO_LABEL[sv.id_servicio] || "Servicio"}</h2>
                        {canEditar && !isEditing && (
                          <Dropdown
                            trigger={["click"]}
                            menu={{
                              items: [
                                { key: "editar", icon: <EditOutlined />, label: "Editar", onClick: () => startEditService(sv, idx) },
                                { type: "divider" },
                                { key: "eliminar", icon: <DeleteOutlined />, label: "Eliminar", danger: true, onClick: () => handleDeleteService(sv) },
                              ],
                            }}
                          >
                            <Button type="text" icon={<EllipsisOutlined />} size="small" style={{ marginLeft: "auto" }} />
                          </Dropdown>
                        )}
                      </div>

                      {isEditing ? (
                        <div className="cd-edit-form">
                          <div className="cd-edit-field">
                            <span className="cd-field-label">Fecha</span>
                            <DatePicker
                              value={editingServiceForm.fecha}
                              onChange={(v) => setEditingServiceForm((f) => ({ ...f, fecha: v }))}
                              format="DD/MM/YYYY"
                            />
                          </div>
                          <div className="cd-edit-form-row">
                            <div className="cd-edit-field">
                              <span className="cd-field-label">Hora inicio</span>
                              <Input
                                value={editingServiceForm.hora_inicio}
                                onChange={(e) => setEditingServiceForm((f) => ({ ...f, hora_inicio: e.target.value }))}
                                placeholder="HH:mm"
                              />
                            </div>
                            <div className="cd-edit-field">
                              <span className="cd-field-label">Hora final</span>
                              <Input
                                value={editingServiceForm.hora_final}
                                onChange={(e) => setEditingServiceForm((f) => ({ ...f, hora_final: e.target.value }))}
                                placeholder="HH:mm"
                              />
                            </div>
                          </div>
                          <div className="cd-edit-field">
                            <span className="cd-field-label">Ciudad</span>
                            <Select
                              value={editingServiceForm.id_ciudad}
                              onChange={(v) => setEditingServiceForm((f) => ({ ...f, id_ciudad: v }))}
                              options={Object.entries(CIUDAD_MAP).map(([value, label]) => ({ value: Number(value), label }))}
                              allowClear
                              placeholder="Seleccionar ciudad"
                            />
                          </div>
                          <div className="cd-edit-field">
                            <span className="cd-field-label">Lugar</span>
                            <Input
                              value={editingServiceForm.lugar}
                              onChange={(e) => setEditingServiceForm((f) => ({ ...f, lugar: e.target.value }))}
                              placeholder="Lugar del servicio"
                            />
                          </div>
                          {paqueteOptions.length > 0 && (
                            <div className="cd-edit-field">
                              <span className="cd-field-label">Paquete</span>
                              <Select
                                value={editingServiceForm.id_paquete}
                                onChange={(v) => setEditingServiceForm((f) => ({ ...f, id_paquete: v }))}
                                options={paqueteOptions}
                                allowClear
                                placeholder="Sin paquete"
                              />
                            </div>
                          )}
                          <div className="cd-edit-field">
                            <span className="cd-field-label">Comentarios</span>
                            <Input.TextArea
                              rows={2}
                              value={editingServiceForm.comentarios}
                              onChange={(e) => setEditingServiceForm((f) => ({ ...f, comentarios: e.target.value }))}
                              placeholder="Comentarios..."
                            />
                          </div>
                          <div className="cd-edit-form-actions">
                            <Button onClick={() => setEditingServiceKey(null)}>Cancelar</Button>
                            <Button type="primary" loading={savingService} onClick={() => handleSaveService(sv)} style={{ background: "var(--eh-primary-btn)", borderColor: "var(--eh-primary-btn)" }}>Guardar</Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="cd-servicio-grid">
                            <div>
                              <span className="cd-field-label">Fecha</span>
                              <div className="cd-field-icon-row">
                                <CalendarOutlined className="cd-field-row-icon" />
                                <span className="cd-field-value">{fmtFechaCorta(sv.fecha)}</span>
                              </div>
                            </div>
                            <div>
                              <span className="cd-field-label">Ciudad</span>
                              <div className="cd-field-icon-row">
                                <EnvironmentOutlined className="cd-field-row-icon" />
                                <span className="cd-field-value">{CIUDAD_MAP[sv.id_ciudad] || "—"}</span>
                              </div>
                            </div>
                            <div>
                              <span className="cd-field-label">Horario</span>
                              <div className="cd-field-icon-row">
                                <ClockCircleOutlined className="cd-field-row-icon" />
                                <span className="cd-field-value">{horasLabel}</span>
                              </div>
                            </div>
                          </div>
                          <div className="cd-servicio-grid2">
                            <div>
                              <span className="cd-field-label">Lugar</span>
                              <span className="cd-field-value">{sv.lugar || "—"}</span>
                            </div>
                            <div>
                              <span className="cd-field-label">Paquete</span>
                              <div style={{ marginTop: 4 }}>
                                {pname
                                  ? (() => {
                                      const pillColor = getChipColors(`${sv.id_servicio}-${sv.id_paquete}`);
                                      const tipoPaquete = SERVICIO_TO_PAQUETE_TIPO[sv.id_servicio];
                                      const clickable = Boolean(navigate && canConsultarPaquetes && tipoPaquete !== undefined);
                                      return (
                                        <span
                                          className={`cd-pill${clickable ? " cd-pill-link" : ""}`}
                                          style={{
                                            "--chip-bg": pillColor.bg,
                                            "--chip-text": pillColor.text,
                                            "--chip-bg-dark": pillColor.darkBg,
                                            "--chip-text-dark": pillColor.darkText,
                                            filter: pillColor.filter,
                                          }}
                                          onClick={clickable
                                            ? () => navigate(`/app/paquetes/${sv.id_paquete}?tipo=${tipoPaquete}`)
                                            : undefined}
                                        >
                                          {pname}
                                        </span>
                                      );
                                    })()
                                  : <span className="cd-field-value cd-field-value-muted">Sin paquete</span>}
                              </div>
                            </div>
                            {sv.comentarios && (
                              <div>
                                <span className="cd-field-label">Comentarios</span>
                                <p className="cd-servicio-comentarios">{sv.comentarios}</p>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
          </div>
          );
        })()}

        {/* Tab 2: Historial */}
        {activeTab === "historial" && (
          <div className="cd-card">
            <div className="cd-card-header">
              <div className="cd-card-icon-wrap"><ClockCircleOutlined /></div>
              <h2 className="cd-card-title">Historial de la cotización</h2>
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
                Actividad de la cotización
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
                <h2 className="cd-card-title">Equipo de la cotización</h2>
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
              <Empty description="Sin equipo asignado a esta cotización" style={{ margin: "32px 0" }} />
            ) : (
              <div className="cd-ev-card-grid">
                {equipoEvento.map((ee) => (
                  <div key={ee.id_cotizacion_equipo} className="cd-ev-card">
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
                      title="Quitar de la cotización"
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
                              await apiCotizacionesInstance.delete(
                                `/cotizaciones/${idCotizacion}/equipo/${ee.id_cotizacion_equipo}`,
                                { headers: authHeaderCotizaciones() }
                              );
                              toast("Equipo quitado del evento");
                              fetchEquipoEvento();
                            } catch (err) {
                              toast(err?.response?.data?.detail || err.message || "Error al quitar equipo");
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
                <h2 className="cd-card-title">Trabajadores de la cotización</h2>
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
              <Empty description="Sin trabajadores asignados a esta cotización" style={{ margin: "32px 0" }} />
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
                      title="Quitar de la cotización"
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
                              await apiCotizacionesInstance.delete(
                                `/cotizaciones/${idCotizacion}/trabajadores/${ct.id_contrato_trabajador}`,
                                { headers: authHeaderCotizaciones() }
                              );
                              toast("Trabajador quitado del evento");
                              fetchTrabajadoresEvento();
                            } catch (err) {
                              toast(err?.response?.data?.detail || err.message || "Error al quitar trabajador");
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
        okButtonProps={{ style: { background: "var(--eh-primary-btn)", borderColor: "var(--eh-primary-btn)" } }}
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

      {/* Modal: Agregar servicio */}
      <Modal
        open={servicioModalOpen}
        onCancel={() => {
          setServicioModalOpen(false);
          servicioForm.resetFields();
          setNuevoServicioTipo(null);
        }}
        onOk={handleAddServicio}
        okText="Agregar servicio"
        cancelText="Cancelar"
        title={
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--eh-ink, #0f172a)" }}>
            Agregar servicio a la cotización
          </div>
        }
        confirmLoading={savingServicio}
        centered
        width={640}
        destroyOnClose
        okButtonProps={{ style: { background: "var(--eh-primary-btn)", borderColor: "var(--eh-primary-btn)" } }}
        styles={{ body: { padding: "20px 24px 4px" } }}
      >
        <p style={{ fontSize: 13, color: "var(--eh-ink-muted, #64748b)", marginTop: 0, marginBottom: 16 }}>
          Selecciona el tipo de servicio y completa fecha, lugar y horario.
        </p>

        <div style={{ display: "flex", gap: 10, marginBottom: 22 }}>
          {[1, 2, 3, 4].map((id) => {
            const active = nuevoServicioTipo === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setNuevoServicioTipo(id)}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                  padding: "18px 8px",
                  borderRadius: 12,
                  border: active ? "1px solid var(--eh-primary-btn)" : "1px solid var(--eh-surface-border, #e2e8f0)",
                  background: active ? "var(--eh-primary-btn)" : "var(--eh-surface-2, #fff)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <span className="cd-servicio-tipo-icon" style={{ color: active ? "#fff" : "var(--eh-ink-muted, #64748b)" }}>
                  {SERVICE_ICONS[id]}
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: active ? "#fff" : "var(--eh-ink-2, #374151)" }}>
                  {SERVICIO_LABEL[id]}
                </span>
              </button>
            );
          })}
        </div>

        <Form form={servicioForm} layout="vertical">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <Form.Item name="fecha" label="Fecha" rules={[{ required: true, message: "Requerido" }]}>
              <DatePicker style={{ width: "100%" }} format="DD MMM YYYY" placeholder="Selecciona fecha" />
            </Form.Item>
            <Form.Item name="id_ciudad" label="Ciudad" rules={[{ required: true, message: "Requerido" }]}>
              <Select
                placeholder="Selecciona la ciudad"
                options={Object.entries(CIUDAD_MAP).map(([value, label]) => ({ value: Number(value), label }))}
                allowClear
              />
            </Form.Item>
          </div>
          <Form.Item name="lugar" label="Lugar" rules={[{ required: true, message: "Requerido" }]}>
            <Input placeholder="Nombre del salón, jardín o lugar" />
          </Form.Item>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <Form.Item name="hora_inicio" label="Hora inicio" rules={[{ required: true, message: "Requerido" }]}>
              <TimePicker style={{ width: "100%" }} format="HH:mm" placeholder="--:-- --" minuteStep={15} needConfirm={false} />
            </Form.Item>
            <Form.Item name="hora_final" label="Hora fin" rules={[{ required: true, message: "Requerido" }]}>
              <TimePicker style={{ width: "100%" }} format="HH:mm" placeholder="--:-- --" minuteStep={15} needConfirm={false} />
            </Form.Item>
          </div>
          <Form.Item name="id_paquete" label="Paquete (opcional)">
            <Select
              placeholder="Sin paquete"
              allowClear
              options={
                nuevoServicioTipo === 1 ? paquetesSonido.map((p) => ({ value: p.id_paquete_sonido, label: p.nombre })) :
                nuevoServicioTipo === 2 ? paquetesFoto.map((p) => ({ value: p.id_paquete_fotografia, label: p.nombre })) :
                nuevoServicioTipo === 3 ? paquetesDecoracion.map((p) => ({ value: p.id_paquete_decoracion, label: p.nombre })) :
                nuevoServicioTipo === 4 ? paquetesBarra.map((p) => ({ value: p.id_paquete_barra, label: p.nombre })) :
                []
              }
            />
          </Form.Item>
          <Form.Item name="comentarios" label="Comentarios (opcional)">
            <Input.TextArea placeholder="Detalles específicos..." rows={2} maxLength={1000} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal: Agregar equipo */}
      <Modal
        open={equipoModalOpen}
        onCancel={() => setEquipoModalOpen(false)}
        footer={null}
        title={
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--eh-ink, #0f172a)" }}>
            Agregar equipo a la cotización
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
                border: "1px solid var(--eh-surface-border, #e2e8f0)",
                borderRadius: 12,
                background: "#fafbfc",
              }}>
                {Object.entries(grupos).sort(([a], [b]) => a.localeCompare(b)).map(([cat, items]) => (
                  <div key={cat}>
                    {/* Category header */}
                    <div style={{
                      position: "sticky", top: 0, zIndex: 1,
                      fontSize: 10, fontWeight: 800, textTransform: "uppercase",
                      letterSpacing: "0.09em", color: "var(--eh-ink-faint, #94a3b8)",
                      padding: "10px 16px 8px",
                      background: "var(--eh-surface-2, #f1f5f9)",
                      borderBottom: "1px solid var(--eh-surface-border, #e2e8f0)",
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
                            borderBottom: idx < items.length - 1 ? "1px solid var(--eh-surface-border, #f1f5f9)" : "none",
                            opacity: sinStock ? 0.5 : 1,
                            background: "transparent",
                          }}
                        >
                          {/* Thumbnail */}
                          <div style={{
                            width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                            overflow: "hidden", background: "var(--eh-surface-2, #e2e8f0)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            {eq.path ? (
                              <img
                                src={`${API_BASE}/${eq.path}`}
                                alt={eq.nombre}
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                              />
                            ) : (
                              <AppstoreOutlined style={{ fontSize: 18, color: "var(--eh-ink-faint, #94a3b8)" }} />
                            )}
                          </div>

                          {/* Info */}
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 14, color: "var(--eh-ink, #0f172a)", textTransform: "capitalize" }}>
                              {eq.nombre}
                            </div>
                            <div style={{ marginTop: 3 }}>
                              {sinStock ? (
                                <span style={{
                                  display: "inline-block", fontSize: 11, fontWeight: 700,
                                  color: "var(--eh-badge-red-text, #b91c1c)", background: "var(--eh-badge-red-bg, #fee2e2)",
                                  borderRadius: 6, padding: "1px 8px",
                                }}>
                                  Sin stock
                                </span>
                              ) : (
                                <span style={{
                                  display: "inline-block", fontSize: 11, fontWeight: 700,
                                  color: "var(--eh-badge-green-text, #15803d)", background: "var(--eh-badge-green-bg, #dcfce7)",
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
                                await apiCotizacionesInstance.post(
                                  `/cotizaciones/${idCotizacion}/equipo`,
                                  { id_equipo: eq.id_equipo, cantidad: cantVal },
                                  { headers: authHeaderCotizaciones() }
                                );
                                toast(`${eq.nombre} agregado al evento`);
                                fetchEquipoEvento();
                                fetchCatalogo();
                              } catch (err) {
                                toast(err?.response?.data?.detail || err.message || "No se pudo agregar");
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
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--eh-ink, #0f172a)" }}>
            Agregar trabajador a la cotización
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
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--eh-ink-muted, #64748b)", marginBottom: 8 }}>
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
              border: "1px solid var(--eh-surface-border, #e2e8f0)",
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
                    <div style={{ padding: "28px 16px", textAlign: "center", color: "var(--eh-ink-faint, #94a3b8)", fontSize: 13 }}>
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
                        <div style={{ fontWeight: 700, fontSize: 14, color: "var(--eh-ink, #0f172a)", textTransform: "capitalize" }}>
                          {t.nombre} {t.apellido}
                        </div>
                        {yaAsignado ? (
                          <div style={{ fontSize: 11, color: "var(--eh-ink-faint, #94a3b8)", fontWeight: 600, marginTop: 1 }}>
                            Ya asignado al evento
                          </div>
                        ) : t.nombre_puesto && (
                          <div style={{ fontSize: 12, color: "var(--eh-ink-muted, #64748b)", fontWeight: 500, marginTop: 1 }}>
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
                <div style={{ padding: "28px 16px", textAlign: "center", color: "var(--eh-ink-faint, #94a3b8)", fontSize: 13 }}>
                  Sin trabajadores registrados
                </div>
              )}
            </div>
          </div>

          {/* Puesto */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--eh-ink-muted, #64748b)", marginBottom: 8 }}>
              Puesto en este evento
            </div>
            <select
              value={trabSelectedPuesto ?? ""}
              onChange={(e) => setTrabSelectedPuesto(e.target.value ? Number(e.target.value) : null)}
              style={{
                width: "100%", padding: "10px 14px", borderRadius: 10,
                border: "1px solid var(--eh-surface-border, #e2e8f0)", fontSize: 14, background: "var(--eh-surface-2, #f8fafc)",
                outline: "none", color: "var(--eh-ink, #0f172a)", appearance: "auto",
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
                toast("Selecciona un trabajador primero");
                return;
              }
              setSavingTrab(true);
              try {
                await apiCotizacionesInstance.post(
                  `/cotizaciones/${idCotizacion}/trabajadores`,
                  { id_trabajador: trabSelectedId, id_puesto: trabSelectedPuesto },
                  { headers: authHeaderCotizaciones() }
                );
                const selected = catalogoTrabajadores.find((t) => t.id_trabajador === trabSelectedId);
                toast(`${selected?.nombre || "Trabajador"} agregado al evento`);
                fetchTrabajadoresEvento();
                setTrabajadoresModalOpen(false);
              } catch (err) {
                toast(err?.response?.data?.detail || err.message || "No se pudo agregar");
              } finally {
                setSavingTrab(false);
              }
            }}
          >
            Agregar a la cotización
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
        classNames={{ content: "ev-viewer-modal" }}
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
                <Button type="primary" style={{ background: "var(--eh-primary-btn)", borderColor: "var(--eh-primary-btn)" }}>
                  Descargar archivo
                </Button>
              </a>
            </div>
          );
        })()}
      </Modal>

      <Toast show={showToast} msg={toastMsg} setShow={setShowToast} />
      <SuccessOverlay
        show={success.show}
        title={success.title}
        subtitle={success.subtitle}
        onDone={() => navigate("/app/cotizaciones")}
      />
    </div>
  );
}
