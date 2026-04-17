// src/components/laboral/AudienciaPrejudicialCard.jsx
import React, { useState, useEffect } from "react";
import { Card, Tabs, Space, Typography, Button } from "antd";

import PrimeraAudienciaView from "./audiencias/PrimeraAudienciaView";
import PrimeraAudienciaForm from "./audiencias/PrimeraAudienciaForm";
import AudienciaGenericaView from "./audiencias/AudienciaGenericaView";
import AudienciaGenericaForm from "./audiencias/AudienciaGenericaForm";
import { actionAbogadosGet } from "../../redux/actions/abogados/abogados";

import {
  parsePrestaciones,
  mapStatusToResultado,
  isPrimeraAudienciaVacia,
} from "./audiencias/audienciaHelpers";

import "./audiencias/CardAudiencia.css";
import { useDispatch, useSelector } from "react-redux";

const { Title, Text } = Typography;

const collapseSpaces = (s) =>
  String(s ?? "")
    .normalize("NFC")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ");

const sanitizeByField = (name, v) => {
  const s = collapseSpaces(v);
  switch (name) {
    case "exp":
      return s.replace(/[^A-Za-z0-9_\-./ ]/g, "").slice(0, 50);
    case "abogado":
    case "abogado_contrario":
    case "trabajador_nombre":
      return s.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ'.\- ]/g, "").slice(0, 100);
    case "empresa":
      return s
        .replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9&.,()\/\- ]/g, "")
        .slice(0, 120);
    case "ciudad":
    case "estado":
      return s.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9_\- ]/g, "").slice(0, 60);
    default:
      return s;
  }
};

const coerceItemsFromSlice = (slice) => {
  if (!slice) return [];
  if (Array.isArray(slice.items)) return slice.items;
  if (Array.isArray(slice.data)) return slice.data;
  if (Array.isArray(slice?.data?.items)) return slice.data.items;
  if (Array.isArray(slice?.payload?.items)) return slice.payload.items;
  return [];
};

const toNullIfEmptyEffective = (v) => {
  if (v === undefined || v === null) return null;
  if (typeof v !== "string") return v;
  return v.replace(/\s/g, "") === "" ? null : v;
};

const makeNormalizer = (field) => (v) => {
  const clean = sanitizeByField(field, v);
  return toNullIfEmptyEffective(clean) === null ? "" : clean;
};
const isAudienciaGenericaVacia = (a) => {
  if (!a) return true;

  const resultado = a.resultado || null;
  const status = a.id_conciliacion_status || null;
  const fecha = a.fecha_audiencia || null;

  const hasDoc =
    !!a.documento || !!a.documento_constancia || !!a.is_constancia_documento;

  const hasContenido =
    !!collapseSpaces(a.resumen_pretensiones_html || "") ||
    !!collapseSpaces(a.motivo_resultado || "") ||
    !!collapseSpaces(a.fundamento_resultado || "") ||
    !!collapseSpaces(a.motivo_diferimiento || "");

  return !resultado && !status && !fecha && !hasDoc && !hasContenido;
};

function AudienciaPrejudicialCard({ data, dataAudiencias, jump }) {
  const [activeTab, setActiveTab] = useState("1");
  const [isEdit, setIsEdit] = useState(false);
  const dispatch = useDispatch();

  const [primeraAudiencia, setPrimeraAudiencia] = useState(null);
  const [primeraData, setPrimeraData] = useState(null);
  const [mode, setMode] = useState("empty"); // primera

  const [segundaData, setSegundaData] = useState(null);
  const [segundaMode, setSegundaMode] = useState("empty");

  const [terceraData, setTerceraData] = useState(null);
  const [terceraMode, setTerceraMode] = useState("empty");


  // =========================
  // Cargar audiencias desde backend (primera, segunda, tercera)
  // =========================
  useEffect(() => {
    if (!dataAudiencias?.items || dataAudiencias.items.length === 0) {
      setPrimeraAudiencia(null);
      setPrimeraData(null);
      setMode("empty");

      setSegundaData(null);
      setSegundaMode("empty");

      setTerceraData(null);
      setTerceraMode("empty");
      return;
    }

    // Ordenar por num_audiencia y, en empate, por fecha_audiencia
    const sorted = [...dataAudiencias.items].sort((a, b) => {
      const na = a.num_audiencia ?? 0;
      const nb = b.num_audiencia ?? 0;
      if (na !== nb) return na - nb;

      const fa = a.fecha_audiencia ? new Date(a.fecha_audiencia).getTime() : 0;
      const fb = b.fecha_audiencia ? new Date(b.fecha_audiencia).getTime() : 0;
      return fa - fb;
    });

    const [aud1, aud2, aud3] = sorted;

    const mapAudienciaFromBackend = (item) => {
      if (!item) return null;

      const prestacionesFromBackend = Array.isArray(item.prestaciones)
        ? item.prestaciones
        : [];

      const prestacionesReclamadas =
        prestacionesFromBackend.length > 0
          ? prestacionesFromBackend.map((p) => p.prestacion)
          : parsePrestaciones(item.prestaciones_reclamadas);

      return {
        resumen_pretensiones_html: item.pretension_trabajador || "",
        documento: item.documento || null,
        is_constancia_documento: item.is_constancia_documento || 0,
        documento_constancia: item.documento_constancia || null,
        monto_estimado_trabajador: item.monto_estimado_trabajador,

        prestaciones: prestacionesFromBackend,
        prestaciones_reclamadas: prestacionesReclamadas,

        id: item.id,
        nombre_abogado: item.nombre_abogado || "",
        id_abogado: item.id_abogado || null,

        propuesta_inicial_trabajador:
          item.propuesta_final_trabajador ??
          item.propuesta_inicial_trabajador ??
          null,
        propuesta_inicial_patron:
          item.propuesta_final_patron ?? item.propuesta_inicial_patron ?? null,

        contra_trabajador_1: item.contraoferta_solicitante_uno,
        contra_patron_1: item.contraoferta_patron_uno,

        propuesta_final_trabajador: item.propuesta_final_trabajador,
        propuesta_final_patron: item.propuesta_final_patron,
        intervencion_conciliador: item.intervencion_conciliador,

        motivo_resultado: item.motivo_resultado,
        fundamento_resultado: item.fundamento,
        riesgos_detectados: item.riesgos_detectados || item.riesgos,
        acciones_recomendadas: item.acciones_inmediatas,

        resultado:
          mapStatusToResultado(item.id_conciliacion_status) ||
          item.resultado ||
          null,

        monto_convenio: item.monto_convenio || null,
        forma_pago_convenio: item.forma_pago_convenio || null,
        fecha_pago_convenio: item.fecha_pago_convenio || null,
        pagos_convenio: item.pagos_convenio || [],

        fecha_proxima_audiencia: item.fecha_proxima_audiencia || null,
        motivo_diferimiento: item.motivo_diferimiento || "",
        motivo_archivo: item.motivo_archivo || "",

        num_audiencia: item.num_audiencia,
        fecha_audiencia: item.fecha_audiencia,
        id_conciliacion_status: item.id_conciliacion_status,
        incomparecencia: item.incomparecencia,
      };
    };

    const primeraMapped = mapAudienciaFromBackend(aud1);
    const segundaMapped = mapAudienciaFromBackend(aud2);
    const terceraMapped = mapAudienciaFromBackend(aud3);

    // PRIMERA
    if (primeraMapped && !isPrimeraAudienciaVacia(primeraMapped)) {
      setPrimeraAudiencia(primeraMapped);
      setMode("view");
    } else {
      setPrimeraAudiencia(null);
      setPrimeraData(null);
      setMode("empty");
    }

    // SEGUNDA
    // SEGUNDA
if (segundaMapped && !isAudienciaGenericaVacia(segundaMapped)) {
  setSegundaData(segundaMapped);
  setSegundaMode("view");
} else {
  setSegundaData(null);
  setSegundaMode("empty");
}

// TERCERA
if (terceraMapped && !isAudienciaGenericaVacia(terceraMapped)) {
  setTerceraData(terceraMapped);
  setTerceraMode("view");
} else {
  setTerceraData(null);
  setTerceraMode("empty");
}

  }, [dataAudiencias]);

  // =========================
  // Cargar catálogos al montar
  // =========================
  useEffect(() => {
    dispatch(actionAbogadosGet());
  }, [dispatch]);

  const abogadosSlice = useSelector((state) => state.abogados || {});
  const abogadosItems = coerceItemsFromSlice(abogadosSlice);
  const abogadoOptions = abogadosItems
    .map((a) => ({
      label: collapseSpaces(a?.nombre_abogado || ""),
      value: a?.id,
    }))
    .filter((o) => o.label);

  useEffect(() => {
    if (primeraAudiencia) {
      setPrimeraData(primeraAudiencia);
      setMode("view");
    } else {
      setPrimeraData(null);
      setMode("empty");
    }
  }, [primeraAudiencia]);


  const hasPrimera = !!primeraData;
  const hasSegunda = !!segundaData;
  const hasTercera = !!terceraData;

  const resultadoPrimera = primeraData?.resultado || primeraAudiencia?.resultado || null;
  const resultadoSegunda = segundaData?.resultado || null;
  const resultadoTercera = terceraData?.resultado || null;

  const showTab2 = hasSegunda || (hasPrimera && resultadoPrimera === "diferimiento");
  const showTab3 = hasTercera || (hasSegunda && resultadoSegunda === "diferimiento");

  const headerInfo = {
    id:data.id,
    expediente: data?.expediente || "",
    trabajador: data?.nombre_trabajador || "",
    empresa: data?.nombre_empresa || "",
    causaTerminacion: data?.motivo_baja || "",
    fechaAudiencia: data?.fecha_cita_audiencia || data?.fecha_creacion_expediente || null,
    fechaProximaAudiencia: data?.fecha_proxima_audiencia || null,
  };

  // =========================
  // Jump "adelantar" con prioridad correcta (3ra > 2da)
  // =========================
 useEffect(() => {
  if (!jump?.ts) return;
  if (jump.type !== "adelantar") return;

  // Si ya existe tercera, cae en view
  if (hasTercera) {
    setActiveTab("3");
    setTerceraMode("view");
    return;
  }

  // Si no existe tercera pero ya hay segunda, abrimos tercera en form
  if (!hasTercera && hasSegunda) {
    setActiveTab("3");
    setIsEdit(false);
    setTerceraMode("form");
    return;
  }

  // Si ya existe segunda, view
  if (hasSegunda) {
    setActiveTab("2");
    setSegundaMode("view");
    return;
  }

  // Si no existe segunda pero hay primera, abrimos segunda en form
  if (!hasSegunda && hasPrimera) {
    setActiveTab("2");
    setIsEdit(false);
    setSegundaMode("form");
    return;
  }

  // Si ni primera existe, te quedas en 1
  setActiveTab("1");

}, [jump?.ts, jump?.type, hasPrimera, hasSegunda, hasTercera]);


  const isDiferimiento =
    (primeraData && primeraData.resultado === "diferimiento") ||
    (primeraAudiencia && primeraAudiencia.resultado === "diferimiento");

  const onClickEditPrimera = () => {
    setMode("form");
    setIsEdit(true);
  };

  // Tabs disponibles
  const tabItems = [{ key: "1", label: "Primera audiencia" }];
  if (showTab2) tabItems.push({ key: "2", label: "Segunda audiencia" });
  if (showTab3) tabItems.push({ key: "3", label: "Tercera audiencia" });

  // Corregir pestaña activa si desaparece alguna audiencia
  useEffect(() => {
    if (!hasPrimera && activeTab !== "1") {
      setActiveTab("1");
      return;
    }

    if (activeTab === "2" && !showTab2) {
      setActiveTab("1");
      return;
    }

    if (activeTab === "3" && !showTab3) {
      setActiveTab(showTab2 ? "2" : "1");
      return;
    }

    if (hasPrimera && isDiferimiento && !hasSegunda && activeTab === "3") {
      setActiveTab("2");
    }
  }, [hasPrimera, hasSegunda, isDiferimiento, activeTab, showTab2, showTab3]);
 console.log(activeTab)
  console.log(mode)
  // =========================
  // PRIMERA AUDIENCIA: cuando no existe
  // =========================
  if (mode === "empty") {
    return (
      <section className="laboral-exp-section">
        <PrimeraAudienciaForm
          jump={jump}
          isEdit={false}
          header={headerInfo}
          initialData={primeraData}
          abogadoOptions={abogadoOptions}
          dataAudiencias={primeraAudiencia}
          onCancel={() => {
            if (primeraData) setMode("view");
            else setMode("empty");
          }}
          onSaved={() => {
            setMode("view");
            setIsEdit(false);
          }}
        />
      </section>
    );
  }
 

  // =========================
  // MODO VIEW: mostrar tabs 1–3
  // =========================
  return (
    <section className="laboral-exp-section">
      <Card
        className="laboral-exp-detail-card"
        bodyStyle={{ padding: 24, paddingBottom: 12 }}
        title={
          <Space align="center" size={8}>
            <span>Audiencia Prejudicial</span>
          </Space>
        }
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems.map((t) => ({ ...t, children: null }))}
          tabBarGutter={16}
          className="laboral-exp-audiencia-tabs"
        />
      </Card>

      {/* TAB 1 · PRIMERA AUDIENCIA */}
      {activeTab === "1" && mode === "view" && (
        <PrimeraAudienciaView
          data={primeraData}
          header={headerInfo}
          onEdit={onClickEditPrimera}
        />
      )}

      {activeTab === "1" && mode === "form" && (
        <PrimeraAudienciaForm
          jump={jump}
          isEdit={isEdit}
          header={headerInfo}
          initialData={primeraData}
          abogadoOptions={abogadoOptions}
          dataAudiencias={primeraAudiencia || primeraData}
          onCancel={() => {
            if (primeraData) setMode("view");
            else setMode("empty");
          }}
          onSaved={() => {
            setMode("view");
            setIsEdit(false);
          }}
        />
      )}

      {/* TAB 2 · SEGUNDA AUDIENCIA */}
      {activeTab === "2" && hasPrimera && (
        <>
          {segundaMode === "empty" && !segundaData && (
            <section className="laboral-exp-section">
              <Card
                className="laboral-exp-detail-card"
                bodyStyle={{ padding: 24, paddingBottom: 12 }}
                title="Segunda audiencia prejudicial"
              >
                <Title level={5} style={{ marginBottom: 4 }}>
                  No hay ninguna segunda audiencia registrada
                </Title>
                <Text type="secondary">
                  Cuando se lleve a cabo una segunda audiencia prejudicial, podrás
                  registrar aquí el resultado y el desarrollo de la negociación.
                </Text>
                <div style={{ marginTop: 16 }}>
                  <Button
                    type="primary"
                    onClick={() => {
                      setIsEdit(false);
                      setSegundaMode("form");
                    }}
                  >
                    Registrar segunda audiencia prejudicial
                  </Button>
                </div>
              </Card>
            </section>
          )}

          {segundaMode === "form" && (
            <AudienciaGenericaForm
              label="Segunda"
              isEdit={isEdit}
              header={headerInfo}
              initialData={segundaData}
              abogadoOptions={abogadoOptions}
              dataAudiencias={segundaData}
              onCancel={() => {
                if (segundaData) setSegundaMode("view");
                else setSegundaMode("empty");
                setIsEdit(false);
              }}
              onSaved={() => {
                setSegundaMode("view");
                setIsEdit(false);
              }}
            />
          )}

          {segundaMode === "view" && segundaData && (
            <AudienciaGenericaView
              label="Segunda"
              header={headerInfo}
              data={segundaData}
              onEdit={() => {
                setIsEdit(true);
                setSegundaMode("form");
              }}
            />
          )}
        </>
      )}

      {/* TAB 3 · TERCERA AUDIENCIA */}
      {activeTab === "3" && hasSegunda && (
        <>
          {terceraMode === "empty" && !terceraData && (
            <section className="laboral-exp-section">
              <Card
                className="laboral-exp-detail-card"
                bodyStyle={{ padding: 24 }}
                title="Tercera audiencia prejudicial"
              >
                <Title level={5} style={{ marginBottom: 4 }}>
                  No hay ninguna tercera audiencia registrada
                </Title>
                <Text type="secondary">
                  Si se llegara a programar una tercera audiencia prejudicial, aquí
                  podrás documentar su resultado.
                </Text>
                <div style={{ marginTop: 16 }}>
                  <Button
                    type="primary"
                    onClick={() => {
                      setIsEdit(false);
                      setTerceraMode("form");
                    }}
                  >
                    Registrar tercera audiencia prejudicial
                  </Button>
                </div>
              </Card>
            </section>
          )}

          {terceraMode === "form" && (
            <AudienciaGenericaForm
              label="Tercera"
              isEdit={isEdit}
              header={headerInfo}
              abogadoOptions={abogadoOptions}
              initialData={terceraData}
              dataAudiencias={terceraData}
              onCancel={() => {
                if (terceraData) setTerceraMode("view");
                else setTerceraMode("empty");
                setIsEdit(false);
              }}
              onSaved={() => {
                setTerceraMode("view");
                setIsEdit(false);
              }}
            />
          )}

          {terceraMode === "view" && terceraData && (
            <AudienciaGenericaView
              label="Tercera"
              data={terceraData}
              header={headerInfo}
              onEdit={() => {
                setIsEdit(true);
                setTerceraMode("form");
              }}
            />
          )}
        </>
      )}
    </section>
  );
}

export default AudienciaPrejudicialCard;
