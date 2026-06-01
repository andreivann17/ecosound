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

const parseNum = (v) => {
  const n = parseFloat(String(v || "").replace(/,/g, ""));
  return isNaN(n) ? 0 : n;
};

const fmtMoney = (val) => {
  const n = parseFloat(String(val || "").replace(/,/g, ""));
  if (isNaN(n)) return "—";
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);
};

function fmtFecha(v) {
  if (!v) return "—";
  const d = dayjs(v);
  return d.isValid() ? d.format("D MMM YYYY") : "—";
}

function fmtHorario(inicio, fin) {
  const i = inicio ? dayjs(inicio).format("HH:mm") : null;
  const f = fin ? dayjs(fin).format("HH:mm") : null;
  if (i && f) return `${i}–${f}`;
  return i || "—";
}

function toTitleCase(str) {
  if (!str) return "—";
  return str.toLowerCase().split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function getEstado(row) {
  const today = dayjs().startOf("day");
  const cancelado = row.cancelado === true || String(row.status || "").toLowerCase() === "cancelado";
  if (cancelado) return "Cancelado";
  if (row.fecha_evento && dayjs(row.fecha_evento).isBefore(today)) return "Concluido";
  return "Activo";
}

function calcSaldo(row) {
  if (!row.importe) return null;
  return parseNum(row.importe) - parseNum(row.importe_anticipo) - parseNum(row.total_abonos);
}

function mapRows(items) {
  return (items || []).map((r) => {
    const saldo = calcSaldo(r);
    const anticipo = parseNum(r.importe_anticipo) + parseNum(r.total_abonos);
    return {
      cliente: toTitleCase(r.cliente_nombre),
      tipo: TIPO_MAP[r.id_tipo_evento] || "—",
      lugar: toTitleCase(r.lugar_evento),
      fecha: fmtFecha(r.fecha_evento),
      horario: fmtHorario(r.hora_inicio, r.hora_final),
      importe: r.importe ? parseNum(r.importe) : null,
      anticipo: anticipo > 0 ? anticipo : null,
      saldo,
      estado: getEstado(r),
    };
  });
}

function computeStats(items) {
  const today = dayjs().startOf("day");
  let activos = 0, concluidos = 0, cancelados = 0, totalImporte = 0, totalAnticipo = 0;
  (items || []).forEach((r) => {
    const cancelado = r.cancelado === true || String(r.status || "").toLowerCase() === "cancelado";
    if (cancelado) cancelados++;
    else if (r.fecha_evento && dayjs(r.fecha_evento).isBefore(today)) concluidos++;
    else activos++;
    totalImporte += parseNum(r.importe);
    totalAnticipo += parseNum(r.importe_anticipo) + parseNum(r.total_abonos);
  });
  return { activos, concluidos, cancelados, total: (items || []).length, totalImporte, totalAnticipo, totalSaldo: totalImporte - totalAnticipo };
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
    tbody td.mono { font-family: "Courier New", monospace; }

    .badge { display: inline-block; padding: 1px 6px; border-radius: 4px; font-size: 7pt; font-weight: 700; letter-spacing: 0.2px; }
    .badge-activo    { background: #dcfce7; color: #166534; }
    .badge-concluido { background: #dbeafe; color: #1e3a8a; }
    .badge-cancelado { background: #fee2e2; color: #991b1b; }

    /* ── Fila de totales ── */
    tfoot tr { background: #f3f4f6; border-top: 2px solid #01369e; }
    tfoot td { padding: 7px 7px; font-size: 8pt; font-weight: 700; color: #111; }
    tfoot td.r { text-align: right; }

    @media print {
      html, body { background: #fff !important; }
      .page { margin: 0; width: auto; padding: 16mm 20mm 20mm 20mm; }
      .badge-activo    { background: #dcfce7 !important; color: #166534 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .badge-concluido { background: #dbeafe !important; color: #1e3a8a !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .badge-cancelado { background: #fee2e2 !important; color: #991b1b !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
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
    const estadoCls = r.estado === "Activo" ? "activo" : r.estado === "Concluido" ? "concluido" : "cancelado";
    const saldoStr = r.saldo === null ? "—" : r.saldo <= 0 ? "Liquidado" : fmtMoney(String(r.saldo));
    return `<tr>
      <td>${escapeHtml(r.cliente)}</td>
      <td>${escapeHtml(r.tipo)}</td>
      <td>${escapeHtml(r.lugar)}</td>
      <td>${escapeHtml(r.fecha)}</td>
      <td>${escapeHtml(r.horario)}</td>
      <td class="r mono">${r.importe ? escapeHtml(fmtMoney(String(r.importe))) : "—"}</td>
      <td class="r mono">${r.anticipo ? escapeHtml(fmtMoney(String(r.anticipo))) : "<span style='color:#888'>Sin anticipo</span>"}</td>
      <td class="r mono">${escapeHtml(saldoStr)}</td>
      <td><span class="badge badge-${estadoCls}">${escapeHtml(r.estado)}</span></td>
    </tr>`;
  }).join("");

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<title>Reporte de Eventos — HerrSoft Events</title>
<style>${css}</style>
</head>
<body>
<div class="page">

  <div class="header">
    ${empresaBrandHtml(empresa)}
    <div class="header-right">
      <div class="header-title">Reporte de Eventos</div>
      <div>Periodo: ${escapeHtml(periodoStr)}</div>
      <div>Tipo: ${escapeHtml(tipoLabel || "Todos")}</div>
      <div>Elaborado: ${escapeHtml(createdAt)}</div>
    </div>
  </div>
  <hr class="rule-thin"/>

  <div class="summary">
    <div class="summary-item">
      <div class="summary-label">Total eventos</div>
      <div class="summary-value gray">${stats.total}</div>
    </div>
    <div class="summary-item">
      <div class="summary-label">Activos</div>
      <div class="summary-value green">${stats.activos}</div>
    </div>
    <div class="summary-item">
      <div class="summary-label">Concluidos</div>
      <div class="summary-value gray">${stats.concluidos}</div>
    </div>
    <div class="summary-item">
      <div class="summary-label">Cancelados</div>
      <div class="summary-value red">${stats.cancelados}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:17%">Cliente</th>
        <th style="width:7%">Tipo</th>
        <th style="width:15%">Lugar</th>
        <th style="width:11%">Fecha</th>
        <th style="width:8%">Horario</th>
        <th class="r" style="width:10%">Importe</th>
        <th class="r" style="width:10%">Anticipo</th>
        <th class="r" style="width:10%">Saldo</th>
        <th style="width:8%">Estado</th>
      </tr>
    </thead>
    <tbody>${rowsTbody}</tbody>
    <tfoot>
      <tr>
        <td colspan="5">Total (${stats.total} eventos)</td>
        <td class="r">${escapeHtml(fmtMoney(String(stats.totalImporte)))}</td>
        <td class="r">${escapeHtml(fmtMoney(String(stats.totalAnticipo)))}</td>
        <td class="r">${escapeHtml(fmtMoney(String(stats.totalSaldo)))}</td>
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

export async function previewEventosReportPdf(payload) {
  const empresa = await getEmpresaConfig();
  return buildHtml({ ...payload, autoPrint: false, empresa });
}

export async function printEventosReportPdf(payload) {
  const empresa = await getEmpresaConfig();
  const html = buildHtml({ ...payload, autoPrint: false, empresa });
  const element = document.createElement("div");
  element.innerHTML = html;
  html2pdf()
    .set({
      margin: 0,
      filename: "reporte_eventos.pdf",
      html2canvas: { scale: 2, backgroundColor: "#ffffff", useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
    })
    .from(element)
    .save();
}
