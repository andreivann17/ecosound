// src/utils/printLaboralReportPdf.js
import html2pdf from "html2pdf.js";
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
  return norm(exp?.status_nombre || exp?.status || exp?.estatus || "");
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

    // subcards concluidos
    cumplimientosConvenio: 0,
    archivoPatron: 0,
    archivoTrabajador: 0,
    constanciaNoConciliacion: 0,

    // constancia_documento=1 y NO es status 7 => separado
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
  const trabajador = String(exp?.nombre_trabajador || "").trim();
  const razon =
    Array.isArray(exp?.razones_sociales) && exp.razones_sociales.length
      ? exp.razones_sociales
          .map((r) => r?.razon_social)
          .filter(Boolean)
          .join(" / ")
      : "";
  const empresa = String(exp?.nombre_empresa || "").trim();

  const right = razon || empresa || "—";
  const left = trabajador || "—";
  return `${left} vs ${right}`;
}

// ISO -> DD/MM/YYYY
function fmtDateDMY(iso) {
  if (!iso) return "—";
  const s = String(iso).slice(0, 10); // YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return "—";
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
}

function mapRowsForPdf(items) {
  return (items || []).map((exp) => ({
    expediente: exp?.expediente_format || exp?.expediente || String(exp?.id || "—"),
    partes: buildPartes(exp),
    estatus: exp?.status || exp?.status_nombre || exp?.estatus || "—",
    proxima_audiencia: fmtDateDMY(exp?.fecha_proxima_audiencia),
  }));
}

function buildReportHtml({
  periodFrom,
  periodTo,
  createdAt,
  stats,
  rows,
  ciudadesLabel,
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
   autoPrint = true,
}) {
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

    .page {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      background: #fff;
      padding: 0;
    }
    h1 {
      margin-top: 14mm;
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
      padding: 18mm 18mm 24mm 18mm;
      position: relative;
    }

    .footer{ display:none !important; }

    thead th{
      padding: 12px 10px;
      line-height: 1.25;
    }

    tbody td{
      padding: 12px 10px;
      line-height: 1.35;
    }

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

    .lh-spacer{
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
    ["Expedientes activos", stats?.activos ?? 0],
    ["Expedientes diferidos", stats?.diferidos ?? 0],
    ["Convenios logrados", stats?.convenios ?? 0],

    ["Expedientes concluidos", stats?.concluidos ?? 0],
    ["  • Cumplimientos de convenio", stats?.cumplimientosConvenio ?? 0],
    ["  • Archivo por patrón", stats?.archivoPatron ?? 0],
    ["  • Archivo por solicitante", stats?.archivoTrabajador ?? 0],
    ["  • Constancia de no conciliación", stats?.constanciaNoConciliacion ?? 0],
    ["  • Constancia de cumplimiento (documento)", stats?.constanciaDocumento ?? 0],

    ["Total de expedientes registrados", stats?.total ?? 0],
  ];

  const statsTbody = statsRows
    .map(
      ([k, v]) => `
      <tr>
        <td>${escapeHtml(k)}</td>
        <td class="right"><b>${escapeHtml(v)}</b></td>
      </tr>
    `
    )
    .join("");

  const casesTbody = (rows || [])
    .map(
      (r) => `
      <tr>
        <td>${escapeHtml(r?.expediente)}</td>
        <td>${escapeHtml(r?.partes)}</td>
        <td>${escapeHtml(r?.estatus)}</td>
        <td>${escapeHtml(r?.proxima_audiencia || "—")}</td>
      </tr>
    `
    )
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

    <h1>Materia Laboral - Centro de Conciliación<br/></h1>

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
    window.__AUTO_PRINT__ = ${autoPrint ? "true" : "false"};
    window.onload = () => {
      if (!window.__AUTO_PRINT__) return;
      setTimeout(() => window.print(), 50);
    };
  </script>
</body>
</html>`;
}
function downloadHtmlAsPdf(html, filename = "reporte_estadistico.pdf") {
  const element = document.createElement("div");
  element.innerHTML = html;

  html2pdf()
    .set({
      margin: 0,
      filename,
      html2canvas: { scale: 2 },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    })
    .from(element)
    .save();
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

  const cleanup = () => {
    setTimeout(() => {
      try {
        document.body.removeChild(iframe);
      } catch {}
    }, 400);
  };

  iframe.contentWindow?.addEventListener("afterprint", cleanup, { once: true });
  setTimeout(cleanup, 6000);
}
export function buildLaboralReportHtml({
  items,
  periodFrom,
  periodTo,
  ciudadesLabel,
  nombreEmpresa,
  autoPrint = false,
}) {
  const list = Array.isArray(items) ? items : [];

  const stats = computeStatsFromItems(list);
  const rows = mapRowsForPdf(list);

  const now = new Date();
  const createdAtLocal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;

  return buildReportHtml({
    periodFrom,
    periodTo,
    createdAt: createdAtLocal,

    stats,
    rows,

    nombreEmpresa: nombreEmpresa || "—",
    ciudadesLabel: ciudadesLabel || "—",

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

    autoPrint,
  });
}
export function printLaboralReportPdf({
  items,
  periodFrom,
  periodTo,
  ciudadesLabel,
  nombreEmpresa,
}) {
  const html = buildLaboralReportHtml({
    items,
    periodFrom,
    periodTo,
    ciudadesLabel,
    nombreEmpresa,
    autoPrint: true, // IMPORTANTe: aquí sí imprime
  });

  downloadHtmlAsPdf(html);
}
export function previewLaboralReportPdf(payload) {
  return buildLaboralReportHtml({ ...payload, autoPrint: false });
}