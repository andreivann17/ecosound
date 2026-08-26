import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  Tooltip, Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { apiInformesInstance, authHeaderInformes } from "../../redux/actions/informes/informes";
import "./InformesPage.css";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

// Chart.js dibuja en <canvas>, no puede leer variables CSS (var(--eh-ink)).
// Se usa un gris medio legible tanto en fondo claro como oscuro.
ChartJS.defaults.color = "#64748b";
ChartJS.defaults.borderColor = "rgba(148,163,184,0.25)";

// ── Paleta (colores de marca HerrSoft Events) ─────────────────────────────────
const C = {
  primary:      "var(--eh-accent-text, var(--eh-primary-btn))",
  primarySoft:  "var(--eh-accent-soft, rgba(1,54,158,0.07))",
  secondary:    "var(--eh-accent-text, var(--eh-primary-btn))",
  secondarySoft:"var(--eh-accent-soft, rgba(1,54,158,0.07))",
  surface:      "var(--eh-surface, #ffffff)",
  bg:           "var(--eh-app-bg, #F4F6F8)",
  border:       "var(--eh-surface-border, #dde1e7)",
  text:         "var(--eh-ink, #1b1b1e)",
  muted:        "var(--eh-ink-muted, #5a6072)",
  outline:      "var(--eh-ink-faint, #8a909e)",
  amber:  "var(--eh-badge-amber-bg, #ffddb5)", amberText:"var(--eh-badge-amber-text, #5c3600)",
  teal:   "var(--eh-badge-teal-bg, #93f2f2)",  tealText:"var(--eh-badge-teal-text, #003030)",
  blue:   "var(--eh-badge-blue-bg, #d8e2ff)",  blueText:"var(--eh-badge-blue-text, #071b3b)",
  red:    "var(--eh-badge-red-bg, #ffdad6)",   redText:"var(--eh-badge-red-text, #93000a)",
  gray:   "var(--eh-badge-gray-bg, #e8eaed)",  grayText:"var(--eh-badge-gray-text, #44474e)",
  green:  "var(--eh-badge-green-bg, #c8f5c8)", greenText:"var(--eh-badge-green-text, #004d00)",
};

// ── Tipos de consulta (tabs) ──────────────────────────────────────────────────
const TIPOS = [
  { key:"eventos-activos",      label:"Eventos Próximos" },
  { key:"eventos-realizados",   label:"Eventos Realizados" },
  { key:"cotizaciones",         label:"Cotizaciones" },
  { key:"contratos",            label:"Pagos" },
  { key:"resumen-servicios",    label:"Servicios" },
  { key:"resumen-trabajadores", label:"Trabajadores" },
  { key:"gastos",               label:"Gastos" },
];

// Qué filtros aplican a cada tipo de consulta
const TAB_FILTERS = {
  "eventos-activos":      { servicio:true,  paquete:true,  ciudad:true,  tipoEvento:true,  trabajador:true,  estado:true,  tipoGasto:false, fechaContrato:true,  fechaRegistro:true,  momentoPago:true,  telefono:true,  usuario:true, lugar:true,  clienteNombre:true,  importe:true, fechaPago:false, estadoField:"estado_pago" },
  "eventos-realizados":   { servicio:true,  paquete:true,  ciudad:true,  tipoEvento:true,  trabajador:true,  estado:true,  tipoGasto:false, fechaContrato:true,  fechaRegistro:true,  momentoPago:true,  telefono:true,  usuario:true, lugar:true,  clienteNombre:true,  importe:true, fechaPago:false, estadoField:"estado_pago" },
  cotizaciones:           { servicio:true,  paquete:true,  ciudad:true,  tipoEvento:true,  trabajador:false, estado:true,  tipoGasto:false, fechaContrato:true,  fechaRegistro:true,  momentoPago:false, telefono:true,  usuario:true, lugar:true,  clienteNombre:true,  importe:true, fechaPago:false, estadoField:"estado" },
  contratos:              { servicio:true,  paquete:true,  ciudad:true,  tipoEvento:false, trabajador:false, estado:false, tipoGasto:false, fechaContrato:false, fechaRegistro:true,  momentoPago:true,  telefono:true,  usuario:true, lugar:true,  clienteNombre:true,  importe:true, fechaPago:true, estadoField:"estado_pago" },
  "resumen-servicios":    { servicio:true,  paquete:true,  ciudad:true,  tipoEvento:false, trabajador:false, estado:false, tipoGasto:false, fechaContrato:false, fechaRegistro:true,  momentoPago:false, telefono:true,  usuario:true, lugar:true,  clienteNombre:true,  importe:false, fechaPago:false },
  "resumen-trabajadores": { servicio:false, paquete:false, ciudad:true,  tipoEvento:false, trabajador:true,  trabajadorFila1:true, puesto:true, estado:false, tipoGasto:false, fechaContrato:false, fechaRegistro:true,  momentoPago:false, telefono:true,  usuario:true, lugar:true,  clienteNombre:true,  importe:false, fechaPago:false },
  gastos:                 { servicio:false, paquete:false, ciudad:false, tipoEvento:false, trabajador:false, estado:false, tipoGasto:true,  fechaContrato:false, fechaRegistro:true,  momentoPago:false, telefono:false, usuario:true, lugar:false, clienteNombre:false, importe:true, importeField:"monto", fechaPago:false },
};

const MOMENTO_PAGO_OPTIONS = ["Al Inicio Del Contrato", "Antes Del Evento", "Durante El Evento"];

// Debe coincidir exactamente con _SIN_PAQUETE_LABEL en informes.py (backend).
const SIN_PAQUETES = "Sin paquetes";

// Opciones fijas del filtro ESTADO por tab (idéntico a las tarjetas de EventosPage.jsx:
// activos -> Pendiente de pago / Pago completado / Sin anticipo,
// concluidos -> Con deuda / Liquidado)
const ESTADO_OPTIONS = {
  "eventos-activos":    ["Pendiente De Pago", "Pago Completado", "Sin Anticipo"],
  "eventos-realizados": ["Con Deuda", "Liquidado"],
  cotizaciones:         ["Pendiente", "Aceptada", "Rechazada"],
  contratos:            ["Pagado", "Parcial", "Pendiente"],
};

// ── Columnas por tipo ─────────────────────────────────────────────────────────
const COL_DEFS = {
  "eventos-activos": [
    { key:"folio",            label:"FOLIO",          req:true,  align:"left",   sort:true },
    { key:"cliente",          label:"CLIENTE",        req:false, align:"left",   sort:true },
    { key:"tipo_evento",      label:"TIPO DE EVENTO", req:false, align:"left",   sort:true },
    { key:"fecha_evento",     label:"FECHA EVENTO",   req:false, align:"left",   sort:true },
    { key:"fecha_contrato",   label:"FECHA CONTRATO", req:false, align:"left",   sort:true },
    { key:"ciudad",           label:"CIUDAD",         req:false, align:"left",   sort:true },
    { key:"lugar",            label:"LUGAR",          req:false, align:"left" },
    { key:"paquetes",         label:"PAQUETE",        req:false, align:"left" },
    { key:"importe",          label:"IMPORTE",        req:false, align:"right",  sort:true },
    { key:"anticipo",         label:"ANTICIPO",       req:false, align:"right",  sort:true },
    { key:"saldo_pendiente",  label:"SALDO",          req:false, align:"right",  sort:true },
    { key:"estado_pago",      label:"ESTADO DE PAGO", req:false, align:"center" },
    { key:"momento_pago",     label:"MOMENTO DE PAGO",req:false, align:"center", hidden:true },
    { key:"telefono",         label:"TELÉFONO",       req:false, align:"left",   hidden:true },
    { key:"fecha_registro",   label:"FECHA REGISTRO", req:false, align:"left",   sort:true, hidden:true },
  ],
  "eventos-realizados": [
    { key:"folio",            label:"FOLIO",          req:true,  align:"left",   sort:true },
    { key:"cliente",          label:"CLIENTE",        req:false, align:"left",   sort:true },
    { key:"tipo_evento",      label:"TIPO DE EVENTO", req:false, align:"left",   sort:true },
    { key:"fecha_evento",     label:"FECHA EVENTO",   req:false, align:"left",   sort:true },
    { key:"fecha_contrato",   label:"FECHA CONTRATO", req:false, align:"left",   sort:true },
    { key:"ciudad",           label:"CIUDAD",         req:false, align:"left",   sort:true },
    { key:"lugar",            label:"LUGAR",          req:false, align:"left" },
    { key:"paquetes",         label:"PAQUETE",        req:false, align:"left" },
    { key:"importe",          label:"IMPORTE",        req:false, align:"right",  sort:true },
    { key:"anticipo",         label:"ANTICIPO",       req:false, align:"right",  sort:true },
    { key:"saldo_pendiente",  label:"SALDO",          req:false, align:"right",  sort:true },
    { key:"estado_pago",      label:"ESTADO DE PAGO", req:false, align:"center" },
    { key:"momento_pago",     label:"MOMENTO DE PAGO",req:false, align:"center", hidden:true },
    { key:"telefono",         label:"TELÉFONO",       req:false, align:"left",   hidden:true },
    { key:"fecha_registro",   label:"FECHA REGISTRO", req:false, align:"left",   sort:true, hidden:true },
  ],
  cotizaciones: [
    { key:"folio",            label:"FOLIO",          req:true,  align:"left",   sort:true },
    { key:"cliente",          label:"CLIENTE",        req:false, align:"left",   sort:true },
    { key:"tipo_evento",      label:"TIPO DE EVENTO", req:false, align:"left",   sort:true },
    { key:"fecha_evento",     label:"FECHA EVENTO",   req:false, align:"left",   sort:true },
    { key:"ciudad",           label:"CIUDAD",         req:false, align:"left",   sort:true },
    { key:"importe",          label:"IMPORTE",        req:false, align:"right",  sort:true },
    { key:"estado",           label:"ESTADO",         req:false, align:"center" },
    { key:"momento_pago",     label:"MOMENTO DE PAGO",req:false, align:"center", hidden:true },
    { key:"telefono",         label:"TELÉFONO",       req:false, align:"left",   hidden:true },
    { key:"fecha_creacion",   label:"CREADA",         req:false, align:"left",   sort:true },
  ],
  contratos: [
    { key:"folio",            label:"FOLIO",          req:true,  align:"left",   sort:true },
    { key:"cliente",          label:"CLIENTE",        req:false, align:"left",   sort:true },
    { key:"fecha_evento",     label:"FECHA EVENTO",   req:false, align:"left",   sort:true },
    { key:"anticipo",         label:"ANTICIPO",       req:false, align:"right",  sort:true },
    { key:"fecha_pago",       label:"FECHA DE PAGO",  req:false, align:"left",   sort:true },
    { key:"momento_pago",     label:"MOMENTO DE PAGO",req:false, align:"center", hidden:true },
    { key:"fecha_registro",   label:"FECHA REGISTRO", req:false, align:"left",   sort:true, hidden:true },
    { key:"telefono",         label:"TELÉFONO",       req:false, align:"left",   hidden:true },
    { key:"lugar",            label:"LUGAR",          req:false, align:"left",   hidden:true },
  ],
  "resumen-servicios": [
    { key:"servicio",           label:"SERVICIO",    req:true,  align:"left",   sort:true },
    { key:"eventos_activos",    label:"PENDIENTES",  req:false, align:"right",  sort:true },
    { key:"eventos_realizados", label:"CONCLUIDOS",  req:false, align:"right",  sort:true },
    { key:"total_eventos",      label:"TOTAL",       req:false, align:"right",  sort:true },
  ],
  "resumen-trabajadores": [
    { key:"trabajador",         label:"TRABAJADOR",      req:true,  align:"left",   sort:true },
    { key:"puesto",             label:"PUESTO",          req:false, align:"left",   sort:true },
    { key:"rango_fechas",       label:"FECHA SERVICIO",  req:false, align:"left",   sort:true },
    { key:"rango_horario",      label:"HORARIO",         req:false, align:"left",   sort:true },
    { key:"eventos_activos",    label:"ACTIVOS",         req:false, align:"right",  sort:true },
    { key:"eventos_realizados", label:"REALIZADOS",      req:false, align:"right",  sort:true },
    { key:"total_eventos",      label:"TOTAL",           req:false, align:"right",  sort:true },
  ],
  gastos: [
    { key:"descripcion",  label:"DESCRIPCIÓN",   req:true,  align:"left",   sort:true },
    { key:"tipo_gasto",   label:"TIPO",           req:false, align:"left",   sort:true },
    { key:"monto",        label:"MONTO",          req:false, align:"right",  sort:true },
    { key:"fecha",        label:"FECHA",          req:false, align:"left",   sort:true },
    { key:"usuario",      label:"REGISTRADO POR", req:false, align:"left" },
  ],
};

const MONEY_COLS = new Set([
  "importe", "anticipo", "abonos", "saldo_pendiente",
  "importe_total", "saldo_pendiente_total", "monto",
]);
const DATE_COLS = new Set(["fecha_evento", "fecha_creacion", "fecha", "fecha_contrato", "fecha_registro", "fecha_pago"]);
const BADGE_COUNT_COLS = new Set(["eventos_activos", "total_eventos"]);

const getStatusStyle = (estado) => {
  const e = (estado || "").toLowerCase();
  if (e === "próximo" || e === "proximo")            return { bg: C.blue,  tc: C.blueText };
  if (e === "realizado")                             return { bg: C.gray,  tc: C.grayText };
  if (e === "pendiente")                             return { bg: C.amber, tc: C.amberText };
  if (e === "aceptada" || e === "pagado" || e === "pago completado" || e === "liquidado")
    return { bg: C.green, tc: C.greenText };
  if (e === "rechazada" || e === "con deuda")         return { bg: C.red,   tc: C.redText };
  if (e === "parcial" || e === "pendiente de pago")   return { bg: C.teal,  tc: C.tealText };
  if (e === "sin anticipo")                           return { bg: C.red,   tc: C.redText };
  if (e === "al inicio del contrato")                 return { bg: C.blue,  tc: C.blueText };
  if (e === "antes del evento")                       return { bg: C.teal,  tc: C.tealText };
  if (e === "durante el evento")                      return { bg: C.amber, tc: C.amberText };
  return { bg: C.gray, tc: C.grayText };
};

const MESES_ES = [
  "enero","febrero","marzo","abril","mayo","junio",
  "julio","agosto","septiembre","octubre","noviembre","diciembre",
];

const fmtDate = (v) => {
  if (!v) return null;
  const str = String(v);
  let datePart = str;
  let timePart = null;

  if (str.includes("T")) {
    [datePart, timePart] = str.split("T");
  } else if (/\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(str)) {
    [datePart, timePart] = str.split(" ");
  }

  if (!datePart.includes("-")) return str;
  const [y, m, d] = datePart.split("-");
  const mes = MESES_ES[parseInt(m, 10) - 1];
  if (!mes) return str;

  const dia = String(parseInt(d, 10)).padStart(2, "0");
  const base = `${dia} de ${mes} de ${y}`;

  if (timePart) {
    const hhmm = timePart.slice(0, 5);
    if (hhmm && hhmm !== "00:00") return `${base} a las ${hhmm} horas`;
  }
  return base;
};

const fmtDateISO = (s) => {
  if (!s) return "—";
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
};

const fmtMoney = (v) => {
  const n = parseFloat(v ?? 0);
  if (isNaN(n)) return "—";
  return new Intl.NumberFormat("es-MX", {
    style: "currency", currency: "MXN",
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n);
};

const toTitleCase = (s) => {
  if (!s) return s;
  return String(s)
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/(^|[\s.,/-])([a-záéíóúñü0-9])/g, (m, sep, c) => sep + c.toUpperCase());
};

// Redondea hacia arriba al siguiente "número limpio" (1/2/5 × 10^n), con un
// margen de padding — usado para que el eje de valor de cada gráfica de barras
// se ajuste a SU PROPIO máximo real, en vez de depender solo del auto-scale
// implícito de Chart.js (que no deja margen ni garantiza un tope explícito).
const niceMax = (values, padFactor = 1.1) => {
  const max = Math.max(0, ...values);
  if (max <= 0) return 5;
  const padded = max * padFactor;
  const magnitude = Math.pow(10, Math.floor(Math.log10(padded)));
  const residual = padded / magnitude;
  const niceResidual = residual > 5 ? 10 : residual > 2 ? 5 : residual > 1 ? 2 : 1;
  return niceResidual * magnitude;
};

// Igual que niceMax, pero para elegir un stepSize "limpio" que produzca
// aproximadamente `targetTicks` marcas en el eje (más granular en la parte
// baja del rango sin necesidad de un generador de ticks no-lineal).
const niceStep = (max, targetTicks = 10) => {
  if (max <= 0) return 1;
  const rawStep = max / targetTicks;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const residual = rawStep / magnitude;
  const niceResidual = residual > 5 ? 10 : residual > 2 ? 5 : residual > 1 ? 2 : 1;
  return niceResidual * magnitude;
};

// ── DatePickerES — input de fecha con display en español ──────────────────────
function DatePickerES({ value, onChange, label }) {
  const formatted = value ? fmtDate(value) : null;
  return (
    <div>
      <label style={{ display:"block", fontSize:10, fontWeight:700, letterSpacing:"0.06em",
        color:C.muted, marginBottom:4, textTransform:"uppercase" }}>{label}</label>
      <div style={{ position:"relative" }}>
        <input
          type="date"
          value={value}
          onChange={onChange}
          style={{ width:"100%", height:34, padding:"0 10px", border:`1px solid ${C.border}`,
            borderRadius:5, fontSize:13, color:"transparent", caretColor:"transparent",
            background:C.surface, outline:"none", boxSizing:"border-box",
            fontFamily:"inherit", cursor:"pointer" }}
        />
        <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center",
          padding:"0 10px", paddingRight:28, fontSize:12,
          color: formatted ? C.text : C.outline,
          pointerEvents:"none", whiteSpace:"nowrap", overflow:"hidden",
          textOverflow:"ellipsis" }}>
          {formatted || "dd/mm/aaaa"}
        </div>
      </div>
    </div>
  );
}

// ── Multiselect ───────────────────────────────────────────────────────────────
function Multiselect({ options, selected, onChange, label, placeholder, withSearch }) {
  const [open, setOpen]   = useState(false);
  const [query, setQuery] = useState("");
  const ref               = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const filtered = options.filter((o) => o.toLowerCase().includes(query.toLowerCase()));
  const toggle = (val) =>
    onChange(selected.includes(val) ? selected.filter((v) => v !== val) : [...selected, val]);
  const allFilteredSelected = filtered.length > 0 && filtered.every((o) => selected.includes(o));
  const toggleAll = () => {
    if (allFilteredSelected) {
      onChange(selected.filter((v) => !filtered.includes(v)));
    } else {
      onChange([...new Set([...selected, ...filtered])]);
    }
  };

  const hasActive = selected.length > 0;
  const btnLabel = !hasActive
    ? placeholder
    : selected.length === 1
      ? selected[0]
      : `${selected.length} seleccionados`;

  return (
    <div ref={ref} style={{ position:"relative", flex:1 }}>
      <label style={S.label}>{label}</label>
      <button type="button" onClick={() => setOpen((v) => !v)}
        style={{ ...S.input, display:"flex", justifyContent:"space-between", alignItems:"center",
          cursor:"pointer", padding:"0 10px",
          borderColor: hasActive ? C.secondary : C.border,
          background:  hasActive ? C.secondarySoft : C.surface }}>
        <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
          fontSize:13, fontWeight: hasActive ? 600 : 400,
          color: hasActive ? C.secondary : C.outline }}>
          {btnLabel}
        </span>
        <span style={{ fontSize:13, marginLeft:4, flexShrink:0, color: hasActive ? C.secondary : C.outline,
          transform: open ? "rotate(180deg)" : "none", transition:"transform 0.15s" }}>▾</span>
      </button>
      {open && (
        <div style={S.dropdown}>
          {withSearch && (
            <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar..."
              style={{ padding:"7px 10px", border:"none", borderBottom:`1px solid ${C.border}`,
                fontSize:12, outline:"none", width:"100%", boxSizing:"border-box", fontFamily:"inherit" }} />
          )}
          <div onClick={toggleAll}
            style={{ padding:"6px 12px", fontSize:11, fontWeight:700, letterSpacing:"0.05em",
              color:C.secondary, cursor:"pointer", borderBottom:`1px solid ${C.border}`, userSelect:"none" }}>
            {allFilteredSelected ? "Limpiar selección" : "Seleccionar todo"}
          </div>
          <div style={{ maxHeight:200, overflowY:"auto" }}>
            {filtered.map((opt) => (
              <label key={opt} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 12px",
                cursor:"pointer", fontSize:13, color:C.text,
                background: selected.includes(opt) ? C.secondarySoft : "transparent" }}>
                <input type="checkbox" checked={selected.includes(opt)} onChange={() => toggle(opt)}
                  style={{ accentColor:C.secondary, cursor:"pointer" }} />
                {opt}
              </label>
            ))}
            {filtered.length === 0 && (
              <div style={{ padding:"10px 12px", color:C.outline, fontSize:12, textAlign:"center" }}>
                Sin resultados
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
const THIS_YEAR = new Date().getFullYear();
const DEFAULT_FI = `${THIS_YEAR}-01-01`;
const DEFAULT_FF = `${THIS_YEAR}-12-31`;

export default function InformesPage() {

  const [tipoConsulta, setTipoConsulta] = useState("eventos-activos");

  // Filtros
  const [fechaInicio,         setFechaInicio]         = useState(DEFAULT_FI);
  const [fechaFin,            setFechaFin]            = useState(DEFAULT_FF);
  const [fechaContratoInicio, setFechaContratoInicio] = useState("");
  const [fechaContratoFin,    setFechaContratoFin]    = useState("");
  const [registroInicio,      setRegistroInicio]      = useState("");
  const [registroFin,         setRegistroFin]         = useState("");
  const [fechaPagoInicio,     setFechaPagoInicio]     = useState("");
  const [fechaPagoFin,        setFechaPagoFin]        = useState("");
  const [selTrabajador,  setSelTrabajador]  = useState([]);
  const [selPuesto,      setSelPuesto]      = useState([]);
  const [selTipoEvento,  setSelTipoEvento]  = useState([]);
  const [selCiudad,      setSelCiudad]      = useState([]);
  const [selTipoGasto,   setSelTipoGasto]   = useState([]);
  const [selServicio,    setSelServicio]    = useState([]);
  const [selPaquete,     setSelPaquete]     = useState([]);
  const [selMomentoPago, setSelMomentoPago] = useState([]);
  const [selTelefono,    setSelTelefono]    = useState([]);
  const [selUsuario,     setSelUsuario]     = useState([]);
  const [lugarQuery,     setLugarQuery]     = useState("");
  const [clienteQuery,   setClienteQuery]   = useState("");
  const [selEstado,      setSelEstado]      = useState([]);
  const [importeMin,     setImporteMin]     = useState("");
  const [importeMax,     setImporteMax]     = useState("");
  const [filtrosExpandidos, setFiltrosExpandidos] = useState(false);

  // Catálogos reales
  const [catTrabajadores,      setCatTrabajadores]      = useState([]);
  const [catPuestos,           setCatPuestos]           = useState([]);
  const [catTiposEvento,       setCatTiposEvento]       = useState([]);
  const [catCiudades,          setCatCiudades]          = useState([]);
  const [catTiposGasto,        setCatTiposGasto]        = useState([]);
  const [catServicios,         setCatServicios]         = useState([]);
  const [catPaquetes,          setCatPaquetes]          = useState([]);
  const [catPaquetesPorServicio, setCatPaquetesPorServicio] = useState({});
  const [catTelefonos,         setCatTelefonos]         = useState([]);
  const [catUsuarios,          setCatUsuarios]          = useState([]);
  const [catLoading,      setCatLoading]      = useState(true);

  // Datos tabla
  const [tableData,    setTableData]    = useState([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [tableError,   setTableError]   = useState(null);

  // Vista: tabla o gráficas
  const [viewMode, setViewMode] = useState("tabla");
  const [graficasData,    setGraficasData]    = useState(null);
  const [graficasLoading, setGraficasLoading] = useState(false);

  // Meta de la última consulta aplicada
  const [queryMeta, setQueryMeta] = useState({ fechaInicio: DEFAULT_FI, fechaFin: DEFAULT_FF });

  // Tabla: orden y paginación
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const [page,    setPage]    = useState(1);
  const [rowsPP,  setRowsPP]  = useState(25);

  const debounceRef  = useRef(null);
  const mountedRef   = useRef(false);
  const skipFilterEffectRef = useRef(false);
  const colPanelRef  = useRef(null);
  const dragSrcRef   = useRef(null);
  const [colPanelOpen, setColPanelOpen] = useState(false);
  const [visibleCols,  setVisibleCols]  = useState(null);
  const [colOrder,     setColOrder]     = useState(null);
  const [dragOverKey,  setDragOverKey]  = useState(null);

  const tabFilters = TAB_FILTERS[tipoConsulta] || {};
  const estadoField = tabFilters.estadoField || "estado";
  const importeField = tabFilters.importeField || "importe";
  const fechaContratoLabel = tipoConsulta === "cotizaciones" ? "COTIZACIÓN" : "CONTRATO";

  // Paquetes disponibles: si no hay servicio seleccionado, todos los paquetes;
  // si hay uno o más servicios seleccionados, solo los paquetes de esos servicios.
  const catPaquetesOptions = useMemo(() => {
    if (!selServicio.length) return [SIN_PAQUETES, ...catPaquetes];
    const set = new Set();
    selServicio.forEach((s) => (catPaquetesPorServicio[s] || []).forEach((p) => set.add(p)));
    return [SIN_PAQUETES, ...[...set].sort()];
  }, [selServicio, catPaquetes, catPaquetesPorServicio]);

  // Si al cambiar el servicio algún paquete ya seleccionado deja de pertenecer
  // a las opciones válidas, se quita (igual que autoridades en el módulo legal).
  useEffect(() => {
    setSelPaquete((prev) => prev.filter((p) => catPaquetesOptions.includes(p)));
    // eslint-disable-next-line
  }, [catPaquetesOptions]);

  // Cargar catálogos al montar
  useEffect(() => {
    setCatLoading(true);
    apiInformesInstance.get("/informes/catalogos", { headers: authHeaderInformes() })
      .then(({ data }) => {
        setCatTrabajadores(data.trabajadores || []);
        setCatPuestos(data.puestos || []);
        setCatTiposEvento(data.tipos_evento || []);
        setCatCiudades(data.ciudades || []);
        setCatTiposGasto(data.tipos_gasto || []);
        setCatServicios(data.servicios || []);
        setCatPaquetes(data.paquetes || []);
        setCatPaquetesPorServicio(data.paquetes_por_servicio || {});
        setCatTelefonos(data.telefonos || []);
        setCatUsuarios(data.usuarios || []);
      })
      .catch(console.error)
      .finally(() => setCatLoading(false));
  }, []);

  const fetchTable = useCallback(async (payload) => {
    setTableLoading(true);
    setTableError(null);
    try {
      const { data } = await apiInformesInstance.post("/informes/tabla", payload, { headers: authHeaderInformes() });
      const items = data.items || [];
      // Mismo criterio que las tarjetas de EventosPage: activos se clasifican por
      // anticipo/saldo, realizados solo por saldo (con deuda o liquidado).
      if (payload.tipo === "eventos-activos") {
        items.forEach((r) => {
          const saldo    = parseFloat(r.saldo_pendiente || 0);
          const anticipo = parseFloat(r.anticipo || 0);
          r.estado_pago = saldo <= 0 ? "Pago completado" : (anticipo === 0 ? "Sin anticipo" : "Pendiente de pago");
        });
      } else if (payload.tipo === "eventos-realizados") {
        items.forEach((r) => {
          const saldo = parseFloat(r.saldo_pendiente || 0);
          r.estado_pago = saldo <= 0 ? "Liquidado" : "Con deuda";
        });
      }
      setTableData(items);
    } catch (err) {
      setTableError(err?.response?.data?.detail || err.message || "Error al cargar datos");
      setTableData([]);
    } finally {
      setTableLoading(false);
    }
  }, []);

  const fetchGraficas = useCallback(async (payload) => {
    setGraficasLoading(true);
    try {
      const { data } = await apiInformesInstance.post("/informes/graficas", payload, { headers: authHeaderInformes() });
      setGraficasData(data);
    } catch (err) {
      console.error("graficas:", err);
      setGraficasData(null);
    } finally {
      setGraficasLoading(false);
    }
  }, []);

  const buildPayload = useCallback(() => ({
    tipo: tipoConsulta,
    fecha_inicio: fechaInicio,
    fecha_fin: fechaFin,
    fecha_contrato_inicio: fechaContratoInicio,
    fecha_contrato_fin: fechaContratoFin,
    registro_inicio: registroInicio,
    registro_fin: registroFin,
    pago_inicio: fechaPagoInicio,
    pago_fin: fechaPagoFin,
    trabajadores: selTrabajador,
    puestos: selPuesto,
    tipos_evento: selTipoEvento,
    ciudades: selCiudad,
    tipos_gasto: selTipoGasto,
    servicios: selServicio,
    paquetes: selPaquete,
    momentos_pago: selMomentoPago,
    telefonos: selTelefono,
    usuarios: selUsuario,
    cliente_query: clienteQuery,
    lugar_query: lugarQuery,
  }), [tipoConsulta, fechaInicio, fechaFin, fechaContratoInicio, fechaContratoFin, registroInicio, registroFin, fechaPagoInicio, fechaPagoFin, selTrabajador, selPuesto, selTipoEvento, selCiudad, selTipoGasto, selServicio, selPaquete, selMomentoPago, selTelefono, selUsuario, clienteQuery, lugarQuery]);

  // Carga inicial al cambiar tab (filtros propios del tab siempre limpios al cambiar)
  useEffect(() => {
    const payload = {
      tipo: tipoConsulta,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      fecha_contrato_inicio: "", fecha_contrato_fin: "",
      registro_inicio: "", registro_fin: "",
      pago_inicio: "", pago_fin: "",
      trabajadores: [], puestos: [], tipos_evento: [], ciudades: [], tipos_gasto: [], servicios: [], paquetes: [],
      momentos_pago: [], telefonos: [], usuarios: [],
      cliente_query: "", lugar_query: "",
    };
    setPage(1); setSortCol(null);
    fetchTable(payload);
    // eslint-disable-next-line
  }, [tipoConsulta]);

  // Auto-aplicar cuando cambia cualquier filtro (sin botón)
  useEffect(() => {
    if (!mountedRef.current) { mountedRef.current = true; return; }
    if (skipFilterEffectRef.current) { skipFilterEffectRef.current = false; return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const payload = buildPayload();
      setSelEstado([]); setColOrder(null);
      setPage(1); setSortCol(null);
      setQueryMeta({ fechaInicio, fechaFin });
      fetchTable(payload);
      if (viewMode === "graficas") fetchGraficas(payload);
      else setGraficasData(null);
    }, 300);
    // eslint-disable-next-line
  }, [fechaInicio, fechaFin, fechaContratoInicio, fechaContratoFin, registroInicio, registroFin, fechaPagoInicio, fechaPagoFin, selTrabajador, selPuesto, selTipoEvento, selCiudad, selTipoGasto, selServicio, selPaquete, selMomentoPago, selTelefono, selUsuario, clienteQuery, lugarQuery]);

  useEffect(() => {
    const h = (e) => { if (colPanelRef.current && !colPanelRef.current.contains(e.target)) setColPanelOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => { setPage(1); }, [selEstado, importeMin, importeMax, lugarQuery, clienteQuery]);

  const applyFilters = () => {
    const payload = buildPayload();
    setQueryMeta({ fechaInicio, fechaFin });
    setPage(1); setSortCol(null);
    fetchTable(payload);
    if (viewMode === "graficas") fetchGraficas(payload);
  };

  const clearFilters = () => {
    setFechaInicio(DEFAULT_FI); setFechaFin(DEFAULT_FF);
    setFechaContratoInicio(""); setFechaContratoFin("");
    setRegistroInicio(""); setRegistroFin("");
    setFechaPagoInicio(""); setFechaPagoFin("");
    setSelTrabajador([]); setSelPuesto([]); setSelTipoEvento([]);
    setSelCiudad([]); setSelTipoGasto([]); setSelServicio([]); setSelPaquete([]); setSelEstado([]);
    setSelMomentoPago([]); setSelTelefono([]); setSelUsuario([]); setLugarQuery(""); setClienteQuery("");
    setImporteMin(""); setImporteMax("");
  };

  const removeChip = (type, val) => {
    if (type === "trabajador")  setSelTrabajador(prev  => prev.filter(v => v !== val));
    if (type === "puesto")      setSelPuesto(prev      => prev.filter(v => v !== val));
    if (type === "tipoEvento")  setSelTipoEvento(prev  => prev.filter(v => v !== val));
    if (type === "ciudad")      setSelCiudad(prev      => prev.filter(v => v !== val));
    if (type === "tipoGasto")   setSelTipoGasto(prev   => prev.filter(v => v !== val));
    if (type === "servicio")    setSelServicio(prev    => prev.filter(v => v !== val));
    if (type === "paquete")     setSelPaquete(prev     => prev.filter(v => v !== val));
    if (type === "momentoPago") setSelMomentoPago(prev => prev.filter(v => v !== val));
    if (type === "telefono")    setSelTelefono(prev    => prev.filter(v => v !== val));
    if (type === "usuario")     setSelUsuario(prev     => prev.filter(v => v !== val));
    if (type === "lugar")       setLugarQuery("");
    if (type === "clienteNombre") setClienteQuery("");
    if (type === "estado")      setSelEstado(prev      => prev.filter(v => v !== val));
    if (type === "importe")     { setImporteMin(""); setImporteMax(""); }
    if (type === "fechaServicio") { setFechaInicio(""); setFechaFin(""); }
    if (type === "fechaContrato") { setFechaContratoInicio(""); setFechaContratoFin(""); }
    if (type === "fechaRegistro") { setRegistroInicio(""); setRegistroFin(""); }
    if (type === "fechaPago")    { setFechaPagoInicio(""); setFechaPagoFin(""); }
  };

  const handleSort = (key) => {
    if (sortCol === key) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortCol(key); setSortDir("asc"); }
    setPage(1);
  };

  const handleTipoChange = (key) => {
    // Evita que el useEffect de "auto-aplicar filtros" dispare un segundo
    // fetch redundante cuando estos resets son consecuencia de cambiar de tab
    // (el useEffect de tipoConsulta ya hace su propio fetch con filtros limpios).
    skipFilterEffectRef.current = true;
    setTipoConsulta(key);
    setSelTrabajador([]); setSelPuesto([]); setSelTipoEvento([]);
    setSelCiudad([]); setSelTipoGasto([]); setSelServicio([]); setSelPaquete([]); setSelEstado([]);
    setSelMomentoPago([]); setSelTelefono([]); setSelUsuario([]); setLugarQuery(""); setClienteQuery("");
    setRegistroInicio(""); setRegistroFin("");
    setFechaPagoInicio(""); setFechaPagoFin("");
    setImporteMin(""); setImporteMax("");
    setGraficasData(null);
    setViewMode("tabla");
    setVisibleCols(null);
    setColOrder(null);
    setColPanelOpen(false);
  };

  // Derivados
  const cols = COL_DEFS[tipoConsulta] || [];
  const idCol = cols.find((c) => c.req)?.key;
  const ALWAYS_VIS = [idCol].filter(Boolean);

  const orderedCols = useMemo(() => {
    if (!colOrder) return cols;
    return [...cols].sort((a, b) => {
      const ai = colOrder.indexOf(a.key);
      const bi = colOrder.indexOf(b.key);
      if (ai === -1 && bi === -1) return 0;
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  }, [cols, colOrder]);

  const displayCols = orderedCols.filter((c) => {
    if (ALWAYS_VIS.includes(c.key)) return true;
    if (visibleCols !== null) return visibleCols.has(c.key);
    return !c.hidden;
  });

  const orderedPanelCols = orderedCols;

  const isColVisible = (key) => {
    if (visibleCols !== null) return visibleCols.has(key);
    const col = cols.find((c) => c.key === key);
    return !(col && col.hidden);
  };
  const toggleColVis = (key) => {
    setVisibleCols((prev) => {
      const cur = prev ?? new Set(cols.filter((c) => !c.hidden).map((c) => c.key));
      const next = new Set(cur);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const reorderCol = (srcKey, tgtKey) => {
    if (!srcKey || srcKey === tgtKey) return;
    setColOrder((prev) => {
      const base = prev ?? orderedPanelCols.map((c) => c.key);
      const arr = [...base];
      const si = arr.indexOf(srcKey);
      const ti = arr.indexOf(tgtKey);
      if (si === -1 || ti === -1) return prev;
      arr.splice(si, 1);
      arr.splice(ti, 0, srcKey);
      return arr;
    });
  };

  const catEstados = ESTADO_OPTIONS[tipoConsulta] || [];

  const sortedData = useMemo(() => {
    if (!sortCol) return tableData;
    return [...tableData].sort((a, b) => {
      let va = a[sortCol] ?? "";
      let vb = b[sortCol] ?? "";
      if (typeof va === "number" && typeof vb === "number")
        return sortDir === "asc" ? va - vb : vb - va;
      va = String(va).toLowerCase(); vb = String(vb).toLowerCase();
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ?  1 : -1;
      return 0;
    });
  }, [tableData, sortCol, sortDir]);

  const filteredData = useMemo(() => {
    let data = sortedData;
    if (selEstado.length) data = data.filter((r) => selEstado.includes(toTitleCase(r[estadoField])));
    if (importeMin !== "") data = data.filter((r) => parseFloat(r[importeField] || 0) >= parseFloat(importeMin));
    if (importeMax !== "") data = data.filter((r) => parseFloat(r[importeField] || 0) <= parseFloat(importeMax));
    // En "resumen-servicios" no hay columna cliente/lugar por fila (es un
    // agregado por servicio) — ahí el filtro ya se aplicó en el backend sobre
    // los contratos subyacentes, filtrar aquí de nuevo solo vaciaría la tabla.
    if (tipoConsulta !== "resumen-servicios") {
      if (lugarQuery.trim()) {
        const q = lugarQuery.trim().toLowerCase();
        data = data.filter((r) => (r.lugar || "").toLowerCase().includes(q));
      }
      if (clienteQuery.trim()) {
        const q = clienteQuery.trim().toLowerCase();
        data = data.filter((r) => (r.cliente || "").toLowerCase().includes(q));
      }
    }
    return data;
  }, [sortedData, selEstado, estadoField, importeMin, importeMax, importeField, lugarQuery, clienteQuery, tipoConsulta]);

  const total      = filteredData.length;
  const start      = total === 0 ? 0 : (page - 1) * rowsPP + 1;
  const end        = Math.min(page * rowsPP, total);
  const pageData   = filteredData.slice((page - 1) * rowsPP, page * rowsPP);
  const totalPages = Math.max(1, Math.ceil(total / rowsPP));

  const activeChips = [
    ...((fechaInicio || fechaFin)
      ? [{ type:"fechaServicio", val:`Servicio: ${fechaInicio ? fmtDateISO(fechaInicio) : "..."} - ${fechaFin ? fmtDateISO(fechaFin) : "..."}` }]
      : []),
    ...((fechaContratoInicio || fechaContratoFin)
      ? [{ type:"fechaContrato", val:`${toTitleCase(fechaContratoLabel)}: ${fechaContratoInicio ? fmtDateISO(fechaContratoInicio) : "..."} - ${fechaContratoFin ? fmtDateISO(fechaContratoFin) : "..."}` }]
      : []),
    ...((registroInicio || registroFin)
      ? [{ type:"fechaRegistro", val:`Registro: ${registroInicio ? fmtDateISO(registroInicio) : "..."} - ${registroFin ? fmtDateISO(registroFin) : "..."}` }]
      : []),
    ...((fechaPagoInicio || fechaPagoFin)
      ? [{ type:"fechaPago", val:`Pago: ${fechaPagoInicio ? fmtDateISO(fechaPagoInicio) : "..."} - ${fechaPagoFin ? fmtDateISO(fechaPagoFin) : "..."}` }]
      : []),
    ...selTrabajador.map((v) => ({ type:"trabajador", val:v })),
    ...selPuesto.map((v)     => ({ type:"puesto",     val:v })),
    ...selTipoEvento.map((v) => ({ type:"tipoEvento", val:v })),
    ...selCiudad.map((v)     => ({ type:"ciudad",     val:v })),
    ...selTipoGasto.map((v)  => ({ type:"tipoGasto",  val:v })),
    ...selServicio.map((v)   => ({ type:"servicio",   val:v })),
    ...selPaquete.map((v)    => ({ type:"paquete",    val:v })),
    ...selMomentoPago.map((v) => ({ type:"momentoPago", val:v })),
    ...selTelefono.map((v)   => ({ type:"telefono",   val:v })),
    ...selUsuario.map((v)    => ({ type:"usuario",    val:v })),
    ...(lugarQuery.trim()
      ? [{ type:"lugar", val:`Lugar: ${lugarQuery.trim()}` }]
      : []),
    ...(clienteQuery.trim()
      ? [{ type:"clienteNombre", val:`Cliente: ${clienteQuery.trim()}` }]
      : []),
    ...selEstado.map((v)     => ({ type:"estado",     val:v })),
    ...(importeMin !== "" || importeMax !== ""
      ? [{ type:"importe", val:`Importe: ${importeMin || "0"} - ${importeMax || "∞"}` }]
      : []),
  ];

  const titleLabel = TIPOS.find((t) => t.key === tipoConsulta)?.label || "";

  // ── Exportaciones ──────────────────────────────────────────────────────────
  const exportCols = cols;

  const exportCSV = useCallback(() => {
    const data = selEstado.length ? tableData.filter((r) => selEstado.includes(toTitleCase(r[estadoField]))) : tableData;
    const headers = exportCols.map((c) => c.label);
    const rows = data.map((row) =>
      exportCols.map((c) => {
        const v = row[c.key] ?? "";
        const s = String(v);
        return s.includes(",") || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
      })
    );
    const BOM = "﻿";
    const csv = BOM + [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${titleLabel}_${queryMeta.fechaInicio}_${queryMeta.fechaFin}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [tableData, selEstado, exportCols, titleLabel, queryMeta, estadoField]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ background:C.bg, minHeight:"100%", color:C.text, fontFamily:'"Noto Sans", system-ui, sans-serif' }}>

      {/* Encabezado */}
      <div style={{ background:C.surface, borderBottom:`1px solid ${C.border}`, padding:"16px 24px 0" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
          <div>
            <h2 style={{ fontSize:20, fontWeight:700, color:C.primary, margin:0, letterSpacing:"-0.01em" }}>
              Informes
            </h2>
            <p style={{ fontSize:12, color:"var(--eh-ink-2, #5a6072)", margin:"2px 0 0" }}>
              Consulta y exportación de datos operativos del sistema
            </p>
          </div>
          {catLoading && (
            <span style={{ fontSize:11, color:C.outline, fontStyle:"italic", alignSelf:"center" }}>
              Cargando catálogos...
            </span>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", flexWrap:"wrap", borderTop:`1px solid ${C.border}`,
          marginLeft:-24, marginRight:-24, paddingLeft:24 }}>
          {TIPOS.map((t) => {
            const active = tipoConsulta === t.key;
            return (
              <button key={t.key} type="button" onClick={() => handleTipoChange(t.key)}
                style={{ padding:"10px 18px", background:"transparent", border:"none",
                  borderBottom: active ? `2px solid ${C.secondary}` : "2px solid transparent",
                  color: active ? C.secondary : C.muted, fontWeight: active ? 700 : 500,
                  fontSize:13, cursor:"pointer", fontFamily:"inherit", marginBottom:-1,
                  whiteSpace:"nowrap", transition:"color 0.15s, border-color 0.15s" }}>
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ padding:20 }}>

        {/* Filtros */}
        <div style={{ ...S.card, marginBottom:12 }}>
          {/* Fila 1: fechas + cliente + tipo de evento + limpiar */}
          <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:12 }}>
            <div style={{ flex:"1 1 130px", maxWidth:190 }}>
              <DatePickerES label="FECHA INICIO SERVICIO" value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)} />
            </div>
            <div style={{ flex:"1 1 130px", maxWidth:190 }}>
              <DatePickerES label="FECHA FIN SERVICIO" value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)} />
            </div>
            {tabFilters.servicio && (
              <div style={{ flex:"2 1 160px" }}>
                <Multiselect label="SERVICIO" placeholder="Todos"
                  options={catServicios} selected={selServicio} onChange={setSelServicio} />
              </div>
            )}
            {tabFilters.paquete && (
              <div style={{ flex:"2 1 160px" }}>
                <Multiselect label="PAQUETE" placeholder="Todos"
                  options={catPaquetesOptions} selected={selPaquete} onChange={setSelPaquete} withSearch />
              </div>
            )}
            {tabFilters.tipoEvento && (
              <div style={{ flex:"1 1 160px" }}>
                <Multiselect label="TIPO DE EVENTO" placeholder="Todos"
                  options={catTiposEvento} selected={selTipoEvento} onChange={setSelTipoEvento} />
              </div>
            )}
            {tabFilters.trabajadorFila1 && (
              <div style={{ flex:"1 1 160px" }}>
                <Multiselect label="TRABAJADOR" placeholder="Todos"
                  options={catTrabajadores} selected={selTrabajador} onChange={setSelTrabajador} withSearch />
              </div>
            )}
            {tabFilters.puesto && (
              <div style={{ flex:"1 1 160px" }}>
                <Multiselect label="TIPO DE PUESTO" placeholder="Todos"
                  options={catPuestos} selected={selPuesto} onChange={setSelPuesto} />
              </div>
            )}
            {tabFilters.ciudad && (
              <div style={{ flex:"1 1 160px" }}>
                <Multiselect label="CIUDAD" placeholder="Todas"
                  options={catCiudades} selected={selCiudad} onChange={setSelCiudad} />
              </div>
            )}
            {tabFilters.tipoGasto && (
              <div style={{ flex:"1 1 160px" }}>
                <Multiselect label="TIPO DE GASTO" placeholder="Todos"
                  options={catTiposGasto} selected={selTipoGasto} onChange={setSelTipoGasto} />
              </div>
            )}
            {tabFilters.tipoGasto && tabFilters.importe && (
              <div style={{ flex:"1 1 220px" }}>
                <label style={S.label}>IMPORTE (MÍN - MÁX)</label>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <input type="number" placeholder="Mín" value={importeMin}
                    onChange={(e) => setImporteMin(e.target.value)}
                    style={{ ...S.input, MozAppearance:"textfield" }} />
                  <span style={{ color:C.outline, fontSize:12 }}>-</span>
                  <input type="number" placeholder="Máx" value={importeMax}
                    onChange={(e) => setImporteMax(e.target.value)}
                    style={{ ...S.input, MozAppearance:"textfield" }} />
                </div>
              </div>
            )}
            <div style={{ display:"flex", gap:8, marginLeft:"auto", alignItems:"flex-end", flexShrink:0 }}>
              <button type="button" onClick={clearFilters} style={{ ...S.btnGhost, padding:"0 24px",
                background:"var(--eh-btn-clean-bg, #fff)", borderColor:"var(--eh-btn-clean-border, #dde1e7)",
                color:"var(--eh-btn-clean-text, #5a6072)" }}>Limpiar</button>
            </div>
          </div>
          {(tabFilters.fechaContrato || tabFilters.fechaPago || tabFilters.estado || (tabFilters.trabajador && !tabFilters.trabajadorFila1) || tabFilters.momentoPago || (tabFilters.importe && !tabFilters.tipoGasto)) && (
            <>
              <div style={{ height:1, background:C.border, margin:"0 -16px 12px" }} />
              {/* Fila 2: fecha contrato/pago + estado + trabajador + momento de pago + tipo de gasto + importe */}
              <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
                {tabFilters.fechaPago && (
                  <>
                    <div style={{ flex:"1 1 130px", maxWidth:190 }}>
                      <DatePickerES label="FECHA PAGO INICIO" value={fechaPagoInicio}
                        onChange={(e) => setFechaPagoInicio(e.target.value)} />
                    </div>
                    <div style={{ flex:"1 1 130px", maxWidth:190 }}>
                      <DatePickerES label="FECHA PAGO FIN" value={fechaPagoFin}
                        onChange={(e) => setFechaPagoFin(e.target.value)} />
                    </div>
                  </>
                )}
                {tabFilters.fechaContrato && (
                  <>
                    <div style={{ flex:"1 1 130px", maxWidth:190 }}>
                      <DatePickerES label={`FECHA INICIO ${fechaContratoLabel}`} value={fechaContratoInicio}
                        onChange={(e) => setFechaContratoInicio(e.target.value)} />
                    </div>
                    <div style={{ flex:"1 1 130px", maxWidth:190 }}>
                      <DatePickerES label={`FECHA FIN ${fechaContratoLabel}`} value={fechaContratoFin}
                        onChange={(e) => setFechaContratoFin(e.target.value)} />
                    </div>
                  </>
                )}
                {tabFilters.estado && (
                  <Multiselect label="ESTATUS" placeholder="Todos"
                    options={catEstados} selected={selEstado} onChange={setSelEstado} />
                )}
                {tabFilters.trabajador && !tabFilters.trabajadorFila1 && (
                  <Multiselect label="TRABAJADOR" placeholder="Todos"
                    options={catTrabajadores} selected={selTrabajador} onChange={setSelTrabajador} withSearch />
                )}
                {tabFilters.momentoPago && (
                  <Multiselect label="MOMENTO DE PAGO" placeholder="Todos"
                    options={MOMENTO_PAGO_OPTIONS} selected={selMomentoPago} onChange={setSelMomentoPago} />
                )}
                {tabFilters.importe && !tabFilters.tipoGasto && (
                  <div style={{ flex:"1 1 220px" }}>
                    <label style={S.label}>IMPORTE (MÍN - MÁX)</label>
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <input type="number" placeholder="Mín" value={importeMin}
                        onChange={(e) => setImporteMin(e.target.value)}
                        style={{ ...S.input, MozAppearance:"textfield" }} />
                      <span style={{ color:C.outline, fontSize:12 }}>-</span>
                      <input type="number" placeholder="Máx" value={importeMax}
                        onChange={(e) => setImporteMax(e.target.value)}
                        style={{ ...S.input, MozAppearance:"textfield" }} />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
          {filtrosExpandidos && (tabFilters.fechaRegistro || tabFilters.telefono || tabFilters.usuario || tabFilters.lugar || tabFilters.clienteNombre) && (
            <>
              <div style={{ height:1, background:C.border, margin:"12px -16px" }} />
              {/* Fila 3 (oculta por defecto): fecha registro + usuario + teléfono + cliente + lugar */}
              <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
                {tabFilters.fechaRegistro && (
                  <>
                    <div style={{ flex:"1 1 130px", maxWidth:190 }}>
                      <DatePickerES label="FECHA INICIO REGISTRO" value={registroInicio}
                        onChange={(e) => setRegistroInicio(e.target.value)} />
                    </div>
                    <div style={{ flex:"1 1 130px", maxWidth:190 }}>
                      <DatePickerES label="FECHA FIN REGISTRO" value={registroFin}
                        onChange={(e) => setRegistroFin(e.target.value)} />
                    </div>
                  </>
                )}
                {tabFilters.usuario && (
                  <Multiselect label="USUARIO" placeholder="Todos"
                    options={catUsuarios} selected={selUsuario} onChange={setSelUsuario} withSearch />
                )}
                {tabFilters.telefono && (
                  <Multiselect label="TELÉFONO" placeholder="Todos"
                    options={catTelefonos} selected={selTelefono} onChange={setSelTelefono} withSearch />
                )}
                {tabFilters.clienteNombre && (
                  <div style={{ flex:1 }}>
                    <label style={S.label}>CLIENTE</label>
                    <input type="text" placeholder="Buscar por cliente..." value={clienteQuery}
                      onChange={(e) => setClienteQuery(e.target.value)}
                      style={S.input} />
                  </div>
                )}
                {tabFilters.lugar && (
                  <div style={{ flex:1 }}>
                    <label style={S.label}>LUGAR</label>
                    <input type="text" placeholder="Buscar por lugar..." value={lugarQuery}
                      onChange={(e) => setLugarQuery(e.target.value)}
                      style={S.input} />
                  </div>
                )}
              </div>
            </>
          )}
          {(tabFilters.fechaRegistro || tabFilters.telefono || tabFilters.usuario || tabFilters.lugar || tabFilters.clienteNombre) && (
            <div style={{ textAlign:"center", marginTop:10 }}>
              <a onClick={() => setFiltrosExpandidos((v) => !v)}
                style={{ fontSize:12, color:C.secondary, cursor:"pointer", fontWeight:600,
                  textDecoration:"none", userSelect:"none" }}>
                {filtrosExpandidos ? "▲ Ocultar filtros avanzados" : "▾ Mostrar filtros avanzados"}
              </a>
            </div>
          )}
        </div>

        {/* Chips de filtros activos */}
        {activeChips.length > 0 && (
          <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:12 }}>
            <span style={{ fontSize:11, color:C.muted, fontWeight:600, letterSpacing:"0.04em", alignSelf:"center" }}>
              FILTROS ACTIVOS:
            </span>
            {activeChips.map((chip) => (
              <span key={chip.type + chip.val}
                style={{ display:"inline-flex", alignItems:"center", gap:5, background:C.secondarySoft,
                  color:C.secondary, border:`1px solid ${C.secondary}40`,
                  padding:"3px 8px 3px 10px", borderRadius:20, fontSize:12, fontWeight:600 }}>
                {chip.val}
                <button type="button" onClick={() => removeChip(chip.type, chip.val)}
                  style={{ background:"none", border:"none", cursor:"pointer", color:C.secondary,
                    padding:0, lineHeight:1, fontSize:14, display:"flex", alignItems:"center" }}>×</button>
              </span>
            ))}
            <button type="button" onClick={clearFilters}
              style={{ fontSize:11, color:C.muted, background:"none", border:"none",
                cursor:"pointer", textDecoration:"underline", fontFamily:"inherit" }}>
              Limpiar todo
            </button>
          </div>
        )}

        {/* Encabezado resultados */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10, gap:12 }}>

          {/* Izquierda: título + toggle vista */}
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:2 }}>
              <span style={{ fontSize:15, fontWeight:700, color:C.primary }}>{titleLabel}</span>
              <span style={{ background:C.primarySoft, color:C.primary, fontSize:11, fontWeight:700,
                padding:"2px 8px", borderRadius:10 }}>
                {tableLoading ? "..." : `${total} registro${total !== 1 ? "s" : ""}`}
              </span>
            </div>
            <p style={{ fontSize:12, color:C.muted, margin:"0 0 10px" }}>
              {fmtDateISO(queryMeta.fechaInicio)} - {fmtDateISO(queryMeta.fechaFin)}
            </p>
            {/* Toggle vista */}
            <div style={{ display:"flex", gap:0, border:`1px solid ${C.border}`, borderRadius:6, overflow:"hidden", width:"fit-content" }}>
              {[{ k:"tabla", icon:"☰", lbl:"Tabla" }, { k:"graficas", icon:"◈", lbl:"Gráficas" }].map(({ k, icon, lbl }) => (
                <button key={k} type="button" onClick={() => {
                  setViewMode(k);
                  if (k === "graficas" && !graficasData) {
                    fetchGraficas(buildPayload());
                  }
                }}
                  style={{ padding:"6px 16px", border:"none", fontFamily:"inherit",
                    fontSize:12, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:6,
                    background: viewMode === k ? C.secondary : C.surface,
                    color: viewMode === k ? "#fff" : C.muted,
                    borderRight: k === "tabla" ? `1px solid ${C.border}` : "none",
                    transition:"all 0.15s" }}>
                  <span style={{ fontSize:11 }}>{icon}</span> {lbl}
                </button>
              ))}
            </div>
          </div>

          {/* Derecha: columnas + exportar */}
          <div style={{ display:"flex", gap:16, alignItems:"flex-start", flexShrink:0 }}>

            {/* Selector de columnas */}
            <div ref={colPanelRef} style={{ position:"relative" }}>
              <span style={{ display:"block", fontSize:10, fontWeight:700, letterSpacing:"0.06em",
                color:C.outline, textTransform:"uppercase", marginBottom:6 }}>Columnas</span>
              <button type="button" onClick={() => setColPanelOpen((v) => !v)}
                style={{ ...S.btnGhost, display:"flex", alignItems:"center", gap:6,
                  borderColor: colPanelOpen ? C.secondary : C.border,
                  color: colPanelOpen ? C.secondary : C.muted }}>
                ⊞ Columnas
                <span style={{ fontSize:10, opacity:0.5,
                  transform: colPanelOpen ? "rotate(180deg)" : "none", transition:"transform 0.15s" }}>▾</span>
              </button>
              {colPanelOpen && (
                <div style={{ ...S.colPanel, right:0 }}>
                  <div style={{ padding:"8px 14px 6px", display:"flex", alignItems:"center",
                    justifyContent:"space-between", borderBottom:`1px solid ${C.border}` }}>
                    <span style={{ fontSize:10, fontWeight:700, letterSpacing:"0.05em",
                      color:C.muted, textTransform:"uppercase" }}>Columnas · arrastra para reordenar</span>
                    {colOrder && (
                      <button type="button" onClick={() => setColOrder(null)}
                        style={{ fontSize:10, background:"none", border:"none", cursor:"pointer",
                          color:C.secondary, fontWeight:700, fontFamily:"inherit", padding:0 }}>
                        Restablecer
                      </button>
                    )}
                  </div>
                  {orderedPanelCols.map((col) => {
                    const always = col.key === idCol;
                    const checked = always || isColVisible(col.key);
                    const isTarget = dragOverKey === col.key;
                    return (
                      <div key={col.key}
                        draggable
                        onDragStart={(e) => {
                          dragSrcRef.current = col.key;
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "move";
                          if (dragSrcRef.current !== col.key) setDragOverKey(col.key);
                        }}
                        onDragLeave={() => setDragOverKey(null)}
                        onDrop={(e) => {
                          e.preventDefault();
                          reorderCol(dragSrcRef.current, col.key);
                          setDragOverKey(null);
                          dragSrcRef.current = null;
                        }}
                        onDragEnd={() => { setDragOverKey(null); dragSrcRef.current = null; }}
                        style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 14px",
                          userSelect:"none", cursor:"default",
                          borderTop: isTarget ? `2px solid ${C.secondary}` : "2px solid transparent",
                          background: checked && !always ? C.secondarySoft : "transparent",
                          transition:"border-color 0.1s" }}>
                        <span style={{ color:C.outline, fontSize:15, cursor:"grab",
                          flexShrink:0, lineHeight:1 }} title="Arrastra para mover">⠿</span>
                        <input type="checkbox" checked={checked} disabled={always}
                          onChange={(e) => { e.stopPropagation(); !always && toggleColVis(col.key); }}
                          onClick={(e) => e.stopPropagation()}
                          style={{ accentColor:C.secondary,
                            cursor: always ? "default" : "pointer", flexShrink:0 }} />
                        <span style={{ fontSize:13, color: always ? C.outline : C.text, flex:1 }}>
                          {col.label}
                        </span>
                        {always && (
                          <span style={{ fontSize:9, fontWeight:700, letterSpacing:"0.06em",
                            color:C.outline, textTransform:"uppercase" }}>fijo</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Exportar */}
            <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6 }}>
              <span style={{ fontSize:10, fontWeight:700, letterSpacing:"0.06em", color:C.outline, textTransform:"uppercase" }}>
                Exportar
              </span>
              <div style={{ display:"flex", gap:8 }}>
                <button type="button" onClick={exportCSV}
                  style={{ ...S.btnGhost, display:"flex", alignItems:"center", gap:6,
                    color:"#004d00", borderColor:"#c8f5c8", background:"#c8f5c8" }}>
                  <span style={{ fontSize:13 }}>⬇</span> Excel
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── VISTA GRÁFICAS ──────────────────────────────────────────────── */}
        {viewMode === "graficas" && (
          <GraficasView
            graficasData={graficasData}
            total={total}
            loading={graficasLoading || tableLoading}
            tipoConsulta={tipoConsulta}
            catServicios={catServicios}
          />
        )}

        {/* ── VISTA TABLA ─────────────────────────────────────────────────── */}
        {viewMode === "tabla" && <div style={{ ...S.card, padding:0 }}>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", minWidth:"max-content" }}>
              <thead>
                <tr style={{ background:"var(--eh-surface-2, #f0f2f5)", borderBottom:`2px solid ${C.border}` }}>
                  {displayCols.map((col) => {
                    const active = sortCol === col.key;
                    return (
                      <th key={col.key} onClick={() => col.sort && handleSort(col.key)}
                        style={{ ...S.th, color: active ? C.secondary : C.muted,
                          cursor: col.sort ? "pointer" : "default",
                          width: col.w, textAlign: col.align, userSelect:"none" }}>
                        <span style={{ display:"inline-flex", alignItems:"center", gap:4,
                          justifyContent: col.align === "right" ? "flex-end"
                            : col.align === "center" ? "center" : "flex-start" }}>
                          {col.label}
                          {col.sort && (
                            <span style={{ opacity: active ? 1 : 0.3, fontSize:10 }}>
                              {active ? (sortDir === "asc" ? "↑" : "↓") : "⇅"}
                            </span>
                          )}
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {tableLoading ? (
                  <tr>
                    <td colSpan={99} style={{ padding:"56px 24px", textAlign:"center", color:C.outline }}>
                      <div style={{ fontSize:20, marginBottom:6 }}>⏳</div>
                      <div style={{ fontSize:13 }}>Consultando datos...</div>
                    </td>
                  </tr>
                ) : tableError ? (
                  <tr>
                    <td colSpan={99} style={{ padding:"40px 24px", textAlign:"center" }}>
                      <div style={{ color:C.redText, fontSize:13, marginBottom:10 }}>
                        Error al cargar datos: {tableError}
                      </div>
                      <button onClick={applyFilters} style={S.btnGhost}>Reintentar</button>
                    </td>
                  </tr>
                ) : pageData.length === 0 ? (
                  <tr>
                    <td colSpan={99} style={{ padding:"56px 24px", textAlign:"center", color:C.outline }}>
                      <div style={{ fontSize:28, marginBottom:8 }}>🔍</div>
                      Sin registros para los filtros seleccionados
                    </td>
                  </tr>
                ) : pageData.map((row, idx) => {
                  return (
                    <tr key={idx}
                      style={{ borderBottom:`1px solid ${C.border}`,
                        background: idx % 2 === 1 ? "var(--eh-surface-2, #f8f9fb)" : C.surface }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "rgba(13,148,136,0.05)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = idx % 2 === 1 ? "var(--eh-surface-2, #f8f9fb)" : C.surface}
                    >
                      {displayCols.map((col) => {
                        const val = row[col.key];
                        let content;

                        if (col.key === idCol) {
                          content = (
                            <span style={{ fontWeight:700, color:C.primary, fontFamily:"monospace",
                              fontSize:12, letterSpacing:"0.02em" }}>{val || "—"}</span>
                          );
                        } else if (col.key === "estado" || col.key === "estado_pago" || col.key === "momento_pago") {
                          if (!val) return <td key={col.key} style={{ padding:"8px 12px", color:C.outline }}>—</td>;
                          const st = getStatusStyle(val);
                          content = (
                            <span style={{ background:st.bg, color:st.tc, padding:"2px 8px",
                              borderRadius:4, fontSize:10, fontWeight:700, letterSpacing:"0.05em",
                              textTransform:"uppercase", whiteSpace:"nowrap", display:"inline-block" }}>
                              {toTitleCase(val)}
                            </span>
                          );
                        } else if (DATE_COLS.has(col.key)) {
                          const d = fmtDate(val);
                          content = d
                            ? <span style={{ fontSize:13, color:C.text }}>{d}</span>
                            : <span style={{ color:C.outline, fontStyle:"italic", fontSize:12 }}>—</span>;
                        } else if (MONEY_COLS.has(col.key)) {
                          const isNegBalance = (col.key === "saldo_pendiente" || col.key === "saldo_pendiente_total") && parseFloat(val || 0) > 0;
                          content = (
                            <span style={{ fontSize:13, fontWeight: isNegBalance ? 700 : 400,
                              color: isNegBalance ? C.redText : C.text }}>{fmtMoney(val)}</span>
                          );
                        } else if (BADGE_COUNT_COLS.has(col.key)) {
                          content = (
                            <span style={{ background:C.primarySoft, color:C.primary,
                              padding:"2px 8px", borderRadius:10, fontWeight:700, fontSize:12 }}>
                              {val ?? 0}
                            </span>
                          );
                        } else if (col.key === "eventos_realizados") {
                          content = <span style={{ color:C.muted, fontWeight:500 }}>{val ?? 0}</span>;
                        } else if (col.key === "puesto" && tipoConsulta === "resumen-trabajadores") {
                          const items = (val || "").split(",").map((p) => p.trim()).filter(Boolean);
                          content = items.length ? (
                            <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                              {items.map((p, i) => (
                                <span key={i} style={{ background:C.secondarySoft, color:C.text,
                                  padding:"2px 8px", borderRadius:10, fontSize:12, fontWeight:500,
                                  width:"fit-content" }}>
                                  {toTitleCase(p)}
                                </span>
                              ))}
                            </div>
                          ) : <span style={{ fontSize:13, color:C.outline }}>—</span>;
                        } else {
                          content = <span style={{ fontSize:13, color:C.text }}>{val ? toTitleCase(val) : "—"}</span>;
                        }

                        return (
                          <td key={col.key} style={{ padding:"8px 12px", textAlign:col.align, verticalAlign:"middle" }}>
                            {content}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          <div style={{ borderTop:`1px solid ${C.border}`, padding:"10px 16px",
            display:"flex", justifyContent:"space-between", alignItems:"center", background:C.surface }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:12, color:C.muted }}>Filas por página:</span>
              <select value={rowsPP} onChange={(e) => { setRowsPP(Number(e.target.value)); setPage(1); }}
                style={{ border:`1px solid ${C.border}`, borderRadius:4, padding:"2px 6px",
                  fontSize:12, color:C.text, background:C.surface, cursor:"pointer", outline:"none", fontFamily:"inherit" }}>
                {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <span style={{ fontSize:12, color:C.muted }}>
                {total === 0 ? "0" : `${start}-${end}`} de {total}
              </span>
              <div style={{ display:"flex", gap:4 }}>
                <button onClick={() => page > 1 && setPage((p) => p - 1)} disabled={page <= 1}
                  style={{ ...S.pgBtn, opacity: page > 1 ? 1 : 0.35 }}>‹</button>
                {totalPages > 1 && (
                  <span style={{ display:"flex", alignItems:"center", justifyContent:"center",
                    padding:"0 8px", fontSize:12, fontWeight:700, color:C.primary }}>
                    {page}/{totalPages}
                  </span>
                )}
                <button onClick={() => page < totalPages && setPage((p) => p + 1)} disabled={page >= totalPages}
                  style={{ ...S.pgBtn, opacity: page < totalPages ? 1 : 0.35 }}>›</button>
              </div>
            </div>
          </div>
        </div>}

      </div>
    </div>
  );
}

// ── Componente de Gráficas ────────────────────────────────────────────────────
function GraficasView({ graficasData, total, loading, tipoConsulta, catServicios }) {
  const [showDetalle, setShowDetalle] = useState(false);

  if (loading) return (
    <div style={{ textAlign:"center", padding:60, color:"#8a909e", fontSize:14 }}>Cargando gráficas...</div>
  );

  const isCot = tipoConsulta === "cotizaciones";
  const isPagos = tipoConsulta === "contratos";
  const isServicios = tipoConsulta === "resumen-servicios";
  const isGastos = tipoConsulta === "gastos";
  const isTrabajadores = tipoConsulta === "resumen-trabajadores";
  const itemWord = isCot ? "cotizaciones" : "eventos";
  const ItemWord = isCot ? "Cotizaciones" : "Eventos";

  const mkHbar = (rows, keyField, valField, color, label) => ({
    labels: rows.map((r) => r[keyField]),
    datasets: [{ label, data: rows.map((r) => Number(r[valField]) || 0),
      backgroundColor: color, borderRadius: 4, borderSkipped: false }],
  });

  // Chart.js dibuja en <canvas>: no puede resolver var(), por eso aquí se
  // usan colores fijos en vez de C.secondary/C.primary.
  const ESTADO_COLORS = {
    "Pago completado":   "#22c55e",
    "Pendiente de pago": "#3b82f6",
    "Sin anticipo":      "#ef4444",
    "Pendiente":         "#f59e0b",
    "Aceptada":          "#22c55e",
    "Rechazada":         "#ef4444",
  };

  const hbarOpts = (suffix = "registros", max) => ({
    indexAxis: "y", responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (ctx) => `  ${ctx.raw} ${suffix}` } },
    },
    scales: {
      x: { grid: { color:"rgba(148,163,184,0.25)" }, max, ticks: { font:{ size:11 }, precision:0 } },
      y: { grid: { display:false }, ticks: { font:{ size:11 } } },
    },
  });

  // Variante de hbarOpts para desgloses en dinero (tab Pagos): tooltip y ticks
  // del eje de valor formateados como moneda en vez de "N registros".
  const hbarMoneyOpts = (max) => ({
    indexAxis: "y", responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (ctx) => `  ${fmtMoney(ctx.raw)}` } },
    },
    scales: {
      x: { grid: { color:"rgba(148,163,184,0.25)" }, max, ticks: { font:{ size:11 },
        callback: (v) => v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}` } },
      y: { grid: { display:false }, ticks: { font:{ size:11 } } },
    },
  });

  const vbarOpts = (suffix = "registros") => ({
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (ctx) => `  ${ctx.raw} ${suffix}` } },
    },
    scales: {
      x: { grid: { display:false }, ticks: { font:{ size:11 } } },
      y: { grid: { color:"rgba(148,163,184,0.25)" }, ticks: { font:{ size:11 }, stepSize:1 } },
    },
  });

  const mesData = graficasData?.por_mes.length ? {
    labels: graficasData.por_mes.map((m) => m.mes_label),
    datasets: isCot ? [
      { label:"Importe cotizado", data: graficasData.por_mes.map((m) => Number(m.importe_total) || 0),
        backgroundColor:"#10b981", borderRadius:4, borderSkipped:false },
    ] : isPagos ? [
      { label:"Pagado", data: graficasData.por_mes.map((m) => Number(m.importe_total) || 0),
        backgroundColor:"#10b981", borderRadius:4, borderSkipped:false },
    ] : [
      { label:"Importe", data: graficasData.por_mes.map((m) => Number(m.importe_total) || 0),
        backgroundColor:"#10b981", borderRadius:4, borderSkipped:false },
      { label:"Saldo pendiente", data: graficasData.por_mes.map((m) => Number(m.saldo_total) || 0),
        backgroundColor:"#cbd5e1", borderRadius:4, borderSkipped:false },
    ],
  } : null;

  // Con pocos meses en el rango, mostrar el valor exacto sobre cada barra de
  // "Importe" (más confiable que leer contra el grid); con muchos meses eso
  // saturaría el chart, así que en ese caso se afinan los ticks del eje Y en
  // vez de etiquetar cada barra.
  const mesMonthCount = mesData?.labels.length || 0;
  const showMesLabels = mesMonthCount > 0 && mesMonthCount <= 14;
  const mesAxisMax = niceMax(graficasData?.por_mes.flatMap((m) => [Number(m.importe_total) || 0, Number(m.saldo_total) || 0]) || []);
  const mesStep = niceStep(mesAxisMax, 10);

  const mesValueLabelsPlugin = {
    id: "mesValueLabels",
    afterDatasetsDraw(chart) {
      const meta = chart.getDatasetMeta(0);
      if (!meta || meta.hidden) return;
      const { ctx } = chart;
      ctx.save();
      ctx.font = "600 10px system-ui, sans-serif";
      ctx.fillStyle = "#047857";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      meta.data.forEach((bar, i) => {
        const value = Number(chart.data.datasets[0].data[i]) || 0;
        if (!value) return;
        const label = value >= 1000 ? `$${(value / 1000).toFixed(0)}k` : `$${value}`;
        ctx.fillText(label, bar.x, bar.y - 4);
      });
      ctx.restore();
    },
  };

  const mesOpts = {
    responsive: true, maintainAspectRatio: false,
    layout: showMesLabels ? { padding: { top: 18 } } : undefined,
    plugins: {
      legend: { position:"bottom", labels: { font:{ size:11 }, padding:16, usePointStyle:true } },
      tooltip: { callbacks: { label: (ctx) => `  ${fmtMoney(ctx.raw)}` } },
    },
    scales: {
      x: { grid: { display:false }, ticks: { font:{ size:11 } } },
      y: { grid: { color:"rgba(148,163,184,0.25)" }, ticks: { font:{ size:11 }, stepSize: showMesLabels ? undefined : mesStep,
        callback: (v) => v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}` } },
    },
  };

  // Tab "Gastos": la gráfica de fila 1 usa gastos_por_mes (SUM(monto) agrupado
  // por fecha del gasto), no por_mes (que en este tab viene de contratos y no
  // tiene relación con los gastos registrados).
  const gastosMesData = graficasData?.gastos_por_mes?.length ? {
    labels: graficasData.gastos_por_mes.map((m) => m.mes_label),
    datasets: [
      { label:"Gastos", data: graficasData.gastos_por_mes.map((m) => Number(m.total) || 0),
        backgroundColor:"#ef4444", borderRadius:4, borderSkipped:false },
    ],
  } : null;

  const gastosMesMonthCount = gastosMesData?.labels.length || 0;
  const showGastosMesLabels = gastosMesMonthCount > 0 && gastosMesMonthCount <= 14;
  const gastosMesAxisMax = niceMax(graficasData?.gastos_por_mes?.map((m) => Number(m.total) || 0) || []);
  const gastosMesStep = niceStep(gastosMesAxisMax, 10);

  const gastosMesValueLabelsPlugin = {
    id: "gastosMesValueLabels",
    afterDatasetsDraw(chart) {
      const meta = chart.getDatasetMeta(0);
      if (!meta || meta.hidden) return;
      const { ctx } = chart;
      ctx.save();
      ctx.font = "600 10px system-ui, sans-serif";
      ctx.fillStyle = "#b91c1c";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      meta.data.forEach((bar, i) => {
        const value = Number(chart.data.datasets[0].data[i]) || 0;
        if (!value) return;
        ctx.fillText(fmtMoney(value), bar.x, bar.y - 4);
      });
      ctx.restore();
    },
  };

  const gastosMesOpts = {
    responsive: true, maintainAspectRatio: false,
    layout: showGastosMesLabels ? { padding: { top: 18 } } : undefined,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (ctx) => `  ${fmtMoney(ctx.raw)}` } },
    },
    scales: {
      x: { grid: { display:false }, ticks: { font:{ size:11 } } },
      y: { grid: { color:"rgba(148,163,184,0.25)" }, ticks: { font:{ size:11 }, stepSize: showGastosMesLabels ? undefined : gastosMesStep,
        callback: (v) => v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}` } },
    },
  };

  // Tab "Trabajadores": la gráfica de fila 1 ya no es por mes — muestra las
  // horas trabajadas (hora_inicio/hora_final de contratos_trabajadores) agrupadas
  // por tipo de puesto, que es la métrica relevante para este tab.
  const puestosHorasRows = graficasData?.puestos_horas || [];
  const puestosHorasData = puestosHorasRows.length
    ? mkHbar(puestosHorasRows, "puesto", "horas", "#8b5cf6", "horas")
    : null;
  const puestosHorasOpts = {
    indexAxis: "y", responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (ctx) => `  ${ctx.raw} horas` } },
    },
    scales: {
      x: { grid: { color:"rgba(148,163,184,0.25)" }, max: niceMax(puestosHorasRows.map((r) => Number(r.horas) || 0)),
        ticks: { font:{ size:11 } } },
      y: { grid: { display:false }, ticks: { font:{ size:11 } } },
    },
  };

  // Tab "Servicios": en vez de dinero, cuántas veces se pidió cada servicio
  // (Sonido, Fotografía, Decoración, Barra, ...) en cada mes — una serie por
  // servicio, usando el rango de meses ya completado (con ceros) de por_mes.
  const SERVICIOS_COLORS = ["#0ea5e9", "#8b5cf6", "#f97316", "#14b8a6", "#ec4899", "#f59e0b", "#22c55e", "#ef4444"];
  // Se muestran TODOS los servicios del catálogo (aunque tengan 0 solicitudes
  // en todo el rango), no solo los que aparecen en los datos — pero ordenados
  // de mayor a menor uso, para que las secciones con más información aparezcan
  // primero (los servicios sin datos quedan al final).
  const serviciosTotales = {};
  (graficasData?.servicios_por_mes || []).forEach((r) => {
    serviciosTotales[r.servicio] = (serviciosTotales[r.servicio] || 0) + (Number(r.total) || 0);
  });
  const servicioNames = (() => {
    if (!isServicios) return [];
    const base = catServicios?.length
      ? [...catServicios]
      : Object.keys(serviciosTotales);
    return base.sort((a, b) => {
      const diff = (serviciosTotales[b] || 0) - (serviciosTotales[a] || 0);
      return diff !== 0 ? diff : a.localeCompare(b);
    });
  })();
  const serviciosMonths = graficasData?.por_mes || [];

  const serviciosPorMesChart = (() => {
    if (!isServicios || !serviciosMonths.length || !servicioNames.length) return null;
    const rows = graficasData?.servicios_por_mes || [];
    const valueMap = {};
    rows.forEach((r) => { valueMap[`${r.mes_key}|${r.servicio}`] = Number(r.total) || 0; });
    return {
      labels: serviciosMonths.map((m) => m.mes_label),
      datasets: servicioNames.map((nombre, i) => ({
        label: nombre,
        data: serviciosMonths.map((m) => valueMap[`${m.mes_key}|${nombre}`] || 0),
        backgroundColor: SERVICIOS_COLORS[i % SERVICIOS_COLORS.length],
        borderRadius: 4, borderSkipped: false,
      })),
    };
  })();

  // Sección por servicio (debajo de la primera gráfica): para cada servicio,
  // por ciudad, por paquete, ingreso por mes y veces usado por mes.
  const servicioColor = (nombre) => SERVICIOS_COLORS[servicioNames.indexOf(nombre) % SERVICIOS_COLORS.length];

  const hbarForServicio = (rows, servicio, keyField, color) => {
    const filtered = (rows || []).filter((r) => r.servicio === servicio);
    return filtered.length ? mkHbar(filtered, keyField, "total", color, "eventos") : null;
  };

  const monthSeriesForServicio = (rows, servicio, color, label) => {
    if (!serviciosMonths.length) return null;
    const map = {};
    (rows || []).filter((r) => r.servicio === servicio).forEach((r) => { map[r.mes_key] = Number(r.total) || 0; });
    return {
      labels: serviciosMonths.map((m) => m.mes_label),
      datasets: [{ label, data: serviciosMonths.map((m) => map[m.mes_key] || 0),
        backgroundColor: color, borderRadius:4, borderSkipped:false }],
    };
  };

  // Sección por trabajador (debajo de la primera gráfica, mismo patrón que
  // Servicios): para cada trabajador que aparece en el rango, su desglose por
  // tipo de puesto (horas), horas trabajadas por mes, ciudades a las que
  // asistió, tipos de evento, paquetes y servicios en los que participó.
  const trabajadoresTotales = {};
  (graficasData?.trabajadores_por_puesto || []).forEach((r) => {
    trabajadoresTotales[r.trabajador] = (trabajadoresTotales[r.trabajador] || 0) + (Number(r.horas) || 0);
  });
  const trabajadorNames = isTrabajadores
    ? Object.keys(trabajadoresTotales).sort((a, b) => {
        const diff = (trabajadoresTotales[b] || 0) - (trabajadoresTotales[a] || 0);
        return diff !== 0 ? diff : a.localeCompare(b);
      })
    : [];
  const trabajadorColor = (nombre) => SERVICIOS_COLORS[trabajadorNames.indexOf(nombre) % SERVICIOS_COLORS.length];

  const hbarForTrabajador = (rows, trabajador, keyField, valField, color) => {
    const filtered = (rows || []).filter((r) => r.trabajador === trabajador);
    return filtered.length ? mkHbar(filtered, keyField, valField, color, valField === "horas" ? "horas" : "eventos") : null;
  };

  const horasPorMesForTrabajador = (trabajador, color) => {
    if (!serviciosMonths.length) return null;
    const map = {};
    (graficasData?.trabajadores_por_mes || []).filter((r) => r.trabajador === trabajador)
      .forEach((r) => { map[r.mes_key] = Number(r.horas) || 0; });
    return {
      labels: serviciosMonths.map((m) => m.mes_label),
      datasets: [{ label:"Horas", data: serviciosMonths.map((m) => map[m.mes_key] || 0),
        backgroundColor: color, borderRadius:4, borderSkipped:false }],
    };
  };

  const horasPorMesOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display:false },
      tooltip: { callbacks: { label: (ctx) => `  ${ctx.raw} horas` } },
    },
    scales: {
      x: { grid: { display:false }, ticks: { font:{ size:11 } } },
      y: { grid: { color:"rgba(148,163,184,0.25)" }, ticks: { font:{ size:11 } } },
    },
  };

  const servicioMoneyMonthOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display:false },
      tooltip: { callbacks: { label: (ctx) => `  ${fmtMoney(ctx.raw)}` } },
    },
    scales: {
      x: { grid: { display:false }, ticks: { font:{ size:11 } } },
      y: { grid: { color:"rgba(148,163,184,0.25)" }, ticks: { font:{ size:11 },
        callback: (v) => v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}` } },
    },
  };

  const serviciosPorMesOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { position:"bottom", labels: { font:{ size:11 }, padding:16, usePointStyle:true } },
      tooltip: { callbacks: { label: (ctx) => `  ${ctx.dataset.label}: ${ctx.raw} solicitudes` } },
    },
    scales: {
      x: { grid: { display:false }, ticks: { font:{ size:11 } } },
      y: { grid: { color:"rgba(148,163,184,0.25)" }, ticks: { font:{ size:11 }, stepSize:1 } },
    },
  };

  const momentoPagoColor = tipoConsulta === "eventos-activos" ? "#3b82f6"
    : tipoConsulta === "eventos-realizados" ? "#94a3b8"
    : isCot ? "#f59e0b"
    : null;

  const momentoPagoTitle = isCot ? (
    <span style={{ display:"inline-flex", alignItems:"center", gap:6 }}>
      <span style={{ width:8, height:8, borderRadius:"50%", background:momentoPagoColor, display:"inline-block", flexShrink:0 }} />
      Momento de pago (cotizaciones)
    </span>
  ) : momentoPagoColor ? (
    <span style={{ display:"inline-flex", alignItems:"center", gap:6 }}>
      <span style={{ width:8, height:8, borderRadius:"50%", background:momentoPagoColor, display:"inline-block", flexShrink:0 }} />
      {tipoConsulta === "eventos-activos" ? "Momento de pago (próximos)" : "Momento de pago (realizados)"}
    </span>
  ) : "Momento de pago (próximos vs realizados)";

  const momentoPagoData = graficasData?.por_momento_pago?.length ? {
    labels: graficasData.por_momento_pago.map((m) => m.momento_pago),
    datasets: tipoConsulta === "eventos-activos" ? [
      { label:"Eventos Próximos", data: graficasData.por_momento_pago.map((m) => Number(m.proximos) || 0),
        backgroundColor:"#3b82f6", borderRadius:4, borderSkipped:false },
    ] : tipoConsulta === "eventos-realizados" ? [
      { label:"Eventos Realizados", data: graficasData.por_momento_pago.map((m) => Number(m.realizados) || 0),
        backgroundColor:"#94a3b8", borderRadius:4, borderSkipped:false },
    ] : isCot ? [
      { label:"Cotizaciones", data: graficasData.por_momento_pago.map((m) => Number(m.proximos) || 0),
        backgroundColor:"#f59e0b", borderRadius:4, borderSkipped:false },
    ] : [
      { label:"Eventos Próximos", data: graficasData.por_momento_pago.map((m) => Number(m.proximos) || 0),
        backgroundColor:"#3b82f6", borderRadius:4, borderSkipped:false },
      { label:"Eventos Realizados", data: graficasData.por_momento_pago.map((m) => Number(m.realizados) || 0),
        backgroundColor:"#94a3b8", borderRadius:4, borderSkipped:false },
    ],
  } : null;

  const momentoPagoOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: momentoPagoColor
        ? { display:false }
        : { position:"bottom", labels: { font:{ size:11 }, padding:12, usePointStyle:true } },
      tooltip: { callbacks: { label: (ctx) => `  ${ctx.dataset.label}: ${ctx.raw} ${itemWord}` } },
    },
    scales: {
      x: { grid: { display:false }, ticks: { font:{ size:11 } } },
      y: { grid: { color:"rgba(148,163,184,0.25)" }, ticks: { font:{ size:11 }, stepSize:1 } },
    },
  };

  const mkConteoPorMes = (rows, color, label) => rows?.length ? {
    labels: rows.map((m) => m.mes_label),
    datasets: [{ label, data: rows.map((m) => Number(m.total) || 0),
      backgroundColor: color, borderRadius:4, borderSkipped:false }],
  } : null;

  const eventosPorMesServicioData = mkConteoPorMes(graficasData?.eventos_por_mes_servicio, isPagos ? "#3b82f6" : "#0ea5e9", isPagos ? "Clientes" : "Eventos");
  const eventosPorMesContratoData = mkConteoPorMes(graficasData?.eventos_por_mes_contrato, "#8b5cf6", "Eventos");

  const mkConteoPorMesOpts = (suffix) => ({
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display:false },
      tooltip: { callbacks: { label: (ctx) => `  ${ctx.raw} ${suffix}` } },
    },
    scales: {
      x: { grid: { display:false }, ticks: { font:{ size:11 } } },
      y: { grid: { color:"rgba(148,163,184,0.25)" }, ticks: { font:{ size:11 }, stepSize:1 } },
    },
  });

  const conteoPorMesOpts = mkConteoPorMesOpts(isPagos ? "clientes" : "eventos");
  const conteoPorMesContratoOpts = mkConteoPorMesOpts("eventos");

  const kpiCiudades  = graficasData?.por_ciudad?.length ?? 0;
  const kpiServicios = graficasData?.por_servicio?.length ?? 0;
  const kpiTotalImporte = (graficasData?.por_mes || []).reduce((sum, m) => sum + (Number(m.importe_total) || 0), 0);
  const kpiAceptadas = graficasData?.por_estado?.find((r) => r.estado === "Aceptada")?.total ?? 0;
  const kpiPuestos = graficasData?.puestos_horas?.length ?? 0;

  const kpiTotalGastado = (graficasData?.gastos_por_tipo || []).reduce((sum, r) => sum + (Number(r.total) || 0), 0);
  const kpiTiposGasto   = graficasData?.gastos_por_tipo?.length ?? 0;

  const kpiTiles = isGastos ? [
    { lbl:"REGISTROS EN EL RANGO", val:total,               color:C.secondary },
    { lbl:"TOTAL GASTADO",         val:fmtMoney(kpiTotalGastado), color:"#ef4444" },
    { lbl:"TIPOS DE GASTO",        val:kpiTiposGasto,       color:"#8b5cf6" },
  ] : [
    { lbl:"REGISTROS EN EL RANGO", val:total,                      color:C.secondary },
    { lbl:"SERVICIOS",             val:kpiServicios,                color:"#0ea5e9" },
    { lbl:"CIUDADES",              val:kpiCiudades,                 color:"#f97316" },
    isCot
      ? { lbl:"ACEPTADAS", val:kpiAceptadas, color:"#22c55e" }
      : isTrabajadores
        ? { lbl:"PUESTOS", val:kpiPuestos, color:"#22c55e" }
        : { lbl:"TOTAL IMPORTE", val:fmtMoney(kpiTotalImporte), color:"#22c55e" },
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:12 }}>
        {kpiTiles.map(({ lbl, val, color }) => (
          <div key={lbl} className="informes-kpi-tile" style={{ background:C.surface, border:`1px solid ${C.border}`,
            borderRadius:8, padding:"14px 16px", boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.06em", color:C.outline, marginBottom:6 }}>
              {lbl}
            </div>
            <div style={{ fontSize:28, fontWeight:800, color, lineHeight:1 }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Fila 1: ingresos por mes / servicios por mes (ancho completo) — prioridad alta, siempre visible */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr", gap:16 }}>
        <ChartCard title={isServicios ? "Servicios de eventos solicitados por mes" : isTrabajadores ? "Horas trabajadas por tipo de puesto" : isCot ? "Importe cotizado por mes" : isPagos ? "Pagos recibidos por mes" : isGastos ? "Gastos por mes" : "Ingresos por mes"} height={isTrabajadores ? Math.max(140, puestosHorasRows.length * 34) : 240}>
          {isServicios
            ? (serviciosPorMesChart
                ? <Bar data={serviciosPorMesChart} options={serviciosPorMesOpts} />
                : <Empty label={graficasData ? "Sin datos en el rango" : "Aplica filtros para ver gráficas"} />)
            : isTrabajadores
              ? (puestosHorasData
                  ? <Bar data={puestosHorasData} options={puestosHorasOpts} />
                  : <Empty label={graficasData ? "Sin datos en el rango" : "Aplica filtros para ver gráficas"} />)
              : isGastos
                ? (gastosMesData
                    ? <Bar data={gastosMesData} options={gastosMesOpts} plugins={showGastosMesLabels ? [gastosMesValueLabelsPlugin] : []} />
                    : <Empty label={graficasData ? "Sin datos en el rango" : "Aplica filtros para ver gráficas"} />)
                : (mesData
                    ? <Bar data={mesData} options={mesOpts} plugins={showMesLabels ? [mesValueLabelsPlugin] : []} />
                    : <Empty label={graficasData ? "Sin datos en el rango" : "Aplica filtros para ver gráficas"} />)}
        </ChartCard>
      </div>

      {/* Debajo de la primera gráfica: una sección por servicio (Sonido, Fotografía, ...)
          con su propio desglose por ciudad, por paquete, ingreso por mes y veces usado por mes.
          Cada sección va en su propia tarjeta con banda de color + badge de total,
          y las 4 gráficas internas heredan el mismo acento — así se distingue de
          un vistazo (sin depender solo del texto) a qué servicio pertenece cada una. */}
      {isServicios && servicioNames.map((servicio) => {
        const color = servicioColor(servicio);
        const total = serviciosTotales[servicio] || 0;
        const porCiudad = hbarForServicio(graficasData?.servicios_por_ciudad, servicio, "ciudad", color);
        const porPaquete = hbarForServicio(graficasData?.servicios_por_paquete, servicio, "paquete", color);
        const ingresoPorMes = monthSeriesForServicio(graficasData?.servicios_por_mes_ingreso, servicio, color, "Ingreso");
        const usoPorMes = monthSeriesForServicio(graficasData?.servicios_por_mes, servicio, color, "Veces usado");
        return (
          <div key={servicio} style={{ background:C.surface, border:`1px solid ${C.border}`,
            borderLeft:`5px solid ${color}`, borderRadius:10, overflow:"hidden",
            boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, padding:"14px 18px",
              background:`${color}12`, borderBottom:`1px solid ${color}30` }}>
              <span style={{ width:11, height:11, borderRadius:"50%", background:color, flexShrink:0,
                boxShadow:`0 0 0 3px ${color}22` }} />
              <h3 style={{ fontSize:15, fontWeight:800, color:C.text, margin:0, letterSpacing:"-0.01em" }}>{servicio}</h3>
              <span style={{ marginLeft:"auto", fontSize:11, fontWeight:700, color,
                background:`${color}1f`, padding:"4px 12px", borderRadius:999, whiteSpace:"nowrap" }}>
                {total} {total === 1 ? "solicitud" : "solicitudes"}
              </span>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, padding:18 }}>
              <ChartCard title="Por ciudad" height={Math.max(140, (porCiudad?.labels.length || 0) * 34)}>
                {porCiudad
                  ? <Bar data={porCiudad} options={hbarOpts("eventos", niceMax(porCiudad.datasets[0].data))} />
                  : <Empty label="Sin datos" />}
              </ChartCard>
              <ChartCard title="Por paquete" height={Math.max(140, (porPaquete?.labels.length || 0) * 34)}>
                {porPaquete
                  ? <Bar data={porPaquete} options={hbarOpts("eventos", niceMax(porPaquete.datasets[0].data))} />
                  : <Empty label="Sin datos" />}
              </ChartCard>
              <ChartCard title="Ingreso por mes" height={220}>
                {ingresoPorMes
                  ? <Bar data={ingresoPorMes} options={servicioMoneyMonthOpts} />
                  : <Empty label="Sin datos" />}
              </ChartCard>
              <ChartCard title="Usado en eventos por mes" height={220}>
                {usoPorMes
                  ? <Bar data={usoPorMes} options={conteoPorMesOpts} />
                  : <Empty label="Sin datos" />}
              </ChartCard>
            </div>
          </div>
        );
      })}

      {/* Debajo de la primera gráfica (tab Trabajadores): una sección por
          trabajador, mismo patrón que Servicios — tipo de puesto, horas por
          mes, ciudades, tipos de evento, paquetes y servicios en los que
          participó. No aplica el resto de gráficas de esta vista (son de
          eventos/contratos agregados, sin desglose por trabajador). */}
      {isTrabajadores && trabajadorNames.map((trabajador) => {
        const color = trabajadorColor(trabajador);
        const totalHoras = Math.round((trabajadoresTotales[trabajador] || 0) * 10) / 10;
        const porPuesto = hbarForTrabajador(graficasData?.trabajadores_por_puesto, trabajador, "puesto", "horas", color);
        const horasPorMes = horasPorMesForTrabajador(trabajador, color);
        const porCiudad = hbarForTrabajador(graficasData?.trabajadores_por_ciudad, trabajador, "ciudad", "total", color);
        const porTipoEvento = hbarForTrabajador(graficasData?.trabajadores_por_tipo_evento, trabajador, "tipo", "total", color);
        return (
          <div key={trabajador} style={{ background:C.surface, border:`1px solid ${C.border}`,
            borderLeft:`5px solid ${color}`, borderRadius:10, overflow:"hidden",
            boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, padding:"14px 18px",
              background:`${color}12`, borderBottom:`1px solid ${color}30` }}>
              <span style={{ width:11, height:11, borderRadius:"50%", background:color, flexShrink:0,
                boxShadow:`0 0 0 3px ${color}22` }} />
              <h3 style={{ fontSize:15, fontWeight:800, color:C.text, margin:0, letterSpacing:"-0.01em" }}>{trabajador}</h3>
              <span style={{ marginLeft:"auto", fontSize:11, fontWeight:700, color,
                background:`${color}1f`, padding:"4px 12px", borderRadius:999, whiteSpace:"nowrap" }}>
                {totalHoras} {totalHoras === 1 ? "hora" : "horas"}
              </span>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:16, padding:18 }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr", gap:16 }}>
                <ChartCard title="Horas trabajadas por mes" height={220}>
                  {horasPorMes
                    ? <Bar data={horasPorMes} options={horasPorMesOpts} />
                    : <Empty label="Sin datos" />}
                </ChartCard>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:16 }}>
                <ChartCard title="Por tipo de puesto" height={Math.max(140, (porPuesto?.labels.length || 0) * 34)}>
                  {porPuesto
                    ? <Bar data={porPuesto} options={hbarOpts("horas", niceMax(porPuesto.datasets[0].data))} />
                    : <Empty label="Sin datos" />}
                </ChartCard>
                <ChartCard title="Eventos por ciudad" height={Math.max(140, (porCiudad?.labels.length || 0) * 34)}>
                  {porCiudad
                    ? <Bar data={porCiudad} options={hbarOpts("eventos", niceMax(porCiudad.datasets[0].data))} />
                    : <Empty label="Sin datos" />}
                </ChartCard>
                <ChartCard title="Por tipo de evento" height={Math.max(140, (porTipoEvento?.labels.length || 0) * 34)}>
                  {porTipoEvento
                    ? <Bar data={porTipoEvento} options={hbarOpts("eventos", niceMax(porTipoEvento.datasets[0].data))} />
                    : <Empty label="Sin datos" />}
                </ChartCard>
              </div>
            </div>
          </div>
        );
      })}

      {/* Fila 2 (tab Gastos): desglose de gastos por tipo y por usuario que los
          registró — no aplica el resto de gráficas de esta fila (son de
          eventos/contratos, sin relación con gastos). */}
      {isGastos && (
        <div style={{ display:"grid", gridTemplateColumns: "1fr", gap:16 }}>
          <ChartCard title="Gastos por tipo" height={Math.max(140, (graficasData?.gastos_por_tipo.length || 0) * 34)}>
            {graficasData?.gastos_por_tipo.length > 0
              ? <Bar data={mkHbar(graficasData.gastos_por_tipo, "tipo", "total", "#ef4444", "gastos")}
                  options={hbarMoneyOpts(niceMax(graficasData.gastos_por_tipo.map((r) => Number(r.total) || 0)))} />
              : <Empty label={graficasData ? "Sin datos" : "Aplica filtros para ver gráficas"} />}
          </ChartCard>
        </div>
      )}

      {!isServicios && !isGastos && !isTrabajadores && (
        <div style={{ display:"grid", gridTemplateColumns: "1fr 1fr", gap:16 }}>
          <ChartCard title={isPagos ? "Clientes que pagaron por mes" : `${ItemWord} por mes (fecha de servicio)`} height={220}>
            {eventosPorMesServicioData
              ? <Bar data={eventosPorMesServicioData} options={conteoPorMesOpts} />
              : <Empty label={graficasData ? "Sin datos en el rango" : "Aplica filtros para ver gráficas"} />}
          </ChartCard>
          {isCot && (
            <ChartCard title="Cotizaciones por mes (fecha de cotización)" height={220}>
              {eventosPorMesContratoData
                ? <Bar data={eventosPorMesContratoData} options={conteoPorMesContratoOpts} />
                : <Empty label={graficasData ? "Sin datos en el rango" : "Aplica filtros para ver gráficas"} />}
            </ChartCard>
          )}
          {isPagos && (
            <ChartCard title={momentoPagoTitle} height={220}>
              {momentoPagoData
                ? <Bar data={momentoPagoData} options={momentoPagoOpts} />
                : <Empty label={graficasData ? "Sin datos" : "Aplica filtros para ver gráficas"} />}
            </ChartCard>
          )}
          {!isCot && !isPagos && (
            <ChartCard title="Estatus" height={220}>
              {graficasData?.por_estado.length > 0
                ? <Bar data={mkHbar(graficasData.por_estado, "estado", "total",
                    graficasData.por_estado.map((r) => ESTADO_COLORS[r.estado] || "#94a3b8"), itemWord)} options={vbarOpts(itemWord)} />
                : <Empty label={graficasData ? "Sin datos" : "Aplica filtros para ver gráficas"} />}
            </ChartCard>
          )}
        </div>
      )}

      {/* Toggle del desglose detallado (no aplica a Servicios, Gastos ni Trabajadores:
          Servicios y Trabajadores van siempre expandidos por sección, Gastos ya
          muestra todo lo relevante en la fila 2) */}
      {!isServicios && !isGastos && !isTrabajadores && (
      <div style={{ textAlign:"center" }}>
        <a onClick={() => setShowDetalle((v) => !v)}
          style={{ fontSize:12, color:C.secondary, cursor:"pointer", fontWeight:600,
            textDecoration:"none", userSelect:"none" }}>
          {showDetalle ? "▲ Ocultar desglose detallado" : "▾ Ver desglose detallado"}
        </a>
      </div>
      )}

      {showDetalle && !isServicios && !isGastos && !isTrabajadores && (
        <>
          {/* Fila 3: eventos por mes (fecha de contrato) + momento de pago — no aplica a cotizaciones
              (ahí la fecha de cotización ya se movió a la fila 2, junto a fecha de servicio).
              En pagos no aplica "fecha de contrato" (se quitó ese card), momento de pago va solo. */}
          {!isCot && !isPagos && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
              <ChartCard title="Eventos por mes (fecha de contrato)" height={220}>
                {eventosPorMesContratoData
                  ? <Bar data={eventosPorMesContratoData} options={conteoPorMesContratoOpts} />
                  : <Empty label={graficasData ? "Sin datos en el rango" : "Aplica filtros para ver gráficas"} />}
              </ChartCard>
              <ChartCard title={momentoPagoTitle} height={220}>
                {momentoPagoData
                  ? <Bar data={momentoPagoData} options={momentoPagoOpts} />
                  : <Empty label={graficasData ? "Sin datos" : "Aplica filtros para ver gráficas"} />}
              </ChartCard>
            </div>
          )}
          {/* Fila 4: por servicio (no aplica a pagos) + por tipo + por ciudad */}
          <div style={{ display:"grid", gridTemplateColumns: isPagos ? "1fr 1fr" : "1fr 1fr 1fr", gap:16 }}>
            {!isPagos && (
              <ChartCard title={`${ItemWord} por servicio`} height={Math.max(140, (graficasData?.por_servicio.length || 0) * 34)}>
                {graficasData?.por_servicio.length > 0
                  ? <Bar data={mkHbar(graficasData.por_servicio, "servicio", "total", "#0ea5e9", itemWord)}
                      options={hbarOpts(itemWord, niceMax(graficasData.por_servicio.map((r) => Number(r.total) || 0)))} />
                  : <Empty label={graficasData ? "Sin datos" : "Aplica filtros para ver gráficas"} />}
              </ChartCard>
            )}
            <ChartCard title={isPagos ? "Importe de pagos por tipo de evento" : `${ItemWord} por tipo`} height={Math.max(140, (graficasData?.por_tipo_evento.length || 0) * 34)}>
              {graficasData?.por_tipo_evento.length > 0
                ? <Bar data={mkHbar(graficasData.por_tipo_evento, "tipo", "total", "#3b82f6", itemWord)}
                    options={isPagos
                      ? hbarMoneyOpts(niceMax(graficasData.por_tipo_evento.map((r) => Number(r.total) || 0)))
                      : hbarOpts(itemWord, niceMax(graficasData.por_tipo_evento.map((r) => Number(r.total) || 0)))} />
                : <Empty label={graficasData ? "Sin datos" : "Aplica filtros para ver gráficas"} />}
            </ChartCard>
            <ChartCard title={isPagos ? "Importe de pagos por ciudad" : `${ItemWord} por ciudad`} height={Math.max(140, (graficasData?.por_ciudad.length || 0) * 34)}>
              {graficasData?.por_ciudad.length > 0
                ? <Bar data={mkHbar(graficasData.por_ciudad, "ciudad", "total", "#f97316", itemWord)}
                    options={isPagos
                      ? hbarMoneyOpts(niceMax(graficasData.por_ciudad.map((r) => Number(r.total) || 0)))
                      : hbarOpts(itemWord, niceMax(graficasData.por_ciudad.map((r) => Number(r.total) || 0)))} />
                : <Empty label={graficasData ? "Sin datos" : "Aplica filtros para ver gráficas"} />}
            </ChartCard>
          </div>

          {/* Fila 5: por paquete + por trabajador (no aplica a cotizaciones ni pagos) + por usuario;
              en cotizaciones el estatus baja aquí para completar la fila de 3 */}
          <div style={{ display:"grid", gridTemplateColumns: (isCot || isPagos) ? "1fr 1fr" : "1fr 1fr 1fr", gap:16 }}>
            <ChartCard title={isCot ? "Cotizaciones por paquete cotizado" : isPagos ? "Importe de pagos por paquete" : "Eventos por paquete contratado"} height={Math.max(140, (graficasData?.por_paquete.length || 0) * 34)}>
              {graficasData?.por_paquete.length > 0
                ? <Bar data={mkHbar(graficasData.por_paquete, "paquete", "total", "#14b8a6", itemWord)}
                    options={isPagos
                      ? hbarMoneyOpts(niceMax(graficasData.por_paquete.map((r) => Number(r.total) || 0)))
                      : hbarOpts(itemWord, niceMax(graficasData.por_paquete.map((r) => Number(r.total) || 0)))} />
                : <Empty label={graficasData ? "Sin datos" : "Aplica filtros para ver gráficas"} />}
            </ChartCard>
            {!isCot && !isPagos && (
              <ChartCard title="Eventos por trabajador asignado" height={Math.max(140, (graficasData?.top_trabajadores.length || 0) * 34)}>
                {graficasData?.top_trabajadores.length > 0
                  ? <Bar data={mkHbar(graficasData.top_trabajadores, "nombre", "total", "#8b5cf6", "eventos")}
                      options={hbarOpts("eventos", niceMax(graficasData.top_trabajadores.map((r) => Number(r.total) || 0)))} />
                  : <Empty label={graficasData ? "Sin datos" : "Aplica filtros para ver gráficas"} />}
              </ChartCard>
            )}
            <ChartCard title={isCot ? "Cotizaciones registradas por usuario" : isPagos ? "Pagos registrados por usuario" : "Eventos registrados por usuario"} height={Math.max(140, (graficasData?.top_usuarios.length || 0) * 34)}>
              {graficasData?.top_usuarios.length > 0
                ? <Bar data={mkHbar(graficasData.top_usuarios, "nombre", "total", "#ec4899", isPagos ? "pagos" : itemWord)}
                    options={hbarOpts(isPagos ? "pagos" : itemWord, niceMax(graficasData.top_usuarios.map((r) => Number(r.total) || 0)))} />
                : <Empty label={graficasData ? "Sin datos" : "Aplica filtros para ver gráficas"} />}
            </ChartCard>
            {isCot && (
              <ChartCard title="Estatus" height={Math.max(140, (graficasData?.por_estado.length || 0) * 34)}>
                {graficasData?.por_estado.length > 0
                  ? <Bar data={mkHbar(graficasData.por_estado, "estado", "total",
                      graficasData.por_estado.map((r) => ESTADO_COLORS[r.estado] || "#94a3b8"), itemWord)}
                      options={hbarOpts(itemWord, niceMax(graficasData.por_estado.map((r) => Number(r.total) || 0)))} />
                  : <Empty label={graficasData ? "Sin datos" : "Aplica filtros para ver gráficas"} />}
              </ChartCard>
            )}
          </div>
        </>
      )}

    </div>
  );
}

function ChartCard({ title, height, children }) {
  return (
    <div className="informes-chart-card" style={{ background:C.surface, border:`1px solid ${C.border}`,
      borderRadius:8, padding:"16px 18px", boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
      <div style={{ fontSize:12, fontWeight:700, color: C.muted, letterSpacing:"0.04em",
        marginBottom:14, textTransform:"uppercase" }}>{title}</div>
      <div style={{ height }}>{children}</div>
    </div>
  );
}

function Empty({ label }) {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
      height:"100%", color:C.outline, fontSize:13, fontStyle:"italic" }}>{label}</div>
  );
}

// ── Estilos base ──────────────────────────────────────────────────────────────
const S = {
  card: {
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 6,
    padding: 16,
    boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
  },
  label: {
    display: "block",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.06em",
    color: C.muted,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  input: {
    width: "100%",
    height: 34,
    padding: "0 10px",
    border: `1px solid ${C.border}`,
    borderRadius: 5,
    fontSize: 13,
    color: C.text,
    background: C.surface,
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
  },
  btnGhost: {
    height: 34,
    padding: "0 14px",
    background: C.surface,
    color: C.muted,
    border: `1px solid ${C.border}`,
    borderRadius: 5,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
    whiteSpace: "nowrap",
  },
  th: {
    padding: "9px 12px",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.05em",
    color: C.muted,
    whiteSpace: "nowrap",
    textAlign: "left",
  },
  dropdown: {
    position: "absolute",
    top: "calc(100% + 3px)",
    left: 0,
    zIndex: 9999,
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 6,
    boxShadow: "0 6px 20px rgba(0,0,0,0.12)",
    minWidth: 220,
    maxHeight: 300,
    display: "flex",
    flexDirection: "column",
  },
  colPanel: {
    position: "absolute",
    top: "calc(100% + 4px)",
    right: 0,
    zIndex: 9999,
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 6,
    boxShadow: "0 6px 20px rgba(0,0,0,0.12)",
    minWidth: 230,
    maxHeight: 360,
    overflowY: "auto",
  },
  pgBtn: {
    width: 30,
    height: 30,
    border: `1px solid ${C.border}`,
    borderRadius: 5,
    background: C.surface,
    cursor: "pointer",
    fontSize: 16,
    color: C.muted,
    fontFamily: "inherit",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
};
