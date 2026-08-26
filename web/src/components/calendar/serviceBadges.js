// Colores y etiquetas de la agenda basados en el SERVICIO agendado, tal cual
// existen en la tabla `servicios` (ver SERVICIO_LABEL, misma fuente que usa
// EventoDetalle) en vez del tipo de contrato (Bodas, XV, Graduación...). Así
// "Barra" siempre se ve igual sin importar de qué tipo de evento viene,
// evitando el efecto "arcoíris".
//
// El servicio se detecta a partir del prefijo "Servicio: X." que el backend
// ya escribe en la descripción de cada entrada de agenda (ver eventos.py /
// contratos.py, _sync_agendas_servicios_extra), usando los nombres reales de
// la tabla `servicios` (ver _get_servicio_nombres en eventos.py).
import { SERVICIO_LABEL } from "../../containers/pages/EventoDetalle/constants";

const stripAccents = (s) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "");
const toKey = (label) => stripAccents(label).toLowerCase();

// Paleta Tailwind-600, pareja en tono/saturación, una por servicio real.
const SERVICE_DOT_COLORS = [
  { bg: "#dbeafe", color: "#1d4ed8", dot: "#2563eb" }, // azul
  { bg: "#fae8ff", color: "#a21caf", dot: "#c026d3" }, // fucsia
  { bg: "#d1fae5", color: "#047857", dot: "#059669" }, // esmeralda
  { bg: "#fef3c7", color: "#b45309", dot: "#d97706" }, // ámbar
];

// Chips reales de la tabla `servicios`: se generan a partir de SERVICIO_LABEL
// (id_servicio -> nombre), en el mismo orden que la tabla.
const SERVICIO_BADGES_FROM_DB = Object.entries(SERVICIO_LABEL).map(([id, label], i) => {
  const key = toKey(label);
  return [key, { key, label, ...SERVICE_DOT_COLORS[i % SERVICE_DOT_COLORS.length] }];
});

export const SERVICE_BADGES = {
  ...Object.fromEntries(SERVICIO_BADGES_FROM_DB),
  misa: { key: "misa", label: "Misa", bg: "#ede9fe", color: "#6d28d9", dot: "#7c3aed" },
  otro: { key: "otro", label: "Otro", bg: "#f3f4f6", color: "#6b7280", dot: "#9ca3af" },
};

// Chips que se muestran en la leyenda del calendario: literal los servicios
// de la tabla `servicios`, y punto. Siempre visibles, aunque no haya nada
// agendado (el conteo puede ser 0).
export const SERVICE_BADGE_ORDER = SERVICIO_BADGES_FROM_DB.map(([, badge]) => badge);

function servicioFromDescription(description) {
  const m = /servicio:\s*([^.]+)\./i.exec(description || "");
  if (!m) return null;
  const key = stripAccents(m[1].trim()).toLowerCase();
  return SERVICE_BADGES[key] ? key : null;
}

// Entradas viejas (Contratos/Cotizaciones) no llevan tag "Servicio: X." en la
// descripción, pero su título ya dice qué son ("Evento X", "Contrato X",
// "Fotografía X"...). "Evento"/"Contrato" son la reserva principal = Sonido.
const TITLE_FALLBACK_KEYWORDS = [
  ["fotografia", "fotografia"],
  ["sonido", "sonido"],
  ["banquete", "banquete"],
  ["barra", "barra"],
  ["evento", "sonido"],
  ["contrato", "sonido"],
];

function servicioFromTitle(title) {
  const norm = stripAccents(title || "").toLowerCase();
  for (const [kw, key] of TITLE_FALLBACK_KEYWORDS) {
    if (norm.includes(kw) && SERVICE_BADGES[key]) return key;
  }
  return null;
}

export function getServiceKey(ev) {
  if (ev?.source === "sesiones_fotos" || ev?.source_table === "sesiones_fotos") return "fotografia";
  const fromDesc = servicioFromDescription(ev?.description);
  if (fromDesc) return fromDesc;
  const fromTitle = servicioFromTitle(ev?.title);
  if (fromTitle) return fromTitle;
  return "otro";
}

export function getServiceBadge(ev) {
  return SERVICE_BADGES[getServiceKey(ev)] || SERVICE_BADGES.otro;
}
