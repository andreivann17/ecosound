// Fetches empresa config (name + logo as base64) and caches it for the session.

import { PATH } from "../../redux/utils";

let _cache = null;

export async function getEmpresaConfig() {
  if (_cache) return _cache;
  try {
    const token = localStorage.getItem("tokenadmin") || localStorage.getItem("token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await fetch(`${PATH}/general/empresa`, { headers });
    if (!res.ok) throw new Error("no empresa");
    const d = await res.json();

    let logoDataUrl = null;
    if (d.path) {
      try {
        const imgRes = await fetch(`${PATH}/${d.path}`);
        const buf = await imgRes.arrayBuffer();
        const bytes = new Uint8Array(buf);
        let bin = "";
        bytes.forEach((b) => (bin += String.fromCharCode(b)));
        const ct = imgRes.headers.get("content-type") || "image/jpeg";
        logoDataUrl = `data:${ct};base64,${btoa(bin)}`;
      } catch { /* logo stays null */ }
    }

    _cache = { nombre: d.nombre_empresa || "", logoDataUrl };
    return _cache;
  } catch {
    return { nombre: "", logoDataUrl: null };
  }
}

// Invalidate cache (call after saving empresa config)
export function clearEmpresaConfigCache() {
  _cache = null;
}

// Returns the brand HTML block for PDF headers
export function empresaBrandHtml(empresa) {
  const nombre = String(empresa?.nombre || "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const logo = empresa?.logoDataUrl;

  if (logo && nombre) {
    return `<div style="display:flex;align-items:center;gap:10px;">
      <img src="${logo}" style="height:44px;width:auto;max-width:140px;object-fit:contain;display:block;" alt="logo"/>
      <div style="font-size:14pt;font-weight:800;color:#111;letter-spacing:-0.3px;line-height:1.2;">${nombre}</div>
    </div>`;
  }
  if (logo) {
    return `<img src="${logo}" style="height:48px;width:auto;max-width:160px;object-fit:contain;display:block;" alt="logo"/>`;
  }
  if (nombre) {
    return `<div style="font-size:22pt;font-weight:800;color:#111;letter-spacing:-0.5px;">${nombre}</div>`;
  }
  return `<div style="font-size:22pt;font-weight:800;color:#111;letter-spacing:-0.5px;">HerrSoft Events</div>`;
}
