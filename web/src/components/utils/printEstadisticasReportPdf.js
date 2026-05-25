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

const fmtMoney = (val) => {
  const n = parseFloat(String(val ?? 0));
  if (isNaN(n)) return "—";
  return new Intl.NumberFormat("es-MX", {
    style: "currency", currency: "MXN",
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n);
};

const fmtFecha = (v) => {
  if (!v) return "—";
  const d = dayjs(v);
  return d.isValid() ? d.format("D MMM YYYY") : "—";
};

const css = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { background: #fff; color: #111; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; font-size: 10pt; }
  .page { width: 190mm; margin: 0 auto; padding: 14mm 16mm 18mm; background: #fff; }

  /* Header */
  .hdr { display: flex; justify-content: space-between; align-items: flex-end; padding-bottom: 8px; border-bottom: 3px solid #01369e; margin-bottom: 4px; }
  .hdr-brand { font-size: 22pt; font-weight: 800; color: #111; letter-spacing: -0.5px; }
  .hdr-sub { font-size: 9pt; color: #555; margin-top: 2px; }
  .hdr-right { text-align: right; font-size: 8pt; color: #444; line-height: 1.7; }
  .hdr-title { font-size: 11pt; font-weight: 700; color: #111; }
  .rule { border: 0; border-top: 1px solid #ccc; margin: 4px 0 14px; }

  /* Section title */
  .section-title { font-size: 7pt; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #01369e; margin: 22px 0 10px; padding-bottom: 5px; border-bottom: 1px solid #e2e8f0; }
  .section-title:first-of-type { margin-top: 8px; }

  /* KPI grid */
  .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 4px; }
  .kpi-box { border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; }
  .kpi-label { font-size: 6.5pt; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: #64748b; margin-bottom: 4px; }
  .kpi-value { font-size: 16pt; font-weight: 800; line-height: 1; margin-bottom: 4px; }
  .kpi-sub { font-size: 7pt; color: #94a3b8; }
  .kpi-green  { color: #15803d; }
  .kpi-red    { color: #b91c1c; }
  .kpi-indigo { color: #3730a3; }
  .kpi-rose   { color: #9f1239; }

  /* Tables */
  table { width: 100%; border-collapse: collapse; font-size: 7.5pt; margin-bottom: 4px; }
  thead tr { background: #01369e; color: #fff; }
  thead th { padding: 5px 7px; text-align: left; font-weight: 600; font-size: 7pt; white-space: nowrap; }
  thead th.r { text-align: right; }
  tbody tr { border-bottom: 1px solid #e5e7eb; }
  tbody tr:nth-child(even) { background: #f9fafb; }
  tbody td { padding: 5px 7px; color: #111; vertical-align: middle; }
  tbody td.r { text-align: right; }
  tfoot tr { background: #f1f5f9; border-top: 2px solid #01369e; }
  tfoot td { padding: 5px 7px; font-weight: 700; font-size: 7.5pt; }
  tfoot td.r { text-align: right; }

  /* Badge */
  .badge { display: inline-block; padding: 1px 5px; border-radius: 4px; font-size: 6.5pt; font-weight: 700; }
  .badge-pending { background: #fef3c7; color: #92400e; }
  .badge-ok      { background: #dcfce7; color: #166534; }
  .badge-vencido { background: #fee2e2; color: #991b1b; }

  /* Two-column layout */
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .two-col table { font-size: 7pt; }

  /* Bar chart rows */
  .bar-row { display: flex; align-items: center; gap: 6px; margin-bottom: 5px; font-size: 7.5pt; }
  .bar-label { width: 130px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex-shrink: 0; }
  .bar-track { flex: 1; height: 10px; background: #f1f5f9; border-radius: 4px; overflow: hidden; }
  .bar-fill { height: 100%; border-radius: 4px; }
  .bar-val { width: 36px; text-align: right; font-weight: 600; color: #374151; flex-shrink: 0; }

  @media print {
    html, body { background: #fff !important; }
    .page { margin: 0; width: auto; padding: 14mm 16mm 18mm; }
    thead tr { background: #01369e !important; color: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    tbody tr:nth-child(even) { background: #f9fafb !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    tfoot tr { background: #f1f5f9 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .bar-fill { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .kpi-box { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }
    tr { page-break-inside: avoid; }
  }
`;

function barRows(items, labelKey, valueKey, color, maxVal) {
  if (!items?.length) return "<p style='font-size:7.5pt;color:#888;margin:8px 0'>Sin datos</p>";
  const max = maxVal || Math.max(...items.map((i) => i[valueKey] || 0)) || 1;
  return items.map((item) => {
    const val = item[valueKey] || 0;
    const pct = Math.round((val / max) * 100);
    const isMoneyVal = typeof val === "number" && val > 100;
    const valStr = isMoneyVal && color === "#f43f5e" ? esc(fmtMoney(val)) : `${val}`;
    return `<div class="bar-row">
      <div class="bar-label">${esc(item[labelKey])}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${color}"></div></div>
      <div class="bar-val">${valStr}</div>
    </div>`;
  }).join("");
}

function buildHtml({ data, periodoDescripcion }) {
  if (!data) return "";
  const createdAt = dayjs().format("D [de] MMMM [de] YYYY [a las] HH:mm");

  const contratos = data.contratos_del_periodo || [];
  const pendientes = data.cobranza?.contratos_pendientes || [];
  const totalImporte = contratos.reduce((s, c) => s + (c.importe || 0), 0);
  const totalSaldo   = contratos.reduce((s, c) => s + (c.saldo_pendiente || 0), 0);
  const totalCobranza = pendientes.reduce((s, c) => s + (c.saldo || 0), 0);

  const ingresosMes = (data.ingresos_por_mes || []).slice(-12);
  const maxIngreso = Math.max(...ingresosMes.map((m) => (m.cobrado || 0) + (m.pendiente || 0)), 1);

  return `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"/><title>Reporte de Estadísticas — HerrSoft Events</title>
<style>${css}</style></head>
<body><div class="page">

  <div class="hdr">
    <div>
      <div class="hdr-brand">HerrSoft Events</div>
      <div class="hdr-sub">Producción de eventos</div>
    </div>
    <div class="hdr-right">
      <div class="hdr-title">Reporte de Estadísticas</div>
      <div>Período: ${esc(periodoDescripcion || "—")}</div>
      <div>Generado: ${esc(createdAt)}</div>
    </div>
  </div>
  <hr class="rule"/>

  <!-- KPIs -->
  <div class="section-title">Resumen del período</div>
  <div class="kpi-grid">
    <div class="kpi-box">
      <div class="kpi-label">Pagos recibidos</div>
      <div class="kpi-value kpi-green">${esc(fmtMoney(data.kpis?.ingresos_cobrados))}</div>
      <div class="kpi-sub">Anticipos y abonos en el período</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-label">Por cobrar</div>
      <div class="kpi-value kpi-red">${esc(fmtMoney(data.kpis?.saldo_pendiente_total))}</div>
      <div class="kpi-sub">Saldo pendiente en el período</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-label">Valor total contratos</div>
      <div class="kpi-value kpi-indigo">${esc(fmtMoney(data.kpis?.importe_total))}</div>
      <div class="kpi-sub">${data.kpis?.contratos_count ?? 0} contratos con evento</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-label">Gastos</div>
      <div class="kpi-value kpi-rose">${esc(fmtMoney(data.kpis?.gastos_total))}</div>
      <div class="kpi-sub">Total registrado en el período</div>
    </div>
  </div>

  <!-- Ingresos por mes -->
  <div class="section-title">Ingresos por mes (últimos 12 meses)</div>
  ${ingresosMes.map((m) => {
    const total = (m.cobrado || 0) + (m.pendiente || 0);
    const pctCob = Math.round(((m.cobrado || 0) / Math.max(total, 1)) * 100);
    const pctPend = 100 - pctCob;
    return `<div class="bar-row">
      <div class="bar-label">${esc(m.mes)}</div>
      <div class="bar-track" style="height:12px">
        <div style="height:100%;display:flex">
          <div style="width:${pctCob}%;background:#10b981;border-radius:4px 0 0 4px"></div>
          <div style="width:${pctPend}%;background:#cbd5e1;border-radius:0 4px 4px 0"></div>
        </div>
      </div>
      <div class="bar-val" style="width:90px;font-size:7pt">${esc(fmtMoney(m.cobrado))} / ${esc(fmtMoney(m.pendiente))}</div>
    </div>`;
  }).join("")}
  <div style="font-size:7pt;color:#64748b;margin-top:4px">
    <span style="display:inline-block;width:10px;height:10px;background:#10b981;border-radius:2px;margin-right:4px;vertical-align:middle"></span>Cobrado
    <span style="display:inline-block;width:10px;height:10px;background:#cbd5e1;border-radius:2px;margin:0 4px 0 12px;vertical-align:middle"></span>Pendiente
  </div>

  <!-- Análisis por tipo y ciudad -->
  <div class="two-col" style="margin-top:14px">
    <div>
      <div class="section-title" style="margin-top:0">Contratos por tipo de evento</div>
      ${barRows(data.por_tipo_evento, "tipo", "cantidad", "#6366f1")}
    </div>
    <div>
      <div class="section-title" style="margin-top:0">Contratos por ciudad</div>
      ${barRows(data.por_ciudad, "ciudad", "cantidad", "#3b82f6")}
    </div>
  </div>

  <!-- Top paquetes -->
  <div class="two-col" style="margin-top:4px">
    <div>
      <div class="section-title" style="margin-top:0">Paquetes fotografía más vendidos</div>
      ${barRows(data.top_paquetes_foto, "nombre", "cantidad", "#6366f1")}
    </div>
    <div>
      <div class="section-title" style="margin-top:0">Paquetes sonido más vendidos</div>
      ${barRows(data.top_paquetes_sonido, "nombre", "cantidad", "#10b981")}
    </div>
  </div>

  <!-- Gastos por categoría -->
  <div class="section-title">Gastos por categoría</div>
  ${barRows(data.gastos_por_tipo, "tipo", "total", "#f43f5e")}

  <!-- Saldo pendiente de cobranza -->
  <div class="section-title">Saldo pendiente por cobrar (${pendientes.length} contratos)</div>
  ${pendientes.length > 0 ? `
  <table>
    <thead><tr>
      <th style="width:30%">Cliente</th>
      <th style="width:15%">Tipo evento</th>
      <th style="width:14%">Fecha evento</th>
      <th class="r" style="width:16%">Saldo</th>
      <th style="width:14%">Estado</th>
    </tr></thead>
    <tbody>
      ${pendientes.map((c) => {
        const vencido = c.dias_diff > 0;
        const badgeCls = vencido && c.dias_diff > 30 ? "badge-vencido" : vencido ? "badge-pending" : "badge-ok";
        const badgeTxt = vencido ? `${c.dias_diff} días vencido` : "Pendiente";
        return `<tr>
          <td>${esc(c.cliente_nombre)}</td>
          <td>${esc(c.tipo_evento)}</td>
          <td>${esc(fmtFecha(c.fecha_evento))}</td>
          <td class="r" style="font-weight:700;color:#b91c1c">${esc(fmtMoney(c.saldo))}</td>
          <td><span class="badge ${badgeCls}">${badgeTxt}</span></td>
        </tr>`;
      }).join("")}
    </tbody>
    <tfoot><tr>
      <td colspan="3">Total por cobrar</td>
      <td class="r">${esc(fmtMoney(totalCobranza))}</td>
      <td></td>
    </tr></tfoot>
  </table>` : "<p style='font-size:7.5pt;color:#888;margin:6px 0'>Sin contratos con saldo pendiente en este período</p>"}

  <!-- Contratos del período -->
  <div class="section-title">Contratos del período (${contratos.length} contratos)</div>
  ${contratos.length > 0 ? `
  <table>
    <thead><tr>
      <th style="width:28%">Cliente</th>
      <th style="width:12%">Tipo</th>
      <th style="width:14%">Fecha evento</th>
      <th class="r" style="width:14%">Importe</th>
      <th class="r" style="width:14%">Saldo</th>
      <th style="width:12%">Estado pago</th>
    </tr></thead>
    <tbody>
      ${contratos.map((c) => {
        const liquidado = !c.saldo_pendiente || c.saldo_pendiente <= 0;
        return `<tr>
          <td>${esc(c.cliente_nombre)}</td>
          <td>${esc(c.tipo_evento)}</td>
          <td>${esc(fmtFecha(c.fecha_evento))}</td>
          <td class="r">${esc(fmtMoney(c.importe))}</td>
          <td class="r" style="font-weight:${liquidado ? "400" : "700"};color:${liquidado ? "#166534" : "#b91c1c"}">
            ${liquidado ? "Liquidado" : esc(fmtMoney(c.saldo_pendiente))}
          </td>
          <td><span class="badge ${liquidado ? "badge-ok" : "badge-pending"}">${liquidado ? "Pagado" : "Pendiente"}</span></td>
        </tr>`;
      }).join("")}
    </tbody>
    <tfoot><tr>
      <td colspan="3">Total (${contratos.length} contratos)</td>
      <td class="r">${esc(fmtMoney(totalImporte))}</td>
      <td class="r">${totalSaldo > 0 ? esc(fmtMoney(totalSaldo)) : "Liquidado"}</td>
      <td></td>
    </tr></tfoot>
  </table>` : "<p style='font-size:7.5pt;color:#888;margin:6px 0'>Sin contratos en este período</p>"}

</div></body></html>`;
}

export function previewEstadisticasReportPdf(payload) {
  return buildHtml(payload);
}

export function printEstadisticasReportPdf(payload) {
  const html = buildHtml(payload);
  const element = document.createElement("div");
  element.innerHTML = html;
  html2pdf()
    .set({
      margin: 0,
      filename: "reporte_estadisticas.pdf",
      html2canvas: { scale: 2, backgroundColor: "#ffffff", useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    })
    .from(element)
    .save();
}
