import html2pdf from "html2pdf.js";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { getEmpresaConfig } from "./empresaConfig";

dayjs.locale("es");

function e(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

const cap = (s) => {
  const t = String(s ?? "").trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : "—";
};

// Capitaliza el mes en fechas "27 may 2026" -> "27 May 2026"
const capFecha = (s) =>
  String(s ?? "").replace(
    /\b(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)\b/gi,
    (m) => m.charAt(0).toUpperCase() + m.slice(1).toLowerCase()
  );

const fmtMoney = (val) => {
  const n = parseFloat(String(val ?? "").replace(/,/g, ""));
  if (isNaN(n)) return "—";
  return new Intl.NumberFormat("es-MX", {
    style: "currency", currency: "MXN",
    minimumFractionDigits: 0, maximumFractionDigits: 2,
  }).format(n);
};

const BLUE = "#01369e";

function buildHtml(data) {
  const {
    folio, cliente, vendedor, tipoLabel,
    comentarios, importe, servicios = [],
    validezDias = 15, logo, nombre_empresa,
  } = data || {};

  const fecha = dayjs().format("DD/MM/YYYY");
  const MIN_ROWS = 8;

  const filasData = (servicios || []).map((s, i) => `
    <tr>
      <td class="n">${i + 1}</td>
      <td class="bold">${e(cap(s.label))}</td>
      <td>${e(capFecha(s.fecha))}</td>
      <td>${e(s.horario || "—")}</td>
      <td>${e(cap(s.paquete))}</td>
    </tr>`).join("");

  const empty = Math.max(0, MIN_ROWS - (servicios || []).length);
  const filasVacias = Array.from({ length: empty }).map(() =>
    `<tr class="erow"><td></td><td></td><td></td><td></td><td></td></tr>`
  ).join("");

  const desc = comentarios
    ? cap(comentarios)
    : `Propuesta de servicios para evento${tipoLabel ? ` de ${tipoLabel}` : ""}.`;

  const logoTag = logo
    ? `<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
        <img src="${e(logo)}" style="height:52px;width:auto;max-width:140px;object-fit:contain;display:block;" alt="logo"/>
        ${nombre_empresa ? `<div style="font-size:15pt;font-weight:900;line-height:1.2;color:#fff;">${e(nombre_empresa)}</div>` : ""}
      </div>`
    : `<div style="font-size:17pt;font-weight:900;line-height:1;margin-bottom:6px;letter-spacing:-.5px;">${nombre_empresa ? e(nombre_empresa) : "HerrSoft<br/>Events"}</div>`;

  const css = `
* { box-sizing:border-box; margin:0; padding:0; }
html,body { background:#f0f2f5; color:#1b1b1d; font-family:"Helvetica Neue",Helvetica,Arial,sans-serif; font-size:10pt; }
.page { width:176mm; margin:0 auto; background:#fff; }

/* ── CABECERA AZUL (esquinas redondeadas abajo, como la referencia) ── */
.head {
  background:${BLUE};
  color:#fff;
  border-radius:0 0 20px 20px;
  padding:28px 30px 30px;
  display:grid;
  grid-template-columns:1fr 1.1fr;
  gap:16px;
  align-items:start;
}
.head-left {}
.head-addr {
  font-size:8.5pt;
  line-height:1.55;
  opacity:.92;
  margin-top:4px;
}
/* ── LADO DERECHO DEL HEADER ── */
.head-right {
  text-align:right;
  display:flex;
  flex-direction:column;
  align-items:flex-end;
  gap:0;
}

/* "COTIZACIÓN" — el único elemento grande y dominante */
.doc-num {
  font-size:26pt;
  font-weight:900;
  letter-spacing:2px;
  line-height:1;
  text-transform:uppercase;
  margin-bottom:8px;
}

/* Folio como pill/badge blanco */
.doc-folio {
  display:inline-flex;
  align-items:center;
  gap:6px;
  background:rgba(255,255,255,0.18);
  border:1.5px solid rgba(255,255,255,0.45);
  border-radius:6px;
  padding:5px 14px;
  font-size:9pt;
  letter-spacing:.3px;
  margin-bottom:14px;
}
.doc-folio span {
  font-weight:900;
  letter-spacing:2.5px;
  font-size:9.5pt;
}

/* Divisor sutil */
.head-divider {
  width:100%;
  height:1px;
  background:rgba(255,255,255,0.3);
  margin-bottom:12px;
}

/* Meta: lista vertical limpia */
.meta { display:flex; flex-direction:column; gap:5px; }
.meta-row { display:flex; justify-content:flex-end; align-items:baseline; gap:8px; }
.mk {
  font-size:7.5pt;
  font-weight:600;
  letter-spacing:.8px;
  text-transform:uppercase;
  opacity:.75;
  white-space:nowrap;
}
.mv {
  font-size:9.5pt;
  font-weight:800;
  white-space:nowrap;
}

/* Meta info en banda blanca fuera del azul */
.meta-band {
  display:flex;
  gap:0;
  border:1px solid #d0d7e2;
  border-radius:8px;
  overflow:hidden;
  margin:18px 0 18px;
}
.meta-item {
  flex:1;
  padding:12px 16px;
  border-right:1px solid #d0d7e2;
  display:flex;
  flex-direction:column;
  gap:4px;
}
.meta-item:last-child { border-right:none; }
.meta-item .meta-k {
  font-size:7.5pt;
  font-weight:700;
  letter-spacing:.6px;
  text-transform:uppercase;
  color:${BLUE};
  opacity:1;
}
.meta-item .meta-v {
  font-size:10pt;
  font-weight:700;
  color:#0d1b4b;
}

/* ── CUERPO ── */
.body { padding:22px 28px 0; }
.sep { height:3px; background:${BLUE}; width:80px; border-radius:3px; margin-bottom:18px; }
.dlabel { font-size:8.5pt; font-weight:800; letter-spacing:.6px; text-transform:uppercase; color:#222; }
.dtext  { font-size:9.5pt; color:#444; margin:8px 0 24px; line-height:1.5; min-height:42px; }

/* ── TABLA (idéntica a la referencia) ── */
table { width:100%; border-collapse:collapse; font-size:9pt; }
thead th {
  background:${BLUE};
  color:#fff;
  padding:10px 10px;
  text-align:left;
  font-weight:700;
  font-size:8pt;
  letter-spacing:.4px;
  text-transform:uppercase;
  border:1px solid ${BLUE};
}
tbody td {
  padding:8px 10px;
  border:1px solid #c8d1dc;
  color:#222;
  vertical-align:middle;
}
td.n { width:28px; text-align:center; color:#8a93a3; font-weight:700; }
td.bold { font-weight:700; color:#0d1b4b; }
tr.erow td { height:26px; }

tfoot td { border:1px solid #c8d1dc; padding:9px 10px; }
.tf-blank { border:none !important; background:#fff; }
.tf-total-l { background:${BLUE}; color:#fff; font-weight:700; text-align:right; text-transform:uppercase; letter-spacing:.4px; font-size:9pt; }
.tf-total-v { background:${BLUE}; color:#fff; font-weight:900; text-align:right; font-size:11pt; white-space:nowrap; }

/* ── PIE ── */
.foot { padding:14px 28px 28px; }
.validez { font-size:8.5pt; font-weight:700; color:#1b1b1d; margin-top:12px; }
.firmas { display:flex; justify-content:space-between; gap:50px; margin-top:60px; }
.firma-line { border-top:1px solid #666; padding-top:5px; font-size:8.5pt; color:#333; }

@media print {
  html,body,page { background:#fff !important; }
  .head,thead th,.tf-total-l,.tf-total-v { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  tr { page-break-inside:avoid; }
}`;

  return `<!doctype html><html lang="es"><head><meta charset="utf-8"/>
<title>Cotización ${e(folio || "")} — HerrSoft Events</title>
<style>${css}</style></head><body>
<div class="page">

  <div class="head">
    <div class="head-left">
      ${logoTag}
      <div class="head-addr">
        San Luis Río Colorado, Sonora<br/>
        herrsoft.com · (664) 000-0000
      </div>
    </div>
    <div class="head-right">
      <div class="doc-num">COTIZACIÓN</div>
      <div class="doc-folio">Folio:&nbsp;<span>#${e(folio || "—")}</span></div>
      <div class="head-divider"></div>
      <div class="meta">
        <div class="meta-row"><span class="mk">Fecha</span><span class="mv">${e(fecha)}</span></div>
        <div class="meta-row"><span class="mk">Vendedor</span><span class="mv">${e(cap(vendedor))}</span></div>
        <div class="meta-row"><span class="mk">Cliente</span><span class="mv">${e(cap(cliente))}</span></div>
      </div>
    </div>
  </div>

  <div class="body">

    <div class="sep"></div>
    <div class="dlabel">Descripción del proyecto:</div>
    <div class="dtext">${e(desc)}</div>

    <table>
      <thead><tr>
        <th style="width:28px">#</th>
        <th style="width:28%">Servicio</th>
        <th style="width:20%">Fecha</th>
        <th style="width:20%">Horario</th>
        <th>Paquete</th>
      </tr></thead>
      <tbody>${filasData}${filasVacias}</tbody>
      <tfoot><tr>
        <td class="tf-blank" colspan="3"></td>
        <td class="tf-total-l">Total</td>
        <td class="tf-total-v">${e(fmtMoney(importe))}</td>
      </tr></tfoot>
    </table>
  </div>

  <div class="foot">
    <div class="validez">Cotización válida por ${e(String(validezDias))} días*</div>
    <div class="firmas">
      <div style="flex:1"><div class="firma-line">Firma de Cliente</div></div>
      <div style="flex:1"><div class="firma-line">Firma de Vendedor</div></div>
    </div>
  </div>

</div>
</body></html>`;
}

export async function previewCotizacionPdf(data) {
  const empresa = await getEmpresaConfig();
  return buildHtml({ ...data, logo: empresa.logoDataUrl || data?.logo, nombre_empresa: empresa.nombre || data?.nombre_empresa });
}

export async function printCotizacionPdf(data) {
  const empresa = await getEmpresaConfig();
  const html = buildHtml({ ...data, logo: empresa.logoDataUrl || data?.logo, nombre_empresa: empresa.nombre || data?.nombre_empresa });
  const el = document.createElement("div");
  el.innerHTML = html;
  html2pdf().set({
    margin: [8, 16, 8, 16],
    filename: `cotizacion_${data?.folio || "documento"}.pdf`,
    html2canvas: { scale: 2, backgroundColor: "#ffffff", useCORS: true, allowTaint: true },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
  }).from(el).save();
}
