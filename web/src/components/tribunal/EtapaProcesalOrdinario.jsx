import React, { useMemo, useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Upload, notification, DatePicker, Button, InputNumber } from "antd";
import dayjs from "dayjs";

import {
  actionEtapaUploadDocumento,
  actionEtapaDeleteDocumento,
  actionEtapaMarcarCompletada,
  actionTribunalDocumentosGetById,
  actionTribunalEtapaUpdateTerminos,
} from "../../redux/actions/tribunal/tribunal";
import "./EtapaProcesalOrdinario.css";

const getExt = (name = "") => {
  const s = String(name);
  const i = s.lastIndexOf(".");
  return i >= 0 ? s.slice(i + 1).toLowerCase() : "";
};

const formatWhen = (iso) => {
  if (!iso) return "—";
  return String(iso).replace("T", " ").slice(0, 16);
};

const toDayjsOrNull = (v) => {
  if (!v) return null;
  const d = dayjs(v);
  return d.isValid() ? d : null;
};

export default function EtapaProcesalOrdinario({
  expedienteId,
  fase: initialFase = "ESCRITA",
  fechaBaseTermino = null,
  diasLimiteProp=null,
  fechaNotificacionDemandaProp = null,
  fechaUltimoDiaLaboradoProp = null,
  fechaEmisionCitatorioProp = null,
  fechaConstanciaConciliacionProp = null,
  fechaRadicacionProp = null,
  fechaLimiteContestacion = null,
  etapaNumero = 5,
  etapaNombre = "Contestación",
  descripcionEtapa = "El demandado debe presentar su contestación a la demanda, oponiendo excepciones y defensas, y ofreciendo pruebas. Este paso es crítico para la defensa patronal.",
  fechaLimiteLabel = "Límite: —",
  diasLabel = "—",
  progresoPct = 70,

  etapasInfo = null,
}) {
  const dispatch = useDispatch();
  const [fase, setFase] = useState(initialFase);
  const [etapaSeleccionada, setEtapaSeleccionada] = useState(etapaNumero);

  // UI términos
  const [fechaNotificacionDemanda, setFechaNotificacionDemanda] = useState(null);
  const [loadingTerminos, setLoadingTerminos] = useState(false);

  // edición/guardado
  const [isEditTerminos, setIsEditTerminos] = useState(true);
  const [diasHabiles, setDiasHabiles] = useState(null);
  const [fechaLimiteCalc, setFechaLimiteCalc] = useState(null); // dayjs o null

  // response backend
  const documentosResp = useSelector((s) => s.tribunal?.documentos);

  // documentos siguen en items[]
  const items = documentosResp?.items || [];

  // etapas nuevas en etapas[]
  const etapas = documentosResp?.etapas || [];

  useEffect(() => {
    if (expedienteId) {
      dispatch(actionTribunalDocumentosGetById(expedienteId));
    }
  }, [dispatch, expedienteId]);

  // ====== helpers días hábiles ======
  const isWeekend = (d) => {
    const day = d.day(); // 0 dom, 6 sáb
    return day === 0 || day === 6;
  };

  const addBusinessDays = (start, businessDays) => {
    if (!start || !Number.isFinite(Number(businessDays))) return null;

    let d = dayjs(start).startOf("day");
    let remaining = Number(businessDays);

    while (remaining > 0) {
      d = d.add(1, "day");
      if (!isWeekend(d)) remaining -= 1;
    }
    return d;
  };

  const businessDaysLeftExclusive = (from, to) => {
    if (!from || !to) return null;

    const a = dayjs(from).startOf("day");
    const b = dayjs(to).startOf("day");

    if (b.isSame(a, "day") || b.isBefore(a, "day")) return 0;

    let count = 0;
    let d = a.add(1, "day");

    while (d.isBefore(b, "day") || d.isSame(b, "day")) {
      if (!isWeekend(d)) count += 1;
      d = d.add(1, "day");
    }
    return count;
  };
useEffect(() => {
  setFase(initialFase);
}, [initialFase]);
  // ====== MAP etapas por num_etapa para leer términos ======
  const etapasByNum = useMemo(() => {
    const m = {};
    for (const e of Array.isArray(etapas) ? etapas : []) {
      const n = Number(e?.num_etapa);
      if (!Number.isFinite(n)) continue;
      m[n] = e;
    }
    return m;
  }, [etapas]);
const etapasConFechaAuto = [5, 6, 7];
const etapasConDocsSeparados = [5, 6, 7];

const usaFechaAuto = etapasConFechaAuto.includes(Number(etapaSeleccionada));
const usaDocsSeparados = etapasConDocsSeparados.includes(Number(etapaSeleccionada));
  // ====== cuando cambia etapaSeleccionada o llegan etapas, cargar términos en UI ======
useEffect(() => {
  const etapaNum = Number(etapaSeleccionada);
  const e = etapasByNum?.[etapaNum];

  if (etapaNum === 1) {
    const fBase = toDayjsOrNull(fechaBaseTermino);
    const dHab = e?.dias_habiles;

    setFechaNotificacionDemanda(fBase);
    setDiasHabiles(Number.isFinite(Number(dHab)) ? Number(dHab) : 0);
    setIsEditTerminos(true);
    return;
  }

if (etapaNum === 4) {
  const fNotifProp = toDayjsOrNull(fechaNotificacionDemandaProp);
  const fLimite = toDayjsOrNull(fechaLimiteContestacion);

  setFechaNotificacionDemanda(fNotifProp);
  setDiasHabiles(Number.isFinite(Number(diasLimiteProp)) ? Number(diasLimiteProp) : null);
  setFechaLimiteCalc(fLimite);   // <-- directo, sin recalcular
  setIsEditTerminos(false);
  return;
}

  if (!e) {
    setFechaNotificacionDemanda(null);
    setDiasHabiles(null);
    setFechaLimiteCalc(null);
    return;
  }

  const fNotif = toDayjsOrNull(e?.fecha_notificacion_demanda);
  const dHab = e?.dias_habiles;

  setFechaNotificacionDemanda(fNotif);
  setDiasHabiles(Number.isFinite(Number(dHab)) ? Number(dHab) : null);

  const hasTerminos = !!fNotif && Number.isFinite(Number(dHab));
  setIsEditTerminos(!hasTerminos);
}, [etapaSeleccionada, etapasByNum, fechaBaseTermino, fechaNotificacionDemandaProp, fechaLimiteContestacion, diasLimiteProp]);
  // ====== recalcular fecha límite ======
useEffect(() => {
  if (Number(etapaSeleccionada) === 4) return;  // etapa 4 ya setea fechaLimiteCalc directo
  if (!fechaNotificacionDemanda || !Number.isFinite(Number(diasHabiles))) {
    setFechaLimiteCalc(null);
    return;
  }
  const lim = addBusinessDays(fechaNotificacionDemanda, Number(diasHabiles));
  setFechaLimiteCalc(lim);
}, [etapaSeleccionada, fechaNotificacionDemanda, diasHabiles]);
const diasRestantesHabiles = useMemo(() => {
  if (!fechaLimiteCalc) return null;
  return businessDaysLeftExclusive(dayjs(), fechaLimiteCalc);
}, [fechaLimiteCalc]);

const diasLabelCalc = useMemo(() => {
  if (Number(etapaSeleccionada) === 4) {
    const d = toDayjsOrNull(fechaLimiteContestacion);
    if (!d) return "—";
    return `${businessDaysLeftExclusive(dayjs(), d)} Días`;
  }
  if (diasRestantesHabiles === null || diasRestantesHabiles === undefined) return "—";
  return `${diasRestantesHabiles} Días`;
}, [diasRestantesHabiles, etapaSeleccionada, fechaLimiteContestacion]);

const fechaLimiteLabelCalc = useMemo(() => {
  if (Number(etapaSeleccionada) === 4) {
    const d = toDayjsOrNull(fechaLimiteContestacion);
    if (!d) return "Límite: —";
    return `Límite: ${d.format("DD MMM YYYY")}`;
  }
  if (!fechaLimiteCalc) return "Límite: —";
  return `Límite: ${fechaLimiteCalc.format("DD MMM YYYY")}`;
}, [fechaLimiteCalc, etapaSeleccionada, fechaLimiteContestacion]);
console.log(fechaLimiteContestacion)
const documentosPorEtapa = useMemo(() => {
  const map = {};
  for (const it of items) {
    const n = Number(it?.id_tribunal_etapa);
    if (!Number.isFinite(n)) continue;
    if (!map[n]) map[n] = [];

    const path = it?.path || "—";
    map[n].push({
      id: it?.id,
      name: it?.filename,
      ext: getExt(path),
      url: it?.url || "",
      size: "—",
      when: formatWhen(it?.datetime),
      seccion: it?.seccion || "",
    });
  }
  return map;
}, [items]);

const documentos = documentosPorEtapa?.[etapaSeleccionada] || [];
const docsCount = documentos.length;

const documentosEscritos = useMemo(() => {
  if (!usaDocsSeparados) return [];
  return documentos.filter((d) => d.seccion === "escritos");
}, [documentos, usaDocsSeparados]);

const documentosAutoResolucion = useMemo(() => {
  if (!usaDocsSeparados) return [];
  return documentos.filter((d) => d.seccion === "auto_resolucion");
}, [documentos, usaDocsSeparados]);

  const pct = Number.isFinite(Number(progresoPct))
    ? Math.max(0, Math.min(100, Number(progresoPct)))
    : 70;

 const handleUpload = async (file, seccion = null) => {
  try {
    await dispatch(
      actionEtapaUploadDocumento({
  expedienteId,
  etapaNumero: etapaSeleccionada,
  file,
  seccion,
})
    );
    notification.success({ message: "Documento cargado correctamente" });
  } catch {
    notification.error({ message: "Error al subir documento" });
  }
  return false;
};
  const handleDeleteDoc = async (doc) => {
    try {
      await dispatch(actionEtapaDeleteDocumento(doc.id, expedienteId));
      notification.success({ message: "Documento eliminado" });
    } catch {
      notification.error({ message: "Error al eliminar documento" });
    }
  };

  const handleMarcarCompletado = async () => {
    try {
      await dispatch(
        actionEtapaMarcarCompletada({
          expedienteId,
          etapaNumero: etapaSeleccionada,
        })
      );
      notification.success({ message: "Etapa marcada como completada" });
    } catch {
      notification.error({ message: "Error al actualizar etapa" });
    }
  };

  const defaultEtapasEscrita = useMemo(
    () => [
      { n: 1, icon: "article", title: "Presentación\ndemanda" },
      { n: 2, icon: "manage_search", title: "Acuerdos /\nPrevención" },
      { n: 3, icon: "assignment_turned_in", title: "Admisión" },
      { n: 4, icon: "record_voice_over", title: "Emplazamiento" },
      { n: 5, icon: "mail", title: "Contestación y Auto de admisión" },
      { n: 6, icon: "find_replace", title: "Reconvención\n(15 días)" },
      { n: 7, icon: "rate_review", title: "Réplica\n(8 días)" },
      { n: 8, icon: "reply", title: "Contrarréplica\n(5 días)" },
      { n: 9, icon: "folder_zip", title: "Integración\nde la litis" },
    ],
    []
  );

  const defaultEtapasOral = useMemo(
    () => [
      { n: 10, icon: "balance", title: "Audiencia Preliminar" },
      { n: 11, icon: "balance", title: "Audiencia\nde juicio" },
      { n: 12, icon: "editor_choice", title: "Sentencia / Laudo" },
      { n: 13, icon: "verified", title: "Amparo\ndirecto" },
      { n: 14, icon: "handyman", title: "Ejecución" },
    ],
    []
  );

const steps = useMemo(() => {
  const fallback = fase === "ORAL" ? defaultEtapasOral : defaultEtapasEscrita;
  const base = Array.isArray(etapasInfo) && etapasInfo.length ? etapasInfo : fallback;

  return base.map((s) => {
    const n = Number(s.n ?? s.numero ?? s.step ?? s.id ?? 0);
    const hasDocs = (documentosPorEtapa?.[n] || []).length > 0;
    const status = hasDocs ? "done" : "empty";

    const displayTitle = s.title || s.nombre || `Etapa ${n}`;

    return { ...s, n, status, displayTitle };
  });
}, [
  fase,
  etapasInfo,
  defaultEtapasEscrita,
  defaultEtapasOral,
  documentosPorEtapa,
]);
  useEffect(() => {
    const allowed = (fase === "ORAL" ? defaultEtapasOral : defaultEtapasEscrita).map((x) => x.n);
    if (!allowed.includes(etapaSeleccionada)) {
      setEtapaSeleccionada(allowed[0]);
    }
  }, [fase, etapaSeleccionada, defaultEtapasEscrita, defaultEtapasOral]);

  // ====== labels desde backend para mostrar en UI (opcional) ======
const fechaNotifLabel = useMemo(() => {
  if (Number(etapaSeleccionada) === 1) {
    const d = dayjs(fechaBaseTermino);
    return d.isValid() ? d.format("DD MMM YYYY") : "—";
  }

  if (Number(etapaSeleccionada) === 4) {
    const d = dayjs(fechaNotificacionDemandaProp);
    return d.isValid() ? d.format("DD MMM YYYY") : "—";
  }

  const e = etapasByNum?.[Number(etapaSeleccionada)];
  const f = e?.fecha_notificacion_demanda;
  if (!f) return "—";
  const d = dayjs(f);
  return d.isValid() ? d.format("DD MMM YYYY") : "—";
}, [etapaSeleccionada, etapasByNum, fechaBaseTermino, fechaNotificacionDemandaProp]);

  const diasHabilesLabel = useMemo(() => {
    const e = etapasByNum?.[Number(etapaSeleccionada)];
    const v = e?.dias_habiles;
    return Number.isFinite(Number(v)) ? String(Number(v)) : "—";
  }, [etapaSeleccionada, etapasByNum]);
const esEtapaSoloVisual = Number(etapaSeleccionada) === 1 || Number(etapaSeleccionada) === 3;

const formatFechaCard = (value) => {
  const d = dayjs(value);
  if (!d.isValid()) return "—";

  const dia = d.format("D");
  const mes = d.locale("es").format("MMMM");
  const anio = d.format("YYYY");

  const mesCapitalizado = mes.charAt(0).toUpperCase() + mes.slice(1);

  return `${dia} ${mesCapitalizado} ${anio}`;
};

const fechaEmisionCitatorioVisual = useMemo(() => {
  return formatFechaCard(fechaEmisionCitatorioProp);
}, [fechaEmisionCitatorioProp]);

const fechaConstanciaConciliacionVisual = useMemo(() => {
  return formatFechaCard(fechaConstanciaConciliacionProp);
}, [fechaConstanciaConciliacionProp]);
const fechaPresentacionVisual = useMemo(() => {
  return formatFechaCard(fechaBaseTermino);
}, [fechaBaseTermino]);

const fechaUltimoDiaLaboradoVisual = useMemo(() => {
  return formatFechaCard(fechaUltimoDiaLaboradoProp);
}, [fechaUltimoDiaLaboradoProp]);
const diasTranscurridosUltimoLaborado = useMemo(() => {
  const fechaPresentacion = dayjs(fechaBaseTermino).startOf("day");
  const fechaUltimoLaborado = dayjs(fechaUltimoDiaLaboradoProp).startOf("day");

  if (!fechaPresentacion.isValid() || !fechaUltimoLaborado.isValid()) return "—";

  const diff = fechaPresentacion.diff(fechaUltimoLaborado, "day");
  return diff >= 0 ? `${diff} días` : "—";
}, [fechaBaseTermino, fechaUltimoDiaLaboradoProp]);

const stage1Timeline = useMemo(() => {
  const milestones = [
    {
      key: "ultimo_dia_laborado",
      label: "Último Día Laborado",
      value: fechaUltimoDiaLaboradoVisual,
      rawDate: fechaUltimoDiaLaboradoProp,
      icon: "event_busy",
      iconClassName: "",
    },
    {
      key: "emision_citatorio",
      label: "Emisión del Citatorio (CCL)",
      value: fechaEmisionCitatorioVisual,
      rawDate: fechaEmisionCitatorioProp,
      icon: "mail",
      iconClassName: "is-citatorio",
    },
    {
      key: "constancia_no_conciliacion",
      label: "Constancia de No Conciliación",
      value: fechaConstanciaConciliacionVisual,
      rawDate: fechaConstanciaConciliacionProp,
      icon: "assignment_turned_in",
      iconClassName: "is-constancia",
    },
    {
      key: "presentacion_demanda",
      label: "Presentación de Demanda",
      value: fechaPresentacionVisual,
      rawDate: fechaBaseTermino,
      icon: "calendar_month",
      iconClassName: "",
    },
  ];

  const timeline = [];

  for (let i = 0; i < milestones.length; i += 1) {
    const current = milestones[i];

    timeline.push({
      type: "milestone",
      ...current,
    });

    if (i < milestones.length - 1) {
      const next = milestones[i + 1];
      const currentDate = dayjs(current.rawDate).startOf("day");
      const nextDate = dayjs(next.rawDate).startOf("day");

      let diff = null;

      if (currentDate.isValid() && nextDate.isValid()) {
        const value = nextDate.diff(currentDate, "day");
        diff = value >= 0 ? value : null;
      }

      const isSuspended =
        current.key === "emision_citatorio" &&
        next.key === "constancia_no_conciliacion";

      timeline.push({
        type: "connector",
        key: `${current.key}_${next.key}`,
        diff,
        isSuspended,
      });
    }
  }

  return timeline;
}, [
  fechaUltimoDiaLaboradoVisual,
  fechaUltimoDiaLaboradoProp,
  fechaEmisionCitatorioVisual,
  fechaEmisionCitatorioProp,
  fechaConstanciaConciliacionVisual,
  fechaConstanciaConciliacionProp,
  fechaPresentacionVisual,
  fechaBaseTermino,
]);

const totalDiasPrescripcion = useMemo(() => {
  const connectorsValidos = stage1Timeline.filter(
    (item) => item.type === "connector" && !item.isSuspended && Number.isFinite(item.diff)
  );

  if (!connectorsValidos.length) return "—";

  const total = connectorsValidos.reduce((acc, item) => acc + Number(item.diff), 0);
  return `${total} días`;
}, [stage1Timeline]);

const resumenPrescripcion = useMemo(() => {
  const connectors = stage1Timeline.filter((item) => item.type === "connector");

  if (!connectors.length) return "—";

  const labels = [
    "último día laborado → citatorio",
    "citatorio → no conciliación",
    "no conciliación → demanda",
  ];

  return connectors
    .map((item, index) => {
      if (item.isSuspended) {
        return `Términos suspendidos (${labels[index] || "tramo"})`;
      }

      const diffText = item.diff === null ? "—" : item.diff;
      return `${diffText} días (${labels[index] || "tramo"})`;
    })
    .join(" + ");
}, [stage1Timeline]);

  return (
    <div className="lxp-ep-wrap">
      <div className="lxp-ep-card">
        <div className="lxp-ep-head">
          <div>
            <h2 className="lxp-ep-title">
              <span className="material-symbols-outlined">schema</span>
              Esquema del Procedimiento Ordinario
            </h2>
            <p className="lxp-ep-sub">Visualización del flujo procesal y estado actual.</p>
          </div>

      
        </div>

        <div className="lxp-ep-timeline-scroll">
          <div className="lxp-ep-timeline">
            <div className="lxp-ep-line" />
            <div className="lxp-ep-steps">
              {steps.map((s) => {
                const isSelected = s.n === etapaSeleccionada;
                const isDone = s.status === "done";
                const isEmpty = s.status === "empty";
                const isDisabled = s.n === 2;

                return (
                  <div
                    key={`${s.n}-${s.title}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      if (isDisabled) return;
                      setEtapaSeleccionada(s.n);
                    }}
                    onKeyDown={(e) => {
                      if (isDisabled) return;
                      if (e.key === "Enter" || e.key === " ") setEtapaSeleccionada(s.n);
                    }}
                    className={[
                      "lxp-ep-step",
                      "is-clickable",
                      isSelected ? "is-active" : "",
                      isDone ? "is-done" : "",
                      isEmpty ? "is-empty" : "",
                    ].join(" ")}
                  >
                    <div className="lxp-ep-step-n">{s.n}</div>
                    <div className="lxp-ep-step-stick" />

                    <div className="lxp-ep-step-icon">
                      <span className="material-symbols-outlined">{s.icon}</span>
                    </div>

           <div className={isSelected ? "lxp-ep-step-text is-active-text" : "lxp-ep-step-text"}>
  {String(s.displayTitle)
    .split("\n")
    .map((line, idx) => (
      <div key={idx}>{line}</div>
    ))}
</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="lxp-ep-bottom">
          <div className="lxp-ep-left">
            <h3 className="lxp-ep-detail-head">
              <span className="lxp-ep-dot" />
              DETALLE: ETAPA {etapaSeleccionada}
            </h3>

            <p
  className="lxp-ep-detail-desc"
  style={{
    whiteSpace: "normal",
    wordBreak: "break-word",
    overflowWrap: "anywhere",
    overflow: "visible",
    textOverflow: "unset",
  }}
>
  {descripcionEtapa}
</p>

            {/* ===== REFLEJAR info de backend (solo lectura visible) ===== */}
            <div style={{ marginBottom: 10, opacity: 0.9 }}>
              
            </div>

           <div className="lxp-ep-dates-row">
{esEtapaSoloVisual ? (
  Number(etapaSeleccionada) === 3 ? (
    <div className="lxp-ep-etapa3-wrap">
      <div className="lxp-ep-etapa3-card">
        <div className="lxp-ep-etapa3-card-top">
          <div className="lxp-ep-etapa3-icon">
            <span className="material-symbols-outlined">event_available</span>
          </div>
          <div className="lxp-ep-etapa3-label">Fecha de Radicación</div>
        </div>
        <div className="lxp-ep-etapa3-value">
          {fechaRadicacionProp
            ? formatFechaCard(fechaRadicacionProp)
            : "—"}
        </div>
      </div>
    </div>
    
 ) : Number(etapaSeleccionada) === 1 ? (
  <div className="lxp-ep-stage1-timeline-wrap">
    <div className="lxp-ep-stage1-timeline">
      {stage1Timeline.map((item) => {
     if (item.type === "connector") {
  return (
    <div key={item.key} className="lxp-ep-stage1-connector">
      <div className="lxp-ep-stage1-connector-line" />
      <div
        className={[
          "lxp-ep-stage1-connector-pill",
          item.isSuspended ? "is-suspended" : "",
        ].join(" ")}
      >
        {item.isSuspended ? (
          <span className="lxp-ep-stage1-connector-suspended">
            Términos suspendidos
          </span>
        ) : (
          <>
            <span className="lxp-ep-stage1-connector-days">
              {item.diff === null ? "—" : item.diff}
            </span>
            <span className="lxp-ep-stage1-connector-unit">días</span>
          </>
        )}
      </div>
    </div>
  );
}

      return (
        <div key={item.key} className="lxp-ep-stage1-card">
          <div className="lxp-ep-stage1-card-top">
            <div className={`lxp-ep-stage1-icon ${item.iconClassName}`.trim()}>
              <span className="material-symbols-outlined">{item.icon}</span>
            </div>

            <div className="lxp-ep-stage1-label">{item.label}</div>
          </div>

          <div className="lxp-ep-stage1-value">{item.value}</div>
        </div>
      );
    })}
  </div>

  <div className="lxp-ep-stage1-total-row">
    <div className="lxp-ep-stage1-total-card">
      <div className="lxp-ep-stage1-total-icon">
        <span className="material-symbols-outlined">schedule</span>
      </div>

      <div className="lxp-ep-stage1-total-content">
        <div className="lxp-ep-stage1-total-label">Total días transcurridos</div>
        <div className="lxp-ep-stage1-total-value">{totalDiasPrescripcion}</div>
      </div>
    </div>
  </div>

  <div className="lxp-ep-stage1-note">
    * {resumenPrescripcion} = <span>{totalDiasPrescripcion}</span>.
  </div>
</div>
) : null
) : (
    <>
      <div className="lxp-ep-dategrid-2">
        <div className="lxp-ep-datefield">
          <div className="lxp-ep-datelabel">
            {usaFechaAuto
              ? "Fecha de Notificación de Auto"
              : "Fecha de Notificación de Demanda"}
          </div>

          <DatePicker
            value={fechaNotificacionDemanda}
            onChange={(v) => setFechaNotificacionDemanda(v)}
            format="MM/DD/YYYY"
            placeholder="mm/dd/yyyy"
            className="lxp-ep-datepicker"
            allowClear
            disabled={Number(etapaSeleccionada) === 4 || !isEditTerminos}
          />
        </div>

        <div className="lxp-ep-datefield">
  <div className="lxp-ep-datelabel">Días hábiles para vencimiento</div>
  {Number(etapaSeleccionada) === 4 ? (
    <div className="lxp-ep-date-static">
      <span className="material-symbols-outlined">schedule</span>
      {Number.isFinite(Number(diasLimiteProp)) ? `${diasLimiteProp} días` : "—"}
    </div>
  ) : (
    <InputNumber
      value={diasHabiles}
      onChange={(v) => setDiasHabiles(v)}
      min={0}
      max={365}
      className="lxp-ep-inputnumber"
      placeholder="Ej: 10"
      disabled={!isEditTerminos}
    />
  )}
</div>
      </div>

<div className="lxp-ep-savebox">
  {Number(etapaSeleccionada) !== 4 && (
  <Button
    type={isEditTerminos ? "primary" : "default"}
          loading={loadingTerminos}
          onClick={async () => {
            if (isEditTerminos) {
              const fechaParaGuardar =
                Number(etapaSeleccionada) === 4
                  ? toDayjsOrNull(fechaNotificacionDemandaProp)
                  : fechaNotificacionDemanda;

              if (!fechaParaGuardar) {
                notification.error({
                  message: "No existe la fecha de notificación",
                });
                return;
              }

              if (!Number.isFinite(Number(diasHabiles))) {
                notification.error({ message: "Faltan los días hábiles" });
                return;
              }

              try {
                setLoadingTerminos(true);

                await dispatch(
                  actionTribunalEtapaUpdateTerminos(expedienteId, etapaSeleccionada, {
                    fecha_notificacion_demanda: fechaParaGuardar.format("YYYY-MM-DD"),
                    dias_habiles: Number(diasHabiles),
                  })
                );

                notification.success({ message: "Términos guardados correctamente" });

                await dispatch(actionTribunalDocumentosGetById(expedienteId));

                setIsEditTerminos(false);
              } catch (err) {
                notification.error({ message: "Error al guardar términos" });
              } finally {
                setLoadingTerminos(false);
              }
            } else {
              setIsEditTerminos(true);
            }
          }}
        >
          {isEditTerminos ? "Guardar" : "Editar"}
        </Button>
   )}
      </div>
    </>
  )}
</div>

       {!esEtapaSoloVisual && (
  usaDocsSeparados ? (
    <>
      <div className="lxp-ep-docs">
        <div className="lxp-ep-docs-head">
          <div className="lxp-ep-docs-title">
            <span className="material-symbols-outlined">folder_data</span>
            Escritos
          </div>

          <div className="lxp-ep-docs-right">
            <span className="lxp-ep-docs-count">{documentosEscritos.length} archivos</span>

            <Upload
              beforeUpload={(file) => handleUpload(file, "escritos")}
              showUploadList={false}
            >
              <button className="lxp-ep-link" type="button">
                <span className="material-symbols-outlined">add</span>
                Agregar
              </button>
            </Upload>
          </div>
        </div>

        <div className="lxp-ep-docs-body">
          {documentosEscritos.map((d) => {
            const ext = String(d?.ext || "").toLowerCase();
            const isPdf = ext === "pdf";

            return (
              <div key={d.id} className={`lxp-ep-doc-item ${isPdf ? "is-pdf" : "is-doc"}`}>
                <div className="lxp-ep-doc-left">
                  <div className="lxp-ep-doc-ico">
                    <span className="material-symbols-outlined">
                      {isPdf ? "picture_as_pdf" : "description"}
                    </span>
                  </div>

                  <div className="lxp-ep-doc-meta">
                    <div className="lxp-ep-doc-name">{d?.name || "—"}</div>
                    <div className="lxp-ep-doc-sub">
                      {d?.size || "—"} •{" "}
                      <span className="material-symbols-outlined">schedule</span>{" "}
                      {d?.when || "—"}
                    </div>
                  </div>
                </div>

                <div className="lxp-ep-doc-actions">
                  <button
                    className="lxp-ep-iconbtn"
                    type="button"
                    title="Ver documento"
                    onClick={() => window.open(d?.url, "_blank")}
                  >
                    <span className="material-symbols-outlined">visibility</span>
                  </button>

                  <button
                    className="lxp-ep-iconbtn"
                    type="button"
                    title="Eliminar"
                    onClick={() => handleDeleteDoc(d)}
                  >
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </div>
            );
          })}

          <Upload
            beforeUpload={(file) => handleUpload(file, "escritos")}
            showUploadList={false}
            className="lxp-ep-upload-block"
          >
            <div className={`lxp-ep-drop ${documentosEscritos.length > 0 ? "is-compact" : ""}`}>
              <div className="lxp-ep-drop-ico">
                <span className="material-symbols-outlined">cloud_upload</span>
              </div>
              <div className="lxp-ep-drop-t">Haga clic para cargar</div>
              <div className="lxp-ep-drop-s">o arrastre y suelte (PDF, Word)</div>
            </div>
          </Upload>
        </div>
      </div>

      <div className="lxp-ep-docs" style={{ marginTop: 16 }}>
        <div className="lxp-ep-docs-head">
          <div className="lxp-ep-docs-title">
            <span className="material-symbols-outlined">folder_data</span>
            Auto / Resolución
          </div>

          <div className="lxp-ep-docs-right">
            <span className="lxp-ep-docs-count">{documentosAutoResolucion.length} archivos</span>

            <Upload
              beforeUpload={(file) => handleUpload(file, "auto_resolucion")}
              showUploadList={false}
            >
              <button className="lxp-ep-link" type="button">
                <span className="material-symbols-outlined">add</span>
                Agregar
              </button>
            </Upload>
          </div>
        </div>

        <div className="lxp-ep-docs-body">
          {documentosAutoResolucion.map((d) => {
            const ext = String(d?.ext || "").toLowerCase();
            const isPdf = ext === "pdf";

            return (
              <div key={d.id} className={`lxp-ep-doc-item ${isPdf ? "is-pdf" : "is-doc"}`}>
                <div className="lxp-ep-doc-left">
                  <div className="lxp-ep-doc-ico">
                    <span className="material-symbols-outlined">
                      {isPdf ? "picture_as_pdf" : "description"}
                    </span>
                  </div>

                  <div className="lxp-ep-doc-meta">
                    <div className="lxp-ep-doc-name">{d?.name || "—"}</div>
                    <div className="lxp-ep-doc-sub">
                      {d?.size || "—"} •{" "}
                      <span className="material-symbols-outlined">schedule</span>{" "}
                      {d?.when || "—"}
                    </div>
                  </div>
                </div>

                <div className="lxp-ep-doc-actions">
                  <button
                    className="lxp-ep-iconbtn"
                    type="button"
                    title="Ver documento"
                    onClick={() => window.open(d?.url, "_blank")}
                  >
                    <span className="material-symbols-outlined">visibility</span>
                  </button>

                  <button
                    className="lxp-ep-iconbtn"
                    type="button"
                    title="Eliminar"
                    onClick={() => handleDeleteDoc(d)}
                  >
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </div>
            );
          })}

          <Upload
            beforeUpload={(file) => handleUpload(file, "auto_resolucion")}
            showUploadList={false}
            className="lxp-ep-upload-block"
          >
            <div
              className={`lxp-ep-drop ${documentosAutoResolucion.length > 0 ? "is-compact" : ""}`}
            >
              <div className="lxp-ep-drop-ico">
                <span className="material-symbols-outlined">cloud_upload</span>
              </div>
              <div className="lxp-ep-drop-t">Haga clic para cargar</div>
              <div className="lxp-ep-drop-s">o arrastre y suelte (PDF, Word)</div>
            </div>
          </Upload>
        </div>
      </div>
    </>
  ) : (
    <div className="lxp-ep-docs">
      <div className="lxp-ep-docs-head">
        <div className="lxp-ep-docs-title">
          <span className="material-symbols-outlined">folder_data</span>
          Documentos de la Etapa
        </div>

        <div className="lxp-ep-docs-right">
          <span className="lxp-ep-docs-count">{docsCount} archivos</span>

          <Upload beforeUpload={handleUpload} showUploadList={false}>
            <button className="lxp-ep-link" type="button">
              <span className="material-symbols-outlined">add</span>
              Agregar
            </button>
          </Upload>
        </div>
      </div>

      <div className="lxp-ep-docs-body">
        {documentos.map((d) => {
          const ext = String(d?.ext || "").toLowerCase();
          const isPdf = ext === "pdf";

          return (
            <div key={d.id} className={`lxp-ep-doc-item ${isPdf ? "is-pdf" : "is-doc"}`}>
              <div className="lxp-ep-doc-left">
                <div className="lxp-ep-doc-ico">
                  <span className="material-symbols-outlined">
                    {isPdf ? "picture_as_pdf" : "description"}
                  </span>
                </div>

                <div className="lxp-ep-doc-meta">
                  <div className="lxp-ep-doc-name">{d?.name || "—"}</div>
                  <div className="lxp-ep-doc-sub">
                    {d?.size || "—"} •{" "}
                    <span className="material-symbols-outlined">schedule</span>{" "}
                    {d?.when || "—"}
                  </div>
                </div>
              </div>

              <div className="lxp-ep-doc-actions">
                <button
                  className="lxp-ep-iconbtn"
                  type="button"
                  title="Ver documento"
                  onClick={() => window.open(d?.url, "_blank")}
                >
                  <span className="material-symbols-outlined">visibility</span>
                </button>

                <button
                  className="lxp-ep-iconbtn"
                  type="button"
                  title="Eliminar"
                  onClick={() => handleDeleteDoc(d)}
                >
                  <span className="material-symbols-outlined">delete</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  )
)}
          </div>

          {!esEtapaSoloVisual && (
  <div className="lxp-ep-right">
    <div className="lxp-ep-deadline-card">
      <div className="lxp-ep-deadline-title">VENCIMIENTO DEL TÉRMINO</div>

      <div className="lxp-ep-deadline-row">
        <div className="lxp-ep-deadline-days">
          {diasLabelCalc}
        </div>
        <span className="material-symbols-outlined lxp-ep-deadline-ico">timer_off</span>
      </div>

      <div className="lxp-ep-bar">
        <div className="lxp-ep-bar-fill" style={{ width: `${pct}%` }} />
      </div>

      <div className="lxp-ep-deadline-foot">
        {fechaLimiteLabelCalc}
      </div>
    </div>
  </div>
)}
        </div>
      </div>
    </div>
  );
}