// src/pages/materias/laboral/helpers/laboralExpedienteFormatters.js
import dayjs from "dayjs";

export const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

export const fmtDateTime = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

export const statusColor = (id) => {
  const map = {
    1: "processing",
    2: "success",
    3: "warning",
    4: "default",
    5: "error",
  };
  return map[id] || "default";
};

export const getRazonesSocialesText = (exp) => {
  if (Array.isArray(exp.razones_sociales) && exp.razones_sociales.length) {
    return exp.razones_sociales.map((r) => r.razon_social).join(" / ");
  }
  return exp.nombre_empresa || "Sin razón social";
};

export const getProximaAudiencia = (detalle) => {
  if (!detalle) return null;

  return dayjs(
    detalle.fecha_cita_audiencia ||
      detalle.fecha_audiencia ||
      detalle.fecha_proxima_audiencia ||
      detalle.fecha_audiencia_inicial
  ).format("DD [de] MMMM [de] YYYY HH:mm");
};

export const getTipoLaboralLabel = (detalle) => {
  if (!detalle) return "Materia laboral";

  return (
    detalle.tipo_laboral ||
    detalle.origen_expediente ||
    detalle.tipo_expediente ||
    (detalle.nombre_autoridad &&
    detalle.nombre_autoridad
      .toLowerCase()
      .includes("centro de conciliación")
      ? "Centro de conciliación"
      : detalle.nombre_autoridad &&
        detalle.nombre_autoridad.toLowerCase().includes("tribunal")
      ? "Tribunal laboral"
      : "Materia laboral")
  );
};
