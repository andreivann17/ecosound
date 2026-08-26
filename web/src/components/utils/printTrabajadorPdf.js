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

const capWords = (s) => {
  const t = String(s ?? "").trim();
  if (!t) return "—";
  return t.toLowerCase().split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
};

const capFecha = (s) =>
  String(s ?? "").replace(
    /\b(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)\b/gi,
    (m) => m.charAt(0).toUpperCase() + m.slice(1).toLowerCase()
  );

// Carga una imagen remota (misma app, distinto puerto en local) a través de
// <img>+<canvas> — más robusto en el navegador que fetch()+arrayBuffer, que
// puede fallar en silencio si el service worker (sw.js) intercepta la
// petición cross-origin. Trae cache-busting para evitar respuestas cacheadas
// vacías/erróneas del service worker.
function loadImageViaCanvas(url) {
  return new Promise((resolve) => {
    if (!url) return resolve(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || 1;
        canvas.height = img.naturalHeight || 1;
        canvas.getContext("2d").drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/jpeg", 0.92));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    const bust = url.includes("?") ? "&" : "?";
    img.src = `${url}${bust}_=${Date.now()}`;
  });
}

// Respaldo por si el canvas falla (p. ej. canvas "tainted"): trae los bytes
// directo por fetch y los codifica a base64.
async function fetchImageAsDataUrl(url) {
  if (!url) return null;
  const viaCanvas = await loadImageViaCanvas(url);
  if (viaCanvas) return viaCanvas;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("no image");
    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let bin = "";
    bytes.forEach((b) => (bin += String.fromCharCode(b)));
    const ct = res.headers.get("content-type") || "image/jpeg";
    return `data:${ct};base64,${btoa(bin)}`;
  } catch {
    return null;
  }
}

const BLUE = "#01369e";

function buildHtml(data) {
  const {
    idTrabajador, nombre, apellido, nombrePuesto, fechaNacimiento, fechaRegistro,
    fotoDataUrl, proximosEventos = [], logo, nombre_empresa,
  } = data || {};

  const fecha = dayjs().format("DD/MM/YYYY");
  const nombreCompleto = capWords(`${nombre || ""} ${apellido || ""}`.trim());

  const filasEventos = (proximosEventos || []).map((ev, i) => {
    const fechaEv = ev.fecha_evento ? dayjs(ev.fecha_evento).format("D MMM YYYY") : "—";
    const inicio = ev.fecha_inicio ? dayjs(ev.fecha_inicio).format("HH:mm") : (ev.hora_inicio || null);
    const final = ev.fecha_final ? dayjs(ev.fecha_final).format("HH:mm") : (ev.hora_final || null);
    const horario = inicio && final ? `${inicio} – ${final}` : (inicio || final || "—");
    return `
    <tr>
      <td class="n">${i + 1}</td>
      <td>${e(capFecha(fechaEv))}</td>
      <td class="bold">${e(capWords(ev.cliente_nombre))}</td>
      <td>${e(cap(ev.nombre_puesto_evento))}</td>
      <td>${e(horario)}</td>
    </tr>`;
  }).join("");

  const logoTag = logo
    ? `<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
        <img src="${e(logo)}" style="height:52px;width:auto;max-width:140px;object-fit:contain;display:block;" alt="logo"/>
        ${nombre_empresa ? `<div style="font-size:15pt;font-weight:900;line-height:1.2;color:#fff;">${e(nombre_empresa)}</div>` : ""}
      </div>`
    : `<div style="font-size:17pt;font-weight:900;line-height:1;margin-bottom:6px;letter-spacing:-.5px;">${nombre_empresa ? e(nombre_empresa) : "HerrSoft<br/>Events"}</div>`;

  const fotoTag = fotoDataUrl
    ? `<img src="${e(fotoDataUrl)}" style="width:100%;height:100%;object-fit:cover;display:block;" alt="foto"/>`
    : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:26pt;font-weight:900;color:#94a3b8;background:#eef2f7;">${e(
        ((nombre || " ")[0] || "").toUpperCase() + ((apellido || " ")[0] || "").toUpperCase()
      )}</div>`;

  const css = `
* { box-sizing:border-box; margin:0; padding:0; }
html,body { background:#f0f2f5; color:#1b1b1d; font-family:"Noto Sans","Helvetica Neue",Helvetica,Arial,sans-serif; font-size:10pt; }
.page { width:176mm; margin:0 auto; background:#fff; }

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
.head-addr { font-size:8.5pt; line-height:1.55; opacity:.92; margin-top:4px; }
.head-right { text-align:right; display:flex; flex-direction:column; align-items:flex-end; gap:0; }
.doc-num { font-size:26pt; font-weight:900; letter-spacing:2px; line-height:1; text-transform:uppercase; margin-bottom:8px; }
.doc-folio {
  display:inline-flex; align-items:center; gap:6px;
  background:rgba(255,255,255,0.18); border:1.5px solid rgba(255,255,255,0.45);
  border-radius:6px; padding:5px 14px; font-size:9pt; letter-spacing:.3px; margin-bottom:14px;
}
.doc-folio span { font-weight:900; letter-spacing:2.5px; font-size:9.5pt; }
.head-divider { width:100%; height:1px; background:rgba(255,255,255,0.3); margin-bottom:12px; }
.meta { display:flex; flex-direction:column; gap:5px; }
.meta-row { display:flex; justify-content:flex-end; align-items:baseline; gap:8px; }
.mk { font-size:7.5pt; font-weight:600; letter-spacing:.8px; text-transform:uppercase; opacity:.75; white-space:nowrap; }
.mv { font-size:9.5pt; font-weight:800; white-space:nowrap; }

.body { padding:22px 28px 0; }
.sep { height:3px; background:${BLUE}; width:80px; border-radius:3px; margin-bottom:18px; }
.profile { display:flex; gap:20px; align-items:flex-start; margin-bottom:24px; }
.profile-photo { width:100px; height:120px; border-radius:8px; overflow:hidden; border:1px solid #e2e8f0; flex-shrink:0; }
.profile-fields { display:grid; grid-template-columns:1fr 1fr; gap:14px 24px; flex:1; }
.dlabel { font-size:7.5pt; font-weight:800; letter-spacing:.6px; text-transform:uppercase; color:#8a93a3; margin-bottom:3px; }
.dvalue { font-size:11pt; font-weight:700; color:#0d1b4b; }

table { width:100%; border-collapse:collapse; font-size:9pt; }
thead th {
  background:${BLUE}; color:#fff; padding:10px 10px; text-align:left; font-weight:700;
  font-size:8pt; letter-spacing:.4px; text-transform:uppercase; border:1px solid ${BLUE};
}
tbody td { padding:8px 10px; border:1px solid #c8d1dc; color:#222; vertical-align:middle; }
td.n { width:28px; text-align:center; color:#8a93a3; font-weight:700; }
td.bold { font-weight:700; color:#0d1b4b; }
.empty-note { padding:16px 0; color:#8a93a3; font-size:9pt; text-align:center; border:1px dashed #c8d1dc; border-radius:8px; }

.foot { padding:14px 28px 28px; }
.gen-note { font-size:8pt; color:#94a3b8; margin-top:20px; }

@media print {
  html,body,page { background:#fff !important; }
  .head,thead th { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  tr { page-break-inside:avoid; }
}`;

  return `<!doctype html><html lang="es"><head><meta charset="utf-8"/>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet">
<title>Ficha ${e(nombreCompleto)}</title>
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
      <div class="doc-num">FICHA</div>
      <div class="doc-folio">ID:&nbsp;<span>#${e(idTrabajador || "—")}</span></div>
      <div class="head-divider"></div>
      <div class="meta">
        <div class="meta-row"><span class="mk">Fecha</span><span class="mv">${e(fecha)}</span></div>
        <div class="meta-row"><span class="mk">Nombre</span><span class="mv">${e(nombreCompleto)}</span></div>
        <div class="meta-row"><span class="mk">Puesto</span><span class="mv">${e(cap(nombrePuesto))}</span></div>
      </div>
    </div>
  </div>

  <div class="body">
    <div class="sep"></div>

    <div class="profile">
      <div class="profile-photo">${fotoTag}</div>
      <div class="profile-fields">
        <div>
          <div class="dlabel">Nombre</div>
          <div class="dvalue">${e(cap(nombre))}</div>
        </div>
        <div>
          <div class="dlabel">Apellido</div>
          <div class="dvalue">${e(cap(apellido))}</div>
        </div>
        <div>
          <div class="dlabel">Puesto</div>
          <div class="dvalue">${e(cap(nombrePuesto))}</div>
        </div>
        <div>
          <div class="dlabel">Fecha de nacimiento</div>
          <div class="dvalue">${fechaNacimiento ? e(capFecha(dayjs(fechaNacimiento).format("D MMM YYYY"))) : "—"}</div>
        </div>
        <div>
          <div class="dlabel">Fecha de registro</div>
          <div class="dvalue">${fechaRegistro ? e(capFecha(dayjs(fechaRegistro).format("D MMM YYYY"))) : "—"}</div>
        </div>
      </div>
    </div>

    <div class="dlabel" style="margin-bottom:10px;">Próximos eventos</div>
    ${
      proximosEventos.length > 0
        ? `<table>
      <thead><tr>
        <th style="width:28px">#</th>
        <th style="width:20%">Fecha</th>
        <th style="width:32%">Cliente</th>
        <th style="width:20%">Puesto</th>
        <th>Horario</th>
      </tr></thead>
      <tbody>${filasEventos}</tbody>
    </table>`
        : `<div class="empty-note">Sin eventos próximos registrados</div>`
    }
  </div>

  <div class="foot">
    <div class="gen-note">Documento generado automáticamente el ${e(fecha)}.</div>
  </div>

</div>
</body></html>`;
}

export async function previewTrabajadorPdf(data) {
  const empresa = await getEmpresaConfig();
  const fotoDataUrl = await fetchImageAsDataUrl(data?.fotoUrl);
  return buildHtml({ ...data, fotoDataUrl, logo: empresa.logoDataUrl, nombre_empresa: empresa.nombre });
}

export async function printTrabajadorPdf(data) {
  const empresa = await getEmpresaConfig();
  const fotoDataUrl = await fetchImageAsDataUrl(data?.fotoUrl);
  const html = buildHtml({ ...data, fotoDataUrl, logo: empresa.logoDataUrl, nombre_empresa: empresa.nombre });
  const el = document.createElement("div");
  el.innerHTML = html;
  html2pdf().set({
    margin: [8, 16, 8, 16],
    filename: `trabajador_${data?.idTrabajador || "ficha"}.pdf`,
    html2canvas: { scale: 2, backgroundColor: "#ffffff", useCORS: true, allowTaint: true },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
  }).from(el).save();
}
