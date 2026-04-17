// src/components/laboral/audienciaHelpers.js

/* =========================
   Quill config
   ========================= */
export const quillModules = {
  toolbar: [
    ["bold", "italic", "underline"],
    [{ list: "ordered" }, { list: "bullet" }],
    [{ indent: "-1" }, { indent: "+1" }],
    ["link"],
    ["clean"],
  ],
};

export const quillFormats = [
  "bold",
  "italic",
  "underline",
  "list",
  "bullet",
  "indent",
  "link",
];

/* =========================
   Prestaciones
   ========================= */
export const prestacionesLabels = {
  indemnizacion: "Indemnización",
  prima_antiguedad: "Prima de antigüedad",
  aguinaldo_prop: "Aguinaldo proporcional",
  salarios_caidos: "Salarios pendientes",
  vacaciones_prop: "Vacaciones proporcionales",
  prima_vacacional: "Prima vacacional",
};

export const prestacionesLista = [
  { key: "indemnizacion", label: "Indemnización" },
  { key: "prima_antiguedad", label: "Prima de antigüedad" },
  { key: "aguinaldo_prop", label: "Aguinaldo proporcional" },
  { key: "salarios_caidos", label: "Salarios pendientes" },
  { key: "vacaciones_prop", label: "Vacaciones proporcionales" },
  { key: "prima_vacacional", label: "Prima vacacional" },
];

export const parsePrestaciones = (csv) => {
  if (!csv) return [];
  if (Array.isArray(csv)) return csv;

  if (typeof csv === "string") {
    return csv
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }

  return [];
};

/* =========================
   Moneda y navegación con Enter
   ========================= */

export const currencyFormatter = (value) => {
  if (value === undefined || value === null || value === "") return "";
  const [integer, decimals] = value.toString().split(".");
  const intFormatted = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `$ ${intFormatted}${decimals ? "." + decimals : ""}`;
};

export const currencyParser = (value) => {
  try {
    return value.replace(/\$\s?/, "").replace(/,/g, "");
  } catch {
    return value;
  }
};

export const handlePressEnter = (e) => {
  e.preventDefault();
  const formEl = e.target.form;
  if (!formEl) return;
  const elements = Array.from(formEl.elements).filter(
    (el) =>
      el.tagName === "INPUT" ||
      el.tagName === "TEXTAREA" ||
      el.classList.contains("ant-input-number-input")
  );
  const index = elements.indexOf(e.target);
  if (index >= 0 && index < elements.length - 1) {
    elements[index + 1].focus();
  }
};

/* =========================
   Forma de pago
   ========================= */

const FORMA_PAGO_LABEL = {
  "1": "Efectivo",
  "2": "Transferencia",
  "3": "Cheque",
  "4": "Orden de Pago",
  efectivo: "Efectivo",
  transferencia: "Transferencia",
    cheque: "Cheque",
  orden_pago: "Orden de Pago",
};
const TIPO_PAGO_LABEL = {
  "1": "Inmediato",
  "2": "Diferido",
  inmediato: "Inmediato",
  diferido: "Diferido",
};
export const formatFormaPago = (value) => {
  if (!value) return "—";
  const v = String(value).toLowerCase();
  return FORMA_PAGO_LABEL[v] || value;
};
export const formatTipoPago = (value) => {
  if (!value) return "—";
  const v = String(value).toLowerCase();
  return TIPO_PAGO_LABEL[v] || value;
};
/* =========================
   Status -> resultado
   ========================= */

export const mapStatusToResultado = (status) => {
  switch (status) {
    case 2:
      return "convenio";
    case 3:
      return "diferimiento";
    case 4:
      return "archivo_solicitante";
    case 6:
      return "no_conciliacion";
    case 5:
      return "archivo_patron";
    default:
      return undefined;
  }
};

/* =========================
   Vacía / no vacía 1ª audiencia
   ========================= */

export const isPrimeraAudienciaVacia = (a) => {
  if (!a) return true;

  // Si ya existe un "resultado" o status o fecha, NO es vacía
  const hasOutcome =
    !!a.resultado ||
    a.id_conciliacion_status != null ||
    !!a.fecha_audiencia ||
    !!a.incomparecencia;

  // Archivo patron/solicitante suele traer motivo_archivo aunque lo demás esté vacío
  const hasArchivo =
    !!a.motivo_archivo;

  // Cualquier documento/constancia cuenta como contenido
  const hasDocs =
    !!a.documento ||
    !!a.documento_constancia ||
    !!a.is_constancia_documento;

  if (hasOutcome || hasArchivo || hasDocs) return false;

  // Si no hay outcome/status/fecha/docs, ahora sí valida contenido “rico”
  return (
    !a.resumen_pretensiones_html &&
    a.monto_estimado_trabajador == null &&
    (!a.prestaciones_reclamadas || a.prestaciones_reclamadas.length === 0) &&
    a.propuesta_inicial_trabajador == null &&
    a.propuesta_inicial_patron == null &&
    a.contra_trabajador_1 == null &&
    a.contra_patron_1 == null &&
    a.propuesta_final_patron == null &&
    !a.intervencion_conciliador &&
    !a.motivo_resultado &&
    !a.fundamento_resultado &&
    !a.riesgos_detectados &&
    !a.acciones_recomendadas &&
    a.monto_convenio == null &&
    !a.forma_pago_convenio &&
    !a.fecha_pago_convenio &&
    !a.fecha_proxima_audiencia
  );
};

/* =========================
   Abogados
   ========================= */

export const buildAbogadoIndex = (abogadoOptions = []) => {
  const index = {};
  abogadoOptions.forEach((opt) => {
    if (!opt) return;
    if (opt.value === undefined || opt.value === null) return;
    index[opt.value] = opt.label || "";
  });
  return index;
};

export const resolveAbogadoNombre = (
  idAbogado,
  abogadoIndex,
  fallbackNombre
) => {
  if (!idAbogado && !fallbackNombre) return null;
  if (idAbogado && abogadoIndex && abogadoIndex[idAbogado]) {
    return abogadoIndex[idAbogado];
  }
  return fallbackNombre || null;
};
