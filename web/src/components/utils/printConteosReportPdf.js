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

const TIPO_MAP = {
  mensual: "Mensual",
  trimestral: "Trimestral",
  semestral: "Semestral",
  anual: "Anual",
};

function fmtFecha(v) {
  if (!v) return "—";
  const d = dayjs(v);
  return d.isValid() ? d.format("D MMM YYYY") : "—";
}

function fmtDatetime(v) {
  if (!v) return "—";
  const d = dayjs(v);
  return d.isValid() ? d.format("DD/MM/YYYY HH:mm") : "—";
}

function buildHtml({ items, periodFrom, periodTo, tipoLabel, autoPrint = false, empresa }) {
  const now = new Date();
  const createdAt = dayjs(now).format("D [de] MMMM [de] YYYY");
  const periodoStr =
    periodFrom && periodTo ? `${periodFrom} — ${periodTo}` : "Todos los periodos";

  const totalEquipos = (items || []).reduce((a, c) => a + (c.total_equipos ?? 0), 0);

  const css = `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { background: #fff; color: #111; font-family: "Noto Sans", "Helvetica Neue", Helvetica, Arial, sans-serif; font-size: 10pt; }
    .page { width: 277mm; min-height: 190mm; margin: 0 auto; padding: 16mm 20mm 20mm 20mm; background: #fff; }

    .header { display: flex; justify-content: space-between; align-items: flex-end; padding-bottom: 8px; border-bottom: 2px solid #111; margin-bottom: 4px; }
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
    .summary-value.blue { color: #1d4ed8; }
    .summary-value.gray { color: #374151; }

    table { width: 100%; border-collapse: collapse; font-size: 8pt; }
    thead tr { background: #111; color: #fff; }
    thead th { padding: 7px 7px; text-align: left; font-weight: 600; font-size: 7.5pt; letter-spacing: 0.3px; white-space: nowrap; }
    thead th.r { text-align: right; }
    tbody tr { border-bottom: 1px solid #e5e7eb; }
    tbody tr:nth-child(even) { background: #f9fafb; }
    tbody td { padding: 6px 7px; vertical-align: middle; color: #111; line-height: 1.3; }
    tbody td.r { text-align: right; }

    .badge { display: inline-block; padding: 1px 7px; border-radius: 4px; font-size: 7pt; font-weight: 700; letter-spacing: 0.2px; }
    .badge-mensual    { background: #e0f2fe; color: #0369a1; }
    .badge-trimestral { background: #dcfce7; color: #15803d; }
    .badge-semestral  { background: #fef9c3; color: #a16207; }
    .badge-anual      { background: #ede9fe; color: #6d28d9; }

    tfoot tr { background: #f3f4f6; border-top: 2px solid #111; }
    tfoot td { padding: 7px 7px; font-size: 8pt; font-weight: 700; color: #111; }
    tfoot td.r { text-align: right; }

    @media print {
      html, body { background: #fff !important; }
      .page { margin: 0; width: auto; padding: 16mm 20mm 20mm 20mm; }
      thead tr { background: #111 !important; color: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      tfoot tr { background: #f3f4f6 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      tbody tr:nth-child(even) { background: #f9fafb !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      thead { display: table-header-group; }
      tfoot { display: table-footer-group; }
      tr { page-break-inside: avoid; }
    }
  `;

  const rowsTbody = (items || [])
    .map((c) => {
      const tipo = c.tipo || "";
      const badgeCls = `badge-${tipo}`;
      const tipoLabel2 = TIPO_MAP[tipo] || tipo;
      return `<tr>
        <td>${escapeHtml(fmtFecha(c.fecha))}</td>
        <td><span class="badge ${escapeHtml(badgeCls)}">${escapeHtml(tipoLabel2)}</span></td>
        <td class="r">${c.total_equipos ?? 0}</td>
        <td>${escapeHtml(fmtDatetime(c.datetime))}</td>
        <td>${escapeHtml(c.descripcion || "—")}</td>
      </tr>`;
    })
    .join("");

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet">
<title>Reporte de Conteos — HerrSoft Events</title>
<style>${css}</style>
</head>
<body>
<div class="page">

  <div class="header">
    ${empresaBrandHtml(empresa)}
    <div class="header-right">
      <div class="header-title">Reporte de Conteos de Inventario</div>
      <div>Periodo: ${escapeHtml(periodoStr)}</div>
      <div>Tipo: ${escapeHtml(tipoLabel || "Todos")}</div>
      <div>Elaborado: ${escapeHtml(createdAt)}</div>
    </div>
  </div>
  <hr class="rule-thin"/>

  <div class="summary">
    <div class="summary-item">
      <div class="summary-label">Total conteos</div>
      <div class="summary-value gray">${(items || []).length}</div>
    </div>
    <div class="summary-item">
      <div class="summary-label">Total equipos registrados</div>
      <div class="summary-value blue">${totalEquipos}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:18%">Fecha</th>
        <th style="width:14%">Tipo</th>
        <th class="r" style="width:14%">Equipos</th>
        <th style="width:22%">Registrado el</th>
        <th style="width:32%">Descripción</th>
      </tr>
    </thead>
    <tbody>${rowsTbody}</tbody>
    <tfoot>
      <tr>
        <td colspan="2">Total (${(items || []).length} conteos)</td>
        <td class="r">${totalEquipos}</td>
        <td colspan="2"></td>
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

export async function previewConteosReportPdf(payload) {
  const empresa = await getEmpresaConfig();
  return buildHtml({ ...payload, autoPrint: false, empresa });
}

export async function printConteosReportPdf(payload) {
  const empresa = await getEmpresaConfig();
  const html = buildHtml({ ...payload, autoPrint: false, empresa });
  const element = document.createElement("div");
  element.innerHTML = html;
  html2pdf()
    .set({
      margin: 0,
      filename: "reporte_conteos.pdf",
      html2canvas: { scale: 2, backgroundColor: "#ffffff", useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
    })
    .from(element)
    .save();
}
