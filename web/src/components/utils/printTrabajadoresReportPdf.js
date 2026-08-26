import html2pdf from "html2pdf.js";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { getEmpresaConfig, empresaBrandHtml } from "./empresaConfig";

dayjs.locale("es");

function esc(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function toTitleCase(str) {
  if (!str) return "—";
  return str.toLowerCase().split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function buildHtml({ items, puestoLabel, empresa }) {
  const total = items.length;
  const createdAt = dayjs().format("D [de] MMMM [de] YYYY [a las] HH:mm");

  const puestoCount = {};
  items.forEach((t) => {
    const p = t.nombre_puesto || "Sin puesto";
    puestoCount[p] = (puestoCount[p] || 0) + 1;
  });
  const puestos = Object.entries(puestoCount).sort((a, b) => b[1] - a[1]);

  const css = `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { background: #fff; color: #111; font-family: "Noto Sans", "Helvetica Neue", Helvetica, Arial, sans-serif; font-size: 10pt; }
    .page { width: 190mm; margin: 0 auto; padding: 14mm 16mm 18mm; background: #fff; }

    .hdr { display: flex; justify-content: space-between; align-items: flex-end; padding-bottom: 8px; border-bottom: 3px solid #01369e; margin-bottom: 4px; }
    .hdr-brand { font-size: 22pt; font-weight: 800; color: #111; letter-spacing: -0.5px; }
    .hdr-sub { font-size: 9pt; color: #555; margin-top: 2px; }
    .hdr-right { text-align: right; font-size: 8pt; color: #444; line-height: 1.7; }
    .hdr-title { font-size: 11pt; font-weight: 700; color: #111; }
    .rule { border: 0; border-top: 1px solid #ccc; margin: 4px 0 14px; }

    .section-title { font-size: 7pt; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #01369e; margin: 28px 0 12px; padding-bottom: 6px; border-bottom: 2px solid #e2e8f0; }
    .section-title:first-of-type { margin-top: 0; }

    .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 0; }
    .kpi-box { border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; }
    .kpi-label { font-size: 6.5pt; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: #64748b; margin-bottom: 4px; }
    .kpi-value { font-size: 16pt; font-weight: 800; line-height: 1; margin-bottom: 4px; }
    .kpi-sub { font-size: 7pt; color: #94a3b8; }
    .kpi-blue { color: #1e3a8a; }
    .kpi-green { color: #15803d; }
    .kpi-gray { color: #374151; }

    .puesto-list { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; }
    .puesto-row { display: flex; justify-content: space-between; align-items: center; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 4px; padding: 5px 10px; font-size: 7.5pt; }
    .puesto-name { font-weight: 600; color: #1e293b; }
    .puesto-count { font-weight: 700; color: #01369e; }

    table { width: 100%; border-collapse: collapse; font-size: 7.5pt; }
    thead tr { background: #01369e; color: #fff; }
    thead th { padding: 6px 7px; text-align: left; font-weight: 600; font-size: 7pt; white-space: nowrap; }
    thead th.c { text-align: center; }
    tbody tr { border-bottom: 1px solid #e5e7eb; }
    tbody tr:nth-child(even) { background: #f9fafb; }
    tbody td { padding: 5px 7px; vertical-align: middle; }
    tbody td.c { text-align: center; }
    tfoot tr { background: #f1f5f9; border-top: 2px solid #01369e; }
    tfoot td { padding: 6px 7px; font-weight: 700; font-size: 7.5pt; }

    @media print {
      html, body { background: #fff !important; }
      .page { margin: 0; width: auto; padding: 14mm 16mm 18mm; }
      thead tr { background: #01369e !important; color: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      tbody tr:nth-child(even) { background: #f9fafb !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      tfoot tr { background: #f1f5f9 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      thead { display: table-header-group; }
      tfoot { display: table-footer-group; }
      tr { page-break-inside: avoid; }
    }
  `;

  const filterLabel = puestoLabel && puestoLabel !== "Todos" ? `Puesto: ${puestoLabel}` : "Todos los puestos";

  return `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"/><title>Reporte de Trabajadores</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet">
<style>${css}</style></head>
<body><div class="page">

  <div class="hdr">
    ${empresaBrandHtml(empresa)}
    <div class="hdr-right">
      <div class="hdr-title">Reporte de Trabajadores</div>
      <div>${esc(filterLabel)}</div>
      <div>Generado: ${esc(createdAt)}</div>
    </div>
  </div>
  <hr class="rule"/>

  <div class="section-title">Resumen</div>
  <div class="kpi-grid">
    <div class="kpi-box">
      <div class="kpi-label">Total de trabajadores</div>
      <div class="kpi-value kpi-blue">${total}</div>
      <div class="kpi-sub">personal registrado</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-label">Puestos distintos</div>
      <div class="kpi-value kpi-green">${puestos.length}</div>
      <div class="kpi-sub">categorías de puesto</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-label">Filtro aplicado</div>
      <div class="kpi-value kpi-gray" style="font-size:10pt;margin-top:4px">${esc(filterLabel)}</div>
    </div>
  </div>

  ${puestos.length > 0 ? `
  <div class="section-title">Distribución por puesto</div>
  <div class="puesto-list">
    ${puestos.map(([nombre, count]) => `
    <div class="puesto-row">
      <span class="puesto-name">${esc(toTitleCase(nombre))}</span>
      <span class="puesto-count">${count}</span>
    </div>`).join("")}
  </div>` : ""}

  <div class="section-title">Listado de trabajadores (${total})</div>
  <table>
    <thead><tr>
      <th style="width:5%">#</th>
      <th style="width:30%">Nombre</th>
      <th style="width:30%">Apellido</th>
      <th style="width:20%">Puesto</th>
      <th class="c" style="width:15%">Fecha nacimiento</th>
    </tr></thead>
    <tbody>
      ${items.map((t, i) => `<tr>
        <td style="color:#94a3b8">${i + 1}</td>
        <td style="font-weight:600">${esc(toTitleCase(t.nombre))}</td>
        <td>${esc(toTitleCase(t.apellido))}</td>
        <td>${esc(toTitleCase(t.nombre_puesto))}</td>
        <td class="c" style="color:#64748b">${t.fecha_nacimiento ? dayjs(t.fecha_nacimiento).format("DD/MM/YYYY") : "—"}</td>
      </tr>`).join("")}
    </tbody>
    <tfoot><tr>
      <td colspan="4">Total (${total} trabajador${total !== 1 ? "es" : ""})</td>
      <td></td>
    </tr></tfoot>
  </table>

</div></body></html>`;
}

export async function previewTrabajadoresReportPdf(payload) {
  const empresa = await getEmpresaConfig();
  return buildHtml({ ...payload, empresa });
}

export async function printTrabajadoresReportPdf(payload) {
  const empresa = await getEmpresaConfig();
  const html = buildHtml({ ...payload, empresa });
  const element = document.createElement("div");
  element.innerHTML = html;
  html2pdf()
    .set({
      margin: 0,
      filename: "reporte_trabajadores.pdf",
      html2canvas: { scale: 2, backgroundColor: "#ffffff", useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    })
    .from(element)
    .save();
}
