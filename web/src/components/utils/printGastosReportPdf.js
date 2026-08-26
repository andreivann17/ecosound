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

const fmtMoney = (val) => {
  const n = parseFloat(String(val ?? 0));
  if (isNaN(n)) return "—";
  return new Intl.NumberFormat("es-MX", {
    style: "currency", currency: "MXN",
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(n);
};

const fmtFecha = (s) => {
  if (!s) return "—";
  const d = dayjs(s);
  return d.isValid() ? d.format("D MMM YYYY") : "—";
};

function buildHtml({ items, periodoLabel, empresa }) {
  const total = items.reduce((s, g) => s + parseFloat(g.monto || 0), 0);
  const conDoc = items.filter((g) => g.filename).length;

  const byTipo = {};
  items.forEach((g) => {
    const key = g.nombre_tipo_gasto || "Sin tipo";
    byTipo[key] = (byTipo[key] || 0) + parseFloat(g.monto || 0);
  });
  const tipoRows = Object.entries(byTipo).sort((a, b) => b[1] - a[1]);

  const createdAt = dayjs().format("D [de] MMMM [de] YYYY [a las] HH:mm");

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
    .kpi-red { color: #9f1239; }
    .kpi-blue { color: #1e3a8a; }
    .kpi-gray { color: #374151; }

    table { width: 100%; border-collapse: collapse; font-size: 7.5pt; }
    thead tr { background: #01369e; color: #fff; }
    thead th { padding: 6px 7px; text-align: left; font-weight: 600; font-size: 7pt; white-space: nowrap; }
    thead th.r { text-align: right; }
    tbody tr { border-bottom: 1px solid #e5e7eb; }
    tbody tr:nth-child(even) { background: #f9fafb; }
    tbody td { padding: 5px 7px; vertical-align: middle; }
    tbody td.r { text-align: right; }
    tfoot tr { background: #f1f5f9; border-top: 2px solid #01369e; }
    tfoot td { padding: 6px 7px; font-weight: 700; font-size: 7.5pt; }
    tfoot td.r { text-align: right; }

    .badge { display: inline-block; padding: 1px 5px; border-radius: 4px; font-size: 6.5pt; font-weight: 700; }
    .badge-doc { background: #dcfce7; color: #166534; }
    .badge-nodoc { background: #f1f5f9; color: #64748b; }

    .bar-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-size: 7.5pt; }
    .bar-label { width: 120px; flex-shrink: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .bar-track { flex: 1; height: 10px; background: #f1f5f9; border-radius: 4px; overflow: hidden; }
    .bar-fill { height: 100%; border-radius: 4px; background: #f43f5e; }
    .bar-val { width: 70px; text-align: right; font-weight: 600; color: #374151; flex-shrink: 0; }

    @media print {
      html, body { background: #fff !important; }
      .page { margin: 0; width: auto; padding: 14mm 16mm 18mm; }
      thead tr { background: #01369e !important; color: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      tbody tr:nth-child(even) { background: #f9fafb !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      tfoot tr { background: #f1f5f9 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .bar-fill { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      thead { display: table-header-group; }
      tfoot { display: table-footer-group; }
      tr { page-break-inside: avoid; }
    }
  `;

  const maxTipo = tipoRows[0]?.[1] || 1;

  return `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"/>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet">
<title>Reporte de Gastos — HerrSoft Events</title>
<style>${css}</style></head>
<body><div class="page">

  <div class="hdr">
    ${empresaBrandHtml(empresa)}
    <div class="hdr-right">
      <div class="hdr-title">Reporte de Gastos</div>
      <div>Período: ${esc(periodoLabel || "Todos los gastos")}</div>
      <div>Generado: ${esc(createdAt)}</div>
    </div>
  </div>
  <hr class="rule"/>

  <div class="section-title">Resumen</div>
  <div class="kpi-grid">
    <div class="kpi-box">
      <div class="kpi-label">Total de gastos</div>
      <div class="kpi-value kpi-red">${esc(fmtMoney(total))}</div>
      <div class="kpi-sub">${items.length} gasto${items.length !== 1 ? "s" : ""} registrado${items.length !== 1 ? "s" : ""}</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-label">Con comprobante</div>
      <div class="kpi-value kpi-blue">${conDoc} / ${items.length}</div>
      <div class="kpi-sub">${items.length > 0 ? Math.round((conDoc / items.length) * 100) : 0}% documentado</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-label">Categorías</div>
      <div class="kpi-value kpi-gray">${tipoRows.length}</div>
      <div class="kpi-sub">tipos de gasto distintos</div>
    </div>
  </div>

  <div class="section-title">Gasto por categoría</div>
  ${tipoRows.map(([nombre, subtotal]) => {
    const pct = Math.round((subtotal / maxTipo) * 100);
    return `<div class="bar-row">
      <div class="bar-label">${esc(nombre)}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
      <div class="bar-val">${esc(fmtMoney(subtotal))}</div>
    </div>`;
  }).join("")}

  <div class="section-title">Detalle de gastos (${items.length})</div>
  <table>
    <thead><tr>
      <th style="width:28%">Descripción</th>
      <th style="width:14%">Tipo</th>
      <th style="width:13%">Fecha</th>
      <th style="width:22%">Notas</th>
      <th style="width:10%">Comprobante</th>
      <th class="r" style="width:13%">Monto</th>
    </tr></thead>
    <tbody>
      ${items.map((g) => `<tr>
        <td>${esc(g.descripcion)}</td>
        <td>${esc(g.nombre_tipo_gasto || "—")}</td>
        <td>${esc(fmtFecha(g.fecha))}</td>
        <td style="font-size:6.5pt;color:#64748b">${esc(g.notas || "—")}</td>
        <td><span class="badge ${g.filename ? "badge-doc" : "badge-nodoc"}">${g.filename ? "Sí" : "No"}</span></td>
        <td class="r" style="font-weight:600">${esc(fmtMoney(g.monto))}</td>
      </tr>`).join("")}
    </tbody>
    <tfoot><tr>
      <td colspan="5">Total (${items.length} gastos)</td>
      <td class="r">${esc(fmtMoney(total))}</td>
    </tr></tfoot>
  </table>

</div></body></html>`;
}

export async function previewGastosReportPdf(payload) {
  const empresa = await getEmpresaConfig();
  return buildHtml({ ...payload, empresa });
}

export async function printGastosReportPdf(payload) {
  const empresa = await getEmpresaConfig();
  const html = buildHtml({ ...payload, empresa });
  const element = document.createElement("div");
  element.innerHTML = html;
  html2pdf()
    .set({
      margin: 0,
      filename: "reporte_gastos.pdf",
      html2canvas: { scale: 2, backgroundColor: "#ffffff", useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    })
    .from(element)
    .save();
}
