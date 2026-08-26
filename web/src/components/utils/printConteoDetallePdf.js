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
  return d.isValid() ? d.format("D [de] MMMM [del] YYYY") : "—";
}

function fmtDatetime(v) {
  if (!v) return "—";
  const d = dayjs(v);
  return d.isValid() ? d.format("DD/MM/YYYY HH:mm") : "—";
}

function groupDetalles(detalles) {
  const map = {};
  for (const d of detalles || []) {
    const cat = d.nombre_categoria || "Sin categoría";
    if (!map[cat]) map[cat] = [];
    map[cat].push(d);
  }
  return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
}

function buildHtml({ conteo, autoPrint = false, empresa }) {
  const detalles = conteo?.detalles || [];
  const grouped = groupDetalles(detalles);
  const now = dayjs().format("D [de] MMMM [de] YYYY");

  const totalEquipos = detalles.length;
  const conDifPos = detalles.filter((d) => (d.cantidad_fisica ?? 0) - (d.cantidad_sistema ?? 0) > 0).length;
  const conDifNeg = detalles.filter((d) => (d.cantidad_fisica ?? 0) - (d.cantidad_sistema ?? 0) < 0).length;
  const sinDif = detalles.filter((d) => (d.cantidad_fisica ?? 0) - (d.cantidad_sistema ?? 0) === 0).length;

  const css = `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { background: #fff; color: #111; font-family: "Noto Sans", "Helvetica Neue", Helvetica, Arial, sans-serif; font-size: 10pt; }
    .page { width: 190mm; min-height: 267mm; margin: 0 auto; padding: 14mm 18mm 18mm 18mm; background: #fff; }

    .header { display: flex; justify-content: space-between; align-items: flex-end; padding-bottom: 8px; border-bottom: 2px solid #111; margin-bottom: 4px; }
    .header-brand { font-size: 20pt; font-weight: 800; letter-spacing: -0.5px; color: #111; }
    .header-sub { font-size: 8.5pt; color: #555; margin-top: 2px; }
    .header-right { text-align: right; font-size: 8pt; color: #444; line-height: 1.7; }
    .header-title { font-size: 10.5pt; font-weight: 700; color: #111; }
    .rule-thin { border: 0; border-top: 1px solid #bbb; margin: 4px 0 12px 0; }

    .summary { display: flex; gap: 0; margin-bottom: 14px; border: 1px solid #d1d5db; border-radius: 6px; overflow: hidden; }
    .summary-item { flex: 1; padding: 7px 12px; border-right: 1px solid #d1d5db; }
    .summary-item:last-child { border-right: none; }
    .summary-label { font-size: 7pt; color: #666; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 2px; }
    .summary-value { font-size: 14pt; font-weight: 700; line-height: 1; }
    .summary-value.gray  { color: #374151; }
    .summary-value.green { color: #15803d; }
    .summary-value.red   { color: #b91c1c; }
    .summary-value.blue  { color: #1d4ed8; }

    table { width: 100%; border-collapse: collapse; font-size: 8pt; }
    thead tr { background: #111; color: #fff; }
    thead th { padding: 7px 8px; text-align: left; font-weight: 600; font-size: 7.5pt; letter-spacing: 0.3px; }
    thead th.r { text-align: right; }
    tbody tr { border-bottom: 1px solid #e5e7eb; }
    tbody tr:nth-child(even) { background: #f9fafb; }
    .cat-row td { background: #eff6ff; color: #1d4ed8; font-size: 7.5pt; font-weight: 800; letter-spacing: 0.07em; text-transform: uppercase; padding: 6px 8px; border-bottom: 1px solid #c7d7f9; }
    tbody td { padding: 6px 8px; vertical-align: middle; color: #111; line-height: 1.3; }
    tbody td.r { text-align: right; }
    .td-pos { font-weight: 700; color: #15803d; }
    .td-neg { font-weight: 700; color: #b91c1c; }
    .td-zero { color: #9ca3af; }
    .td-sys { font-weight: 700; color: #1d4ed8; }

    tfoot tr { background: #f3f4f6; border-top: 2px solid #111; }
    tfoot td { padding: 6px 8px; font-size: 8pt; font-weight: 700; color: #111; }
    tfoot td.r { text-align: right; }

    @media print {
      html, body { background: #fff !important; }
      .page { margin: 0; width: auto; padding: 14mm 18mm 18mm 18mm; }
      thead tr { background: #111 !important; color: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .cat-row td { background: #eff6ff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      tfoot tr { background: #f3f4f6 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      tbody tr:nth-child(even) { background: #f9fafb !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      thead { display: table-header-group; }
      tfoot { display: table-footer-group; }
      tr { page-break-inside: avoid; }
    }
  `;

  const rowsTbody = grouped.map(([cat, rows]) => {
    const catRow = `<tr class="cat-row"><td colspan="4">${escapeHtml(cat)}</td></tr>`;
    const dataRows = rows.map((d) => {
      const diff = (d.cantidad_fisica ?? 0) - (d.cantidad_sistema ?? 0);
      const diffStr = diff > 0 ? `+${diff}` : String(diff);
      const diffCls = diff > 0 ? "td-pos" : diff < 0 ? "td-neg" : "td-zero";
      return `<tr>
        <td>${escapeHtml(d.nombre_equipo)}</td>
        <td class="r td-sys">${d.cantidad_sistema ?? 0}</td>
        <td class="r" style="font-weight:700">${d.cantidad_fisica ?? 0}</td>
        <td class="r ${diffCls}">${escapeHtml(diffStr)}</td>
      </tr>`;
    }).join("");
    return catRow + dataRows;
  }).join("");

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet">
<title>Conteo ${escapeHtml(TIPO_MAP[conteo?.tipo] || "")} — HerrSoft Events</title>
<style>${css}</style>
</head>
<body>
<div class="page">

  <div class="header">
    ${empresaBrandHtml(empresa)}
    <div class="header-right">
      <div class="header-title">Conteo de Inventario — ${escapeHtml(TIPO_MAP[conteo?.tipo] || conteo?.tipo || "")}</div>
      <div>Fecha del conteo: ${escapeHtml(fmtFecha(conteo?.fecha))}</div>
      ${conteo?.descripcion ? `<div>Descripción: ${escapeHtml(conteo.descripcion)}</div>` : ""}
      <div>Registrado: ${escapeHtml(fmtDatetime(conteo?.datetime))}</div>
      <div>Elaborado: ${escapeHtml(now)}</div>
    </div>
  </div>
  <hr class="rule-thin"/>

  <div class="summary">
    <div class="summary-item">
      <div class="summary-label">Total equipos</div>
      <div class="summary-value gray">${totalEquipos}</div>
    </div>
    <div class="summary-item">
      <div class="summary-label">Sin diferencia</div>
      <div class="summary-value blue">${sinDif}</div>
    </div>
    <div class="summary-item">
      <div class="summary-label">Sobrantes</div>
      <div class="summary-value green">${conDifPos}</div>
    </div>
    <div class="summary-item">
      <div class="summary-label">Faltantes</div>
      <div class="summary-value red">${conDifNeg}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:50%">Equipo</th>
        <th class="r" style="width:16%">Sistema</th>
        <th class="r" style="width:16%">Físico</th>
        <th class="r" style="width:18%">Diferencia</th>
      </tr>
    </thead>
    <tbody>${rowsTbody}</tbody>
    <tfoot>
      <tr>
        <td>Total (${totalEquipos} equipos)</td>
        <td class="r">${detalles.reduce((a, d) => a + (d.cantidad_sistema ?? 0), 0)}</td>
        <td class="r">${detalles.reduce((a, d) => a + (d.cantidad_fisica ?? 0), 0)}</td>
        <td class="r">${(() => { const v = detalles.reduce((a, d) => a + ((d.cantidad_fisica ?? 0) - (d.cantidad_sistema ?? 0)), 0); return v > 0 ? `+${v}` : String(v); })()}</td>
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

export async function previewConteoDetallePdf(conteo) {
  const empresa = await getEmpresaConfig();
  return buildHtml({ conteo, autoPrint: false, empresa });
}

export async function printConteoDetallePdf(conteo) {
  const empresa = await getEmpresaConfig();
  const html = buildHtml({ conteo, autoPrint: false, empresa });
  const element = document.createElement("div");
  element.innerHTML = html;
  const tipo = TIPO_MAP[conteo?.tipo] || conteo?.tipo || "conteo";
  const fecha = conteo?.fecha ? dayjs(conteo.fecha).format("YYYY-MM-DD") : "sin-fecha";
  html2pdf()
    .set({
      margin: 0,
      filename: `conteo_${tipo}_${fecha}.pdf`,
      html2canvas: { scale: 2, backgroundColor: "#ffffff", useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    })
    .from(element)
    .save();
}
