import html2pdf from "html2pdf.js";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { getEmpresaConfig, empresaBrandHtml } from "./empresaConfig";

dayjs.locale("es");

const _TIPO_LABEL = { 0: "Fotografía", 1: "Sonido", 2: "Decoraciones", 3: "Barra" };
const _TIPO_CLS   = { 0: "foto", 1: "sonido", 2: "decoracion", 3: "barra" };

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildHtml({ items, tipoLabel, autoPrint = false, empresa }) {
  const now = new Date();
  const createdAt = dayjs(now).format("D [de] MMMM [de] YYYY");

  const totalFoto      = (items || []).filter((p) => p.is_paquete_sonido === 0).length;
  const totalSonido    = (items || []).filter((p) => p.is_paquete_sonido === 1).length;
  const totalDecoracion = (items || []).filter((p) => p.is_paquete_sonido === 2).length;
  const totalBarra     = (items || []).filter((p) => p.is_paquete_sonido === 3).length;
  const totalVigentes      = (items || []).filter((p) => p.active).length;
  const totalDescontinuados = (items || []).filter((p) => !p.active).length;

  const css = `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { background: #fff; color: #111; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; font-size: 10pt; }

    .page { width: 277mm; min-height: 190mm; margin: 0 auto; padding: 16mm 20mm 20mm 20mm; background: #fff; }

    .header { display: flex; justify-content: space-between; align-items: flex-end; padding-bottom: 8px; border-bottom: 2px solid #01369e; margin-bottom: 4px; }
    .header-brand { font-size: 22pt; font-weight: 800; letter-spacing: -0.5px; color: #111; }
    .header-sub { font-size: 9pt; color: #555; margin-top: 2px; }
    .header-right { text-align: right; font-size: 8.5pt; color: #444; line-height: 1.6; }
    .header-title { font-size: 11pt; font-weight: 700; color: #111; }

    .rule-thin { border: 0; border-top: 1px solid #bbb; margin: 4px 0 12px 0; }

    .summary { display: flex; gap: 0; margin-bottom: 14px; border: 1px solid #d1d5db; border-radius: 6px; overflow: hidden; }
    .summary-item { flex: 1; padding: 8px 14px; border-right: 1px solid #d1d5db; }
    .summary-item:last-child { border-right: none; }
    .summary-label { font-size: 7.5pt; color: #666; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 2px; }
    .summary-value { font-size: 15pt; font-weight: 700; color: #111; line-height: 1; }
    .summary-value.green   { color: #166534; }
    .summary-value.gray    { color: #374151; }
    .summary-value.blue    { color: #1e3a8a; }
    .summary-value.purple  { color: #5b21b6; }
    .summary-value.teal    { color: #065f46; }
    .summary-value.amber   { color: #92400e; }
    .summary-value.red     { color: #991b1b; }

    table { width: 100%; border-collapse: collapse; font-size: 8pt; }
    thead tr { background: #01369e; color: #fff; }
    thead th { padding: 7px 7px; text-align: left; font-weight: 600; font-size: 7.5pt; letter-spacing: 0.3px; white-space: nowrap; }
    thead th.r { text-align: right; }
    thead th.c { text-align: center; }
    tbody tr { border-bottom: 1px solid #e5e7eb; }
    tbody tr:nth-child(even) { background: #f9fafb; }
    tbody td { padding: 6px 7px; vertical-align: middle; color: #111; line-height: 1.3; }
    tbody td.r { text-align: right; }
    tbody td.c { text-align: center; }

    .badge { display: inline-block; padding: 1px 6px; border-radius: 4px; font-size: 7pt; font-weight: 700; letter-spacing: 0.2px; }
    .badge-foto       { background: #ede9fe; color: #5b21b6; }
    .badge-sonido     { background: #dbeafe; color: #1e40af; }
    .badge-decoracion   { background: #d1fae5; color: #065f46; }
    .badge-barra      { background: #fef3c7; color: #92400e; }
    .badge-vigente    { background: #dcfce7; color: #166534; }
    .badge-descont    { background: #fee2e2; color: #991b1b; }

    tfoot tr { background: #f3f4f6; border-top: 2px solid #01369e; }
    tfoot td { padding: 7px 7px; font-size: 8pt; font-weight: 700; color: #111; }
    tfoot td.r { text-align: right; }
    tfoot td.c { text-align: center; }

    @media print {
      html, body { background: #fff !important; }
      .page { margin: 0; width: auto; padding: 16mm 20mm 20mm 20mm; }
      .badge-foto      { background: #ede9fe !important; color: #5b21b6 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .badge-sonido    { background: #dbeafe !important; color: #1e40af !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .badge-decoracion  { background: #d1fae5 !important; color: #065f46 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .badge-barra     { background: #fef3c7 !important; color: #92400e !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .badge-vigente   { background: #dcfce7 !important; color: #166534 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .badge-descont   { background: #fee2e2 !important; color: #991b1b !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      thead tr { background: #01369e !important; color: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      tfoot tr { background: #f3f4f6 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      tbody tr:nth-child(even) { background: #f9fafb !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      thead { display: table-header-group; }
      tfoot { display: table-footer-group; }
      tr { page-break-inside: avoid; }
    }
  `;

  const rowsTbody = (items || []).map((p) => {
    const tipoNum = p.is_paquete_sonido;
    const tipo    = _TIPO_LABEL[tipoNum] ?? "—";
    const tipoCls = _TIPO_CLS[tipoNum]   ?? "foto";
    const estado    = p.active ? "Vigente" : "Descontinuado";
    const estadoCls = p.active ? "vigente" : "descont";
    const contenidos = p.contenidos_count ?? 0;
    const desc = p.descripcion ? escapeHtml(String(p.descripcion).slice(0, 80)) : "—";
    return `<tr>
      <td>${escapeHtml(p.nombre || "—")}</td>
      <td><span class="badge badge-${tipoCls}">${tipo}</span></td>
      <td class="c">${contenidos}</td>
      <td>${desc}</td>
      <td><span class="badge badge-${estadoCls}">${estado}</span></td>
    </tr>`;
  }).join("");

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<title>Reporte de Paquetes — HerrSoft Events</title>
<style>${css}</style>
</head>
<body>
<div class="page">

  <div class="header">
    ${empresaBrandHtml(empresa)}
    <div class="header-right">
      <div class="header-title">Reporte de Paquetes</div>
      <div>Tipo: ${escapeHtml(tipoLabel || "Todos")}</div>
      <div>Elaborado: ${escapeHtml(createdAt)}</div>
    </div>
  </div>
  <hr class="rule-thin"/>

  <div class="summary">
    <div class="summary-item">
      <div class="summary-label">Total paquetes</div>
      <div class="summary-value gray">${(items || []).length}</div>
    </div>
    <div class="summary-item">
      <div class="summary-label">Fotografía</div>
      <div class="summary-value purple">${totalFoto}</div>
    </div>
    <div class="summary-item">
      <div class="summary-label">Sonido</div>
      <div class="summary-value blue">${totalSonido}</div>
    </div>
    <div class="summary-item">
      <div class="summary-label">Banquete</div>
      <div class="summary-value teal">${totalDecoracion}</div>
    </div>
    <div class="summary-item">
      <div class="summary-label">Barra</div>
      <div class="summary-value amber">${totalBarra}</div>
    </div>
    <div class="summary-item">
      <div class="summary-label">Vigentes</div>
      <div class="summary-value green">${totalVigentes}</div>
    </div>
    <div class="summary-item">
      <div class="summary-label">Descontinuados</div>
      <div class="summary-value red">${totalDescontinuados}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:28%">Nombre del paquete</th>
        <th style="width:10%">Tipo</th>
        <th class="c" style="width:10%">Contenidos</th>
        <th style="width:37%">Descripción</th>
        <th style="width:10%">Estado</th>
      </tr>
    </thead>
    <tbody>${rowsTbody}</tbody>
    <tfoot>
      <tr>
        <td colspan="2">Total (${(items || []).length} paquetes)</td>
        <td class="c">${(items || []).reduce((a, p) => a + (p.contenidos_count ?? 0), 0)}</td>
        <td></td>
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

export async function previewPaquetesReportPdf(payload) {
  const empresa = await getEmpresaConfig();
  return buildHtml({ ...payload, autoPrint: false, empresa });
}

export async function printPaquetesReportPdf(payload) {
  const empresa = await getEmpresaConfig();
  const html = buildHtml({ ...payload, autoPrint: false, empresa });
  const element = document.createElement("div");
  element.innerHTML = html;
  html2pdf()
    .set({
      margin: 0,
      filename: "reporte_paquetes.pdf",
      html2canvas: { scale: 2, backgroundColor: "#ffffff", useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
    })
    .from(element)
    .save();
}
