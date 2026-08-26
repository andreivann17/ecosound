
import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import dayjs from "dayjs";
import {
  apiEventosInstance,
  authHeaderEventos,
} from "../../redux/actions/eventos/eventos";
import {
  apiPaquetesInstance,
  authHeaderPaquetes,
} from "../../redux/actions/paquetes/paquetes";
import { actionCiudadesGet } from "../../redux/actions/ciudades/ciudades";

import {
  Form,
  Input,
  DatePicker,
  TimePicker,
  Select,
  Button,
  Dropdown,
  Row,
  Col,
  Typography,
  Space,
  Upload,
  List,
  Spin,
  Tooltip,
  Modal,
  Tabs,
} from "antd";
import {
  ArrowLeftOutlined,
  FilePdfOutlined,
  InboxOutlined,
  DeleteOutlined,
  UserOutlined,
  CalendarOutlined,
  DollarOutlined,
  AlignLeftOutlined,
  EnvironmentOutlined,
  CameraOutlined,
  SoundOutlined,
  PlusOutlined,
  ImportOutlined,
  ThunderboltOutlined,
  DownloadOutlined,
  DownOutlined,
  CheckCircleFilled,
  ExclamationCircleFilled,
  CloseOutlined,
} from "@ant-design/icons";

import ImportarCotizacionModal from "./ImportarCotizacionModal";
import Toast from "../../components/toasts/toast";
import SuccessOverlay from "../../components/feedback/SuccessOverlay";
import "./EventosPage.css";

const { Title, Text } = Typography;
const { Dragger } = Upload;

// Íconos estilo Tabler (line icons 24x24) para el selector de servicios.
// Fijamos fill="none" + stroke="currentColor" en el SVG para que SIEMPRE
// se rendericen outlined, sin depender del contexto CSS donde se monten.
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
  sonido: (
    <svg {..._SVG_PROPS}>
      <path d="M18 8a3 3 0 0 1 0 6" />
      <path d="M10 8v11a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-5" />
      <path d="M12 8h0l4.524-3.77a.9.9 0 0 1 1.476.692v10.156a.9.9 0 0 1-1.476.692L12 12H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
    </svg>
  ),
  foto: (
    <svg {..._SVG_PROPS}>
      <path d="M5 7h2a2 2 0 0 0 2-2 1 1 0 0 1 1-1h4a1 1 0 0 1 1 1 2 2 0 0 0 2 2h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  ),
  decoracion: (
    <svg {..._SVG_PROPS}>
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  ),
  barra: (
    <svg {..._SVG_PROPS}>
      <path d="M8 21h8" />
      <path d="M12 15v6" />
      <path d="M17 3l1 5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4l1-5z" />
      <path d="M7 8h10" />
    </svg>
  ),
  misa: (
    <svg {..._SVG_PROPS}>
      <path d="M12 1v5" />
      <path d="M9.5 3.5h5" />
      <path d="M5 21v-8l7-5 7 5v8" />
      <path d="M9 21v-5h6v5" />
    </svg>
  ),
};

// Toggle card para seleccionar servicios del evento
function ServiceCard({ active, onClick, icon, label, selected, status }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={`cc-service-card${active ? " is-active" : ""}${selected ? " is-selected" : ""}`}
      aria-pressed={active}
    >
      {status === "ok" && (
        <CheckCircleFilled className="cc-service-status cc-service-status--ok" />
      )}
      {status === "warn" && (
        <ExclamationCircleFilled className="cc-service-status cc-service-status--warn" />
      )}
      <span className="cc-service-card-icon">{icon}</span>
      <span className="cc-service-card-label">{label}</span>
    </div>
  );
}

const FIELD_LABELS = {
  cliente_nombre:          "Nombre del cliente",
  importe:                 "Importe total",
  fecha_evento:            "Fecha del evento",
  id_tipo_evento:          "Tipo de evento",
  id_ciudad:               "Ciudad del evento",
  lugar_evento:            "Lugar del evento",
  hora_inicio:             "Hora inicio",
  hora_final:              "Hora fin",
  id_ciudad_fotografia:    "Ciudad (fotografía)",
  lugar_fotografia:        "Lugar (fotografía)",
  fecha_fotografia:        "Fecha (fotografía)",
  fecha_creacion_contrato: "Fecha de celebración del contrato",
};


const TIPOS_EVENTO = [
  { label: "Bodas", value: 1 },
  { label: "XV", value: 2 },
  { label: "Graduación", value: 3 },
  { label: "Corporativo", value: 4 },
  { label: "Cumpleaños", value: 5 },
  { label: "Otro", value: 6 },
];

function toDecimal(val) {
  const n = parseFloat(String(val ?? "").replace(/[^0-9.]/g, ""));
  return isNaN(n) ? "" : n.toFixed(2);
}

function parseOCRDate(str) {
  if (!str) return null;
  const parts = str.split("/");
  if (parts.length !== 3) return null;
  const [d, m, y] = parts;
  const parsed = dayjs(`${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`);
  return parsed.isValid() ? parsed : null;
}

function parseTime12(str) {
  if (!str) return null;
  const match = str.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return null;
  let h = parseInt(match[1]);
  const m = parseInt(match[2]);
  const ampm = match[3].toUpperCase();
  if (ampm === "PM" && h < 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  return dayjs().hour(h).minute(m).second(0);
}

function parseMoney(str) {
  if (!str) return "";
  const n = parseFloat(str.replace(/,/g, ""));
  return isNaN(n) ? "" : n.toFixed(2);
}

export default function CrearEventoPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const ciudadesRaw = useSelector((s) => {
    const d = s.ciudades?.data;
    return Array.isArray(d) ? d : [];
  });
  const ciudadesOptions = ciudadesRaw.map((c) => ({
    label: c.nombre,
    value: c.id_ciudad,
  }));

  const eventoEditar = location.state?.evento ?? null;
  const isEditing = !!eventoEditar;

  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const toast = (msg) => { setToastMsg(msg); setShowToast(true); };
  const [success, setSuccess] = useState({ show: false, title: "", subtitle: "" });
  const [importCotizacionOpen, setImportCotizacionOpen] = useState(false);
  const [autofillOpen, setAutofillOpen] = useState(false);
  const [autofillText, setAutofillText] = useState("");
  const [autofillError, setAutofillError] = useState("");

  useEffect(() => {
    dispatch(actionCiudadesGet());
    if (!isEditing) {
      form.setFieldValue("fecha_creacion_contrato", dayjs());
    }
  }, []);
  const [horaInicio, setHoraInicio] = useState(null);
  const [horaFinal, setHoraFinal] = useState(null);

  const [pendingFile, setPendingFile] = useState(null);
  const [documentos, setDocumentos] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  // Selección de servicios — al entrar a "Nuevo evento", Sonido queda activo y
  // seleccionado por default (el resto en false). Si está editando un evento
  // existente, el useEffect de abajo activa lo que tenga datos.
  const [hayEventoSonido, setHayEventoSonido] = useState(!eventoEditar);
  const [hayEventoFoto, setHayEventoFoto] = useState(false);
  const [hayDecoracion, setHayDecoracion] = useState(false);
  const [hayBarra, setHayBarra] = useState(false);
  const [hayMisa, setHayMisa] = useState(false);
  const [servicioTab, setServicioTab] = useState(eventoEditar ? null : 1);
  const [paquetesSonido, setPaquetesSonido] = useState([]);
  const [paquetesFoto, setPaquetesFoto] = useState([]);
  const [paquetesDecoracion, setPaquetesDecoracion] = useState([]);
  const [paquetesBarra, setPaquetesBarra] = useState([]);

  // Config maestra de servicios. id_servicio coincide con la tabla `servicios` (1..4).
  const SERVICIOS = [
    { id: 1, key: "sonido",     label: "Sonido",        icon: SERVICE_ICONS.sonido,     paquetes: paquetesSonido },
    { id: 2, key: "foto",       label: "Fotografía",    icon: SERVICE_ICONS.foto,       paquetes: paquetesFoto },
    { id: 3, key: "decoracion", label: "Decoraciones",  icon: SERVICE_ICONS.decoracion, paquetes: paquetesDecoracion },
    { id: 4, key: "barra",      label: "Barra",         icon: SERVICE_ICONS.barra,      paquetes: paquetesBarra },
  ];
  const activosByServicio = {
    1: hayEventoSonido,
    2: hayEventoFoto,
    3: hayDecoracion,
    4: hayBarra,
  };
  const setActivoByServicio = (id, value) => {
    if (id === 1) setHayEventoSonido(value);
    if (id === 2) setHayEventoFoto(value);
    if (id === 3) setHayDecoracion(value);
    if (id === 4) setHayBarra(value);
  };
  const serviciosActivos = SERVICIOS.filter((s) => activosByServicio[s.id]);

  const watchedValues = Form.useWatch([], form);
  const getServiceStatus = (id) => {
    const instances = svInstances[id] || [0];
    const REQUIRED = ['fecha', 'id_ciudad', 'lugar', 'hora_inicio', 'hora_final'];
    const ALL_FIELDS = [...REQUIRED, 'id_paquete', 'comentarios'];
    let hasAny = false;
    let allComplete = true;
    instances.forEach(instId => {
      if (ALL_FIELDS.some(f => watchedValues?.[svFieldI(id, instId, f)])) hasAny = true;
      if (!REQUIRED.every(f => watchedValues?.[svFieldI(id, instId, f)])) allComplete = false;
    });
    if (!hasAny) return null;
    return allComplete ? "ok" : "warn";
  };
  const getMisaStatus = () => {
    const dir = watchedValues?.direccion_misa;
    const fecha = watchedValues?.fecha_misa;
    const hora = watchedValues?.hora_misa;
    if (!dir && !fecha && !hora) return null;
    return (dir && fecha && hora) ? "ok" : "warn";
  };

  const handleNavClick = (id) => {
    if (!activosByServicio[id]) setActivoByServicio(id, true);
    setServicioTab(id);
  };
  const handleMisaNavClick = () => {
    if (!hayMisa) setHayMisa(true);
    setServicioTab("misa");
  };

  const addServiceInstance = (id) => {
    const newInstId = svNextIdRef.current++;
    setSvInstances(prev => ({ ...prev, [id]: [...prev[id], newInstId] }));
    setSvTabActive(prev => ({ ...prev, [id]: newInstId }));
  };

  const removeServiceInstance = (id, instId) => {
    const fields = ['fecha', 'id_ciudad', 'lugar', 'hora_inicio', 'hora_final', 'id_paquete', 'comentarios'];
    const reset = fields.reduce((acc, f) => ({ ...acc, [svFieldI(id, instId, f)]: undefined }), {});
    form.setFieldsValue(reset);
    setSvInstances(prev => {
      const next = prev[id].filter(i => i !== instId);
      setSvTabActive(t => ({ ...t, [id]: next[next.length - 1] ?? 0 }));
      return { ...prev, [id]: next };
    });
  };

  const clearServiceFields = (id, instId) => {
    const fields = ['fecha', 'id_ciudad', 'lugar', 'hora_inicio', 'hora_final', 'id_paquete', 'comentarios'];
    const reset = fields.reduce((acc, f) => ({ ...acc, [svFieldI(id, instId, f)]: undefined }), {});
    form.setFieldsValue(reset);
  };

  const clearMisaFields = () => {
    form.setFieldsValue({ direccion_misa: undefined, fecha_misa: undefined, hora_misa: undefined });
  };

  // Nombre de campo por servicio: sv{id}_{field} (instancia 0, backward compat)
  const svField  = (id, field) => `sv${id}_${field}`;
  // Instancia N>=1: sv{id}_i{instId}_{field}
  const svFieldI = (id, instId, field) =>
    instId === 0 ? svField(id, field) : `sv${id}_i${instId}_${field}`;

  // Multi-instancia: { 1: [0], 2: [0], 3: [0], 4: [0] }
  // Cada array contiene los IDs estables de cada instancia (0 = base).
  const [svInstances, setSvInstances] = useState({ 1: [0], 2: [0], 3: [0], 4: [0] });
  const [svTabActive, setSvTabActive] = useState({ 1: 0, 2: 0, 3: 0, 4: 0 });
  const svNextIdRef = useRef(1); // genera IDs estables para nuevas instancias

  const aiCacheRef = useRef({});

  useEffect(() => {
    const fetchPaquetes = async () => {
      try {
        const res = await apiPaquetesInstance.get("/paquetes", {
          headers: authHeaderPaquetes(),
        });
        const todos = res.data || [];
        const toOption = (p) => ({ label: p.nombre, value: p.id_paquete });
        // El backend devuelve is_paquete_sonido como tipo_id numérico:
        // 0=Fotografía, 1=Sonido, 2=Banquete, 3=Barra (NO es un boolean).
        const byTipo = (t) => todos.filter((p) => Number(p.is_paquete_sonido) === t).map(toOption);
        setPaquetesFoto(byTipo(0));
        setPaquetesSonido(byTipo(1));
        setPaquetesDecoracion(byTipo(2));
        setPaquetesBarra(byTipo(3));
      } catch {}
    };
    fetchPaquetes();
  }, []);

  useEffect(() => {
    if (!eventoEditar) return;

    const fm = eventoEditar.fecha_misa ? dayjs(eventoEditar.fecha_misa) : null;

    // Campos comunes (cliente, importes, tipo, misa, contrato)
    const baseValues = {
      cliente_nombre:          eventoEditar.cliente_nombre,
      domicilio:               eventoEditar.domicilio,
      celular:                 eventoEditar.celular,
      id_tipo_evento:          eventoEditar.id_tipo_evento,
      importe:                 eventoEditar.importe          ? toDecimal(eventoEditar.importe)          : "",
      fecha_anticipo:          eventoEditar.fecha_anticipo   ? dayjs(eventoEditar.fecha_anticipo)       : null,
      importe_anticipo:        eventoEditar.importe_anticipo ? toDecimal(eventoEditar.importe_anticipo) : "",
      fecha_creacion_contrato: eventoEditar.fecha_creacion_contrato ? dayjs(eventoEditar.fecha_creacion_contrato) : null,
      direccion_misa:          eventoEditar.direccion_misa   ?? "",
      fecha_misa:              fm,
      hora_misa:               fm,
    };

    // 1) Formato nuevo: eventoEditar.servicios = [{ id_servicio, fecha, ... }]
    if (Array.isArray(eventoEditar.servicios) && eventoEditar.servicios.length > 0) {
      const activos = new Set();
      const byService = {}; // { id: [sv, sv, ...] }
      eventoEditar.servicios.forEach((sv) => {
        const id = sv.id_servicio;
        if (!id) return;
        activos.add(id);
        if (!byService[id]) byService[id] = [];
        byService[id].push(sv);
      });

      // Construir instancias y valores de formulario
      const newInstances = { 1: [0], 2: [0], 3: [0], 4: [0] };
      let nextId = svNextIdRef.current;
      Object.entries(byService).forEach(([idStr, rows]) => {
        const id = parseInt(idStr);
        rows.forEach((sv, idx) => {
          const instId = idx === 0 ? 0 : nextId++;
          if (idx > 0) newInstances[id] = [...(newInstances[id] || [0]), instId];
          baseValues[svFieldI(id, instId, "fecha")]       = sv.fecha       ? dayjs(sv.fecha) : null;
          baseValues[svFieldI(id, instId, "hora_inicio")] = sv.hora_inicio ? dayjs(sv.hora_inicio, "HH:mm") : null;
          baseValues[svFieldI(id, instId, "hora_final")]  = sv.hora_final  ? dayjs(sv.hora_final,  "HH:mm") : null;
          baseValues[svFieldI(id, instId, "id_ciudad")]   = sv.id_ciudad ?? null;
          baseValues[svFieldI(id, instId, "lugar")]       = sv.lugar ?? "";
          baseValues[svFieldI(id, instId, "id_paquete")]  = sv.id_paquete ?? null;
          baseValues[svFieldI(id, instId, "comentarios")] = sv.comentarios ?? "";
        });
      });
      svNextIdRef.current = nextId;
      setSvInstances(newInstances);

      setHayEventoSonido(activos.has(1));
      setHayEventoFoto(activos.has(2));
      setHayDecoracion(activos.has(3));
      setHayBarra(activos.has(4));
      const firstActive = [1,2,3,4].find(id => activos.has(id));
      setServicioTab(firstActive ?? null);
    } else {
      // 2) Formato legacy: campos planos en el evento. Activamos sonido si hay
      // fecha_evento, foto si hay datetime_fotografia.
      const hi     = eventoEditar.hora_inicio        ? dayjs(eventoEditar.hora_inicio) : null;
      const hf     = eventoEditar.hora_final         ? dayjs(eventoEditar.hora_final)  : null;
      const dtFoto = eventoEditar.datetime_fotografia ? dayjs(eventoEditar.datetime_fotografia) : null;

      if (eventoEditar.fecha_evento) {
        baseValues[svField(1, "fecha")]       = dayjs(eventoEditar.fecha_evento);
        baseValues[svField(1, "hora_inicio")] = hi;
        baseValues[svField(1, "hora_final")]  = hf;
        baseValues[svField(1, "id_ciudad")]   = eventoEditar.id_ciudad ?? null;
        baseValues[svField(1, "lugar")]       = eventoEditar.lugar_evento ?? "";
        baseValues[svField(1, "id_paquete")]  = eventoEditar.id_paquete_sonido ?? null;
        baseValues[svField(1, "comentarios")] = eventoEditar.comentarios ?? "";
        setHayEventoSonido(true);
        setHoraInicio(hi);
        setHoraFinal(hf);
      }
      if (dtFoto) {
        baseValues[svField(2, "fecha")]       = dtFoto;
        baseValues[svField(2, "hora_inicio")] = dtFoto;
        baseValues[svField(2, "hora_final")]  = null;
        baseValues[svField(2, "id_ciudad")]   = eventoEditar.id_ciudad_fotografia ?? null;
        baseValues[svField(2, "lugar")]       = eventoEditar.lugar_fotografia ?? "";
        baseValues[svField(2, "id_paquete")]  = eventoEditar.id_paquete_fotografia ?? null;
        baseValues[svField(2, "comentarios")] = eventoEditar.comentarios_fotografia ?? "";
        setHayEventoFoto(true);
      }
    }

    if (eventoEditar.direccion_misa || eventoEditar.fecha_misa) setHayMisa(true);
    form.setFieldsValue(baseValues);
    fetchDocumentos(eventoEditar.id_evento);
  }, [eventoEditar, form]);

  // ── Hidratación desde una COTIZACIÓN importada ──
  // Reutiliza la misma lógica que la edición de evento: pone los campos
  // comunes (cliente, tipo, importes, misa) y por cada servicio activa el
  // card correspondiente con sus campos. NO copia el contrato ni fechas
  // de creación — son específicas del nuevo evento que se está creando.
  const hydrateFromCotizacion = (c) => {
    if (!c) return;
    const fm = c.hora_misa ? dayjs(c.hora_misa) : null;
    const baseValues = {
      cliente_nombre:    c.cliente_nombre,
      domicilio:         c.domicilio,
      celular:           c.celular,
      id_tipo_evento:    c.id_tipo_evento ?? null,
      importe:           c.importe          ? toDecimal(c.importe)          : "",
      fecha_anticipo:    c.fecha_anticipo   ? dayjs(c.fecha_anticipo)       : null,
      importe_anticipo:  c.importe_anticipo ? toDecimal(c.importe_anticipo) : "",
      direccion_misa:    c.direccion_misa ?? "",
      fecha_misa:        fm,
      hora_misa:         fm,
    };

    // Reseteamos servicios antes de aplicar para no mezclar con datos previos.
    setHayEventoSonido(false);
    setHayEventoFoto(false);
    setHayDecoracion(false);
    setHayBarra(false);
    setHayMisa(!!(c.direccion_misa || c.hora_misa));

    if (Array.isArray(c.servicios) && c.servicios.length > 0) {
      const activos = new Set();
      c.servicios.forEach((sv) => {
        const id = sv.id_servicio;
        if (!id) return;
        activos.add(id);
        baseValues[svField(id, "fecha")]       = sv.fecha       ? dayjs(sv.fecha) : null;
        baseValues[svField(id, "hora_inicio")] = sv.hora_inicio ? dayjs(sv.hora_inicio, "HH:mm") : null;
        baseValues[svField(id, "hora_final")]  = sv.hora_final  ? dayjs(sv.hora_final,  "HH:mm") : null;
        baseValues[svField(id, "id_ciudad")]   = sv.id_ciudad ?? null;
        baseValues[svField(id, "lugar")]       = sv.lugar ?? "";
        baseValues[svField(id, "id_paquete")]  = sv.id_paquete ?? null;
        baseValues[svField(id, "comentarios")] = sv.comentarios ?? "";
      });
      setHayEventoSonido(activos.has(1));
      setHayEventoFoto(activos.has(2));
      setHayDecoracion(activos.has(3));
      setHayBarra(activos.has(4));
    }

    form.setFieldsValue(baseValues);
    toast(`Se cargaron los datos de la cotización ${c.code ? `#${c.code}` : ""}. Revisa los campos antes de guardar.`);
  };

  const fetchDocumentos = async (id) => {
    setLoadingDocs(true);
    try {
      const res = await apiEventosInstance.get(`/eventos/${id}/documentos`, {
        headers: authHeaderEventos(),
      });
      setDocumentos(res.data || []);
    } catch {
      setDocumentos([]);
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleDeleteDoc = async (id) => {
    try {
      await apiEventosInstance.delete(
        `/eventos/${eventoEditar.id_evento}/documentos/${id}`,
        { headers: authHeaderEventos() }
      );
      toast("Documento eliminado");
      setDocumentos((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      toast(err?.response?.data?.detail || err.message || "Error al eliminar");
    }
  };

  const handleBeforeUpload = (file) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast("Solo se permiten archivos PDF");
      return Upload.LIST_IGNORE;
    }
    setPendingFile(file);
    return false;
  };

  const handleMoneyBlur = (fieldName) => {
    const formatted = toDecimal(form.getFieldValue(fieldName));
    if (formatted) form.setFieldValue(fieldName, formatted);
  };

  const uploadDocumento = async (id_evento, file) => {
    const formData = new FormData();
    formData.append("file", file, file.name);
    const baseURL = apiEventosInstance.defaults.baseURL;
    const token = localStorage.getItem("tokenadmin") || localStorage.getItem("token");
    const res = await fetch(`${baseURL}/eventos/${id_evento}/documentos`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw { response: { data: err } };
    }
    return res.json();
  };

  const applyAIResult = (campos) => {
    // El OCR del contrato extrae datos del evento de sonido (id_servicio=1).
    // Llenamos sv1_* y activamos el card de Sonido si no lo estaba.
    const updates = {};
    if (campos.cliente)        updates.cliente_nombre  = campos.cliente;
    if (campos.telefono)       updates.celular         = campos.telefono;
    if (campos.lugar_evento)   updates[svField(1, "lugar")] = campos.lugar_evento;
    if (campos.importe_total)  updates.importe           = parseMoney(campos.importe_total);
    if (campos.monto_anticipo) updates.importe_anticipo  = parseMoney(campos.monto_anticipo);
    if (campos.fecha_evento) {
      const d = parseOCRDate(campos.fecha_evento);
      if (d) updates[svField(1, "fecha")] = d;
    }
    if (campos.fecha_anticipo) {
      const d = parseOCRDate(campos.fecha_anticipo);
      if (d) updates.fecha_anticipo = d;
    }
    if (campos.hora_inicio) {
      const t = parseTime12(campos.hora_inicio);
      if (t) { updates[svField(1, "hora_inicio")] = t; setHoraInicio(t); }
    }
    if (campos.hora_fin) {
      const t = parseTime12(campos.hora_fin);
      if (t) { updates[svField(1, "hora_final")] = t; setHoraFinal(t); }
    }
    form.setFieldsValue(updates);
    if (!hayEventoSonido) setHayEventoSonido(true);
  };

  const handleAIFill = async () => {
    if (!pendingFile) return;
    const cacheKey = `${pendingFile.name}_${pendingFile.size}`;

    if (aiCacheRef.current[cacheKey]) {
      applyAIResult(aiCacheRef.current[cacheKey]);
      toast("Se usó el resultado ya extraído de este documento.");
      return;
    }

    setAiLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", pendingFile, pendingFile.name);
      const baseURL = apiEventosInstance.defaults.baseURL;
      const token = localStorage.getItem("tokenadmin") || localStorage.getItem("token");
      const res = await fetch(`${baseURL}/eventos/extraer-ai`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Error al procesar el archivo");
      }
      const data = await res.json();
      const campos = data.archivos?.[0]?.campos || {};

      aiCacheRef.current[cacheKey] = campos;
      applyAIResult(campos);
      toast("Datos extraídos con IA. Revisa y corrige los campos antes de guardar.");
    } catch (err) {
      toast(err.message || "Error con IA");
    } finally {
      setAiLoading(false);
    }
  };

  const AUTOFILL_PROMPT = `Eres un extractor de datos de contratos de eventos (sonido, fotografía, decoración, barra). Se te proporcionará el texto de un contrato de servicios. Tu única tarea es leer el contrato y devolver exclusivamente el siguiente JSON con la información encontrada — sin explicaciones, sin texto adicional, sin bloques de código markdown, solo el JSON puro.

Reglas de extracción:
- Fechas en formato "DD/MM/YYYY". Si no aparece, usa null.
- Horas en formato "HH:MM AM/PM" (ej. "08:00 PM"). Si no aparece, usa null.
- Montos como string numérico sin comas ni símbolo (ej. "15000.00"). Si no aparece, usa null.
- tipo: uno de estos valores exactos: "Bodas", "XV", "Graduación", "Corporativo", "Cumpleaños", "Otro".
- Para cada servicio, marca "activo": true solo si ese servicio está incluido en el contrato.
- Si un campo no se encuentra en el documento, deja el valor vacío ("") o null.
- No inventes datos. Si algo es ambiguo o no está, deja el campo vacío.

Devuelve únicamente esto:

{
  "cliente": {
    "nombre": "",
    "domicilio": "",
    "celular": ""
  },
  "evento": {
    "tipo": "",
    "importe_total": "",
    "monto_anticipo": "",
    "fecha_anticipo": null,
    "fecha_celebracion_contrato": null,
    "direccion_misa": "",
    "fecha_misa": null,
    "hora_misa": null
  },
  "servicios": {
    "sonido": {
      "activo": false,
      "fecha": null,
      "hora_inicio": null,
      "hora_fin": null,
      "ciudad": "",
      "lugar": "",
      "comentarios": ""
    },
    "fotografia": {
      "activo": false,
      "fecha": null,
      "hora_inicio": null,
      "hora_fin": null,
      "ciudad": "",
      "lugar": "",
      "comentarios": ""
    },
    "decoracion": {
      "activo": false,
      "fecha": null,
      "hora_inicio": null,
      "hora_fin": null,
      "ciudad": "",
      "lugar": "",
      "comentarios": ""
    },
    "barra": {
      "activo": false,
      "fecha": null,
      "hora_inicio": null,
      "hora_fin": null,
      "ciudad": "",
      "lugar": "",
      "comentarios": ""
    }
  }
}`;

  const parseTimeFlexible = (str) => {
    if (!str) return null;
    const t12 = parseTime12(str);
    if (t12) return t12;
    const match = str.match(/^(\d{1,2}):(\d{2})$/);
    if (match) {
      const h = parseInt(match[1]);
      const m = parseInt(match[2]);
      if (h >= 0 && h < 24 && m >= 0 && m < 60) return dayjs().hour(h).minute(m).second(0);
    }
    return null;
  };

  const applyAutofill = () => {
    let parsed;
    try {
      parsed = JSON.parse(autofillText);
    } catch (e) {
      setAutofillError("JSON inválido: " + e.message);
      return;
    }
    setAutofillError("");

    const cliente = parsed?.cliente || {};
    const evento = parsed?.evento || {};
    const servicios = parsed?.servicios || {};

    const updates = {};

    if (cliente.nombre)    updates.cliente_nombre = cliente.nombre;
    if (cliente.domicilio) updates.domicilio      = cliente.domicilio;
    if (cliente.celular)   updates.celular        = cliente.celular;

    if (evento.tipo) {
      const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
      const TIPO_MAP = {
        bodas: 1, boda: 1,
        xv: 2, quince: 2, quinceanera: 2, "xv anos": 2,
        graduacion: 3,
        corporativo: 4,
        cumpleanos: 5,
        otro: 6, otros: 6,
      };
      const tipoId = TIPO_MAP[norm(evento.tipo)];
      if (tipoId) updates.id_tipo_evento = tipoId;
    }
    if (evento.importe_total)  updates.importe           = parseMoney(evento.importe_total);
    if (evento.monto_anticipo) updates.importe_anticipo  = parseMoney(evento.monto_anticipo);
    if (evento.fecha_anticipo) {
      const d = parseOCRDate(evento.fecha_anticipo);
      if (d) updates.fecha_anticipo = d;
    }
    if (evento.fecha_celebracion_contrato) {
      const d = parseOCRDate(evento.fecha_celebracion_contrato);
      if (d) updates.fecha_creacion_contrato = d;
    }
    if (evento.direccion_misa) updates.direccion_misa = evento.direccion_misa;
    if (evento.fecha_misa) {
      const d = parseOCRDate(evento.fecha_misa);
      if (d) updates.fecha_misa = d;
    }
    if (evento.hora_misa) {
      const t = parseTimeFlexible(evento.hora_misa);
      if (t) updates.hora_misa = t;
    }

    const SV_KEY_MAP = { sonido: 1, fotografia: 2, fotografía: 2, decoracion: 3, decoración: 3, barra: 4 };
    const norm2 = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    const newActivos = { 1: hayEventoSonido, 2: hayEventoFoto, 3: hayDecoracion, 4: hayBarra };

    Object.entries(servicios).forEach(([key, sv]) => {
      const id = SV_KEY_MAP[norm2(key)];
      if (!id || !sv?.activo) return;
      newActivos[id] = true;
      if (sv.fecha) {
        const d = parseOCRDate(sv.fecha);
        if (d) updates[svField(id, "fecha")] = d;
      }
      if (sv.hora_inicio) {
        const t = parseTimeFlexible(sv.hora_inicio);
        if (t) updates[svField(id, "hora_inicio")] = t;
      }
      if (sv.hora_fin) {
        const t = parseTimeFlexible(sv.hora_fin);
        if (t) updates[svField(id, "hora_final")] = t;
      }
      if (sv.ciudad) {
        const normCiudad = norm2(sv.ciudad);
        const match = ciudadesOptions.find(
          (c) => norm2(c.label).includes(normCiudad) || normCiudad.includes(norm2(c.label))
        );
        if (match) updates[svField(id, "id_ciudad")] = match.value;
      }
      if (sv.lugar)       updates[svField(id, "lugar")]       = sv.lugar;
      if (sv.comentarios) updates[svField(id, "comentarios")] = sv.comentarios;
    });

    setHayEventoSonido(newActivos[1]);
    setHayEventoFoto(newActivos[2]);
    setHayDecoracion(newActivos[3]);
    setHayBarra(newActivos[4]);
    form.setFieldsValue(updates);
    setAutofillOpen(false);
    setAutofillText("");
    toast("Formulario rellenado. Revisa y corrige los campos antes de guardar.");
  };

  const handleSave = async () => {
    if (serviciosActivos.length === 0) {
      toast("Selecciona al menos un servicio (Sonido, Fotografía, Banquete o Barra).");
      return;
    }

    let values;
    try {
      values = await form.validateFields();
    } catch (errInfo) {
      const SV_FIELD_LABELS = {
        fecha:        "Fecha",
        hora_inicio:  "Hora inicio",
        hora_final:   "Hora fin",
        id_ciudad:    "Ciudad",
        lugar:        "Lugar",
        id_paquete:   "Paquete",
        comentarios:  "Comentarios",
      };
      const labelForField = (name) => {
        if (FIELD_LABELS[name]) return FIELD_LABELS[name];
        // sv{id}_i{instId}_{field} (multi-instance)
        const mi = /^sv(\d+)_i\d+_(.+)$/.exec(name);
        if (mi) {
          const svInfo = SERVICIOS.find((x) => x.id === parseInt(mi[1], 10));
          return `${SV_FIELD_LABELS[mi[2]] || mi[2]} (${svInfo?.label || "servicio"})`;
        }
        // sv{id}_{field} (single instance)
        const m = /^sv(\d+)_(.+)$/.exec(name);
        if (m) {
          const svInfo = SERVICIOS.find((x) => x.id === parseInt(m[1], 10));
          return `${SV_FIELD_LABELS[m[2]] || m[2]} (${svInfo?.label || "servicio"})`;
        }
        return name;
      };
      const campos = (errInfo?.errorFields || [])
        .map((f) => labelForField(f.name?.[0]))
        .filter(Boolean);
      toast(
        campos.length > 0
          ? `Por favor llena: ${campos.join(", ")}.`
          : "Revisa los campos marcados en rojo antes de continuar."
      );
      return;
    }

    // Construir array de servicios — cada instancia genera una fila en eventos_servicios.
    const servicios = [];
    serviciosActivos.forEach((s) => {
      (svInstances[s.id] || [0]).forEach((instId) => {
        const fecha = values[svFieldI(s.id, instId, "fecha")];
        const hi    = values[svFieldI(s.id, instId, "hora_inicio")];
        const hf    = values[svFieldI(s.id, instId, "hora_final")];
        servicios.push({
          id_servicio:  s.id,
          fecha:        fecha ? dayjs(fecha).format("YYYY-MM-DD") : null,
          hora_inicio:  hi ? dayjs(hi).format("HH:mm") : null,
          hora_final:   hf ? dayjs(hf).format("HH:mm") : null,
          id_ciudad:    values[svFieldI(s.id, instId, "id_ciudad")] ?? null,
          lugar:        (values[svFieldI(s.id, instId, "lugar")] || "").trim() || null,
          id_paquete:   values[svFieldI(s.id, instId, "id_paquete")] || null,
          comentarios:  (values[svFieldI(s.id, instId, "comentarios")] || "").trim() || null,
        });
      });
    });

    const payload = {
      cliente_nombre:          values.cliente_nombre?.trim(),
      domicilio:               values.domicilio?.trim() || null,
      celular:                 values.celular?.trim() || null,
      id_tipo_evento:          values.id_tipo_evento ?? null,
      importe:                 values.importe          ? String(values.importe)          : undefined,
      fecha_anticipo:          values.fecha_anticipo
        ? dayjs(values.fecha_anticipo).format("YYYY-MM-DDTHH:mm:ss") : undefined,
      importe_anticipo:        values.importe_anticipo ? String(values.importe_anticipo) : undefined,
      fecha_creacion_contrato: values.fecha_creacion_contrato
        ? dayjs(values.fecha_creacion_contrato).format("YYYY-MM-DDTHH:mm:ss") : null,
      direccion_misa:          hayMisa ? (values.direccion_misa?.trim() || null) : null,
      fecha_misa:              hayMisa && values.fecha_misa
        ? `${dayjs(values.fecha_misa).format("YYYY-MM-DD")}T${values.hora_misa ? dayjs(values.hora_misa).format("HH:mm") : "00:00"}:00`
        : null,
      servicios,
    };

    // ── Compatibilidad con backend actual ──────────────────────────
    // Mientras el backend no procese el array `servicios`, mapeamos los
    // servicios de Sonido (id=1) y Fotografía (id=2) a los campos planos
    // tradicionales para que el flujo de agenda/notificaciones siga vivo.
    const svSonido = servicios.find((x) => x.id_servicio === 1);
    const svFoto   = servicios.find((x) => x.id_servicio === 2);

    if (svSonido) {
      payload.id_ciudad         = svSonido.id_ciudad;
      payload.lugar_evento      = svSonido.lugar || "";
      payload.fecha_evento      = svSonido.fecha ? `${svSonido.fecha}T00:00:00` : null;
      payload.hora_inicio       = svSonido.hora_inicio;
      payload.hora_final        = svSonido.hora_final;
      payload.id_paquete_sonido = svSonido.id_paquete;
      payload.comentarios       = svSonido.comentarios;
    } else {
      payload.id_ciudad = null;
      payload.lugar_evento = "";
      payload.fecha_evento = null;
      payload.hora_inicio = null;
      payload.hora_final = null;
      payload.id_paquete_sonido = null;
      payload.comentarios = null;
    }

    if (svFoto) {
      const fechaIso = svFoto.fecha;
      const horaIso  = svFoto.hora_inicio || "00:00";
      payload.id_ciudad_fotografia   = svFoto.id_ciudad;
      payload.lugar_fotografia       = svFoto.lugar;
      payload.datetime_fotografia    = fechaIso ? `${fechaIso}T${horaIso}:00` : null;
      payload.id_paquete_fotografia  = svFoto.id_paquete;
      payload.comentarios_fotografia = svFoto.comentarios;
    } else {
      payload.id_ciudad_fotografia   = null;
      payload.lugar_fotografia       = null;
      payload.datetime_fotografia    = null;
      payload.id_paquete_fotografia  = null;
      payload.comentarios_fotografia = null;
    }

    setSaving(true);
    try {
      let id_evento = eventoEditar?.id_evento;

      if (isEditing) {
        await apiEventosInstance.patch(`/eventos/${id_evento}`, payload, {
          headers: authHeaderEventos(),
        });
      } else {
        const res = await apiEventosInstance.post("/eventos", payload, {
          headers: authHeaderEventos(),
        });
        id_evento = res.data?.id ?? res.data?.id_evento;
      }

      if (pendingFile && id_evento) {
        try {
          await uploadDocumento(id_evento, pendingFile);
        } catch (err) {
          toast(err?.response?.data?.detail || err.message || "Evento guardado, pero falló la subida del contrato");
        }
      }

      setSuccess({
        show: true,
        title: isEditing ? "¡Cambios guardados!" : "¡Evento creado!",
        subtitle: isEditing
          ? "Los cambios se guardaron correctamente."
          : `El evento de "${values.cliente_nombre?.trim() || ""}" ya está registrado.`,
      });
    } catch (err) {
      toast(err?.response?.data?.detail || err.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="eventos-main evt-form-page">
      <div className="eventos-content">



        <section className="cc-page-header-card">
          <Space direction="vertical" size={2}>
            <Title level={2} className="eventos-title" style={{ marginBottom: 0 }}>
              {isEditing
                ? `Editando evento de ${eventoEditar.cliente_nombre}`
                : "Nuevo evento"}
            </Title>
            <Text className="eventos-subtitle">
              {isEditing
                ? "Modifica los datos del evento y guarda los cambios."
                : "Completa los datos del cliente y del evento para registrarlo."}
            </Text>
          </Space>

          <Space>
            <Dropdown
              disabled={saving}
              trigger={["click"]}
              menu={{
                items: [
                  {
                    key: "cotizacion",
                    icon: <ImportOutlined />,
                    label: "Importar de cotización",
                    disabled: isEditing,
                    onClick: () => setImportCotizacionOpen(true),
                  },
                  { type: "divider" },
                  {
                    key: "autorelleno",
                    icon: <ThunderboltOutlined />,
                    label: "Autorelleno con IA",
                    onClick: () => setAutofillOpen(true),
                  },
                ],
              }}
            >
              <Button className="eventos-btn-clean">
                Importar <DownOutlined style={{ fontSize: 10, marginLeft: 4 }} />
              </Button>
            </Dropdown>
            <Button
              className="eventos-btn-clean"
              onClick={() => navigate("/app/eventos")}
              disabled={saving || success.show}
            >
              Cancelar
            </Button>
            <Button
              type="primary"
              loading={saving}
              disabled={success.show}
              icon={!isEditing ? <PlusOutlined /> : null}
              onClick={handleSave}
              style={{ backgroundColor: "var(--eh-primary-btn)", borderColor: "var(--eh-primary-btn)" }}
            >
              {isEditing ? "Guardar cambios" : "Crear evento"}
            </Button>
          </Space>
        </section>

        <Form form={form} layout="vertical">
          <div className="cc-body-grid">

            {/* ── Columna izquierda: cliente + importes ── */}
            <div className="cc-left-col">

              {/* Datos del cliente */}
              <div className="cc-section-card">
                <div className="cc-section-header">
                  <span className="cc-section-icon"><UserOutlined /></span>
                  Datos del cliente
                </div>
                <Row gutter={16}>
                  <Col xs={24}>
                    <Form.Item
                      name="cliente_nombre"
                      label={<span className="eventos-field-label">Nombre del cliente</span>}
                      rules={[{ required: true, message: "Requerido" }]}
                    >
                      <Input placeholder="Ej. Juan Pérez" autoComplete="off" />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="domicilio"
                      label={<span className="eventos-field-label">Dirección</span>}
                    >
                      <Input placeholder="Calle, número, colonia" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="celular"
                      label={
                        <span className="eventos-field-label">
                          Teléfono celular&nbsp;
                          <span style={{ fontWeight: 400, color: "#9ca3af", fontSize: 11 }}>(opcional)</span>
                        </span>
                      }
                    >
                      <Input placeholder="55 0000 0000" maxLength={15} />
                    </Form.Item>
                  </Col>
                </Row>
              </div>

              {/* Importes — debajo del cliente */}
              <div className="cc-section-card">
                <div className="cc-section-header">
                  <span className="cc-section-icon"><DollarOutlined /></span>
                  Importes
                </div>
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="importe"
                      label={<span className="eventos-field-label">Importe total</span>}
                      rules={[{ required: true, message: "Requerido" }]}
                    >
                      <Input
                        prefix="$"
                        suffix="MXN"
                        placeholder="0.00"
                        onBlur={() => {
                          handleMoneyBlur("importe");
                          form.validateFields(["importe_anticipo"]);
                        }}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="fecha_anticipo"
                      label={<span className="eventos-field-label">Fecha primer pago</span>}
                    >
                      <DatePicker style={{ width: "100%" }} format="DD MMM YYYY" placeholder="mm/dd/yyyy" />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="importe_anticipo"
                      label={<span className="eventos-field-label">Monto primer pago</span>}
                      rules={[
                        {
                          validator(_, value) {
                            if (!value) return Promise.resolve();
                            const total = parseFloat(String(form.getFieldValue("importe") ?? "").replace(/[^0-9.]/g, ""));
                            const anticipo = parseFloat(String(value).replace(/[^0-9.]/g, ""));
                            if (!isNaN(total) && !isNaN(anticipo) && anticipo > total) {
                              return Promise.reject("El primer pago no puede ser mayor al importe total");
                            }
                            return Promise.resolve();
                          },
                        },
                      ]}
                    >
                      <Input
                        prefix="$"
                        suffix="MXN"
                        placeholder="0.00"
                        onBlur={() => handleMoneyBlur("importe_anticipo")}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="fecha_creacion_contrato"
                      label={<span className="eventos-field-label">Fecha de celebración del contrato</span>}
                      rules={[{ required: true, message: "Requerido" }]}
                    >
                      <DatePicker style={{ width: "100%" }} format="DD MMM YYYY" placeholder="mm/dd/yyyy" />
                    </Form.Item>
                  </Col>
                </Row>
              </div>

            </div>

            {/* ── Columna derecha: solo Contrato (ocupa la altura de cliente + importes) ── */}
            <div className="cc-right-col cc-right-col-stretch">

              {/* Contrato */}
              <div className="cc-section-card" style={{ flex: 1 }}>
                <div className="cc-section-header">
                  <span className="cc-section-icon"><FilePdfOutlined /></span>
                  Contrato
                </div>

                  {isEditing && loadingDocs && (
                    <div style={{ padding: "8px 0" }}><Spin size="small" /></div>
                  )}

                  {isEditing && !loadingDocs && documentos.length > 0 && (
                    <List
                      size="small"
                      dataSource={documentos}
                      renderItem={(doc) => (
                        <List.Item
                          style={{
                            padding: "8px 12px",
                            borderRadius: 6,
                            border: "1px solid #e5e7eb",
                            marginBottom: 6,
                            background: "#fafafa",
                          }}
                          actions={[
                            <Tooltip title="Eliminar documento">
                              <Button
                                type="text"
                                danger
                                size="small"
                                icon={<DeleteOutlined />}
                                onClick={() => handleDeleteDoc(doc.id)}
                              />
                            </Tooltip>,
                          ]}
                        >
                          <Space>
                            <FilePdfOutlined style={{ color: "#ef4444" }} />
                            <Text style={{ fontSize: 12 }}>{doc.filename}</Text>
                          </Space>
                        </List.Item>
                      )}
                    />
                  )}

                  {pendingFile ? (
                    <>
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 14px",
                        borderRadius: 8,
                        border: "1px solid #e5e7eb",
                        background: "#f9fafb",
                        marginBottom: 10,
                      }}>
                        <FilePdfOutlined style={{ color: "#ef4444", fontSize: 20, flexShrink: 0 }} />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <Text style={{ fontSize: 13, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {pendingFile.name}
                          </Text>
                          <Text style={{ fontSize: 11, color: "#9ca3af" }}>Se enviará al guardar</Text>
                        </div>
                      </div>
                      <Button danger onClick={() => setPendingFile(null)}>
                        Cancelar
                      </Button>
                    </>
                  ) : (
                    (!isEditing || (!loadingDocs && documentos.length === 0)) && (
                      <Dragger
                        accept=".pdf"
                        multiple={false}
                        showUploadList={false}
                        beforeUpload={handleBeforeUpload}
                        style={{ borderRadius: 8, height: 300 }}
                      >
                        <p className="ant-upload-drag-icon" style={{ marginBottom: 8 }}>
                          <InboxOutlined style={{ fontSize: 32, color: "var(--eh-ink-muted, #9ca3af)" }} />
                        </p>
                        <p style={{ margin: 0, fontSize: 13, color: "var(--eh-ink, #374151)", fontWeight: 500 }}>
                          Subir archivo de contrato
                        </p>
                        <p style={{ margin: "4px 0 8px", fontSize: 11, color: "var(--eh-ink-muted, #9ca3af)" }}>
                          PDF hasta 10MB
                        </p>
                        <Button size="small" style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.05em" }}>
                          SELECCIONAR ARCHIVO
                        </Button>
                      </Dragger>
                    )
                  )}

              </div>

            </div>

            {/* ── Datos del evento: navbar vertical + formulario ── */}
            <div className="cc-section-card cc-full-width">
              <div className="cc-section-header">
                <span className="cc-section-icon"><CalendarOutlined /></span>
                Datos del evento
              </div>

              <Form.Item
                name="id_tipo_evento"
                label={<span className="eventos-field-label">Tipo de evento</span>}
                rules={[{ required: true, message: "Requerido" }]}
                style={{ marginBottom: 40, maxWidth: 280 }}
              >
                <Select placeholder="Selecciona el tipo" options={TIPOS_EVENTO} />
              </Form.Item>

              <div className="cc-evento-panel">

                {/* Sidebar izquierdo */}
                <div className="cc-evento-sidebar">
                  <div className="cc-evento-nav">
                    {SERVICIOS.map((s) => (
                      <ServiceCard
                        key={s.id}
                        active={activosByServicio[s.id]}
                        selected={servicioTab === s.id}
                        onClick={() => handleNavClick(s.id)}
                        icon={s.icon}
                        label={s.label}
                        status={getServiceStatus(s.id)}
                      />
                    ))}
                    <ServiceCard
                      active={hayMisa}
                      selected={servicioTab === "misa"}
                      onClick={handleMisaNavClick}
                      icon={SERVICE_ICONS.misa}
                      label="Misa"
                      status={getMisaStatus()}
                    />
                  </div>
                </div>

                {/* Contenido del servicio seleccionado — siempre montado para preservar valores */}
                <div className="cc-evento-content">
                  {servicioTab === null && (
                    <div className="cc-no-service">
                      Selecciona un servicio para ver sus campos.
                    </div>
                  )}

                  {SERVICIOS.map((s) => {
                    const renderFields = (instId) => (
                      <>
                        <Row gutter={16}>
                          <Col xs={24} md={6}>
                            <Form.Item name={svFieldI(s.id, instId, "fecha")} label={<span className="eventos-field-label">Fecha</span>} rules={activosByServicio[s.id] ? [{ required: true, message: "Requerido" }] : []}>
                              <DatePicker style={{ width: "100%" }} format="DD MMM YYYY" placeholder="Selecciona fecha" />
                            </Form.Item>
                          </Col>
                          <Col xs={24} md={6}>
                            <Form.Item name={svFieldI(s.id, instId, "id_ciudad")} label={<span className="eventos-field-label">Ciudad</span>} rules={activosByServicio[s.id] ? [{ required: true, message: "Requerido" }] : []}>
                              <Select placeholder="Selecciona la ciudad" options={ciudadesOptions} allowClear />
                            </Form.Item>
                          </Col>
                          <Col xs={24} md={12}>
                            <Form.Item name={svFieldI(s.id, instId, "lugar")} label={<span className="eventos-field-label">Lugar</span>} rules={activosByServicio[s.id] ? [{ required: true, message: "Requerido" }] : []}>
                              <Input placeholder="Nombre del salón, jardín o lugar" />
                            </Form.Item>
                          </Col>
                        </Row>
                        <Row gutter={16}>
                          <Col xs={24} md={6}>
                            <Form.Item name={svFieldI(s.id, instId, "hora_inicio")} label={<span className="eventos-field-label">Hora inicio</span>} rules={activosByServicio[s.id] ? [{ required: true, message: "Requerido" }] : []}>
                              <TimePicker style={{ width: "100%" }} format="HH:mm" placeholder="--:-- --" minuteStep={15} needConfirm={false} />
                            </Form.Item>
                          </Col>
                          <Col xs={24} md={6}>
                            <Form.Item name={svFieldI(s.id, instId, "hora_final")} label={<span className="eventos-field-label">Hora fin</span>} rules={activosByServicio[s.id] ? [{ required: true, message: "Requerido" }] : []}>
                              <TimePicker style={{ width: "100%" }} format="HH:mm" placeholder="--:-- --" minuteStep={15} needConfirm={false} />
                            </Form.Item>
                          </Col>
                          <Col xs={24} md={6}>
                            <Form.Item name={svFieldI(s.id, instId, "id_paquete")} label={<span className="eventos-field-label">Paquete</span>}>
                              <Select placeholder="Sin paquete" options={[{ label: "Sin paquete", value: null }, ...s.paquetes]} />
                            </Form.Item>
                          </Col>
                          <Col xs={24} md={6}>
                            <Form.Item name={svFieldI(s.id, instId, "comentarios")} label={<span className="eventos-field-label">Comentarios</span>}>
                              <Input.TextArea placeholder="Detalles específicos..." rows={1} maxLength={1000} />
                            </Form.Item>
                          </Col>
                        </Row>
                      </>
                    );

                    const instances = svInstances[s.id] || [0];
                    const multiTab = instances.length > 1;

                    return (
                      <div key={s.id} style={{ display: servicioTab === s.id ? undefined : "none" }}>
                        {/* Tab header — solo visible cuando hay 2+ instancias */}
                        {multiTab && (
                          <div className="cd-header-tabs" style={{ marginBottom: 16 }}>
                            {instances.map((instId, idx) => (
                              <button
                                key={instId}
                                className={`cd-tab-btn${svTabActive[s.id] === instId ? " cd-tab-btn-active" : ""}`}
                                onClick={() => setSvTabActive(prev => ({ ...prev, [s.id]: instId }))}
                              >
                                {s.label} {idx + 1}
                                {idx > 0 && (
                                  <CloseOutlined
                                    style={{ fontSize: 10, marginLeft: 4, opacity: 0.7 }}
                                    onClick={(e) => { e.stopPropagation(); removeServiceInstance(s.id, instId); }}
                                  />
                                )}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Campos — todas las instancias montadas, solo la activa visible */}
                        {instances.map((instId) => (
                          <div key={instId} style={{ display: svTabActive[s.id] === instId ? undefined : "none" }}>
                            {renderFields(instId)}
                          </div>
                        ))}

                        <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 16 }}>
                          <div className="cc-add-service-btn" style={{ marginTop: 0 }} onClick={() => addServiceInstance(s.id)}>
                            <PlusOutlined style={{ fontSize: 14 }} />
                            <span>Agregar otro Servicio de {s.label}</span>
                          </div>
                          <div className="cc-clear-fields-btn" onClick={() => clearServiceFields(s.id, svTabActive[s.id])}>
                            Limpiar campos
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <div style={{ display: servicioTab === "misa" ? undefined : "none" }}>
                    <Row gutter={16}>
                      <Col xs={24} md={8}>
                        <Form.Item
                          name="fecha_misa"
                          label={<span className="eventos-field-label">Fecha de la misa</span>}
                        >
                          <DatePicker style={{ width: "100%" }} format="DD MMM YYYY" placeholder="Selecciona fecha" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={16}>
                        <Form.Item
                          name="direccion_misa"
                          label={<span className="eventos-field-label">Dirección de la misa</span>}
                        >
                          <Input placeholder="Iglesia, parroquia, dirección..." />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={16}>
                      <Col xs={24} md={8}>
                        <Form.Item
                          name="hora_misa"
                          label={<span className="eventos-field-label">Hora de la misa</span>}
                        >
                          <TimePicker style={{ width: "100%" }} format="HH:mm" placeholder="--:-- --" minuteStep={15} needConfirm={false} />
                        </Form.Item>
                      </Col>
                    </Row>
                    <div className="cc-clear-fields-btn" style={{ marginTop: 8 }} onClick={clearMisaFields}>
                      Limpiar campos
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </Form>

      </div>

      <ImportarCotizacionModal
        open={importCotizacionOpen}
        onClose={() => setImportCotizacionOpen(false)}
        onPick={(cot) => {
          hydrateFromCotizacion(cot);
          setImportCotizacionOpen(false);
        }}
      />

      <Modal
        open={autofillOpen}
        onCancel={() => { setAutofillOpen(false); setAutofillText(""); setAutofillError(""); }}
        footer={null}
        width={620}
        centered
        destroyOnClose
        title={
          <Space>
            <ThunderboltOutlined style={{ color: "var(--eh-primary-btn)" }} />
            <span>Autorelleno de formulario</span>
          </Space>
        }
      >
        <div style={{ padding: "8px 0 0" }}>
          {/* Pasos */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            {[
              { n: "1", text: "Descarga el prompt de abajo." },
              { n: "2", text: "Ábrelo en ChatGPT, Claude u otra IA y adjunta el PDF o foto del contrato." },
              { n: "3", text: "Copia el JSON que te devuelva la IA y pégalo en el campo de abajo." },
            ].map(({ n, text }) => (
              <div key={n} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <span style={{
                  minWidth: 22, height: 22, borderRadius: "50%",
                  background: "var(--eh-accent-soft, #e8eef8)", color: "var(--eh-accent-text, var(--eh-primary-btn))",
                  fontSize: 11, fontWeight: 800,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginTop: 1,
                }}>
                  {n}
                </span>
                <Text style={{ fontSize: 13, color: "var(--eh-ink-2, #4b5563)", lineHeight: "22px" }}>{text}</Text>
              </div>
            ))}
          </div>

          <Button
            icon={<DownloadOutlined />}
            style={{
              marginBottom: 14,
              backgroundColor: "var(--eh-accent-soft, #e8eef8)",
              borderColor: "var(--eh-accent-text, #c3d4f0)",
              color: "var(--eh-accent-text, var(--eh-primary-btn))",
              fontWeight: 600,
            }}
            onClick={() => {
              const blob = new Blob([AUTOFILL_PROMPT], { type: "text/plain;charset=utf-8" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "prompt_extraccion_contrato_evento.txt";
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Descargar prompt
          </Button>

          <div style={{ marginBottom: 6 }}>
            <Text style={{ fontSize: 12, fontWeight: 700, color: "#374151", letterSpacing: "0.04em", textTransform: "uppercase" }}>
              Pega aquí el JSON
            </Text>
          </div>
          <Input.TextArea
            placeholder={'{\n  "cliente": { "nombre": "Juan Pérez", ... },\n  "evento": { "tipo": "Bodas", ... },\n  "servicios": { "sonido": { "activo": true, ... } }\n}'}
            value={autofillText}
            onChange={(e) => { setAutofillText(e.target.value); if (autofillError) setAutofillError(""); }}
            rows={12}
            style={{
              fontFamily: "monospace",
              fontSize: 12,
              borderColor: autofillError ? "#ef4444" : undefined,
            }}
          />
          {autofillError && (
            <Text style={{ fontSize: 12, color: "#ef4444", display: "block", marginTop: 4 }}>
              {autofillError}
            </Text>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
            <Button
              className="eventos-btn-clean"
              style={{ flex: "none" }}
              onClick={() => { setAutofillOpen(false); setAutofillText(""); setAutofillError(""); }}
            >
              Cancelar
            </Button>
            <Button
              type="primary"
              icon={<ThunderboltOutlined />}
              disabled={!autofillText.trim()}
              onClick={applyAutofill}
              style={{ backgroundColor: "var(--eh-primary-btn)", borderColor: "var(--eh-primary-btn)" }}
            >
              Aplicar al formulario
            </Button>
          </div>
        </div>
      </Modal>

      <Toast show={showToast} msg={toastMsg} setShow={setShowToast} />
      <SuccessOverlay
        show={success.show}
        title={success.title}
        subtitle={success.subtitle}
        onDone={() => navigate("/app/eventos")}
      />
    </main>
  );
}
