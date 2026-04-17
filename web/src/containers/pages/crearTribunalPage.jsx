// src/pages/materias/laboral/CrearExpedientePage.jsx
import React, { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { notification, Spin, Button } from "antd";

import FormTribunal from "../../components/forms/tribunal/FormTribunal";
import { actionTribunalGetByIdRedux, actionTribunalCreate, actionTribunalUpdateById } from "../../redux/actions/tribunal/tribunal";
import {actionConciliacionGet} from "../../redux/actions/conciliacion/conciliacion"
/* ===== helpers ===== */
const pad2 = (n) => String(n).padStart(2, "0");

const isoToDDMMYYYY = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
};

const isoToDDMMYYYY_HHMM = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} ${pad2(
    d.getHours()
  )}:${pad2(d.getMinutes())}`;
};

const isoToDayjs = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return dayjs(iso);
};

const extractFolioFromExpediente = (expediente) => {
  if (!expediente) return "";
  const parts = String(expediente).split("/");
  return parts.length ? parts[parts.length - 1] : String(expediente);
};

const isoToYMD = (iso) => {
  console.log(iso)
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
};

const backendToInitialValues = (d) => {
  if (!d) return {};

  const dg = d?.datos_generales || {};
  const ap = d?.acciones_prestaciones || {};
  const hx = d?.hechos || {};
  const ct = d?.condiciones_trabajo || {};
  const ep = d?.etapas_procesales || {};
  const pd = d?.pruebas_documentacion || {};
  console.log(d)

  // razones sociales (tu backend manda {id_razon_social, razon_social})
  const rsIds =
    Array.isArray(dg?.razones_sociales) ? dg.razones_sociales.map((x) => x?.id_razon_social).filter(Boolean) : [];

  // CITATORIO:
  // - si hay citatorio en ep => lo metemos como row sin _file
  // - si NO hay, dejamos []
  const citatorioArr = [];
  if (ep?.citatorio?.filename || ep?.citatorio?.url) {
    citatorioArr.push({
      id: String(ep?.citatorio?.id_tribunal_documento || ep?.id_tribunal_documento_citatorio || Date.now()),
      filename: ep?.citatorio?.filename || "documento.pdf",
      estado: "Cargado",
      url: ep?.citatorio?.url || "",
      // _file NO existe en edit
    });
  }

  // checklist/detalle pueden venir como string en vez de array (tu JSON trae "general_de":"trabajador")
  const toArr = (v) => (Array.isArray(v) ? v : v == null || v === "" ? [] : [v]);

  const detalleActora = pd?.detalle?.actora || {};
  const checklistActora = pd?.checklist?.actora || {};
  console.log(ep)

  return {
    // DATOS GENERALES
    num_unico: dg?.num_unico ?? "",
    numero_expediente: dg?.numero_expediente ?? "",
    nombre_parte_actora: ap?.trabajador_nombre ?? dg?.nombre_parte_actora ?? "",

    estado: dg?.estado ?? null,
    ciudad: dg?.ciudad ?? null,
    autoridad: dg?.autoridad ?? null,

    empresa_id: dg?.empresa_id ?? null,
    empresa_nombre: dg?.empresa_nombre ?? "",
    empresa_razon_social_ids: rsIds,

    corresponsal_nombre: dg?.corresponsal_nombre ?? "No hay corresponsal",

    // ETAPA PROCESAL (en tu JSON está como etapa_procesal, NO como "etapas_procesales")
    fecha_limite_contestacion: isoToYMD(ep?.fecha_limite_contestacion),
    fecha_audiencia_conciliatoria: isoToYMD(ep?.fecha_audiencia_conciliatoria),
    observaciones_etapa_actual: ep?.observaciones_etapa_actual ?? "",

    fecha_notificacion_demanda: isoToYMD(ep?.fecha_notificacion_demanda),
    fecha_presentacion_demanda: isoToYMD(ep?.fecha_presentacion_demanda),
    fecha_ultimo_dia_laborado: isoToYMD(ep?.fecha_ultimo_dia_laborado),

    citatorio: citatorioArr,

    // ACCIONES Y PRESTACIONES
    accion_intentada: ap?.accion_intentada ?? "",
    prestaciones: {
      // tu estado espera booleanos por key
      ...(ap?.prestaciones || {}),
    },
    otras_prestaciones: ap?.otras_prestaciones ?? "",

    // HECHOS
    responsable_despido: hx?.responsable_despido ?? "",
    jefes_inmediatos: hx?.jefes_inmediatos ?? "",
    hechos: hx?.narrativa ?? "",

    // CONDICIONES
    fecha_ingreso: isoToYMD(ct?.fecha_ingreso),
    puesto: ct?.puesto ?? "",
    salario_diario: ct?.salario_diario ?? "",
    salario_diario_integrado: ct?.salario_diario_integrado ?? "",
    jornada: ct?.jornada ?? "",
    dia_descanso: ct?.dia_descanso ?? "",
    lugar_servicio: ct?.lugar_servicio ?? "",

    // PRUEBAS
    pruebas_tab: pd?.tab === "actora" || pd?.tab === "demandada" ? pd.tab : "actora",
    pruebas_checklist: {
      actora: {
        ...checklistActora,
        // mantiene defaults true en instrumental/presuncional si no vienen
        instrumental_actuaciones: checklistActora?.instrumental_actuaciones ?? true,
        presuncional_legal_humana: checklistActora?.presuncional_legal_humana ?? true,
      },
    },
    pruebas_detalle: {
      actora: {
        ...detalleActora,
        confesional: {
            ...(detalleActora?.confesional || {}),
            registros: Array.isArray(detalleActora?.confesional?.registros)
              ? detalleActora.confesional.registros.map((item) => ({
                  id: item?.id || `${Date.now()}_${Math.random().toString(16).slice(2)}`,
                  tipo_prueba: item?.tipo_prueba || "",
                  persona_confesar: item?.persona_confesar || "",
                  hechos_confesar: item?.hechos_confesar || "",
                  fecha_solicitud: isoToYMD(item?.fecha_solicitud),
                }))
              : (
                  detalleActora?.confesional?.tipo_prueba ||
                  detalleActora?.confesional?.persona_confesar ||
                  detalleActora?.confesional?.hechos_confesar ||
                  detalleActora?.confesional?.fecha_solicitud
                )
              ? [
                  {
                    id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
                    tipo_prueba: detalleActora?.confesional?.tipo_prueba || "",
                    persona_confesar: detalleActora?.confesional?.persona_confesar || "",
                    hechos_confesar: detalleActora?.confesional?.hechos_confesar || "",
                    fecha_solicitud: isoToYMD(detalleActora?.confesional?.fecha_solicitud),
                  },
                ]
              : [],
          },
        testimonial: {
          ...(detalleActora?.testimonial || {}),
          tipo: toArr(detalleActora?.testimonial?.tipo),
          testigos: Array.isArray(detalleActora?.testimonial?.testigos)
            ? detalleActora.testimonial.testigos.map((t) => ({
                id: t?.id || `${Date.now()}_${Math.random().toString(16).slice(2)}`,
                nombre: t?.nombre || "",
              }))
            : [],
        },
        documental_publica: {
          ...(detalleActora?.documental_publica || {}),
          tipo: toArr(detalleActora?.documental_publica?.tipo),
        },
        documental_privada: {
          ...(detalleActora?.documental_privada || {}),
          tipo: toArr(detalleActora?.documental_privada?.tipo),
        },
        pericial: {
          ...(detalleActora?.pericial || {}),
          tipo: toArr(detalleActora?.pericial?.tipo),
        },
      },
    },
  };
};

export default function CrearExpedientePage(props) {
  const location = useLocation();
const [submitting, setSubmitting] = useState(false);

  
  const idCiudad = props?.ciudad ?? location.state?.ciudad ?? null;
  const nombreIdentificacionCiudad =
    props?.nombreIdentificacionCiudad ?? location.state?.nombreIdentificacionCiudad ?? "";

  const { idExpediente } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const isEdit = Boolean(idExpediente);
  const idAutoridad = isEdit? props?.idAutoridad ?? location.state?.idAutoridad ?? null : null;

  const detallesState = useSelector((state) => state?.tribunal?.detalles);
const detalle = detallesState?.detalle ?? detallesState ?? null;

  console.log(detalle)
  const [loadingEdit, setLoadingEdit] = useState(false);


const initialValues = useMemo(() => {
  if (!isEdit || !detalle) return {};
  return backendToInitialValues(detalle);
}, [isEdit, detalle]);
console.log(initialValues)
  useEffect(() => {
    if (!isEdit) return;

    (async () => {
      try {
        setLoadingEdit(true);
        await dispatch(actionTribunalGetByIdRedux(idExpediente));
      } catch (e) {
        notification.error({
          message: "No se pudo cargar el expediente",
          description: e?.message || "Sin detalle",
          placement: "bottomRight",
        });
      } finally {
        setLoadingEdit(false);
      }
    })();
  }, [dispatch, isEdit, idExpediente]);

 const onCancel = () => {
    navigate(`/materias/laboral/tribunal`);
  };

  const onSave = () => {
    window.dispatchEvent(new CustomEvent("oa:expediente:save"));
  };
const ready = !isEdit || !!detalle;
   return (
    <div className="oa-exp-page">
      {/* PORTADA (titulo grande como HTML) */}
     <section className="oa-exp-topbar">
  <div className="oa-exp-topbar-left">
    <h1 className="oa-exp-title">REGISTRO DE EXPEDIENTE DE TRIBUNAL</h1>
    <p className="oa-exp-subtitle">REGISTRO DE DEMANDA LABORAL / DEFENSA PATRONAL ESPECIALIZADA</p>
  </div>

  <div className="oa-exp-topbar-right">
    <button type="button" className="oa-exp-btn oa-exp-btn-ghost" onClick={onCancel}>
      Cancelar
    </button>
    <button type="button" className="oa-exp-btn oa-exp-btn-primary" onClick={onSave}>
      Guardar expediente
    </button>
  </div>
</section>


      {/* CONTENIDO (NO TOCAR EL FORM) */}
      <main className="oa-exp-main">
          {!ready ? (
    <div style={{ padding: 24, display: "flex", justifyContent: "center" }}>
      <Spin />
    </div>
  ) : (
        <FormTribunal
isEdit={isEdit}
      idCiudad={idCiudad}
      idExpediente={idExpediente}
      initialValues={initialValues}
      idAutoridad={idAutoridad}
      nombreIdentificacionCiudad={nombreIdentificacionCiudad}
      onCancel={onCancel}
onSubmit={async (payload, filesMap) => {
  try {
   if (isEdit) {
  const updated = await dispatch(
    actionTribunalUpdateById(idExpediente, payload, () => {}, filesMap)
  );

  notification.success({
    message: "Actualizado",
    description: "Se guardó correctamente.",
    placement: "bottomRight",
  });

  navigate(`/materias/laboral/tribunal/${idExpediente}`);
} else {
  const created = await dispatch(
    actionTribunalCreate(payload, () => {}, filesMap)
  );

  // ✅ aquí ya tienes response.data
  const newId =
    created?.id ||
    created?.data?.id ||
    created?.id_expediente ||
    created?.id_tribunal ||
    created?.insertId;

  notification.success({
    message: "Guardado",
    description: "Se guardó correctamente.",
    placement: "bottomRight",
  });

  if (newId) {
    navigate(`/materias/laboral/tribunal/${newId}`);
  } else {
    // fallback seguro si tu backend no manda id
    navigate("/materias/laboral/tribunal");
  }
}

  } catch (e) {
    const status = e?.response?.status;
    const backendMsg =
      e?.response?.data?.detail ||
      e?.response?.data?.message ||
      e?.message ||
      "Error";

    if (status === 409) {
      notification.error({
        message: "Registro duplicado",
        description: backendMsg,
        placement: "bottomRight",
      });
      return;
    }

    notification.error({
      message: "No se pudo guardar",
      description: backendMsg,
      placement: "bottomRight",
    });

    throw e;
  }
}}




/>
  )}
      </main>
    </div>
  );
}