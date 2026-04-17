// src/components/tribunal/FormTribunal/formTribunal.helpers.js

export const collapseSpaces = (s) => String(s || "").replace(/\s+/g, " ").trim();

export const toArray = (v) => {
  if (Array.isArray(v)) return v.filter((x) => x != null && String(x).trim() !== "");
  if (v == null || String(v).trim() === "") return [];
  return [v];
};

export const normLabel = (txt) => collapseSpaces(txt || "").trim().toLowerCase();

export const isEmpty = (v) => {
  if (v === null || v === undefined) return true;
  if (typeof v === "string") return collapseSpaces(v) === "";
  return false;
};

export const isValidISODate = (s) => {
  if (!s || typeof s !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + "T00:00:00");
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};

export const toNum = (v) => {
  if (v === null || v === undefined) return NaN;
  const s = String(v).trim();
  if (s === "") return NaN;
  return Number(s);
};

export const anyTrue = (obj) => {
  if (!obj || typeof obj !== "object") return false;
  return Object.values(obj).some((v) => v === true);
};

export const makeNewSelectValue = (label) => {
  const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  return `__new__:${id}:${label}`;
};

export const buildExpedienteOptionLabel = (it) => {
  const exp = collapseSpaces(it?.expediente || it?.expediente_format || "");
  const trabajador = collapseSpaces(it?.nombre_trabajador || it?.trabajador_nombre || it?.nombre_parte_actora || "");
  const empresa = collapseSpaces(it?.nombre_empresa || it?.empresa_nombre || it?.empresa || "");

  const titulo = exp || collapseSpaces(it?.num_unico || it?.numero_unico || it?.identificador || "") || "Expediente";
  const linea2 = `${trabajador || "—"} vs ${empresa || "—"}`;

  return (
    <div>
      <div style={{ fontWeight: 600 }}>{titulo}</div>
      <div style={{ fontSize: 12, color: "#6b7280", whiteSpace: "normal" }}>{linea2}</div>
      <div style={{ fontSize: 12, color: "#9ca3af" }}>{exp ? `Expediente: ${exp}` : ""}</div>
    </div>
  );
};