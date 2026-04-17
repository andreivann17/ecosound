// src/pages/materias/laboral/LaboralProcedimientoPage/materias/laboral/useTribunalProcedimiento.js

import { useEffect, useMemo } from "react";
import dayjs from "dayjs";

export default function useTribunalProcedimiento({
  concSlice,
  search,
  statusFilter, // "todos" | "conCitatorio" | "sinCitatorio" | "conAudiencia" | "sinAudiencia" | "conLimite"
  dateRange,
  currentPage,
  pageSize,
  setCurrentPage,
}) {
  const expedientesItems = useMemo(() => {
    const raw = concSlice?.data ?? concSlice;
    if (Array.isArray(raw)) return raw;
    if (raw && Array.isArray(raw.items)) return raw.items;
    if (raw?.items && Array.isArray(raw.items.items)) return raw.items.items;
    return [];
  }, [concSlice]);

const searchedExpedientes = useMemo(() => {
  const term = String(search || "").trim().toLowerCase();
  if (!term) return expedientesItems;

  return expedientesItems.filter((exp) => {
    const razonesSociales = Array.isArray(exp?.razones_sociales)
      ? exp.razones_sociales.map((r) => r?.razon_social).filter(Boolean).join(" ")
      : "";

    const campos = [
      exp.expediente,
      exp.numero_expediente,
      exp.expediente_anterior,
      exp.corresponsal,
      exp.nombre_trabajador,
      exp.nombre_parte_actora,
      exp.accion_intentada,
      exp.nombre_autoridad,
      exp.nombre_ciudad,
      exp.nombre_estado,
      exp.empresa_nombre,
      razonesSociales,
      exp.id,
      exp.code,
    ];

    return campos.some((v) => v && String(v).toLowerCase().includes(term));
  });
}, [search, expedientesItems]);

const baseForCounts = useMemo(() => {
  let list = [...searchedExpedientes];

  if (dateRange && dateRange.length === 2) {
    const [start, end] = dateRange;

    list = list.filter((exp) => {
      const candidates = [
        exp.fecha_recepcion_demanda,
        exp.fecha_limite_contestacion,
        exp.fecha_audiencia_conciliadora,
        exp.datetime,
      ].filter(Boolean);

      if (!candidates.length) return false;

      return candidates.some((fechaRaw) => {
        const d = dayjs(fechaRaw);
        if (!d.isValid()) return false;
        const afterStart = d.isSame(start, "day") || d.isAfter(start, "day");
        const beforeEnd = d.isSame(end, "day") || d.isBefore(end, "day");
        return afterStart && beforeEnd;
      });
    });
  }

  return list;
}, [searchedExpedientes, dateRange]);

const statusCounts = useMemo(() => {
  const base = {
    proximasAudiencias: 0,
    terminosCriticos: 0,
    pendientesNotificar: 0,
    sinActividad15d: 0,
  };

  const today = dayjs().startOf("day");
  const critDays = 7;

  baseForCounts.forEach((exp) => {
    const active = !(exp?.active === 0 || exp?.active === "0");

    const doc = exp?.id_tribunal_documento_citatorio;
    const hasCitatorio = doc !== null && doc !== undefined && Number(doc) !== 0;

    // Pendientes de notificar = sin citatorio y activo
    if (active && !hasCitatorio) base.pendientesNotificar += 1;

    // Próximas audiencias = audiencia válida y hoy o futura
    if (exp?.fecha_audiencia_conciliadora) {
      const a = dayjs(exp.fecha_audiencia_conciliadora).startOf("day");
      if (a.isValid() && (a.isSame(today) || a.isAfter(today))) base.proximasAudiencias += 1;
    }

    // Términos críticos = límite dentro de 7 días (no vencido) y activo
    if (active && exp?.fecha_limite_contestacion) {
      const l = dayjs(exp.fecha_limite_contestacion).startOf("day");
      if (l.isValid() && (l.isSame(today) || l.isAfter(today))) {
        const diff = l.diff(today, "day");
        if (diff <= critDays) base.terminosCriticos += 1;
      }
    }

    // Sin actividad 15d+ = datetime (última actividad) <= hoy-15
    if (exp?.datetime) {
      const last = dayjs(exp.datetime).startOf("day");
      if (last.isValid()) {
        const diff = today.diff(last, "day");
        if (diff >= 15) base.sinActividad15d += 1;
      }
    }
  });

  return base;
}, [baseForCounts]);


  const filteredExpedientes = useMemo(() => {
    let list = [...searchedExpedientes];

    // segment filter (tribunal)
    if (statusFilter && statusFilter !== "todos") {
      list = list.filter((exp) => {
        const doc = exp.id_tribunal_documento_citatorio;
        const hasCitatorio = doc !== null && doc !== undefined && Number(doc) !== 0;

        if (statusFilter === "conCitatorio") return hasCitatorio;
        if (statusFilter === "sinCitatorio") return !hasCitatorio;
        if (statusFilter === "conAudiencia") return !!exp.fecha_audiencia_conciliadora;
        if (statusFilter === "sinAudiencia") return !exp.fecha_audiencia_conciliadora;
        if (statusFilter === "conLimite") return !!exp.fecha_limite_contestacion;
        return true;
      });
    }

    // date range: match si cualquiera de estas fechas cae dentro
    if (dateRange && dateRange.length === 2) {
      const [start, end] = dateRange;
      list = list.filter((exp) => {
        const candidates = [
          exp.fecha_recepcion_demanda,
          exp.fecha_limite_contestacion,
          exp.fecha_audiencia_conciliadora,
          exp.datetime,
        ].filter(Boolean);

        if (!candidates.length) return false;

        return candidates.some((fechaRaw) => {
          const d = dayjs(fechaRaw);
          if (!d.isValid()) return false;

          const afterStart = d.isSame(start, "day") || d.isAfter(start, "day");
          const beforeEnd = d.isSame(end, "day") || d.isBefore(end, "day");
          return afterStart && beforeEnd;
        });
      });
    }

    return list;
  }, [searchedExpedientes, statusFilter, dateRange]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, dateRange, setCurrentPage]);

  const paginatedExpedientes = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredExpedientes.slice(start, start + pageSize);
  }, [filteredExpedientes, currentPage, pageSize]);

  return {
    statusCounts,
    filteredExpedientes,
    paginatedExpedientes,
    totalExp: filteredExpedientes.length,
  };
}
