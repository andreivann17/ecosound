// src/pages/materias/laboral/LaboralExpedienteDetallePage.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Modal, notification } from "antd";
import { useDispatch } from "react-redux";
import EtapaProcesalOrdinario from "../../components/tribunal/EtapaProcesalOrdinario";
import TabDocumentosPruebas from "../../components/tribunal/TabDocumentosPruebas";
import TabCuantificaciones from "../../components/tribunal/TabCuantificaciones";
import TabBitacora from "../../components/tribunal/TabBitacora";

import "../../assets/css/LaboralExpedienteDetallePage.css";
import "../../assets/css/LaboralExpedientePruebasSection.css";
import { actionTribunalGetById } from "../../redux/actions/tribunal/tribunal";

// ✅ TRIBUNAL components (los sigues usando en su tab)
import DocumentosTribunalCard from "../../components/tribunal/DocumentosTribunalCard";

const safeObj = (v) => (v && typeof v === "object" ? v : {});
const safeArr = (v) => (Array.isArray(v) ? v : []);

const fmtDateLong = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
};

const fmtShort = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const day = d.toLocaleDateString("es-ES", { day: "2-digit" });
  const mon = d.toLocaleDateString("es-ES", { month: "short" }).replace(".", "");
  const yr = d.toLocaleDateString("es-ES", { year: "numeric" });
  return `${day} ${mon} ${yr}`.replace(" de ", " ");
};

const toTitleCase = (str) => {
  if (!str || typeof str !== "string") return "—";
  return str
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
};
const formatTipoList = (arr) => {
  const items = safeArr(arr).filter(Boolean);
  if (!items.length) return "—";
  return items.map((it) => toTitleCase(String(it).replaceAll("_", " "))).join(", ");
};
export default function LaboralExpedienteDetallePage({ maps = {} }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { idExpediente } = useParams();
  const location = useLocation();
  const [activeMainTab, setActiveMainTab] = useState("1");
  const [deletingExp, setDeletingExp] = useState(false);

  const [detalle, setDetalle] = useState(null);
  const [loadingDetalle, setLoadingDetalle] = useState(true);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoadingDetalle(true);
        const data = await dispatch(actionTribunalGetById(idExpediente));
        if (!mounted) return;

        const d =
          data?.detalle ||
          data?.data ||
          data?.item ||
          (Array.isArray(data?.items) ? data.items[0] : null) ||
          data;

        setDetalle(d && typeof d === "object" ? d : null);
      } catch (e) {
        if (!mounted) return;
        setDetalle(null);
        notification.error({
          message: "Error al cargar expediente",
          description: e?.response?.data?.detail || e?.message || "No se pudo cargar el expediente.",
        });
      } finally {
        if (!mounted) return;
        setLoadingDetalle(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [dispatch, idExpediente]);

  const mapsSafe = safeObj(maps);
  const ciudadesById = safeObj(mapsSafe.ciudadesById);
  const estadosById = safeObj(mapsSafe.estadosById);
  const isFlat = detalle && typeof detalle === "object" && !detalle?.datos_generales;


  const meta = safeObj(detalle?.meta);

  const dg = isFlat
    ? {
        estado: detalle?.id_estado ?? null,
        ciudad: detalle?.id_ciudad ?? null,
        autoridad: detalle?.id_autoridad ?? null,
        num_unico: detalle?.expediente ?? null,
        numero_expediente: detalle?.numero_expediente ?? "",
      }
    : safeObj(detalle?.datos_generales);

  const ap = isFlat
    ? {
        trabajador_nombre: detalle?.nombre_trabajador ?? "",
        accion_intentada: detalle?.accion_intentada ?? "",
        fecha_recepcion_demanda: detalle?.fecha_recepcion_demanda ?? null,
        otras_prestaciones: detalle?.otras_prestaciones ?? "",
        prestaciones: safeObj(detalle?.prestaciones),
      }
    : safeObj(detalle?.acciones_prestaciones);

  const hechos = isFlat
    ? {
        responsable_despido: detalle?.responsable_despido ?? "",
        jefes_inmediatos: detalle?.jefes_inmediatos ?? "",
        narrativa: detalle?.narrativa ?? "",
      }
    : safeObj(detalle?.hechos);
   
const ct = isFlat
  ? {
      fecha_ingreso: detalle?.fecha_ingreso ?? null,
      puesto: detalle?.puesto ?? "",
      salario_diario: detalle?.salario_diario ?? "",
      salario_diario_integrado:
        detalle?.salario_diario_integrado ??
        detalle?.debug_flat?.salario_diario_integrado ??
        "",
      lugar_servicio: detalle?.lugar_servicio ?? "",
      sdi: detalle?.debug_flat?.salario_diario_integrado ?? "",
      jornada: detalle?.jornada ?? "",
      dia_descanso: detalle?.dia_descanso ?? "",
    }
  : safeObj(detalle?.condiciones_trabajo);
  const etapa = isFlat
    ? {
        fecha_limite_contestacion: detalle?.fecha_limite_contestacion ?? null,
        fecha_audiencia_conciliatoria: detalle?.fecha_audiencia_conciliadora ?? detalle?.fecha_audiencia_conciliatoria ?? null,
        observaciones_etapa_actual: detalle?.observaciones_etapa_inicial ?? "",
        id_tribunal_documento_citatorio: detalle?.id_tribunal_documento_citatorio ?? null,
        citatorio: safeObj(detalle?.citatorio),
        fecha_presentacion_demanda: detalle?.fecha_presentacion_demanda ?? null,
        fecha_notificacion_demanda: detalle?.fecha_notificacion_demanda ?? null,
        fecha_ultimo_dia_laborado: detalle?.fecha_ultimo_dia_laborado ?? null,
      }
    : safeObj(detalle?.etapa_procesal);

  const pruebas = isFlat ? {} : safeObj(detalle?.pruebas_documentacion);

  const ciudadName =
    dg?.nombre_ciudad ||
    detalle?.nombre_ciudad ||
    ciudadesById?.[dg?.ciudad]?.nombre ||
    ciudadesById?.[dg?.ciudad] ||
    (dg?.ciudad ? `#${dg.ciudad}` : "—");

  const estadoName =
    dg?.nombre_estado ||
    detalle?.nombre_estado ||
    estadosById?.[dg?.estado]?.nombre ||
    estadosById?.[dg?.estado] ||
    (dg?.estado ? `#${dg.estado}` : "—");

  const autoridadName =
    dg?.nombre_autoridad ||
    detalle?.nombre_autoridad ||
    (dg?.autoridad ? `#${dg.autoridad}` : "—");

  const rightSideTitle = detalle?.nombre_autoridad || ap?.accion_intentada || "—";
  const statusTag = Number(detalle?.active ?? 0) === 1 ? "Activo" : "Inactivo";

  const demandadaTitle = useMemo(() => {
    const rs = safeArr(dg?.razones_sociales);
    const names = rs
      .map((x) => String(x?.razon_social || "").trim())
      .filter(Boolean);

    return names.length ? names.join(" vs ") : "—";
  }, [dg]);

  const prestaciones = useMemo(() => {
    const p = safeObj(ap?.prestaciones);
    return Object.keys(p).filter((k) => p[k] === true);
  }, [ap]);

  // Plazos críticos (ejemplo: contestación)
  const vencioContestacion = detalle?.etapas_procesales?.fecha_limite_contestacion;
  const diasVencidos = useMemo(() => {
    if (!vencioContestacion) return null;
    const d = new Date(vencioContestacion);
    if (Number.isNaN(d.getTime())) return null;
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    // si diff > 0 => vencido
    return diff;
  }, [vencioContestacion]);

  const handleDeleteExpediente = () => {
    const idToDelete = detalle?.id;
    if (!idToDelete) {
      notification.error({ message: "No se puede eliminar", description: "No se encontró el ID del expediente." });
      return;
    }

    Modal.confirm({
      title: "Eliminar expediente",
      content: "Esta acción elimina el expediente y su información relacionada.",
      okText: "Eliminar",
      okType: "danger",
      cancelText: "Cancelar",
      centered: true,
      okButtonProps: { loading: deletingExp, disabled: deletingExp },
      cancelButtonProps: { disabled: deletingExp },
      onOk: async () => {
        try {
          setDeletingExp(true);

          // ✅ Conecta aquí tu action real:
          // await dispatch(actionTribunalDelete(idToDelete, () => navigate("/materias/laboral/tribunal")));

          notification.success({
            message: "Pendiente",
            description: "Conecta tu actionTribunalDelete aquí. El modal y estados ya están listos.",
          });
        } catch (error) {
          const msg = error?.response?.data?.detail || error?.message || "No se pudo eliminar el expediente.";
          notification.error({ message: "Error al eliminar", description: msg });
        } finally {
          setDeletingExp(false);
        }
      },
    });
  };

  if (loadingDetalle) {
    return (
      <div className="lxp-root">
        <div className="lxp-wrap">
          <div className="lxp-card lxp-summary">
            Cargando expediente...
          </div>
        </div>
      </div>
    );
  }

  if (!detalle) {
    return (
      <div className="lxp-root">
        <div className="lxp-wrap">
          <div className="lxp-card lxp-summary">
            No se encontró el expediente.
          </div>
        </div>
      </div>
    );
  }

  const citFilename = etapa?.citatorio?.filename || (etapa?.citatorio?.url ? "Ver demanda" : "—");
  const citHas = Boolean(etapa?.citatorio?.url);

const dataActor = safeArr(pruebas?.actor || pruebas?.actora || pruebas?.pruebas_actor || pruebas?.parte_actora);
const dataDemandada = safeArr(pruebas?.demandada || pruebas?.pruebas_demandada || pruebas?.parte_demandada);

const pruebasDetalle = safeObj(pruebas?.detalle);
const pruebasActora = safeObj(pruebasDetalle?.actora);

const confesionalesActora = safeArr(pruebasActora?.confesional);

const confesionalHechosPropiosActora = safeObj(pruebasActora?.confesional_hechos_propios);
const confesionalHechosPropiosRegistros = safeArr(confesionalHechosPropiosActora?.registros);

const testimonialActora = safeObj(pruebasActora?.testimonial);
const testigosActora = safeArr(testimonialActora?.testigos);

const documentalPublicaActora = safeObj(pruebasActora?.documental_publica);
const documentosPublicosActora = safeArr(documentalPublicaActora?.documentos);

const documentalPrivadaActora = safeObj(pruebasActora?.documental_privada);
const documentosPrivadosActora = safeArr(documentalPrivadaActora?.documentos);

const pericialActora = safeObj(pruebasActora?.pericial);
const inspeccionOcularActora = safeObj(pruebasActora?.inspeccion_ocular);

const checklistActora = safeObj(pruebas?.checklist?.actora);
const tieneConfesionalExpresa = Boolean(checklistActora?.confesional_expresa);
const tieneInstrumentalActora = Boolean(checklistActora?.instrumental_actuaciones);
const tienePresuncionalActora = Boolean(checklistActora?.presuncional_legal_humana);

  // audiencia
  const audIso = etapa?.fecha_audiencia_conciliatoria;
  const audDate = audIso ? new Date(audIso) : null;
  const audMonth = audDate && !Number.isNaN(audDate.getTime())
    ? audDate.toLocaleDateString("es-ES", { month: "short" }).replace(".", "").toUpperCase()
    : "—";
  const audDay = audDate && !Number.isNaN(audDate.getTime())
    ? audDate.toLocaleDateString("es-ES", { day: "2-digit" })
    : "—";

  // fechas clave adicionales
  const fechaPresentacionDemanda = dg?.fecha_presentacion_demanda || detalle?.fecha_presentacion_demanda || null;
  const fechaNotificacionDemanda = dg?.fecha_notificacion_demanda || detalle?.fecha_notificacion_demanda || null;
  const fechaRadicacionDemanda= dg?.fecha_radicacion || detalle?.fecha_radicacion || null;
  const fechaNoConciliacionDemanda = dg?.fecha_no_conciliacion || detalle?.fecha_no_conciliacion || null;
  const fechaEmisionDemanda = dg?.fecha_emision_ccl || detalle?.fecha_emision_ccl || null;
    const fechaLimiteDemanda = dg?.fecha_limite_contestacion || detalle?.fecha_limite_contestacion || null;
  const diasLimiteDemanda = dg?.dias_limite || detalle?.dias_limite || null;
const fechaUltimoDiaLaborado =
  detalle?.etapas_procesales?.fecha_ultimo_dia_laborado ||
  detalle?.fecha_ultimo_dia_laborado ||
  null;
  const pruebasDemandada = safeObj(pruebasDetalle?.demandada);
const confesionalesDemandada = safeArr(pruebasDemandada?.confesional);

const informeAutoridadActora = safeObj(pruebasActora?.informe_autoridad);
const informesAutoridadActora = safeArr(informeAutoridadActora?.documentos);
  return (
    <div className="lxp-root">
      <div className="lxp-wrap">
        <div className="">
          {/* LEFT */}
          <div>
            {/* breadcrumb */}
            <div className="lxp-breadcrumb">
              <a className="lxp-bc-link" href="#"
                  onClick={() => navigate(`/materias/laboral/tribunal${location.search}`)}
                 
                 >
                <span className="material-symbols-outlined">arrow_back</span>
                Volver a expedientes
              </a>
              <span>/</span>
              <span style={{ fontWeight: 700, color: "#0f172a" }}>Detalle de expediente</span>
            </div>

            {/* summary */}
            <div className="lxp-card lxp-summary">
              <div className="lxp-summary-top">
                <div className="lxp-summary-left">
                  <div className="lxp-icon-square">
                    <span className="material-symbols-outlined">description</span>
                  </div>

                  <div>
                    <div className="lxp-title-row">
                      <h1 className="lxp-title">
                        {ap?.trabajador_nombre || "—"}
                        <span className="lxp-vs">vs</span>
                        {demandadaTitle}
                      </h1>

                     
                    </div>

                    <div className="lxp-meta">
                      <span className="lxp-meta-item">
                        <span className="material-symbols-outlined">fingerprint</span>
                        Núm. único: {dg?.num_unico || "—"}
                      </span>
                      <span className="lxp-meta-item">
                        <span className="material-symbols-outlined">location_on</span>
                        Ubicación: {ciudadName}{estadoName !== "—" ? `, ${estadoName}` : ""}
                      </span>
                      <span className="lxp-meta-item">
                        <span className="material-symbols-outlined">gavel</span>
                        Autoridad: {autoridadName}
                      </span>
                    </div>
                  </div>
                </div>

                <button className="lxp-danger-btn" onClick={handleDeleteExpediente} disabled={deletingExp}>
                  <span className="material-symbols-outlined">delete</span>
                  Eliminar
                </button>
              </div>

              {/* tabs */}
              <div className="lxp-tabsbar">
                <div className="lxp-tabsbar-inner">
                  <div
                    className={`lxp-tab ${activeMainTab === "1" ? "lxp-tab--active" : ""}`}
                    onClick={() => setActiveMainTab("1")}
                  >
                    <span className="material-symbols-outlined">dashboard</span>
                    Principal
                  </div>

                                  <div
                  className={`lxp-tab ${activeMainTab === "2" ? "lxp-tab--active" : ""}`}
                  onClick={() => setActiveMainTab("2")}
                >
                  <span className="material-symbols-outlined">timeline</span>
                  Fase Escrita
                </div>

                <div
                  className={`lxp-tab ${activeMainTab === "3" ? "lxp-tab--active" : ""}`}
                  onClick={() => setActiveMainTab("3")}
                >
                  <span className="material-symbols-outlined">timeline</span>
                  Fase Oral
                </div>

      

                  <div
                    className={`lxp-tab ${activeMainTab === "4" ? "lxp-tab--active" : ""}`}
                    onClick={() => setActiveMainTab("4")}
                  >
                    <span className="material-symbols-outlined">calculate</span>
                    Cuantificaciones
                  </div>

                 <div
                    className={`lxp-tab ${activeMainTab === "5" ? "lxp-tab--active" : ""}`}
                    onClick={() => setActiveMainTab("5")}
                  >
                    <span className="material-symbols-outlined">history_edu</span>
                    Bitácora
                  </div>
                </div>
              </div>
            </div>

            {/* TAB CONTENT */}
            {activeMainTab === "1" && (
              <>
                {/* Datos expediente */}
                <div className="lxp-card lxp-exp-kv" style={{ marginTop: 18 }}>
                  <div className="lxp-section-head">
                    <div>
                      <h3 className="lxp-section-title">Datos de expediente</h3>
                      <div className="lxp-section-subtitle">Información principal capturada en tribunal.</div>
                    </div>

                   <div
  className="lxp-edit-link"
  onClick={() => navigate(`/materias/laboral/tribunal/${idExpediente}/editar`)}
>
  <span className="material-symbols-outlined">edit</span>
  Editar
</div>
                  </div>

                  <div className="lxp-body">
                    <div className="lxp-kv-grid">
                      <div className="lxp-kv-block">
                        <div className="lxp-kv">
                          <div className="lxp-k">Número único</div>
                          <div className="lxp-v">{dg?.num_unico || "—"}</div>
                        </div>

                        <div className="lxp-kv">
                          <div className="lxp-k">Número de expediente</div>
                          <div className="lxp-v">{dg?.numero_expediente || "—"}</div>
                        </div>
                      </div>

                      <div className="lxp-kv-block">
                        <div className="lxp-kv">
                          <div className="lxp-k">Estado</div>
                          <div className="lxp-v lxp-v-row">
                            <span className="lxp-dot" />
                            {estadoName}
                          </div>
                        </div>

                        <div className="lxp-kv">
                          <div className="lxp-k">Ciudad</div>
                          <div className="lxp-v">{ciudadName}</div>
                        </div>
                      </div>

                      <div className="lxp-kv-block">
                        <div className="lxp-kv">
                          <div className="lxp-k">Autoridad</div>
                          <div className="lxp-v" title={autoridadName}>
                            {autoridadName}
                          </div>
                        </div>

                        
                      </div>

                      <div className="lxp-kv-block">
                       

                        <div className="lxp-kv">
                          <div className="lxp-k">Fecha notificación demanda</div>
                          <div className="lxp-v">{fmtDateLong(fechaNotificacionDemanda)}</div>
                        </div>
                          <div className="lxp-kv">
                          <div className="lxp-k">Último día laborado</div>
                          <div className="lxp-v">{fmtDateLong(fechaUltimoDiaLaborado)}</div>
                        </div>
                      </div>

                      <div className="lxp-kv-block">
                      

                        <div className="lxp-kv">
                          <div className="lxp-k">Límite contestación</div>
<div className="lxp-v">{fmtDateLong(detalle?.etapas_procesales?.fecha_limite_contestacion || etapa?.fecha_limite_contestacion)}</div>                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Acciones y prestaciones */}
                <div className="lxp-card" style={{ marginTop: 18 }}>
                  <div className="lxp-section-head">
                    <h3 className="lxp-section-title">Acciones y prestaciones</h3>
                  </div>

                  <div className="lxp-ap-grid">
                    {/* IZQUIERDA */}
                    <div className="lxp-ap-left">
                      <div className="lxp-ap-row">
                        <div className="lxp-label">TRABAJADOR</div>
                        <div className="lxp-ap-worker">
                          <div className="lxp-ap-initials">
                            {(ap?.trabajador_nombre || "—")
                              .split(" ")
                              .filter(Boolean)
                              .slice(0, 2)
                              .map(w => w[0].toUpperCase())
                              .join("")}
                          </div>
                          <div className="lxp-ap-worker-name">{ap?.trabajador_nombre || "—"}</div>
                        </div>
                      </div>

                      <div className="lxp-ap-row" style={{ marginTop: 18 }}>
                        <div className="lxp-label">FECHA PRESENTACIÓN DEMANDA</div>
                        <div className="lxp-ap-date">
                          <span className="material-symbols-outlined">calendar_month</span>
                          <span>{fmtDateLong(fechaPresentacionDemanda)}</span>
                        </div>
                      </div>
                    </div>

                    {/* DERECHA */}
                    <div className="lxp-ap-right">
                      <div className="lxp-ap-row">
                        <div className="lxp-label">ACCIÓN INTENTADA</div>
                        <div className="lxp-ap-box">{ap?.accion_intentada || "—"}</div>
                      </div>

                      <div className="lxp-ap-row" style={{ marginTop: 18 }}>
                        <div className="lxp-label">PRESTACIONES RECLAMADAS</div>
                        <div className="lxp-chip-row">
                          {prestaciones.length ? (
                            prestaciones.map((k) => (
                              <span key={k} className="lxp-chip">
                                {toTitleCase(k.replaceAll("_", " "))}
                              </span>
                            ))
                          ) : (
                            <span className="lxp-chip" style={{ opacity: 0.6 }}>—</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom 2 cards */}
                <div className="lxp-bottom" style={{ marginTop: 18 }}>
                  {/* Hechos */}
                  <div className="lxp-card">
                    <div className="lxp-subhead">
                      <span className="material-symbols-outlined">psychology</span>
                      Hechos y Narrativa
                    </div>
                    <div className="lxp-hechos">
                      <div className="lxp-mini-cards">
                        <div className="lxp-mini-card">
                          <div className="lxp-label">Responsable despido</div>
                          <div className="lxp-v">{hechos?.responsable_despido || "—"}</div>
                        </div>
                        <div className="lxp-mini-card">
                          <div className="lxp-label">Jefes inmediatos</div>
                          <div className="lxp-v">{hechos?.jefes_inmediatos || "—"}</div>
                        </div>
                      </div>

                      <div className="lxp-narr">
                        <div className="lxp-label" style={{ fontSize: 12 }}>Narrativa principal</div>
                        <div className="lxp-narr-box">
                          <div className="lxp-quote">❞</div>
                          <div className="lxp-narr-text">
                            {hechos?.narrativa ? `"${hechos.narrativa}"` : "—"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Condiciones */}
                  <div className="lxp-card">
                    <div className="lxp-subhead">
                      <span className="material-symbols-outlined">work</span>
                      Condiciones de Trabajo
                    </div>
                    <div className="lxp-ct">
                      <div className="lxp-ct-row">
                        <div className="lxp-ct-left">
                          <span className="lxp-badge lxp-badge--indigo">
                            <span className="material-symbols-outlined">calendar_today</span>
                          </span>
                          Fecha ingreso
                        </div>
                        <div className="lxp-ct-val">{fmtShort(ct?.fecha_ingreso)}</div>
                      </div>

                      <div className="lxp-ct-row">
                        <div className="lxp-ct-left">
                          <span className="lxp-badge lxp-badge--blue">
                            <span className="material-symbols-outlined">badge</span>
                          </span>
                          Puesto
                        </div>
                        <div className="lxp-ct-val">{ct?.puesto || "—"}</div>
                      </div>

                      <div className="lxp-ct-row">
                        <div className="lxp-ct-left">
                          <span className="lxp-badge lxp-badge--green">
                            <span className="material-symbols-outlined">payments</span>
                          </span>
                          Salario Diario
                        </div>
                        <div className="lxp-money-green">{ct?.salario_diario ? `$${Number(ct.salario_diario).toFixed(2)}` : "—"}</div>
                      </div>

                      <div className="lxp-ct-row">
                        <div className="lxp-ct-left">
                          <span className="lxp-badge lxp-badge--teal">
                            <span className="material-symbols-outlined">request_quote</span>
                          </span>
                          SDI
                        </div>
                       <div className="lxp-money-teal">
  {ct?.sdi || ct?.salario_diario_integrado
    ? `$${Number(ct?.sdi || ct?.salario_diario_integrado).toFixed(2)}`
    : "—"}
</div>
                      </div>

                      <div className="lxp-ct-row">
                        <div className="lxp-ct-left">
                          <span className="lxp-badge lxp-badge--purple">
                            <span className="material-symbols-outlined">location_on</span>
                          </span>
                          Lugar servicio
                        </div>
                        <div className="lxp-ct-val">{ct?.lugar_servicio || "—"}</div>
                      </div>

                      <div className="lxp-ct-row">
                        <div className="lxp-ct-left">
                          <span className="lxp-badge lxp-badge--blue">
                            <span className="material-symbols-outlined">schedule</span>
                          </span>
                          Jornada
                        </div>
                        <div className="lxp-ct-val">{ct?.jornada || "—"}</div>
                      </div>

                      <div className="lxp-ct-row">
                        <div className="lxp-ct-left">
                          <span className="lxp-badge lxp-badge--indigo">
                            <span className="material-symbols-outlined">weekend</span>
                          </span>
                          Día descanso
                        </div>
                        <div className="lxp-ct-val">{ct?.dia_descanso || "—"}</div>
                      </div>
                    </div>
                  </div>
                  {/* Pruebas del expediente */}
               


                </div>
                 <div className="lxp-pruebas-wrap">
                  <div className="lxp-pruebas-head">
                    <div>
                      <h2 className="lxp-pruebas-title">Pruebas del Expediente</h2>
                      <div className="lxp-pruebas-subtitle">
                        Resumen de pruebas y evidencias registradas en el proceso judicial.
                      </div>
                    </div>

                   
                  </div>

                 {confesionalesActora.length > 0 && (
  <section className="lxp-prueba-card">
    <div className="lxp-prueba-card-head">
      <h3 className="lxp-prueba-card-title">
        <span className="material-symbols-outlined">person_search</span>
        Confesional
      </h3>
    </div>

    <div className="lxp-prueba-stack">
      {confesionalesActora.map((item, idx) => (
        <div
          key={item?.id || `${item?.persona_confesar}-${idx}`}
          className="lxp-prueba-block"
        >
          <div className="lxp-prueba-grid lxp-prueba-grid--2">
            <div className="lxp-kv">
              <div className="lxp-k">Persona a confesar</div>
              <div className="lxp-v">{item?.persona_confesar || "—"}</div>
            </div>

            <div className="lxp-kv">
              <div className="lxp-k">Hechos a confesar</div>
              <div className="lxp-v lxp-prueba-text">{item?.hechos_confesar || "—"}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  </section>
)}
                  <section className="lxp-prueba-card">
  <div className="lxp-prueba-card-head">
    <h3 className="lxp-prueba-card-title">
      <span className="material-symbols-outlined">business</span>
      Confesional Demandada
    </h3>
  </div>

  <div className="lxp-prueba-stack">
    {confesionalesDemandada.length > 0 ? (
      confesionalesDemandada.map((item, idx) => (
        <div
          key={item?.id || `${item?.empresa_nombre}-${idx}`}
          className="lxp-prueba-block"
        >
          <div className="lxp-prueba-grid lxp-prueba-grid--2">
            <div className="lxp-kv">
              <div className="lxp-k">Empresa</div>
              <div className="lxp-v">{item?.empresa_nombre || "—"}</div>
            </div>

            <div className="lxp-kv">
              <div className="lxp-k">Razón social</div>
              <div className="lxp-v">{item?.razon_social || "—"}</div>
            </div>
          </div>
        </div>
      ))
    ) : (
      <div className="lxp-empty-inline">Sin confesional demandada</div>
    )}
  </div>
</section>
<section className="lxp-prueba-card">
  <div className="lxp-prueba-card-head">
    <h3 className="lxp-prueba-card-title">
      <span className="material-symbols-outlined">gavel</span>
      Informe de Autoridad
    </h3>
  </div>

  <div className="lxp-doc-list">
    {informesAutoridadActora.length > 0 ? (
      informesAutoridadActora.map((doc, idx) => (
        <div key={doc?.id || `${doc?.nombre}-${idx}`} className="lxp-doc-item">
          <span className="material-symbols-outlined lxp-doc-icon">description</span>
          <div>
            <div className="lxp-doc-name">{doc?.nombre || "—"}</div>
            <div className="lxp-doc-desc">{doc?.descripcion || "—"}</div>
            <div className="lxp-doc-date">{fmtShort(doc?.fecha)}</div>
          </div>
        </div>
      ))
    ) : (
      <div className="lxp-empty-inline">Sin informes de autoridad</div>
    )}
  </div>
</section>
                  {testigosActora.length > 0 && (
                    <section className="lxp-prueba-card">
                      <div className="lxp-prueba-card-head">
                        <h3 className="lxp-prueba-card-title">
                          <span className="material-symbols-outlined">groups</span>
                          Testimonial
                        </h3>
                      </div>

                      <div className="lxp-testigos-grid">
                        {testigosActora.map((testigo, idx) => (
                          <div key={testigo?.id || `${testigo?.nombre}-${idx}`} className="lxp-testigo-card">
                            <div className="lxp-testigo-avatar">
                              <span className="material-symbols-outlined">person</span>
                            </div>

                            <div className="lxp-testigo-body">
                              <div className="lxp-testigo-name">{testigo?.nombre || "—"}</div>

                              <div className="lxp-testigo-meta">
                                <div className="lxp-testigo-kv">
                                  <div className="lxp-testigo-k">Relación</div>
                                  <div className="lxp-testigo-v">{testigo?.relacion || "—"}</div>
                                </div>

                                <div className="lxp-testigo-kv">
                                  <div className="lxp-testigo-k">Contacto</div>
                                  <div className="lxp-testigo-v">{testigo?.contacto || "—"}</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {(documentosPublicosActora.length > 0 || documentosPrivadosActora.length > 0) && (
                    <div className="lxp-docs-grid">
                      <section className="lxp-prueba-card">
                        <div className="lxp-prueba-card-head">
                          <h3 className="lxp-prueba-card-title">
                            <span className="material-symbols-outlined">account_balance</span>
                            Documental Pública
                          </h3>
                        </div>

                        <div className="lxp-doc-list">
                          {documentosPublicosActora.length ? (
                            documentosPublicosActora.map((doc) => (
                              <div key={doc?.id || doc?.nombre} className="lxp-doc-item">
                                <span className="material-symbols-outlined lxp-doc-icon">description</span>
                                <div>
                                  <div className="lxp-doc-name">{doc?.nombre || "—"}</div>
                                  <div className="lxp-doc-desc">{doc?.descripcion || "—"}</div>
                                  <div className="lxp-doc-date">{fmtShort(doc?.fecha)}</div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="lxp-empty-inline">Sin documentos públicos</div>
                          )}
                        </div>
                      </section>

                      <section className="lxp-prueba-card">
                        <div className="lxp-prueba-card-head">
                          <h3 className="lxp-prueba-card-title">
                            <span className="material-symbols-outlined">article</span>
                            Documental Privada
                          </h3>
                        </div>

                        <div className="lxp-doc-list">
                          {documentosPrivadosActora.length ? (
                            documentosPrivadosActora.map((doc) => (
                              <div key={doc?.id || doc?.nombre} className="lxp-doc-item">
                                <span className="material-symbols-outlined lxp-doc-icon">description</span>
                                <div>
                                  <div className="lxp-doc-name">{doc?.nombre || "—"}</div>
                                  <div className="lxp-doc-desc">{doc?.descripcion || "—"}</div>
                                  <div className="lxp-doc-date">{fmtShort(doc?.fecha)}</div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="lxp-empty-inline">Sin documentos privados</div>
                          )}
                        </div>
                      </section>
                    </div>
                  )}

                  {(pericialActora?.tipo?.length > 0 || pericialActora?.perito || pericialActora?.objeto) && (
                    <section className="lxp-prueba-card">
                      <div className="lxp-prueba-card-head">
                        <h3 className="lxp-prueba-card-title">
                          <span className="material-symbols-outlined">clinical_notes</span>
                          Pericial
                        </h3>
                      </div>

                      <div className="lxp-prueba-grid lxp-prueba-grid--3">
                        <div className="lxp-kv">
                          <div className="lxp-k">Tipo de pericial</div>
                          <div className="lxp-v">{formatTipoList(pericialActora?.tipo)}</div>
                        </div>

                        <div className="lxp-kv">
                          <div className="lxp-k">Perito propuesto</div>
                          <div className="lxp-v">{pericialActora?.perito || "—"}</div>
                        </div>

                        <div className="lxp-kv">
                          <div className="lxp-k">Objeto de la prueba</div>
                          <div className="lxp-v">{pericialActora?.objeto || "—"}</div>
                        </div>
                      </div>
                    </section>
                  )}

                  {(inspeccionOcularActora?.items?.length > 0) && (
  <section className="lxp-prueba-card">
    <div className="lxp-prueba-card-head">
      <h3 className="lxp-prueba-card-title">
        <span className="material-symbols-outlined">visibility</span>
        Inspección Ocular
      </h3>
    </div>

    <div className="lxp-prueba-stack">
      {inspeccionOcularActora.items.map((item, idx) => (
        <div key={item?.id || idx} className="lxp-prueba-block">
          
          <div className="lxp-prueba-grid lxp-prueba-grid--2">
            <div className="lxp-kv">
              <div className="lxp-k">Tipo</div>
              <div className="lxp-v">{item?.tipo || "—"}</div>
            </div>

            <div className="lxp-kv">
              <div className="lxp-k">Nombre</div>
              <div className="lxp-v">{item?.nombre || "—"}</div>
            </div>
          </div>

          <div className="lxp-kv" style={{ marginTop: 12 }}>
            <div className="lxp-k">Objeto</div>
            <div className="lxp-v">{item?.objeto || inspeccionOcularActora?.objeto || "—"}</div>
          </div>

        </div>
      ))}
    </div>
  </section>
)}

                  <div className="lxp-status-grid">
                    <div className="lxp-status-card">
                      <div>
                        <div className="lxp-status-title">Instrumental de Actuaciones</div>
                        <div className="lxp-status-subtitle">Integrada formalmente al expediente</div>
                      </div>

                      <div className={`lxp-status-badge ${tieneInstrumentalActora ? "is-on" : "is-off"}`}>
                        <span className="material-symbols-outlined">
                          {tieneInstrumentalActora ? "check_circle" : "remove_circle"}
                        </span>
                        {tieneInstrumentalActora ? "Incluida" : "No incluida"}
                      </div>
                    </div>

                    <div className="lxp-status-card">
                      <div>
                        <div className="lxp-status-title">Presuncional Legal y Humana</div>
                        <div className="lxp-status-subtitle">Deducciones extraídas de hechos</div>
                      </div>

                      <div className={`lxp-status-badge ${tienePresuncionalActora ? "is-on" : "is-off"}`}>
                        <span className="material-symbols-outlined">
                          {tienePresuncionalActora ? "check_circle" : "remove_circle"}
                        </span>
                        {tienePresuncionalActora ? "Incluida" : "No incluida"}
                      </div>
                    </div>
                    <div className="lxp-status-card">
  <div>
    <div className="lxp-status-title">Confesional Expresa</div>
    <div className="lxp-status-subtitle">Reconocimiento directo de hechos</div>
  </div>

  <div className={`lxp-status-badge ${tieneConfesionalExpresa ? "is-on" : "is-off"}`}>
    <span className="material-symbols-outlined">
      {tieneConfesionalExpresa ? "check_circle" : "remove_circle"}
    </span>
    {tieneConfesionalExpresa ? "Incluida" : "No incluida"}
  </div>
</div>
                  </div>
                </div>
              </>
            )}

            {activeMainTab === "2" && (
            <div style={{ marginTop: 18 }}>
          <EtapaProcesalOrdinario
 expedienteId={idExpediente}
  fase="ESCRITA"
fechaConstanciaConciliacionProp={fechaNoConciliacionDemanda}
fechaEmisionCitatorioProp={fechaEmisionDemanda}
fechaRadicacionProp={fechaRadicacionDemanda}
diasLimiteProp={diasLimiteDemanda}
  etapaNombre="Contestación"
  fechaBaseTermino={fechaPresentacionDemanda}
  fechaNotificacionDemandaProp={fechaNotificacionDemanda}
  fechaUltimoDiaLaboradoProp={fechaUltimoDiaLaborado}
  fechaLimiteContestacion={fechaLimiteDemanda}
  etapaNumero={5}
  descripcionEtapa={""}
  diasLabel={typeof diasVencidos === "number" ? `${Math.abs(diasVencidos)} Días` : "—"}
  fechaLimiteLabel={`Límite: ${fmtShort(etapa?.fecha_limite_contestacion)}`}
  progresoPct={70}
  documentos={[
    { id: 1, name: "Contestacion_firmada.pdf", ext: "pdf", size: "2.4 MB", when: "Hace 2 horas" },
    { id: 2, name: "Anexo_Pruebas.docx", ext: "docx", size: "1.1 MB", when: "Ayer" },
  ]}
  onCargar={() => notification.info({ message: "Cargar", description: "Conecta tu flujo aquí." })}
  onCompletar={() => notification.success({ message: "Completado", description: "Conecta tu flujo aquí." })}
  onAgregarDoc={() => notification.info({ message: "Agregar", description: "Conecta tu flujo aquí." })}
  onVerDoc={(d) => notification.info({ message: "Ver documento", description: d?.name || "—" })}
  onEliminarDoc={(d) => notification.warning({ message: "Eliminar", description: d?.name || "—" })}
/>
              </div>
            )}

            {activeMainTab === "3" && (
              <div style={{ marginTop: 18 }}>
                <EtapaProcesalOrdinario
                  expedienteId={idExpediente}
                  fase="ORAL"
                  etapaNombre="Audiencia"
                  etapaNumero={10}
                  descripcionEtapa={""}
                  diasLabel="—"
                  fechaLimiteLabel="Límite: —"
                  progresoPct={30}
                />
              </div>
            )}

            {activeMainTab === "4" && (
              <div style={{ marginTop: 18 }}>
                <TabCuantificaciones
                  detalle={detalle}
                  expedienteId={idExpediente}
                  onExportar={() => notification.info({ message: "Exportar", description: "Conecta exportación a Excel aquí." })}
                  onNuevoConcepto={() => notification.info({ message: "Nuevo concepto", description: "Conecta tu modal/form aquí." })}
                  onEditarConcepto={(it) => notification.info({ message: "Editar", description: it?.title || "Concepto" })}
                />
              </div>
            )}
               {activeMainTab === "5" && (
  <div style={{ marginTop: 18 }}>
    <TabBitacora
    expedienteId={idExpediente}
      detalle={detalle}
      onVerDocumento={(item) => {
        const url = item?.url || item?.documento_url || item?.file_url;
        if (!url) return;
        const finalUrl = String(url).startsWith("/api") ? url : `/api${url}`;
        window.open(finalUrl, "_blank", "noopener,noreferrer");
      }}
    />
  </div>
)}
          </div>

     
        </div>

        <div style={{ height: 40 }} />
      </div>
    </div>
  );
}
