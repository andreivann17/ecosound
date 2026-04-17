// src/pages/materias/laboral/LaboralProcedimientoPage/useExpedientesProcedimiento.js

import { useEffect, useMemo } from "react";
import dayjs from "dayjs";

export default function useExpedientesProcedimiento({
  concSlice,
  search,
  statusFilter,
  activosSubFilter,        // ✅ NUEVO
  concluidosSubFilter,
  conveniosSubFilter,
  fueroFilter,
  empresaFilter,
  dateRange,
  currentPage,
  pageSize,
  setCurrentPage,
}) {
  const expedientesItems = useMemo(() => {
    const raw = concSlice?.data;
    if (Array.isArray(raw)) return raw;
    if (raw && Array.isArray(raw.items)) return raw.items;
    return [];
  }, [concSlice]);


  const norm = (s) =>
    String(s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

const getRawStatus = (exp) => {
  if (Number(exp?.is_constancia_documento) === 1) {
    return norm("cumplimiento_convenio");
  }

  return norm(exp?.status_nombre || exp?.status || exp?.estatus || "");
};
const isActivoStatus = (exp) => getRawStatus(exp).includes("activo");

// ojo: “difer”, “diferimiento”, “diferido” caen aquí
const isDiferimientoStatus = (exp) => {
  const raw = getRawStatus(exp);
  return raw.includes("difer");
};

// ✅ Activos (card principal) = Activo + Diferimiento
const isActivoOrDiferimiento = (exp) => isActivoStatus(exp) || isDiferimientoStatus(exp);

// ✅ Regla que pediste:
// - Activo => primera audiencia
// - Diferimiento => subsecuente
const getActivoBucket = (exp) => {
  if (isDiferimientoStatus(exp)) return "subsecuente";
  if (isActivoStatus(exp)) return "primera";
  return "otros";
};
const isConstancia = (exp) => Number(exp?.is_constancia_documento) === 1;
const isConvenioDoc = (exp) => Number(exp?.is_constancia_documento) === 0;


// ✅ audiencias: 0 => primera, >=1 => subsecuente
const getAudienciasCount = (exp) => {
  // intenta campos comunes
  const direct =
    exp?.audiencias_count ??
    exp?.num_audiencias ??
    exp?.total_audiencias ??
    exp?.audiencia_count ??
    exp?.cantidad_audiencias;

  if (Number.isFinite(Number(direct))) return Number(direct);

  // array de audiencias
  if (Array.isArray(exp?.audiencias)) return exp.audiencias.length;
  if (Array.isArray(exp?.lista_audiencias)) return exp.lista_audiencias.length;
  if (Array.isArray(exp?.historial_audiencias)) return exp.historial_audiencias.length;

  // fallback final: si tienes “numero_audiencia” o “audiencia_actual”
  const n1 = exp?.numero_audiencia ?? exp?.audiencia_actual ?? exp?.num_audiencia;
  if (Number.isFinite(Number(n1))) return Number(n1);

  // si no hay dato, asume 0 (para no inflar subsecuentes)
  return 0;
};

const isActivoPrimera = (exp) => getAudienciasCount(exp) === 0;
const isActivoSubsecuente = (exp) => getAudienciasCount(exp) >= 1;
const isCumplimientoConvenio = (exp) => {
  const raw = getRawStatus(exp);
  const idst = Number(exp?.id_conciliacion_status);

  // En tu JSON: "cumplimiento_convenio", id_conciliacion_status=7
  if (idst === 7) return true;
  if (raw.includes("cumplimiento")) return true;
  if (raw === "cumplimiento_convenio") return true;

  return false;
};
// ✅ “Constancia” de la sección convenios = is_constancia_documento==1
//    + también “cumplimiento” (status 7 / 'cumpl') debe caer aquí
const isConstanciaDeConvenio = (exp) => isConstancia(exp) || isCumplimientoConvenio(exp);

// Opcional: blindaje por status (si te preocupa que vengan registros raros)
const isConvenioOrConstancia = (exp) => {
  const v = Number(exp?.is_constancia_documento);
  if (v === 0 || v === 1) return true;

  // fallback por texto / id si llega null/undefined
  const raw = getRawStatus(exp);
  const idst = Number(exp?.id_conciliacion_status ?? -1);

  // aquí puedes ajustar reglas según tu catálogo real
  if (raw.includes("conven")) return true;
  if (raw.includes("constan")) return true;
  if (idst === 6 || idst === 7) return true; // AJUSTA si aplica en tu sistema

  return false;
};


const getConcluidoBucket = (exp) => {
  const raw = getRawStatus(exp);

  // ✅ Constancia SOLO es “cumplimientos” si realmente es cumplimiento
  if (isConstancia(exp) && isCumplimientoConvenio(exp)) return "cumplimientos";

  // ✅ cumplimiento por status/texto aunque no venga is_constancia_documento
  if (isCumplimientoConvenio(exp)) return "cumplimientos";

  if (raw.includes("archivo") && raw.includes("patron")) return "archivo_patron";
  if (raw.includes("archivo") && raw.includes("solicitante")) return "archivo_trabajador";
  if (raw.includes("constancia") && raw.includes("no concili")) return "constancia_no_conciliacion";
  if (raw.includes("no concili")) return "constancia_no_conciliacion";
  if (raw.includes("archivo")) return "archivo_generico";

  return "otros";
};



const isConcluido = (exp) => {
  if (isConstanciaDeConvenio(exp)) return false;

  const bucket = getConcluidoBucket(exp);
  return (
    bucket === "archivo_patron" ||
    bucket === "archivo_trabajador" ||
    bucket === "constancia_no_conciliacion" ||
    bucket === "archivo_generico"
  );
};

const isConvenio = (exp) => {
  // Regla dura:
  // 0 => convenio
  // 1 => constancia (NO convenio)
  if (isConstancia(exp)) return false;
  if (isCumplimientoConvenio(exp)) return false;
  return isConvenioDoc(exp);
};


  const searchedExpedientes = useMemo(() => {
    const term = String(search || "").trim().toLowerCase();

    if (!term) return expedientesItems;

    return expedientesItems.filter((exp) => {
      const campos = [
        exp.expediente,
        exp.expediente_format,
        exp.numero_expediente,
        exp.folio,
        exp.id,

        exp.nombre_trabajador,
        exp.nombre_empresa,

        // ✅ aquí está "JORGE VERA"
        exp.nombre_contacto,

        // útiles para búsquedas reales
        exp.nombre_autoridad,
        exp.nombre_ciudad,
        exp.nombre_estado,

        // razones sociales
        Array.isArray(exp.razones_sociales)
          ? exp.razones_sociales.map((r) => r?.razon_social).join(" / ")
          : "",
      ];

      return campos.some((v) => v && String(v).toLowerCase().includes(term));
    });
  }, [search, expedientesItems]);

const expedientesBase = useMemo(() => {
  let list = [...searchedExpedientes];

  // ===== empresaFilter (id o texto) =====
  const isNumericLike = (v) => {
    if (v === null || v === undefined) return false;
    const s = String(v).trim();
    return s !== "" && !Number.isNaN(Number(s));
  };

  if (empresaFilter) {
    list = list.filter((exp) => {
      const idEmp =
        exp?.id_empresa ??
        exp?.empresa_id ??
        exp?.empresa?.id ??
        exp?.id_empresa_demandada;

      // si viene como id
      if (isNumericLike(empresaFilter)) {
        return String(idEmp ?? "") === String(empresaFilter);
      }

      // si viene como texto
      const nombreEmpresa =
        exp?.nombre_empresa ||
        (Array.isArray(exp?.razones_sociales)
          ? exp.razones_sociales.map((r) => r?.razon_social).join(" / ")
          : "");

      return String(nombreEmpresa || "")
        .toLowerCase()
        .includes(String(empresaFilter).toLowerCase());
    });
  }

  // ===== dateRange (fecha_emision_expediente) =====
  if (dateRange?.[0] && dateRange?.[1]) {
    const from = dayjs(dateRange[0]).startOf("day");
    const to = dayjs(dateRange[1]).endOf("day");

    list = list.filter((exp) => {
      const d = dayjs(exp?.fecha_emision_expediente);
      if (!d.isValid()) return false;
      return (d.isAfter(from) || d.isSame(from)) && (d.isBefore(to) || d.isSame(to));
    });
  }

  return list;
}, [searchedExpedientes, empresaFilter, dateRange]);
const isDatePast = (v) => {
  if (!v) return false;
  const d = dayjs(v);
  if (!d.isValid()) return false;
  return d.isBefore(dayjs(), "day");
};
const isConvenioStatus = (exp) => {
  // regla dura: concluido no es convenio
  if (isConcluidoFlag(exp)) return false;

  const raw = getRawStatus(exp); // ya viene norm + override
  const idst = Number(exp?.id_conciliacion_status);

  // regla dura: cumplimiento/constancia NO es convenio
  if (Number(exp?.is_constancia_documento) === 1) return false;
  if (raw === "cumplimiento_convenio") return false;
  if (raw.includes("cumplimiento")) return false;
  if (idst === 7) return false;

  // convenio real
  if (raw === "convenio") return true;

  // si tienes otros textos tipo "convenio_xxx" (pero no cumplimiento_convenio)
  if (raw.startsWith("convenio")) return true;

  // por id
  if (idst === 2) return true;

  return false;
};
const isConcluidoFlag = (exp) => Number(exp?.is_concluido) === 1;
const isConstanciaConcluidoFlag = (exp) => Number(exp?.is_constancia_documento) === 1;
// “Vencido / anomalía” global (cualquier status)
const isVencidoOrAnomalia = (exp) => {
  const raw = String(getRawStatus(exp) || "").toLowerCase();

  // 🔒 Regla dura: concluido NO es vencido/anomalía
  if (isConcluidoFlag(exp)) return false;

  // 🔒 Regla dura: cumplimiento NO es vencido/anomalía
  const isCumplimiento =
    Number(exp?.is_constancia_documento) === 1 ||
    raw.includes("cumplimiento_convenio");

  if (isCumplimiento) return false;

  // 1) Cumplimiento (por status) pero falta fecha_convenio => anomalía roja
  //    Nota: aquí NO usamos raw.includes("cumpl") porque puede chocar con "cumplimiento_convenio"
  const isStatusCumpl = Number(exp?.id_conciliacion_status) === 7;
  if (isStatusCumpl && !exp?.fecha_convenio) return true;

  // 2) Convenio
  //    - sin fecha_proximo_pago => anomalía
  //    - fecha_proximo_pago pasada => vencido (pago atrasado)
  if (raw.includes("convenio")) {
    if (!exp?.fecha_proximo_pago) return true;
    if (isDatePast(exp?.fecha_proximo_pago)) return true;
  }

  // 3) Activo / Diferido
  //    - sin fecha_proxima_audiencia => anomalía
  //    - audiencia pasada => vencido
  if (raw.includes("activo") || raw.includes("difer")) {
    if (!exp?.fecha_proxima_audiencia) return true;
    if (isDatePast(exp?.fecha_proxima_audiencia)) return true;
  }

  return false;
};
const statusCounts = useMemo(() => {
  const base = {
    // ✅ Activos (card principal) = Activo + Diferimiento
    activos: 0,
    activosPrimera: 0,       // ✅ NUEVO
    activosSubsecuente: 0,   // ✅ NUEVO

    // ✅ Convenios card principal = convenios + constancias (pero NO concluidos)
    convenios: 0,
    conveniosOnly: 0,
    constanciasOnly: 0,

    concluidos: 0,

    // subfiltros concluidos
    cumplimientosConvenio: 0,
    archivoPatron: 0,
    archivoTrabajador: 0,
    constanciaNoConciliacion: 0,

    // vencidos
    vencidos: 0,
  };

  expedientesBase.forEach((exp) => {
    if (isVencidoOrAnomalia(exp)) base.vencidos += 1;

    // ✅ ACTIVO / DIFERIMIENTO (se van al bloque Activos)
    if (isActivoOrDiferimiento(exp)) {
      base.activos += 1;

      const b = getActivoBucket(exp);
      if (b === "primera") base.activosPrimera += 1;
      if (b === "subsecuente") base.activosSubsecuente += 1;
      return;
    }

    // ✅ CONCLUIDOS
    if (isConcluido(exp)) {
      base.concluidos += 1;

      const bucket = getConcluidoBucket(exp);
      if (bucket === "cumplimientos") base.cumplimientosConvenio += 1;
      else if (bucket === "archivo_patron") base.archivoPatron += 1;
      else if (bucket === "archivo_trabajador") base.archivoTrabajador += 1;
      else if (bucket === "constancia_no_conciliacion") base.constanciaNoConciliacion += 1;

      return;
    }

    // ✅ CONVENIOS / CONSTANCIAS (pero NO cumplimiento)
    // convenio “normal”
  // ✅ Convenios (incluye Convenio + Cumplimiento)
if (isCumplimientoConvenio(exp)) {
  base.convenios += 1;
  base.constanciasOnly += 1;  // “cumplimientos/constancias”
  return;
}

if (isConvenioStatus(exp)) {
  base.convenios += 1;
  base.conveniosOnly += 1;
  return;
}
  });

  return base;
}, [expedientesBase]);
  const filteredExpedientes = useMemo(() => {
    let list = [...expedientesBase];

    if (statusFilter !== "todos") {
  list = list.filter((exp) => {
    const raw = getRawStatus(exp);

    if (statusFilter === "vencidos") return isVencidoOrAnomalia(exp);

    if (statusFilter === "activos") {
  if (!isActivoOrDiferimiento(exp)) return false;

  if (!activosSubFilter || activosSubFilter === "todos") return true;

  const b = getActivoBucket(exp);
  if (activosSubFilter === "primera") return b === "primera";
  if (activosSubFilter === "subsecuente") return b === "subsecuente";

  return true;
}
    if (statusFilter === "diferidos") return raw.includes("difer");
   if (statusFilter === "convenios") {
  if (!conveniosSubFilter || conveniosSubFilter === "todos") {
    return isConvenioStatus(exp) || isCumplimientoConvenio(exp);
  }

  if (conveniosSubFilter === "convenio") return isConvenioStatus(exp);
  if (conveniosSubFilter === "constancia") return isCumplimientoConvenio(exp);

  return true;
}

    if (statusFilter === "concluidos") {
      const bucket = getConcluidoBucket(exp);

      if (!isConcluido(exp)) return false;

      if (!concluidosSubFilter || concluidosSubFilter === "todos") return true;

      if (concluidosSubFilter === "cumplimientos") return bucket === "cumplimientos";
      if (concluidosSubFilter === "archivo_patron") return bucket === "archivo_patron";
      if (concluidosSubFilter === "archivo_trabajador") return bucket === "archivo_trabajador";
      if (concluidosSubFilter === "constancia_no_conciliacion")
        return bucket === "constancia_no_conciliacion";

      return true;
    }

    return true;
  });
}

    if (fueroFilter !== "todos") {
      list = list.filter((exp) => {
        const raw = `${exp.competencia || exp.fuero || exp.tipo_competencia || ""}`.toLowerCase();
        if (fueroFilter === "local") return raw.includes("local");
        if (fueroFilter === "federal") return raw.includes("federal");
        return true;
      });
    }

    const isNumericLike = (v) => {
      if (v === null || v === undefined) return false;
      const s = String(v).trim();
      return s !== "" && !Number.isNaN(Number(s));
    };

    if (empresaFilter) {
      list = list.filter((exp) => {
        const idEmp =
          exp.id_empresa ??
          exp.empresa_id ??
          exp.empresa?.id ??
          exp.id_empresa_demandada;

        if (isNumericLike(empresaFilter)) {
          return String(idEmp) === String(empresaFilter);
        }

        const nombre =
          exp.nombre_empresa ||
          (Array.isArray(exp.razones_sociales)
            ? exp.razones_sociales.map((r) => r?.razon_social).join(" / ")
            : "");

        return String(nombre).toLowerCase().includes(String(empresaFilter).toLowerCase());
      });
    }

    return list;
}, [
  searchedExpedientes,
  statusFilter,
  activosSubFilter,        // ✅
  concluidosSubFilter,
  conveniosSubFilter,
  fueroFilter,
  empresaFilter,
  dateRange,
]);



useEffect(() => {
  setCurrentPage(1);
}, [search, statusFilter, activosSubFilter, concluidosSubFilter, conveniosSubFilter, fueroFilter, empresaFilter, dateRange]);
  useEffect(() => {
    const total = filteredExpedientes.length;
    const maxPage = Math.max(1, Math.ceil(total / pageSize));

    if (currentPage > maxPage) {
      setCurrentPage(1); // o setCurrentPage(maxPage) si prefieres
    }
  }, [filteredExpedientes.length, pageSize, currentPage, setCurrentPage]);

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
