import html2pdf from "html2pdf.js";
import dayjs from "dayjs";
import "dayjs/locale/es";

dayjs.locale("es");

function esc(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function buildHtml({ items }) {
  const total   = items.length;
  const activos = items.filter((u) => u.active).length;
  const inactivos = total - activos;

  const createdAt = dayjs().format("D [de] MMMM [de] YYYY [a las] HH:mm");

  const css = `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { background: #fff; color: #111; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; font-size: 10pt; }
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

    .badge { display: inline-block; padding: 1px 6px; border-radius: 4px; font-size: 6.5pt; font-weight: 700; }
    .badge-active { background: #dbeafe; color: #1d4ed8; }
    .badge-inactive { background: #f1f5f9; color: #64748b; }

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

  return `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"/><title>Reporte de Usuarios — HerrSoft Events</title>
<style>${css}</style></head>
<body><div class="page">

  <div class="hdr">
    <div>
      <div class="hdr-brand">HerrSoft Events</div>
      <div class="hdr-sub">Producción de eventos</div>
    </div>
    <div class="hdr-right">
      <div class="hdr-title">Reporte de Usuarios</div>
      <div>Generado: ${esc(createdAt)}</div>
    </div>
  </div>
  <hr class="rule"/>

  <div class="section-title">Resumen</div>
  <div class="kpi-grid">
    <div class="kpi-box">
      <div class="kpi-label">Total de usuarios</div>
      <div class="kpi-value kpi-blue">${total}</div>
      <div class="kpi-sub">registrados en el sistema</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-label">Usuarios activos</div>
      <div class="kpi-value kpi-green">${activos}</div>
      <div class="kpi-sub">${total > 0 ? Math.round((activos / total) * 100) : 0}% del total</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-label">Usuarios inactivos</div>
      <div class="kpi-value kpi-gray">${inactivos}</div>
      <div class="kpi-sub">${total > 0 ? Math.round((inactivos / total) * 100) : 0}% del total</div>
    </div>
  </div>

  <div class="section-title">Listado de usuarios (${total})</div>
  <table>
    <thead><tr>
      <th style="width:5%">#</th>
      <th style="width:35%">Nombre</th>
      <th style="width:40%">Correo electrónico</th>
      <th class="c" style="width:20%">Estado</th>
    </tr></thead>
    <tbody>
      ${items.map((u, i) => `<tr>
        <td style="color:#94a3b8">${i + 1}</td>
        <td style="font-weight:600">${esc(u.name || "—")}</td>
        <td style="color:#64748b">${esc(u.email || "—")}</td>
        <td class="c"><span class="badge ${u.active ? "badge-active" : "badge-inactive"}">${u.active ? "Activo" : "Inactivo"}</span></td>
      </tr>`).join("")}
    </tbody>
    <tfoot><tr>
      <td colspan="3">Total (${total} usuario${total !== 1 ? "s" : ""})</td>
      <td></td>
    </tr></tfoot>
  </table>

</div></body></html>`;
}

export function previewUsuariosReportPdf(payload) {
  return buildHtml(payload);
}

export function printUsuariosReportPdf(payload) {
  const html = buildHtml(payload);
  const element = document.createElement("div");
  element.innerHTML = html;
  html2pdf()
    .set({
      margin: 0,
      filename: "reporte_usuarios.pdf",
      html2canvas: { scale: 2, backgroundColor: "#ffffff", useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    })
    .from(element)
    .save();
}
