// src/components/export/ExportReportsModal.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import "./ExportReportsModal.css";

import logo from "../../../assets/img/logo.png";

// Si ya tienes una action específica para exportar, cámbiala aquí (nombre/ruta).
// Si NO la tienes lista, pasa onExport desde el padre y ahí haces el dispatch.
import { actionExportReports } from "../../../redux/actions/conciliacion/conciliacion";
import { actionCiudadesGet } from "../../../redux/actions/ciudades/ciudades";



function useBodyScrollLock(isOpen) {
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);
}

const Icon = {
  Report: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none">
      <path
        d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  Close: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none">
      <path
        d="M6 18L18 6M6 6l12 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  Download: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none">
      <path
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  ExcelDoc: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="currentColor">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM6 20V4h7v5h5v11H6z" />
    </svg>
  ),
};

function clampStr(v) {
  return String(v ?? "").replace(/\s+/g, " ").trim();
}

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function toISODate(d) {
  if (!d) return "";
  if (typeof d === "string") return d.slice(0, 10);
  return "";
}

function firstDayOfMonthISO(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

function lastDayOfMonthISO(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function yearRangeISO(year) {
  return { start: `${year}-01-01`, end: `${year}-12-31` };
}
function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function norm(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function getRawStatus(exp) {
  return norm(exp.status_nombre || exp.status || exp.estatus || "");
}

const isConstancia = (exp) => Number(exp?.is_constancia_documento) === 1;

const isCumplimientoConvenio = (exp) =>
  Number(exp?.id_conciliacion_status) === 7 || getRawStatus(exp).includes("cumpl");

function getConcluidoBucket(exp) {
  const raw = getRawStatus(exp);

  // regla dura: si hay documento/constancia => "cumplimientos"
  if (isConstancia(exp)) return "cumplimientos";

  // también cumple si status=7 o texto "cumpl"
  if (Number(exp?.id_conciliacion_status) === 7) return "cumplimientos";
  if (raw.includes("cumpl")) return "cumplimientos";

  if (raw.includes("archivo") && raw.includes("patron")) return "archivo_patron";
  if (raw.includes("archivo") && raw.includes("solicitante")) return "archivo_trabajador";
  if (raw.includes("constancia") && raw.includes("no concili")) return "constancia_no_conciliacion";
  if (raw.includes("no concili")) return "constancia_no_conciliacion";
  if (raw.includes("archivo")) return "archivo_generico";

  return "otros";
}

const isConcluido = (exp) => {
  if (isConstancia(exp)) return true;
  const bucket = getConcluidoBucket(exp);
  return (
    bucket === "cumplimientos" ||
    bucket === "archivo_patron" ||
    bucket === "archivo_trabajador" ||
    bucket === "constancia_no_conciliacion" ||
    bucket === "archivo_generico"
  );
};

const isConvenio = (exp) => {
  const raw = getRawStatus(exp);
  if (isConstancia(exp)) return false;
  if (isCumplimientoConvenio(exp)) return false;
  return raw.includes("convenio");
};

function computeStatsFromItems(items) {
  const base = {
    activos: 0,
    diferidos: 0,
    convenios: 0,
    concluidos: 0,

    // subcards concluidos (igual que el hook)
    cumplimientosConvenio: 0,
    archivoPatron: 0,
    archivoTrabajador: 0,
    constanciaNoConciliacion: 0,

    // extra (definición coherente con tu intención)
    // constancia_documento=1 y NO es status 7 => lo quieres separado
    constanciaDocumento: 0,

    total: 0,
  };

  (items || []).forEach((exp) => {
    const raw = getRawStatus(exp);

    if (raw.includes("activo")) {
      base.activos += 1;
      return;
    }

    if (raw.includes("difer")) {
      base.diferidos += 1;
      return;
    }

    if (isConcluido(exp)) {
      base.concluidos += 1;

      // constanciaDocumento (separado)
      if (isConstancia(exp) && Number(exp?.id_conciliacion_status) !== 7) {
        base.constanciaDocumento += 1;
      }

      const bucket = getConcluidoBucket(exp);

      if (bucket === "cumplimientos") base.cumplimientosConvenio += 1;
      else if (bucket === "archivo_patron") base.archivoPatron += 1;
      else if (bucket === "archivo_trabajador") base.archivoTrabajador += 1;
      else if (bucket === "constancia_no_conciliacion") base.constanciaNoConciliacion += 1;

      return;
    }

    if (isConvenio(exp)) {
      base.convenios += 1;
      return;
    }
  });

  base.total = (items || []).length;
  return base;
}


// "tehiya ..." vs "CADENA COMERCIAL ..."
function buildPartes(exp) {
  const trabajador = (exp.nombre_trabajador || "").trim();
  const razon = Array.isArray(exp.razones_sociales) && exp.razones_sociales.length
    ? exp.razones_sociales.map((r) => r?.razon_social).filter(Boolean).join(" / ")
    : "";
  const empresa = (exp.nombre_empresa || "").trim();

  const right = razon || empresa || "—";
  const left = trabajador || "—";
  return `${left} vs ${right}`;
}

// Convierte ISO -> DD/MM/YYYY (sin dayjs)
function fmtDateDMY(iso) {
  if (!iso) return "—";
  const s = String(iso).slice(0, 10); // YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return "—";
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
}

function mapRowsForPdf(items) {
  return (items || []).map((exp) => ({
    expediente: exp.expediente_format || exp.expediente || String(exp.id || "—"),
    partes: buildPartes(exp),
    estatus: exp.status || exp.status_nombre || exp.estatus || "—",
    proxima_audiencia: fmtDateDMY(exp.fecha_proxima_audiencia),
  }));
}
function buildReportHtml({
  periodFrom, periodTo, createdAt, stats, rows,
  ciudadesLabel,

  logoUrl,
  nombreEmpresa,
  orgNameLine1,
  orgNameLine2,

  addressLeftLine1,
  addressLeftLine2,
  addressLeftLine3,
  phoneLeft,
  emailLeft,

  addressRightLine1,
  addressRightLine2,
  addressRightLine3,
  phoneRight,
  emailRight,
}){
  const css = `
  
    :root{
      --bg: #eef1f5;
      --paper: #f3f5f8;
      --ink: #111827;
      --muted: #6b7280;
      --line: #d6dae1;
      --head: #eceff4;
      --rowAlt: #f7f8fb;
    }

    *{ box-sizing: border-box; }
    html,body{ height:100%; }
    body{
      margin:0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      color: var(--ink);
      background: var(--bg);
    }

    /* “Hoja” */
    .page{
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      background: var(--paper);
      padding: 18mm 18mm 16mm 18mm;
      position: relative;
    }

    .top{
      display:flex;
      justify-content: space-between;
      align-items:flex-start;
      gap: 16px;
      margin-bottom: 18px;
    }

    .logo{
      font-weight: 700;
      font-size: 20px;
      letter-spacing: .2px;
      color: #374151;
    }

    .company{
      text-align:right;
      font-size: 12px;
      line-height: 1.35;
      color: #374151;
    }
    .company .muted{ color: var(--muted); }

    h1{
      margin: 10px 0 0 0;
      font-size: 18px;
      letter-spacing: .2px;
      font-weight: 700;
      text-align:center;
      color: #1f2937;
    }

    .periodBox{
      margin: 14px 0 18px 0;
      border: 1px solid var(--line);
      background: rgba(255,255,255,.40);
      padding: 12px 14px;
      border-radius: 10px;
      font-size: 13px;
      color: #111827;
    }
    .periodRow{
      display:flex;
      gap: 16px;
      margin-bottom:5px,
      flex-wrap: wrap;
      justify-content: space-between;
    }
    .periodRow b{ font-weight: 700; }

    hr.sep{
      border:0;
      border-top: 1px solid var(--line);
      margin: 14px 0 16px 0;
    }

    .sectionTitle{
      font-size: 13px;
      font-weight: 700;
      color: #111827;
      margin: 0 0 8px 0;
    }

    table{
      width:100%;
      border-collapse: collapse;
      border: 1px solid var(--line);
      background: rgba(255,255,255,.45);
    }
    thead th{
      background: var(--head);
      border-bottom: 1px solid var(--line);
      font-size: 12px;
      text-align:left;
      padding: 10px 10px;
      color: #111827;
      font-weight: 700;
    }
    tbody td{
      font-size: 12px;
      padding: 10px 10px;
      border-top: 1px solid var(--line);
      vertical-align: top;
      color: #111827;
    }
    tbody tr:nth-child(even) td{
      background: var(--rowAlt);
    }

    .right{ text-align:right; }
    .muted{ color: var(--muted); }

    .footer{
      position:absolute;
      left: 18mm;
      right: 18mm;
      bottom: 10mm;
      border-top: 1px solid var(--line);
      padding-top: 10px;
      display:flex;
      justify-content: space-between;
      gap: 12px;
      font-size: 11px;
      color: #374151;
    }

    /* Print */
   
  
.page {
  width: 210mm;
  min-height: 297mm;
  margin: 0 auto;
  background: #fff;
  padding: 0; /* importante */
}
h1 {
  margin-top: 14mm;   /* separa del membrete */
  margin-bottom: 8mm;
}

    @media print{
      body{ background: white; }
      .page{ margin:0; width:auto; min-height:auto; }
      .no-print{ display:none !important; }
    }
      .page{
  width: 210mm;
  min-height: 297mm;
  margin: 0 auto;
  background: var(--paper);
  /* AUMENTA el padding inferior para que nunca choque */
  padding: 18mm 18mm 24mm 18mm;
  position: relative;
}

/* Quita footer y su línea (por si se quedó algo) */
.footer{ display:none !important; }

/* Más altura real a filas y mejor legibilidad */
thead th{
  padding: 12px 10px;
  line-height: 1.25;
}

tbody td{
  padding: 12px 10px;      /* antes 10px */
  line-height: 1.35;       /* antes normal */
}

/* Evita que una fila quede cortada en salto de página */
tr{ page-break-inside: avoid; }
thead{ display: table-header-group; }
thead { display: table-header-group; }
tfoot { display: table-footer-group; }
tr { page-break-inside: avoid; }
.letterhead{
  display: grid;
  grid-template-columns: 120px 1fr 120px;
  align-items: center;
  gap: 12px;
  margin-bottom: 6px;
}

.lh-logo{
  width: 120px;
  height: 60px;
  display:flex;
  align-items:center;
  justify-content:flex-start;
}
.lh-logo img{
  max-width: 120px;
  max-height: 60px;
  object-fit: contain;
  display:block;
}

.lh-title{
  text-align: center;
  line-height: 1.15;
}
.lh-name{
  font-weight: 700;
  letter-spacing: .7px;
  font-size: 20px;
}
.lh-sub{
  margin-top: 5px;
  font-weight: 500;
  font-size: 18px;
}

.lh-spacer{ /* columna derecha vacía para centrar el título */
  width: 120px;
  height: 60px;
}

.lh-rule{
  border-top: 2px solid #111;
  margin: 6px 0;
}
.lh-rule2{
  border-top: 1px solid #111;
  margin: 6px 0;
}

.lh-contacts{
  display:grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
  font-size: 11px;
  line-height: 1.35;
  color: #111827;
}

.lh-col a{
  color: #1d4ed8;
  text-decoration: underline;
}
table {
  margin-top: 6mm;
}

.sectionTitle {
  margin-top: 10mm;
}
table {
  page-break-inside: auto;
}

tr {
  page-break-inside: avoid;
}
.listado-expedientes {
  break-before: page;
}
.page{
  width: 210mm;
  min-height: 297mm;
  margin: 0 auto;
  background: #fff;
  padding: 18mm 18mm 24mm 18mm;
  position: relative;
}
@media print{
  body{ background:#fff; }
  .page{ margin:0; width:auto; min-height:auto; }
}

  `;

const statsRows = [
  ["Expedientes activos", stats.activos],
  ["Expedientes diferidos", stats.diferidos],
  ["Convenios logrados", stats.convenios],

  ["Expedientes concluidos", stats.concluidos],
  ["  • Cumplimientos de convenio", stats.cumplimientosConvenio],
  ["  • Archivo por patrón", stats.archivoPatron],
  ["  • Archivo por solicitante", stats.archivoTrabajador],
  ["  • Constancia de no conciliación", stats.constanciaNoConciliacion],
  ["  • Constancia de cumplimiento (documento)", stats.constanciaDocumento],

  ["Total de expedientes registrados", stats.total],
];

  const statsTbody = statsRows
    .map(([k, v]) => `
      <tr>
        <td>${escapeHtml(k)}</td>
        <td class="right"><b>${escapeHtml(v)}</b></td>
      </tr>
    `)
    .join("");

  const casesTbody = rows
    .map((r) => `
      <tr>
        <td>${escapeHtml(r.expediente)}</td>
        <td>${escapeHtml(r.partes)}</td>
        <td>${escapeHtml(r.estatus)}</td>
        <td>${escapeHtml(r.proxima_audiencia || "—")}</td>
      </tr>
    `)
    .join("");

return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Reporte Estadístico</title>
<style>${css}</style>
</head>
<body>
  <div class="page">

    <!-- MEMBRETE -->
   <div class="letterhead">
  <div class="lh-spacer"></div>

  <div class="lh-title">
    <div class="lh-name">${escapeHtml(orgNameLine1)}</div>
    <div class="lh-sub">${escapeHtml(orgNameLine2)}</div>
  </div>

  <div class="lh-spacer"></div>
</div>


    <div class="lh-rule"></div>
<div class="lh-rule2"></div>

    <div class="lh-contacts">
      <div class="lh-col">
        <div>${escapeHtml(addressLeftLine1)}</div>
        <div>${escapeHtml(addressLeftLine2)}</div>
        <div>${escapeHtml(addressLeftLine3 || "")}</div>
        <div>Tel. ${escapeHtml(phoneLeft)}</div>
        <div>
          Correo:
          <a href="mailto:${escapeHtml(emailLeft)}">
            ${escapeHtml(emailLeft)}
          </a>
        </div>
      </div>

      <div class="lh-col">
        <div>${escapeHtml(addressRightLine1)}</div>
        <div>${escapeHtml(addressRightLine2)}</div>
        <div>${escapeHtml(addressRightLine3 || "")}</div>
        <div>Tel. ${escapeHtml(phoneRight)}</div>
        <div>
          Correo:
          <a href="mailto:${escapeHtml(emailRight)}">
            ${escapeHtml(emailRight)}
          </a>
        </div>
      </div>
    </div>

    <div class="lh-rule"></div>
    <!-- FIN MEMBRETE -->

    <h1>Reporte Estadístico - Centro de Conciliación<br/>Materia Laboral</h1>

    <div class="periodBox">
      <div class="periodRow">
        <div><b>Periodo:</b> ${escapeHtml(periodFrom)} - ${escapeHtml(periodTo)}</div>
        <div><b>Fecha de elaboración:</b> ${escapeHtml(createdAt)}</div>
      </div>
      <div class="periodRow">

        <div><b>Empresa:</b> ${escapeHtml(nombreEmpresa)}</div>
      </div>
      <div class="periodRow">
  <div><b>Ciudades:</b> ${escapeHtml(ciudadesLabel || "—")}</div>
</div>
    </div>

    <div class="sectionTitle">Resumen general</div>
    <table>
      <thead>
        <tr>
          <th>Descripción</th>
          <th class="right">Cantidad</th>
        </tr>
      </thead>
      <tbody>
        ${statsTbody}
      </tbody>
    </table>

    <hr class="sep" />

    <div class="sectionTitle">Listado de expedientes</div>
    <table>
      <thead>
        <tr>
          <th style="width: 20%;">Expediente</th>
          <th>Parte actora vs Empresa</th>
          <th style="width: 14%;">Estatus</th>
          <th style="width: 18%;">Próxima audiencia</th>
        </tr>
      </thead>
      <tbody>
        ${casesTbody}
      </tbody>
    </table>

  </div>

  <script>
    window.onload = () => {
      setTimeout(() => window.print(), 50);
    };
  </script>
</body>
</html>`;

}

function printHtmlAsPdf(html) {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.setAttribute("aria-hidden", "true");
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    throw new Error("No se pudo inicializar el iframe de impresión.");
  }

  doc.open();
  doc.write(html);
  doc.close();

  // Cleanup después de imprimir / cancelar
  const cleanup = () => {
    setTimeout(() => {
      try { document.body.removeChild(iframe); } catch {}
    }, 400);
  };

  iframe.contentWindow?.addEventListener("afterprint", cleanup, { once: true });

  // fallback por si afterprint no dispara
  setTimeout(cleanup, 6000);
}

export default function ExportReportsModal({
  open,
  onClose,
  onExport,


  companies,

  initialFormat = "pdf", // "excel" | "pdf"

  initialSelectedCityIds = [],
  initialSelectedCompanyIds = [],

}) {
  const dispatch = useDispatch();
  const now = new Date();
const normIds = (arr) =>
  Array.isArray(arr) ? arr.map((x) => Number(x)).filter((n) => Number.isFinite(n)) : [];
  const [selectedCityIds, setSelectedCityIds] = useState(() => normIds(initialSelectedCityIds));
const [selectedCompanyIds, setSelectedCompanyIds] = useState(() => normIds(initialSelectedCompanyIds));
    const y = yearRangeISO(now.getFullYear());
  const initialDateFrom = `${y.start.split("-")[0]}-01-01`
  const initialDateTo = `${y.end.split("-")[0]}-12-31`

const ciudadesSlice = useSelector((state) => state.ciudades || {});
const ciudadesItems = useMemo(() => {
  const items = ciudadesSlice?.data?.items;
  return Array.isArray(items) ? items : [];
}, [ciudadesSlice?.data?.items]);

useEffect(() => {
  // carga solo si está vacío
  if (ciudadesItems.length === 0) {
    dispatch(actionCiudadesGet({}));
  }
}, [dispatch, ciudadesItems.length]);

// lo que usa el UI: {id, name}
const effectiveCities = useMemo(() => {
  return ciudadesItems.map((c) => ({
    id: Number(c.id),
    name: String(c.nombre ?? c.code ?? `Ciudad ${c.id}`),
  }));
}, [ciudadesItems]);

const effectiveCompanies = useMemo(() => {
  return Array.isArray(companies) ? companies : [];
}, [companies]);

const allCityIds = (effectiveCities || []).map((c) => Number(c.id));
const isAllCities =
  allCityIds.length > 0 && allCityIds.every((id) => selectedCityIds.includes(id));

const selectedCitiesLabel =
  !selectedCityIds.length || isAllCities
    ? "Todas"
    : (effectiveCities || [])
        .filter((c) => selectedCityIds.includes(Number(c.id)))
        .map((c) => c.name)
        .join(", ");
const allCompanyIds = (effectiveCompanies || []).map((c) => Number(c.id));
const isAllCompanies =
  allCompanyIds.length > 0 && allCompanyIds.every((id) => selectedCompanyIds.includes(id));

const selectedCompaniesLabel =
  !selectedCompanyIds.length || isAllCompanies
    ? "Todas"
    : (effectiveCompanies || [])
        .filter((c) => selectedCompanyIds.includes(Number(c.id)))
        .map((c) => c.name)
        .join(", ");


  
  const overlayRef = useRef(null);
  const contentRef = useRef(null);

  const [closing, setClosing] = useState(false);
  const mounted = open || closing;

  useBodyScrollLock(mounted);

  const [cityQuery, setCityQuery] = useState("");
  const [companyQuery, setCompanyQuery] = useState("");





  const [preset, setPreset] = useState("month"); // month | prevMonth | year | prevYear | custom

  const [dateFrom, setDateFrom] = useState(toISODate(initialDateFrom) || todayISO());
  const [dateTo, setDateTo] = useState(toISODate(initialDateTo) || todayISO());
const prevOpenRef = useRef(false);

  const [format, setFormat] = useState(initialFormat);

useEffect(() => {
  const wasOpen = prevOpenRef.current;
  prevOpenRef.current = open;

  // SOLO cuando cambia de cerrado -> abierto
  if (!open || wasOpen) return;

  setClosing(false);

  setCityQuery("");
  setCompanyQuery("");

  setSelectedCityIds(normIds(initialSelectedCityIds));
  setSelectedCompanyIds(normIds(initialSelectedCompanyIds));

  setFormat(initialFormat);

  const fromInit = toISODate(initialDateFrom);
  const toInit = toISODate(initialDateTo);

  const now = new Date();
    const y = yearRangeISO(now.getFullYear());
    setPreset("month");
    setDateFrom(y.start);
    setDateTo(y.end);

  setTimeout(() => {
    contentRef.current?.focus?.();
  }, 0);
}, [open, initialSelectedCityIds, initialSelectedCompanyIds, initialFormat, initialDateFrom, initialDateTo]);


  const requestClose = () => {
    if (!mounted) return;
    if (closing) return;

    setClosing(true);
    window.setTimeout(() => {
      setClosing(false);
      onClose?.();
    }, 170);
  };

  useEffect(() => {
    if (!mounted) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        requestClose();
        return;
      }

      if (e.key === "Tab") {
        const root = contentRef.current;
        if (!root) return;

        const focusables = root.querySelectorAll(
          'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'
        );
        if (!focusables.length) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mounted, closing]);

  const filteredCities = useMemo(() => {
    const q = clampStr(cityQuery).toLowerCase();
    if (!q) return effectiveCities || [];
    return (effectiveCities || []).filter((c) =>
      String(c?.name || "").toLowerCase().includes(q)
    );
  }, [effectiveCities, cityQuery]);

  const filteredCompanies = useMemo(() => {
    const q = clampStr(companyQuery).toLowerCase();
    if (!q) return effectiveCompanies || [];
    return (effectiveCompanies || []).filter((c) =>
      String(c?.name || "").toLowerCase().includes(q)
    );
  }, [effectiveCompanies, companyQuery]);

  const isAllCitiesSelected = useMemo(() => {
    const ids = (filteredCities || []).map((c) => c.id);
    return ids.length ? ids.every((id) => selectedCityIds.includes(id)) : false;
  }, [filteredCities, selectedCityIds]);

  const isAllCompaniesSelected = useMemo(() => {
    const ids = (filteredCompanies || []).map((c) => Number(c.id));

    return ids.length ? ids.every((id) => selectedCompanyIds.includes(id)) : false;
  }, [filteredCompanies, selectedCompanyIds]);

  const toggleCity = (id) => {
    setSelectedCityIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleCompany = (id) => {
    setSelectedCompanyIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAllCities = () => {
    const ids = (filteredCities || []).map((c) => Number(c.id));
    setSelectedCityIds((prev) => {
      const all = ids.every((id) => prev.includes(id));
      if (all) return prev.filter((id) => !ids.includes(id));
      return Array.from(new Set([...prev, ...ids]));
    });
  };

  const toggleSelectAllCompanies = () => {
    const ids = (filteredCompanies || []).map((c) => Number(c.id));

    setSelectedCompanyIds((prev) => {
      const all = ids.every((id) => prev.includes(id));
      if (all) return prev.filter((id) => !ids.includes(id));
      return Array.from(new Set([...prev, ...ids]));
    });
  };

  const applyPreset = (p) => {
    setPreset(p);

    const now = new Date();

    if (p === "month") {
      setDateFrom(firstDayOfMonthISO(now));
      setDateTo(lastDayOfMonthISO(now));
      return;
    }
    if (p === "prevMonth") {
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      setDateFrom(firstDayOfMonthISO(prev));
      setDateTo(lastDayOfMonthISO(prev));
      return;
    }
if (p === "year") {
  const now = new Date();
  const y = yearRangeISO(now.getFullYear());
  setDateFrom(y.start);
  setDateTo(y.end);
  return;
}


    if (p === "prevYear") {
      const y = yearRangeISO(now.getFullYear() - 1);
      setDateFrom(y.start);
      setDateTo(y.end);
      return;
    }
  };

  const handleOverlayMouseDown = (e) => {
    if (e.target === overlayRef.current) requestClose();
  };

const handleExport = async (e) => {
  e?.preventDefault?.();
  e?.stopPropagation?.();

 const cleanCityIds = selectedCityIds.filter(
  (id) => Number.isInteger(id)
);

const cleanCompanyIds = selectedCompanyIds.filter(
  (id) => Number.isInteger(id)
);

const payload = {
  city_ids: cleanCityIds,
  company_ids: cleanCompanyIds,
  preset,
  format,
};


  if (preset === "custom") {
    payload.date_from = dateFrom || undefined;
    payload.date_to = dateTo || undefined;
  }

  // PDF => trae lista real y arma HTML con stats + rows
  if (format === "pdf") {
    // 1) pedir datos reales al backend
    const items = await dispatch(actionExportReports(payload));

    // si backend devuelve {items:[...]} también lo soportamos
    const list = Array.isArray(items) ? items : Array.isArray(items?.items) ? items.items : [];

    // 2) stats reales (misma lógica que tu hook)
    const stats = computeStatsFromItems(list);

    // 3) rows reales para la tabla
    const rows = mapRowsForPdf(list);
    const now = new Date();


    // 4) imprimir
    const createdAtLocal = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;

    const html = buildReportHtml({
  periodFrom: dateFrom,
  periodTo: dateTo,
  createdAt: createdAtLocal,

  stats,
  nombreEmpresa: selectedCompaniesLabel || (list[0]?.nombre_empresa ?? "—"),
  ciudadesLabel: selectedCitiesLabel,

  rows,

  logoUrl: logo,

  orgNameLine1: "ONTIVEROS & ASOCIADOS",
  orgNameLine2: "ABOGADOS",


  addressLeftLine1: 'Calle "H" y Ave. Marmoleros #1598 Altos',
  addressLeftLine2: "Col. Industrial, C.P. 21010, Mexicali, Baja California",
  addressLeftLine3: "",
  phoneLeft: "686 554 54 82",
  emailLeft: "recepcionmxl@ontiverosyasociados.com.mx",

  addressRightLine1: "Calle 2 #200 Local 8, Plaza Gabriela, Comercial 83449",
  addressRightLine2: "San Luis Río Colorado, Sonora",
  addressRightLine3: "",
  phoneRight: "653 534 14 02, 534 41 91",
  emailRight: "victor@ontiverosyasociados.com.mx",
});

    printHtmlAsPdf(html);
    return;
  }

  // Excel / flujo existente
  if (typeof onExport === "function") {
    const ret = onExport(payload);
    if (ret && typeof ret.then === "function") await ret;
    return;
  }

  const ret2 = dispatch(actionExportReports(payload));
  if (ret2 && typeof ret2.then === "function") await ret2;
};




  if (!mounted) return null;

  const overlayClass =
    "er-overlay " + (open && !closing ? "is-open" : "") + (closing ? " is-closing" : "");

  return (
    <div
      className={overlayClass}
      ref={overlayRef}
      onMouseDown={handleOverlayMouseDown}
      role="presentation"
    >
      <div
        className="er-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Exportar Reportes"
        tabIndex={-1}
        ref={contentRef}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="er-header">
          <div className="er-header-left">
            <Icon.Report className="er-header-icon" />
            <h1 className="er-header-title">Exportar Reportes</h1>
          </div>

          <button
            className="er-icon-btn"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              requestClose();
            }}
            aria-label="Cerrar"
            type="button"
          >
            <Icon.Close className="er-icon" />
          </button>
        </header>

        {/* Body */}
        <div className="er-body">
          <main className="er-main">
            <div className="er-main-inner">
              {/* Selection */}
              <section className="er-section">
                <h2 className="er-h2">¿Qué quieres exportar?</h2>

                <div className="er-grid-2">
                  {/* Cities */}
                  <div className="er-card">
                    <div className="er-card-head">
                      <label className="er-card-label">CIUDADES</label>
                      <button className="er-link" type="button" onClick={toggleSelectAllCities}>
                        {isAllCitiesSelected ? "Quitar selección" : "Seleccionar todo"}
                      </button>
                    </div>

                    <div className="er-input-wrap">
                      <input
                        className="er-input"
                        placeholder="Buscar ciudad..."
                        value={cityQuery}
                        onChange={(e) => setCityQuery(e.target.value)}
                      />
                    </div>

                    <div className="er-scroll">
                      {(filteredCities || []).map((c) => (
                        <label key={c.id} className="er-check-row">
                          <input
                            type="checkbox"
                            checked={selectedCityIds.includes(Number(c.id))}
                            onChange={() => toggleCity(Number(c.id))}
                          />
                          <span>{c.name}</span>
                        </label>
                      ))}
                      {!filteredCities?.length ? <div className="er-empty">Sin resultados</div> : null}
                    </div>
                  </div>

                  {/* Companies */}
                  <div className="er-card">
                    <div className="er-card-head">
                      <label className="er-card-label">EMPRESAS</label>
                      <button className="er-link" type="button" onClick={toggleSelectAllCompanies}>
                        {isAllCompaniesSelected ? "Quitar selección" : "Seleccionar todo"}
                      </button>
                    </div>

                    <div className="er-input-wrap">
                      <input
                        className="er-input"
                        placeholder="Buscar empresa..."
                        value={companyQuery}
                        onChange={(e) => setCompanyQuery(e.target.value)}
                      />
                    </div>

                    <div className="er-scroll">
                      {(filteredCompanies || []).map((c) => (
                        <label key={c.id} className="er-check-row">
                          <input
                            type="checkbox"
                            checked={selectedCompanyIds.includes(Number(c.id))}
                            onChange={() => toggleCompany(Number(c.id))}

                          />
                          <span>{c.name}</span>
                        </label>
                      ))}
                      {!filteredCompanies?.length ? <div className="er-empty">Sin resultados</div> : null}
                    </div>
                  </div>
                </div>
              </section>

              {/* Date range */}
              <section className="er-section">
                <h2 className="er-h2">Rango de fechas</h2>

                <div className="er-card er-card-pad">
                  <div className="er-pills">
                    <button
                      className={`er-pill ${preset === "month" ? "is-on" : ""}`}
                      type="button"
                      onClick={() => applyPreset("month")}
                    >
                      Este mes
                    </button>

                    <button
                      className={`er-pill ${preset === "prevMonth" ? "is-on" : ""}`}
                      type="button"
                      onClick={() => applyPreset("prevMonth")}
                    >
                      Mes anterior
                    </button>

                    <button
                      className={`er-pill ${preset === "year" ? "is-on" : ""}`}
                      type="button"
                      onClick={() => applyPreset("year")}
                    >
                      Este año
                    </button>

                    <button
                      className={`er-pill ${preset === "prevYear" ? "is-on" : ""}`}
                      type="button"
                      onClick={() => applyPreset("prevYear")}
                    >
                      Año anterior
                    </button>

                    <button
                      className={`er-pill ${preset === "custom" ? "is-on" : ""}`}
                      type="button"
                      onClick={() => {
                        setPreset("custom");
                      }}
                    >
                      Personalizado
                    </button>
                  </div>

                  {preset === "custom" ? (
                    <div className="er-grid-dates">
                      <div className="er-date-col">
                        <label className="er-date-label">Fecha de inicio</label>
                        <input
                          className="er-date"
                          type="date"
                          value={dateFrom}
                          onChange={(e) => {
                            setPreset("custom");
                            setDateFrom(e.target.value);
                          }}
                        />
                      </div>

                      <div className="er-date-col">
                        <label className="er-date-label">Fecha de fin</label>
                        <input
                          className="er-date"
                          type="date"
                          value={dateTo}
                          onChange={(e) => {
                            setPreset("custom");
                            setDateTo(e.target.value);
                          }}
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              </section>

              {/* Export format */}
              <section className="er-section">
                <h2 className="er-h2">Formato de salida</h2>

                <div className="er-format-row">
                

                  <label className="er-format">
                    <input
                      type="radio"
                      name="format"
                      value="pdf"
                      checked={format === "pdf"}
                      onChange={() => setFormat("pdf")}
                    />
                    <div
                      className={`er-format-card ${format === "pdf" ? "is-pdf" : ""}`}
                      role="radio"
                      aria-checked={format === "pdf"}
                      tabIndex={0}
                      onClick={() => setFormat("pdf")}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") setFormat("pdf");
                      }}
                    >
                      <div className="er-format-ic pdf">
                        <Icon.ExcelDoc className="er-doc" />
                      </div>
                      <div className="er-format-text">
                        <div className="er-format-title">PDF (.pdf)</div>
                        <div className="er-format-sub">Recomendado para impresión</div>
                      </div>
                    </div>
                  </label>
                    <label className="er-format">
                    <input
                      type="radio"
                      name="format"
                      value="excel"
                      checked={format === "excel"}
                      onChange={() => setFormat("excel")}
                    />
                    <div
  className={`er-format-card ${format === "excel" ? "is-excel" : ""}`}
  role="radio"
  aria-checked={format === "excel"}
  tabIndex={0}
  onMouseDown={(e) => e.stopPropagation()}
  onClick={(e) => {
    e.preventDefault();
    e.stopPropagation();
    setFormat("excel");
  }}
  onKeyDown={(e) => {
    if (e.key === "Enter" || e.key === " ") setFormat("excel");
  }}
>

                      <div className="er-format-ic excel">
                        <Icon.ExcelDoc className="er-doc" />
                      </div>
                      <div className="er-format-text">
                        <div className="er-format-title">Excel (.xlsx)</div>
                        <div className="er-format-sub">Recomendado para análisis</div>
                      </div>
                    </div>
                  </label>
                </div>
              </section>
            </div>
          </main>
        </div>

        {/* Footer */}
        <footer className="er-footer">
          <button className="er-btn er-btn-cancel" type="button" onClick={requestClose}>
            Cancelar
          </button>

          <button className="er-btn er-btn-primary" type="button" onClick={handleExport}>
            <Icon.Download className="er-btn-ic" />
            <span>Exportar Reporte</span>
          </button>
        </footer>
      </div>
    </div>
  );
}
