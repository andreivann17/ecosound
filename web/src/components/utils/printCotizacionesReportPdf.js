import html2pdf from "html2pdf.js";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { getEmpresaConfig, empresaBrandHtml } from "./empresaConfig";

dayjs.locale("es");

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

const TIPO_MAP = { 1: "Bodas", 2: "XV", 3: "Graduación", 4: "Corporativo", 5: "Cumpleaños", 6: "Otro" };
const SERVICIO_MAP = { 1: "Sonido", 2: "Fotografía", 3: "Banquete", 4: "Barra" };
const ESTADOS = ["pendiente", "aceptada", "rechazada"];
const ESTADO_LABEL = { pendiente: "Pendiente", aceptada: "Aceptada", rechazada: "Rechazada" };

const parseNum = (v) => {
  const n = parseFloat(String(v || "").replace(/,/g, ""));
  return isNaN(n) ? 0 : n;
};

const fmtMoney = (val) => {
  const n = parseFloat(String(val || "").replace(/,/g, ""));
  if (isNaN(n)) return "—";
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);
};

function toTitleCase(str) {
  if (!str) return "—";
  return str.toLowerCase().split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function getEstado(row) {
  const e = String(row.estado || "pendiente").toLowerCase();
  return ESTADOS.includes(e) ? e : "pendiente";
}

// Mismo criterio que la lista / el detalle
function getServicios(row) {
  let ids = [];
  if (Array.isArray(row.servicios) && row.servicios.length) {
    ids = row.servicios.map((s) => s.id_servicio);
  } else if (row.servicios_ids != null && row.servicios_ids !== "") {
    ids = Array.isArray(row.servicios_ids)
      ? row.servicios_ids
      : String(row.servicios_ids).split(",").map((x) => parseInt(x, 10));
  } else {
    if (row.fecha_evento || row.lugar_evento) ids.push(1);
    if (row.datetime_fotografia || row.lugar_fotografia) ids.push(2);
  }
  return ids.filter((id) => SERVICIO_MAP[id]).map((id) => SERVICIO_MAP[id]);
}

function mapRows(items) {
  return (items || []).map((r) => {
    const estado = getEstado(r);
    const servicios = getServicios(r);
    return {
      folio: r.folio || "—",
      cliente: toTitleCase(r.cliente_nombre),
      tipo: TIPO_MAP[r.id_tipo_evento] || "—",
      servicios: servicios.length ? servicios.join(", ") : "—",
      importe: r.importe ? parseNum(r.importe) : null,
      estado,
      estadoLabel: ESTADO_LABEL[estado],
    };
  });
}

function computeStats(items) {
  let pendientes = 0, aceptadas = 0, rechazadas = 0, totalImporte = 0;
  (items || []).forEach((r) => {
    const e = getEstado(r);
    if (e === "pendiente") pendientes++;
    else if (e === "aceptada") aceptadas++;
    else if (e === "rechazada") rechazadas++;
    totalImporte += parseNum(r.importe);
  });
  return { pendientes, aceptadas, rechazadas, total: (items || []).length, totalImporte };
}

function buildHtml({ items, periodFrom, periodTo, tipoLabel, autoPrint = false, empresa }) {
  const rows = mapRows(items);
  const stats = computeStats(items);
  const now = new Date();
  const createdAt = dayjs(now).format("D [de] MMMM [de] YYYY");

  const css = `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { background: #fff; color: #111; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; font-size: 10pt; }

    .page { width: 277mm; min-height: 190mm; margin: 0 auto; padding: 16mm 20mm 20mm 20mm; background: #fff; }

    /* ── Encabezado ── */
    .header { display: flex; justify-content: space-between; align-items: flex-end; padding-bottom: 8px; border-bottom: 2px solid #01369e; margin-bottom: 4px; }
    .header-brand { font-size: 22pt; font-weight: 800; letter-spacing: -0.5px; color: #111; }
    .header-sub { font-size: 9pt; color: #555; margin-top: 2px; }
    .header-right { text-align: right; font-size: 8.5pt; color: #444; line-height: 1.6; }
    .header-title { font-size: 11pt; font-weight: 700; color: #111; }

    .rule-thin { border: 0; border-top: 1px solid #bbb; margin: 4px 0 12px 0; }

    /* ── Resumen inline ── */
    .summary { display: flex; gap: 0; margin-bottom: 14px; border: 1px solid #d1d5db; border-radius: 6px; overflow: hidden; }
    .summary-item { flex: 1; padding: 8px 14px; border-right: 1px solid #d1d5db; }
    .summary-item:last-child { border-right: none; }
    .summary-label { font-size: 7.5pt; color: #666; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 2px; }
    .summary-value { font-size: 15pt; font-weight: 700; color: #111; line-height: 1; }
    .summary-value.blue  { color: #01369e; }
    .summary-value.green { color: #166534; }
    .summary-value.gray  { color: #374151; }
    .summary-value.red   { color: #991b1b; }

    /* ── Tabla ── */
    table { width: 100%; border-collapse: collapse; font-size: 8pt; }
    thead tr { background: #01369e; color: #fff; }
    thead th { padding: 7px 7px; text-align: left; font-weight: 600; font-size: 7.5pt; letter-spacing: 0.3px; white-space: nowrap; }
    thead th.r { text-align: right; }
    tbody tr { border-bottom: 1px solid #e5e7eb; }
    tbody tr:nth-child(even) { background: #f9fafb; }
    tbody td { padding: 6px 7px; vertical-align: middle; color: #111; line-height: 1.3; }
    tbody td.r { text-align: right; }
    tbody td.mono { font-family: "Courier New", monospace; letter-spacing: 0.5px; }

    .badge { display: inline-block; padding: 1px 6px; border-radius: 4px; font-size: 7pt; font-weight: 700; letter-spacing: 0.2px; }
    .badge-pendiente { background: #e0e9ff; color: #01369e; }
    .badge-aceptada  { background: #dcfce7; color: #166534; }
    .badge-rechazada { background: #fee2e2; color: #991b1b; }

    /* ── Fila de totales ── */
    tfoot tr { background: #f3f4f6; border-top: 2px solid #01369e; }
    tfoot td { padding: 7px 7px; font-size: 8pt; font-weight: 700; color: #111; }
    tfoot td.r { text-align: right; }

    @media print {
      html, body { background: #fff !important; }
      .page { margin: 0; width: auto; padding: 16mm 20mm 20mm 20mm; }
      .badge-pendiente { background: #e0e9ff !important; color: #01369e !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .badge-aceptada  { background: #dcfce7 !important; color: #166534 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .badge-rechazada { background: #fee2e2 !important; color: #991b1b !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      thead tr { background: #01369e !important; color: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      tfoot tr { background: #f3f4f6 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      tbody tr:nth-child(even) { background: #f9fafb !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      thead { display: table-header-group; }
      tfoot { display: table-footer-group; }
      tr { page-break-inside: avoid; }
    }
  `;

  const periodoStr = periodFrom && periodTo ? `${periodFrom} — ${periodTo}` : "Todos los periodos";

  const rowsTbody = rows.map((r) => {
    return `<tr>
      <td class="mono">${escapeHtml(r.folio)}</td>
      <td>${escapeHtml(r.cliente)}</td>
      <td>${escapeHtml(r.tipo)}</td>
      <td>${escapeHtml(r.servicios)}</td>
      <td class="r mono">${r.importe ? escapeHtml(fmtMoney(String(r.importe))) : "—"}</td>
      <td><span class="badge badge-${r.estado}">${escapeHtml(r.estadoLabel)}</span></td>
    </tr>`;
  }).join("");

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<title>Reporte de Cotizaciones — HerrSoft Events</title>
<style>${css}</style>
</head>
<body>
<div class="page">

  <div class="header">
    ${empresaBrandHtml(empresa)}
    <div class="header-right">
      <div class="header-title">Reporte de Cotizaciones</div>
      <div>Periodo: ${escapeHtml(periodoStr)}</div>
      <div>Tipo: ${escapeHtml(tipoLabel || "Todos")}</div>
      <div>Elaborado: ${escapeHtml(createdAt)}</div>
    </div>
  </div>
  <hr class="rule-thin"/>

  <div class="summary">
    <div class="summary-item">
      <div class="summary-label">Total cotizaciones</div>
      <div class="summary-value gray">${stats.total}</div>
    </div>
    <div class="summary-item">
      <div class="summary-label">Pendientes</div>
      <div class="summary-value blue">${stats.pendientes}</div>
    </div>
    <div class="summary-item">
      <div class="summary-label">Aceptadas</div>
      <div class="summary-value green">${stats.aceptadas}</div>
    </div>
    <div class="summary-item">
      <div class="summary-label">Rechazadas</div>
      <div class="summary-value red">${stats.rechazadas}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:13%">Folio</th>
        <th style="width:24%">Cliente</th>
        <th style="width:10%">Tipo</th>
        <th style="width:29%">Servicios</th>
        <th class="r" style="width:14%">Importe total</th>
        <th style="width:10%">Estado</th>
      </tr>
    </thead>
    <tbody>${rowsTbody}</tbody>
    <tfoot>
      <tr>
        <td colspan="4">Total (${stats.total} cotizaciones)</td>
        <td class="r">${escapeHtml(fmtMoney(String(stats.totalImporte)))}</td>
        <td></td>
      </tr>
    </tfoot>
  </table>

</div>
<script>
  window.__AUTO_PRINT__ = ${autoPrint ? "true" : "false"};
  window.onload = () => { if (window.__AUTO_PRINT__) setTimeout(() => window.print(), 80); };
</script>
</body>
</html>`;
}

export async function previewCotizacionesReportPdf(payload) {
  const empresa = await getEmpresaConfig();
  return buildHtml({ ...payload, autoPrint: false, empresa });
}

export async function printCotizacionesReportPdf(payload) {
  const empresa = await getEmpresaConfig();
  const html = buildHtml({ ...payload, autoPrint: false, empresa });
  const element = document.createElement("div");
  element.innerHTML = html;
  html2pdf()
    .set({
      margin: 0,
      filename: "reporte_cotizaciones.pdf",
      html2canvas: { scale: 2, backgroundColor: "#ffffff", useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
    })
    .from(element)
    .save();
}
