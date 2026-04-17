// src/pages/materias/laboral/CrearExpedientePage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Breadcrumb, Button, Spin, notification } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import dayjs from "dayjs";
import { useParams, useNavigate, useLocation, useSearchParams } from "react-router-dom";

import FormCentroConciliacion from "../../components/forms/centro_conciliacion/FormCentroConciliacion";
import {actionConciliacionGetByID} from "../../redux/actions/conciliacion/conciliacion";

// ====== helpers ======
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

const backendToInitialValues = (d) => {
  if (!d) return {};

  // ✅ RS como ARRAY DE IDS (Select NO usa labelInValue)
  const rs = Array.isArray(d.razones_sociales) ? d.razones_sociales : [];
  const rsIds = rs
    .map((x) => x?.id_razon_social ?? x?.id ?? null)
    .filter((v) => v !== null && v !== undefined)
    .map((v) => Number(v));

  const formaNot = d.tipo_notificado === "actuario" ? "actuario" : "trabajador";
  const proximaAudISO = d.fecha_proxima_audiencia || d.fecha_audiencia_inicial || null;

  return {
    exp: d.expediente,

    empresa_id: d.id_empresa ?? null,
    empresa_nombre: d.nombre_empresa ?? "",

    // ✅ ahora sí: values
    empresa_razon_social_id: rsIds,

    trabajador_nombre: d.nombre_trabajador ?? "",
    abogado_contrario: d.abogado_contrario ?? "",
    objeto_solicitud: d.nombre_objeto ?? "",
    forma_notificacion: formaNot,
    origen_actuario: d.tipo_notificado_actuario ?? undefined,

    id_medio_notificacion:
      d.id_medio_notificacion != null ? Number(d.id_medio_notificacion) : undefined,

    fecha_emision_expediente: isoToDDMMYYYY(d.fecha_emision_expediente),
    fecha_audiencia: proximaAudISO ? isoToDDMMYYYY_HHMM(proximaAudISO) : "",

    fecha_proxima_audiencia: isoToDayjs(proximaAudISO),

    fecha_hora_cita_recepcion: d.fecha_notificacion
      ? isoToDDMMYYYY_HHMM(d.fecha_notificacion)
      : "",
  };
};

const getInt = (sp, key) => {
  const v = sp.get(key);
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
export default function CrearExpedientePage(props) {
  const location = useLocation();
  const [searchParams] = useSearchParams();


const idEstado = getInt(searchParams, "estado") ?? location.state?.idEstado ?? null;
const idCiudad = getInt(searchParams, "ciudad") ?? location.state?.idCiudad ?? null;
const idAutoridad = getInt(searchParams, "autoridad") ?? location.state?.idAutoridad ?? null;

  const nombreIdentificacionCiudad =

    location.state?.nombreIdentificacionCiudad ??
    "";



  const { idExpediente } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const isEdit = Boolean(idExpediente);

  const { detalle } = useSelector((state) => state?.conciliacion ?? {});
  const [loadingEdit, setLoadingEdit] = useState(false);

  // KEY estable: evita recalcular initialValues por “cualquier” cambio del objeto detalle
  const detalleKey = useMemo(() => {
    if (!isEdit) return "";
    return String(detalle?.updated_at || detalle?.id || idExpediente || "");
  }, [isEdit, detalle?.updated_at, detalle?.id, idExpediente]);

  // initialValues estable: en CREATE siempre es el MISMO objeto
  const emptyInitialValues = useMemo(() => ({}), []);

  const initialValues = useMemo(() => {
    if (!isEdit) return emptyInitialValues;
    return backendToInitialValues(detalle);
  }, [isEdit, detalleKey, emptyInitialValues]);



  const handleBack = () => {
    navigate(`/materias/laboral/centro-conciliacion`);
  };

  useEffect(() => {
    if (!isEdit) return;

    (async () => {
      try {
        setLoadingEdit(true);

        await dispatch(actionConciliacionGetByID(idExpediente));
       
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

  const commonProps = {
    
    onSaved: () => handleBack(),
    onCancel: () => handleBack(),
  };

  const formNode = (
    <FormCentroConciliacion
      {...commonProps}
      idEstado={idEstado}
      isEdit={isEdit}
      idCiudad={idCiudad}
      idExpediente={idExpediente}
      initialValues={initialValues}
      idAutoridad={idAutoridad}
      nombreIdentificacionCiudad={nombreIdentificacionCiudad}
        showTopActions={true}

    />
  );

  return (
    <main className="laboral-main">
      <div className="expediente-page-container">
        <section className="laboral-header-section">
          <div className="laboral-header-left">
            <Button
              type="link"
              icon={<ArrowLeftOutlined />}
              onClick={handleBack}
              className="laboral-back-btn"
            >
              Volver a expedientes
            </Button>
          </div>

       
        </section>

        {isEdit ? (
          <Spin spinning={loadingEdit} tip="Cargando expediente...">
            {formNode}
          </Spin>
        ) : (
          formNode
        )}
      </div>

      <style>
        {`
.expediente-page-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px 24px 40px;
}

.laboral-header-section {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 16px;
}

.laboral-header-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.laboral-back-btn {
  padding-left: 0;
}
        `}
      </style>
    </main>
  );
}
