
import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import dayjs from "dayjs";
import {
  apiCotizacionesInstance,
  authHeaderCotizaciones,
} from "../../redux/actions/cotizaciones/cotizaciones";
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
  Row,
  Col,
  notification,
  Typography,
  Space,
  Upload,
  List,
  Spin,
  Tooltip,
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
  RobotOutlined,
  CameraOutlined,
  SoundOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";

import "./EventosPage.css";
import "./CotizacionForm.css";

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
};

// Toggle card para seleccionar servicios del evento
function ServiceCard({ active, onClick, icon, label }) {
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
      className={`cc-service-card ${active ? "is-active" : ""}`}
      aria-pressed={active}
    >
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

function fmtMoneyView(val) {
  const n = parseFloat(String(val ?? "").replace(/[^0-9.]/g, ""));
  if (isNaN(n)) return "$0.00";
  return "$" + n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function CrearCotizacionPage() {
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

  // Valores en vivo para el resumen de la cotización
  const watchImporte = Form.useWatch("importe", form);
  const watchCliente = Form.useWatch("cliente_nombre", form);
  const watchTipo    = Form.useWatch("id_tipo_evento", form);
  const watchFolio   = Form.useWatch("folio", form);

  // Autogenera un folio de exactamente 8 letras mayúsculas.
  const generarFolio = () => {
    const letras = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let f = "";
    for (let i = 0; i < 8; i++) f += letras[Math.floor(Math.random() * letras.length)];
    form.setFieldValue("folio", f);
    form.validateFields(["folio"]);
  };

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

  // Selección de servicios — al entrar a "Nueva cotización" todo en false (formulario limpio).
  // Si está editando un evento existente, el useEffect de abajo activa lo que tenga datos.
  const [hayEventoSonido, setHayEventoSonido] = useState(false);
  const [hayEventoFoto, setHayEventoFoto] = useState(false);
  const [hayDecoracion, setHayDecoracion] = useState(false);
  const [hayBarra, setHayBarra] = useState(false);
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

  // Nombre de campo por servicio: sv{id}_{field}
  const svField = (id, field) => `sv${id}_${field}`;

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

    const mh = eventoEditar.hora_misa ? dayjs(eventoEditar.hora_misa, "HH:mm") : null;

    // Campos comunes (cliente, importes, tipo, misa, contrato)
    const baseValues = {
      cliente_nombre:          eventoEditar.cliente_nombre,
      folio:                   eventoEditar.folio,
      domicilio:               eventoEditar.domicilio,
      celular:                 eventoEditar.celular,
      id_tipo_evento:          eventoEditar.id_tipo_evento,
      importe:                 eventoEditar.importe          ? toDecimal(eventoEditar.importe)          : "",
      fecha_anticipo:          eventoEditar.fecha_anticipo   ? dayjs(eventoEditar.fecha_anticipo)       : null,
      importe_anticipo:        eventoEditar.importe_anticipo ? toDecimal(eventoEditar.importe_anticipo) : "",
      fecha_creacion_contrato: eventoEditar.fecha_creacion_contrato ? dayjs(eventoEditar.fecha_creacion_contrato) : null,
      direccion_misa:          eventoEditar.direccion_misa   ?? "",
      hora_misa:               mh,
    };

    // 1) Formato nuevo: eventoEditar.servicios = [{ id_servicio, fecha, hora_inicio, hora_final, id_ciudad, lugar, id_paquete, comentarios }]
    if (Array.isArray(eventoEditar.servicios) && eventoEditar.servicios.length > 0) {
      const activos = new Set();
      eventoEditar.servicios.forEach((sv) => {
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

    form.setFieldsValue(baseValues);
    fetchDocumentos(eventoEditar.id_cotizacion);
  }, [eventoEditar, form]);

  const fetchDocumentos = async (id) => {
    setLoadingDocs(true);
    try {
      const res = await apiCotizacionesInstance.get(`/cotizaciones/${id}/documentos`, {
        headers: authHeaderCotizaciones(),
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
      await apiCotizacionesInstance.delete(
        `/cotizaciones/${eventoEditar.id_cotizacion}/documentos/${id}`,
        { headers: authHeaderCotizaciones() }
      );
      notification.success({ message: "Documento eliminado" });
      setDocumentos((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      notification.error({
        message: "Error al eliminar",
        description: err?.response?.data?.detail || err.message,
      });
    }
  };

  const handleBeforeUpload = (file) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      notification.error({ message: "Solo se permiten archivos PDF" });
      return Upload.LIST_IGNORE;
    }
    setPendingFile(file);
    return false;
  };

  const handleMoneyBlur = (fieldName) => {
    const formatted = toDecimal(form.getFieldValue(fieldName));
    if (formatted) form.setFieldValue(fieldName, formatted);
  };

  const uploadDocumento = async (id_cotizacion, file) => {
    const formData = new FormData();
    formData.append("file", file, file.name);
    const baseURL = apiCotizacionesInstance.defaults.baseURL;
    const token = localStorage.getItem("tokenadmin") || localStorage.getItem("token");
    const res = await fetch(`${baseURL}/cotizaciones/${id_cotizacion}/documentos`, {
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
      notification.success({
        message: "Datos cargados",
        description: "Se usó el resultado ya extraído de este documento.",
      });
      return;
    }

    setAiLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", pendingFile, pendingFile.name);
      const baseURL = apiCotizacionesInstance.defaults.baseURL;
      const token = localStorage.getItem("tokenadmin") || localStorage.getItem("token");
      const res = await fetch(`${baseURL}/cotizaciones/extraer-ai`, {
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
      notification.success({
        message: "Datos extraídos con IA",
        description: "Revisa y corrige los campos antes de guardar.",
      });
    } catch (err) {
      notification.error({ message: "Error con IA", description: err.message });
    } finally {
      setAiLoading(false);
    }
  };

  const handleSave = async () => {
    if (serviciosActivos.length === 0) {
      notification.error({
        message: "Sin servicio seleccionado",
        description: "Selecciona al menos un servicio (Sonido, Fotografía, Banquete o Barra).",
      });
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
      notification.warning({
        message: "Faltan campos por completar",
        description: campos.length > 0
          ? `Por favor llena: ${campos.join(", ")}.`
          : "Revisa los campos marcados en rojo antes de continuar.",
        duration: 6,
        placement: "topRight",
      });
      return;
    }

    // Construir array de servicios — cada servicio activo genera una fila en eventos_servicios.
    const servicios = serviciosActivos.map((s) => {
      const fecha = values[svField(s.id, "fecha")];
      const hi    = values[svField(s.id, "hora_inicio")];
      const hf    = values[svField(s.id, "hora_final")];
      const fechaIso = fecha ? dayjs(fecha).format("YYYY-MM-DD") : null;
      return {
        id_servicio:  s.id,
        fecha:        fechaIso,
        hora_inicio:  hi ? dayjs(hi).format("HH:mm") : null,
        hora_final:   hf ? dayjs(hf).format("HH:mm") : null,
        id_ciudad:    values[svField(s.id, "id_ciudad")] ?? null,
        lugar:        (values[svField(s.id, "lugar")] || "").trim() || null,
        id_paquete:   values[svField(s.id, "id_paquete")] || null,
        comentarios:  (values[svField(s.id, "comentarios")] || "").trim() || null,
      };
    });

    const payload = {
      cliente_nombre:          values.cliente_nombre?.trim(),
      folio:                   values.folio ? values.folio.trim().toUpperCase() : null,
      domicilio:               values.domicilio?.trim() || null,
      celular:                 values.celular?.trim() || null,
      id_tipo_evento:          values.id_tipo_evento ?? null,
      importe:                 values.importe          ? String(values.importe)          : undefined,
      fecha_anticipo:          values.fecha_anticipo
        ? dayjs(values.fecha_anticipo).format("YYYY-MM-DDTHH:mm:ss") : undefined,
      importe_anticipo:        values.importe_anticipo ? String(values.importe_anticipo) : undefined,
      fecha_creacion_contrato: values.fecha_creacion_contrato
        ? dayjs(values.fecha_creacion_contrato).format("YYYY-MM-DDTHH:mm:ss") : null,
      direccion_misa:          values.direccion_misa?.trim() || null,
      hora_misa:               values.hora_misa ? dayjs(values.hora_misa).format("HH:mm") : null,
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
      let id_cotizacion = eventoEditar?.id_cotizacion;

      if (isEditing) {
        await apiCotizacionesInstance.patch(`/cotizaciones/${id_cotizacion}`, payload, {
          headers: authHeaderCotizaciones(),
        });
      } else {
        const res = await apiCotizacionesInstance.post("/cotizaciones", payload, {
          headers: authHeaderCotizaciones(),
        });
        id_cotizacion = res.data?.id ?? res.data?.id_cotizacion;
      }

      if (pendingFile && id_cotizacion) {
        try {
          await uploadDocumento(id_cotizacion, pendingFile);
        } catch (err) {
          notification.warning({
            message: "Cotización guardada, pero falló la subida del contrato",
            description: err?.response?.data?.detail || err.message,
          });
        }
      }

      notification.success({
        message: isEditing ? "Cotización actualizada correctamente" : "Cotización creada exitosamente",
      });
      navigate("/app/cotizaciones");
    } catch (err) {
      notification.error({
        message: "Error al guardar",
        description: err?.response?.data?.detail || err.message,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="eventos-main cot-form-page">
      <div className="eventos-content">

        <Button
          type="link"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate("/app/cotizaciones")}
          className="cc-back-btn"
        >
          Volver a Cotizaciones
        </Button>

        <section className="cc-page-header-card">
          <Space direction="vertical" size={2}>
            <Title level={2} className="eventos-title" style={{ marginBottom: 0 }}>
              {isEditing
                ? `Editando cotización de ${eventoEditar.cliente_nombre}`
                : "Nueva cotización"}
            </Title>
            <Text className="eventos-subtitle">
              {isEditing
                ? "Modifica los datos y guarda los cambios de la cotización."
                : "Completa los datos del cliente y los servicios para generar la cotización."}
            </Text>
          </Space>

          <Space>
            <Button
              type="primary"
              loading={saving}
              icon={!isEditing ? <PlusOutlined /> : null}
              onClick={handleSave}
              style={{ backgroundColor: "#01369e", borderColor: "#01369e" }}
            >
              {isEditing ? "Guardar cambios" : "Crear cotización"}
            </Button>
          </Space>
        </section>

        <Form form={form} layout="vertical">
          <div className="cc-body-grid">

            <div className="cc-left-col">

              {/* ── Datos del cliente ── */}
              <div className="cc-section-card">
                <div className="cc-section-header">
                  <span className="cc-section-icon"><UserOutlined /></span>
                  Datos del cliente
                </div>
                <Row gutter={16}>
                  <Col xs={24} md={15}>
                    <Form.Item
                      name="cliente_nombre"
                      label={<span className="eventos-field-label">Nombre del cliente</span>}
                      rules={[{ required: true, message: "Requerido" }]}
                    >
                      <Input placeholder="Ej. Juan Pérez" autoComplete="off" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={9}>
                    <Form.Item
                      name="folio"
                      label={<span className="eventos-field-label"># Folio</span>}
                      rules={[
                        { required: true, message: "Requerido" },
                        { pattern: /^[A-Za-z]{8}$/, message: "Deben ser exactamente 8 letras" },
                      ]}
                    >
                      <Input
                        placeholder="Ej. ABCDEFGH"
                        maxLength={8}
                        autoComplete="off"
                        style={{ textTransform: "uppercase" }}
                        addonAfter={
                          <Tooltip title="Generar folio automáticamente">
                            <span className="cot-folio-gen" onClick={generarFolio}>
                              <ReloadOutlined /> Generar
                            </span>
                          </Tooltip>
                        }
                      />
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

              {/* ── Datos del evento + Selector de servicios (mismo card) ── */}
              <div className="cc-section-card">
                <div className="cc-section-header">
                  <span className="cc-section-icon"><CalendarOutlined /></span>
                  Datos del evento
                </div>
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="id_tipo_evento"
                      label={<span className="eventos-field-label">Tipo de evento</span>}
                      rules={[{ required: true, message: "Requerido" }]}
                    >
                      <Select
                        placeholder="Selecciona el tipo"
                        options={TIPOS_EVENTO}
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <div className="cc-services-block">
                  <div className="cc-services-label">
                    ¿Qué servicios incluye este evento?
                  </div>
                  <div className="cc-services-grid">
                    {SERVICIOS.map((s) => (
                      <ServiceCard
                        key={s.id}
                        active={activosByServicio[s.id]}
                        onClick={() => setActivoByServicio(s.id, !activosByServicio[s.id])}
                        icon={s.icon}
                        label={s.label}
                      />
                    ))}
                  </div>
                  <p className="cc-services-hint">
                    Selecciona uno o más. Solo verás los campos del servicio que elijas.
                  </p>
                </div>
              </div>

              {/* ── Subsecciones de servicios activos ──
                  Cada servicio muestra los MISMOS campos: fecha, hora_inicio,
                  hora_final, ciudad, lugar, paquete (opcional) y comentarios.
                  Los Form.Item usan prefijo sv{id}_* para no chocar entre servicios. */}
              {serviciosActivos.map((s) => (
                <div key={s.id} className="cc-section-card">
                  <div className="cc-section-header">
                    <span className="cc-section-icon">{s.icon}</span>
                    Información de {s.label.toLowerCase()}
                  </div>
                  <Row gutter={16}>
                    <Col xs={24} md={12}>
                      <Form.Item
                        name={svField(s.id, "fecha")}
                        label={<span className="eventos-field-label">Fecha</span>}
                        rules={[{ required: true, message: "Requerido" }]}
                      >
                        <DatePicker
                          style={{ width: "100%" }}
                          format="DD MMM YYYY"
                          placeholder="Selecciona fecha"
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item
                        name={svField(s.id, "id_ciudad")}
                        label={<span className="eventos-field-label">Ciudad</span>}
                        rules={[{ required: true, message: "Requerido" }]}
                      >
                        <Select
                          placeholder="Selecciona la ciudad"
                          options={ciudadesOptions}
                          allowClear
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Row gutter={16}>
                    <Col xs={24}>
                      <Form.Item
                        name={svField(s.id, "lugar")}
                        label={<span className="eventos-field-label">Lugar</span>}
                        rules={[{ required: true, message: "Requerido" }]}
                      >
                        <Input placeholder="Nombre del salón, jardín o lugar" />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Row gutter={16}>
                    <Col xs={24} md={12}>
                      <Form.Item
                        name={svField(s.id, "hora_inicio")}
                        label={<span className="eventos-field-label">Hora inicio</span>}
                        rules={[{ required: true, message: "Requerido" }]}
                      >
                        <TimePicker
                          style={{ width: "100%" }}
                          format="HH:mm"
                          placeholder="--:-- --"
                          minuteStep={15}
                          needConfirm={false}
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item
                        name={svField(s.id, "hora_final")}
                        label={<span className="eventos-field-label">Hora fin</span>}
                        rules={[{ required: true, message: "Requerido" }]}
                      >
                        <TimePicker
                          style={{ width: "100%" }}
                          format="HH:mm"
                          placeholder="--:-- --"
                          minuteStep={15}
                          needConfirm={false}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Row gutter={16}>
                    <Col xs={24} md={12}>
                      <Form.Item
                        name={svField(s.id, "id_paquete")}
                        label={<span className="eventos-field-label">Paquete</span>}
                      >
                        <Select
                          placeholder={s.paquetes.length === 0 ? "Sin paquetes disponibles" : "Selecciona el paquete"}
                          options={s.paquetes}
                          allowClear
                          disabled={s.paquetes.length === 0}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Form.Item
                    name={svField(s.id, "comentarios")}
                    label={<span className="eventos-field-label">Comentarios</span>}
                  >
                    <Input.TextArea
                      placeholder="Detalles específicos, requerimientos especiales..."
                      rows={3}
                      maxLength={1000}
                      showCount
                    />
                  </Form.Item>
                </div>
              ))}

            </div>

            <div className="cc-right-col">

              {/* ── Importe + Resumen (una sola tarjeta que se estira hasta abajo) ── */}
              <div className="cc-section-card cot-side-card">

                <div className="cc-section-header">
                  <span className="cc-section-icon"><DollarOutlined /></span>
                  Importe
                </div>
                <Form.Item
                  name="importe"
                  label={<span className="eventos-field-label">Importe total</span>}
                  rules={[{ required: true, message: "Requerido" }]}
                  style={{ marginBottom: 6 }}
                >
                  <Input
                    prefix="$"
                    suffix="MXN"
                    placeholder="0.00"
                    onBlur={() => handleMoneyBlur("importe")}
                  />
                </Form.Item>
                <p className="cot-help">Monto total estimado de la cotización.</p>

                <div className="cot-divider" />

                <div className="cc-section-header">
                  <span className="cc-section-icon"><AlignLeftOutlined /></span>
                  Resumen
                </div>

                <div className="cot-summary-list">
                  <div className="cot-summary-row">
                    <span className="cot-summary-key"># Folio</span>
                    <span className="cot-summary-val">
                      {(watchFolio || "").trim().toUpperCase() || "Sin especificar"}
                    </span>
                  </div>

                  <div className="cot-summary-row">
                    <span className="cot-summary-key">Cliente</span>
                    <span className="cot-summary-val">
                      {(watchCliente || "").trim() || "Sin especificar"}
                    </span>
                  </div>

                  <div className="cot-summary-row">
                    <span className="cot-summary-key">Tipo de evento</span>
                    <span className="cot-summary-val">
                      {TIPOS_EVENTO.find((t) => t.value === watchTipo)?.label || "Sin especificar"}
                    </span>
                  </div>

                  <div className="cot-summary-block">
                    <span className="cot-summary-key">Servicios</span>
                    {serviciosActivos.length === 0 ? (
                      <span className="cot-summary-empty">Ninguno seleccionado</span>
                    ) : (
                      <div className="cot-summary-chips">
                        {serviciosActivos.map((s) => (
                          <span key={s.id} className="cot-chip">{s.label}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Total fijado al pie de la tarjeta */}
                <div className="cot-summary-total">
                  <span className="cot-summary-total-label">Total estimado</span>
                  <span className="cot-summary-total-value">{fmtMoneyView(watchImporte)}</span>
                </div>
              </div>

            </div>
          </div>
        </Form>

      </div>
    </main>
  );
}
