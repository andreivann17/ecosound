import dayjs from "dayjs";
import { ACTION_CONFIG, SERVICIO_LABEL } from "./constants";

// Eventos antiguos no tienen evento.servicios; se reconstruye desde los
// campos planos legacy (fecha_evento/lugar_evento = sonido, datetime_fotografia = fotografía).
export function resolveServicios(evento) {
  const serviciosArr = Array.isArray(evento?.servicios) ? evento.servicios : [];
  if (serviciosArr.length > 0) return serviciosArr;
  return [
    evento?.fecha_evento || evento?.lugar_evento ? {
      id_servicio: 1,
      fecha: evento.fecha_evento,
      hora_inicio: evento.hora_inicio ? fmtHora(evento.hora_inicio) : null,
      hora_final:  evento.hora_final  ? fmtHora(evento.hora_final)  : null,
      id_ciudad: evento.id_ciudad,
      lugar: evento.lugar_evento,
      id_paquete: evento.id_paquete_sonido,
      comentarios: evento.comentarios,
    } : null,
    evento?.datetime_fotografia || evento?.lugar_fotografia ? {
      id_servicio: 2,
      fecha: evento.datetime_fotografia,
      hora_inicio: evento.datetime_fotografia ? dayjs(evento.datetime_fotografia).format("HH:mm") : null,
      hora_final: null,
      id_ciudad: evento.id_ciudad_fotografia,
      lugar: evento.lugar_fotografia,
      id_paquete: evento.id_paquete_fotografia,
      comentarios: evento.comentarios_fotografia,
    } : null,
  ].filter(Boolean);
}

export function buildServiceLabels(servicios) {
  const countByType = {};
  for (const sv of servicios) {
    countByType[sv.id_servicio] = (countByType[sv.id_servicio] || 0) + 1;
  }
  const seenByType = {};
  const result = {};
  for (const sv of servicios) {
    const base = SERVICIO_LABEL[sv.id_servicio] || "Servicio";
    seenByType[sv.id_servicio] = (seenByType[sv.id_servicio] || 0) + 1;
    result[sv.id_evento_servicio] = countByType[sv.id_servicio] > 1
      ? `${base} #${seenByType[sv.id_servicio]}`
      : base;
  }
  return result;
}

export const fmtMoney = (val) => {
  if (!val && val !== 0) return "—";
  const n = parseFloat(String(val).replace(/,/g, ""));
  if (isNaN(n)) return String(val);
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
};

export const fmtFecha = (v) => {
  if (!v) return "—";
  const d = dayjs(v);
  return d.isValid() ? d.format("D [de] MMMM [del] YYYY") : "—";
};

export const fmtFechaCorta = (v) => {
  if (!v) return "—";
  const d = dayjs(v);
  return d.isValid() ? d.format("D MMM YYYY") : "—";
};

export const fmtHora = (v) => {
  if (!v) return "—";
  if (String(v).length <= 5) return v;
  const d = dayjs(v);
  return d.isValid() ? d.format("HH:mm") : v;
};

export const fmtDatetime = (v) => {
  if (!v) return "—";
  const d = dayjs(v);
  return d.isValid() ? d.format("DD/MM/YYYY, HH:mm") : "—";
};

export const parseNum = (v) => {
  const n = parseFloat(String(v || "").replace(/,/g, ""));
  return isNaN(n) ? 0 : n;
};

export const getFileExt = (filename) =>
  (filename || "").split(".").pop().toLowerCase();

export const getFileType = (filename) => {
  const ext = getFileExt(filename);
  if (["pdf"].includes(ext)) return "pdf";
  if (["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(ext)) return "image";
  if (["doc", "docx"].includes(ext)) return "word";
  if (["xls", "xlsx", "csv"].includes(ext)) return "excel";
  return "other";
};

export const getActionConfig = (action) =>
  ACTION_CONFIG[action] || { label: action, color: "#595c5e", bg: "#f1f5f9" };
