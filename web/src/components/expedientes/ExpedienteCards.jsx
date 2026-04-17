// src/components/expedientes/ExpedienteCards.jsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  Row,
  Col,
  Tag,
  Button,
  Space,
  Typography,
  Tooltip,
  Divider,
  Table,
  Pagination,
  Segmented,
} from "antd";
import {
  FileTextOutlined,
  IdcardOutlined,
  ApartmentOutlined,
  EnvironmentOutlined,
  CalendarOutlined,
  EyeOutlined,
  InfoCircleOutlined,
  FileDoneOutlined,
  AppstoreOutlined,
  TableOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import "dayjs/locale/es";
import "./expediente.css"
dayjs.locale("es");
const { Text, Title, Paragraph } = Typography;

const toTitleCase = (str) => {
  if (!str || typeof str !== "string") return "—";
  return str
    .toLowerCase()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
};

// =========================
// Helpers: faltantes
// =========================
const MISSING_LABEL = "FALTA AGREGAR";

const isEmpty = (v) => {
  if (v === null || v === undefined) return true;
  if (typeof v === "number") return Number.isNaN(v);
  const s = String(v).trim();
  return s === "" || s === "—";
};

const MissingText = ({extra = ""}) => (
  <Text style={{ color: "#ad6800", fontWeight: 600 }}>
    {MISSING_LABEL + extra }
  </Text>
);

const showOrMissing = (value, renderValue) => {
  if (isEmpty(value)) return <MissingText extra= " TIPO OBJETO" />;
  return renderValue ? renderValue(value) : <Text>{String(value)}</Text>;
};


function ExpedienteCards({
  items = [],
  maps = {},
  tipo,
  idEstado,
  idCiudad,
  PAGE_SIZE,
  filteredExpedientes = [],
  currentPage,
  setCurrentPage,
}) {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState("cards"); // "cards" | "tabla"

  const {
    ciudadesById = {},
    estadosById = {},
    abogadosById = {},
    statusById = {},
    ambitoById = { 1: "Local", 2: "Federal" },
  } = maps;

  const colorStatus = (idStatus) => {
    const map = {
      1: "processing",
      2: "success",
      3: "warning",
      4: "default",
      5: "error",
    };
    return map[idStatus] || "default";
  };


  const gridItems = useMemo(() => {
    if (Array.isArray(items)) return items;
    if (items && Array.isArray(items.items)) return items.items;
    return [];
  }, [items]);

const handleView = (exp) => {
  const conciliacionId = exp?.id_conciliacion ?? exp?.id;

  if (!conciliacionId) return;

  navigate(`/materias/laboral/centro-conciliacion/${conciliacionId}`, {
    state: {
      id_conciliacion: conciliacionId,
      tipo,
      // opcional: si quieres seguir teniendo el exp disponible en la vista
      expediente: exp?.expediente_format ?? exp?.expediente ?? null,
    },
  });
};


  const getRazonesSocialesText = (exp) => {
    if (Array.isArray(exp.razones_sociales) && exp.razones_sociales.length) {
      return exp.razones_sociales.map((r) => r.razon_social).join(" / ");
    }
    return exp.nombre_empresa || "Sin razón social";
  };

  const getAbogadoName = (exp) =>
    abogadosById[exp.id_abogado]?.nombre ||
    abogadosById[exp.id_abogado] ||
    `Abogado #${exp.id_abogado ?? "—"}`;
const isPagoAtrasado = (fechaProximoPago) => {
  if (!fechaProximoPago) return false;
  const d = dayjs(fechaProximoPago);
  if (!d.isValid()) return false;
  return d.isBefore(dayjs(), "day"); // atrasado si fue antes de hoy
};

const getFechaBadge = (exp) => {
  const status = String(exp?.status || "").toLowerCase();
  const idStatus = Number(exp?.id_conciliacion_status);

  const isCumpl = isConstancia(exp) || idStatus === 7 || status.includes("cumpl");
  const isConv = !isConstancia(exp) && (status.includes("convenio") || idStatus === 2);

  // rojo: falta constancia (marcado como constancia pero sin fecha_convenio)
  if (isConstancia(exp) && !exp?.fecha_convenio) {
    return { tone: "red", label: "FALTA CONSTANCIA", value: "—" };
  }

  // verde: cumplimiento con fecha
  if (isCumpl) {
    return {
      tone: "green",
      label: "CUMPLIMIENTO",
      value: exp?.fecha_convenio ? fmtFechaHora(exp.fecha_convenio) : "—",
    };
  }

  // amarillo: convenio (pago) o activo/diferimiento (audiencia)
  if (isConv) {
    return { tone: "gold", label: "PRÓX. PAGO", value: getPagoText(exp) };
  }

  if (["activo", "diferimiento"].includes(status)) {
    return {
      tone: "gold",
      label: "PRÓX. AUDIENCIA",
      value: exp?.fecha_proxima_audiencia ? fmtFechaHora(exp.fecha_proxima_audiencia) : "—",
    };
  }

  return { tone: "default", label: null, value: null };
};

const getPagoText = (exp) => {
  const forceDone = Number(exp.is_constancia_documento) === 1;
  const status = String(exp?.status || "").toLowerCase();

  if (forceDone) return "—"; // ya concluido

  if (status !== "convenio") return "—";

  if (!exp.fecha_proximo_pago) {
    return "FALTA SUBIR CONSTANCIA DE CUMPLIMIENTO";
  }

  const d = dayjs(exp.fecha_proximo_pago);
  if (!d.isValid()) return "—";

  if (d.isBefore(dayjs(), "day")) {
    return "PAGO ATRASADO";
  }

  return d.format("D [de] MMMM [del] YYYY");
};

const isCumplimiento = (exp) => {
  const s = norm(exp?.status || exp?.status_nombre || exp?.estatus || "");
  const idStatus = Number(exp?.id_conciliacion_status);
  return isConstancia(exp) || idStatus === 7 || s.includes("cumpl");
};

const isConvenio = (exp) => {
  const s = norm(exp?.status || exp?.status_nombre || exp?.estatus || "");
  return s.includes("convenio");
};

  const fmtFecha = (v) => {
    if (!v) return "—";
    const d = dayjs(v);
    if (!d.isValid()) return "—";
    return d.format("D [de] MMMM [del] YYYY");
  };

  const fmtFechaHora = (v) => {
    if (!v) return "—";
    const d = dayjs(v);
    if (!d.isValid()) return "—";
    return d.format("D [de] MMMM [del] YYYY [a las] HH:mm [horas]");
  };

  const getNombreVs = (exp) => {
    const trabajador = exp.nombre_trabajador || "—";
    const razones = getRazonesSocialesText(exp);
    return `${trabajador} vs ${razones}`;
  };

  const renderNotificacionTag = (exp, { variant = "table" } = {}) => {
    const isTrabajador = exp.tipo_notificado === "trabajador";
    const isActuario = exp.tipo_notificado === "actuario";
    const show = isTrabajador || isActuario;

    if (!show) return <Text type="secondary">—</Text>;

    const label = isActuario
      ? "CON APERCIBIMIENTO DE MULTA"
      : "SIN APERCIBIMIENTO DE MULTA";

    const color = isActuario ? "red" : "green";
    const isCard = variant === "card";

    const tag = (
      <Tag
      
        color={color}
        className={isCard ? "exp-notif-tag exp-notif-tag-card" : "exp-notif-tag"}
        style={{
          margin: 0,
          maxWidth: "100%",
        }}
      >
        <Paragraph
          className="exp-notif-text"
          style={{ margin: 0 }}
          ellipsis={{ rows: 2 }}
        >
          {label}
        </Paragraph>
      </Tag>
    );

    return (
      <Tooltip title={exp.especifico}>
        <span className={isCard ? "exp-notif-wrap exp-notif-wrap-card" : "exp-notif-wrap"}>
          {tag}
        </span>
      </Tooltip>
    );
  };

const norm = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const isConstancia = (exp) => Number(exp?.is_constancia_documento) === 1;

// ✅ Esto define “qué es” el expediente para UI (cards/tabla)
const getUiStatus = (exp) => {
  const raw = norm(exp?.status || exp?.status_nombre || exp?.estatus || "");
  const idStatus = Number(exp?.id_conciliacion_status);

  // ✅ regla dura: constancia = cumplimiento (como dijiste)
  if (isConstancia(exp)) return "cumplimiento_convenio";

  // respaldo por id/texto
  if (idStatus === 7 || raw.includes("cumpl")) return "cumplimiento_convenio";

  if (raw.includes("convenio")) return "convenio";
  if (raw.includes("difer")) return "diferimiento";
  if (raw.includes("activo")) return "activo";

  return raw || "—";
};

// ✅ Fecha principal según el “tipo”
const getFechaPrincipalLabel = (exp) => {
  if (!exp) return { label: null, value: null, tone: null };

  const status = norm(exp?.status || exp?.status_nombre || exp?.estatus || "");

  const isPast = (v) => {
    if (!v) return false;
    const d = dayjs(v);
    if (!d.isValid()) return false;
    return d.isBefore(dayjs(), "day");
  };

  // ✅ ROJO: falta constancia (cumplimiento sin fecha_convenio)
  if (isCumplimiento(exp) && !exp?.fecha_convenio) {
    return { label: "FALTA CONSTANCIA", value: "SUBIR", tone: "red" };
  }

  // ✅ VERDE: cumplimiento con fecha
  if (isCumplimiento(exp) && exp?.fecha_convenio) {
    return { label: "CUMPLIMIENTO", value: fmtFechaHora(exp.fecha_convenio), tone: "green" };
  }

  // ✅ CONVENIO: prox pago / pago atrasado / falta info
  if (isConvenio(exp)) {
    const txt = getPagoText(exp); // ya regresa “PAGO ATRASADO” o “FALTA SUBIR...”
    const tone =
      txt === "PAGO ATRASADO" || txt?.includes("FALTA") ? "red" : "gold";

    return { label: "PRÓX. PAGO", value: txt, tone };
  }

  // ✅ ACTIVO / DIFERIDO: audiencia vencida o falta fecha
  if (status.includes("activo") || status.includes("difer")) {
    if (!exp?.fecha_proxima_audiencia) {
      return { label: "FALTA FECHA DE AUDIENCIA", value: "CAPTURAR", tone: "red" };
    }

    if (isPast(exp?.fecha_proxima_audiencia)) {
      return { label: "AUDIENCIA VENCIDA", value: fmtFechaHora(exp.fecha_proxima_audiencia), tone: "red" };
    }

    return { label: "PRÓX. AUDIENCIA", value: fmtFechaHora(exp.fecha_proxima_audiencia), tone: "gold" };
  }

  return { label: null, value: null, tone: null };
};


  const columns = [
    {
      title: "Razones sociales",
      key: "razones_sociales",
      width: 360,
      render: (_, exp) => (
        <Tooltip title={getNombreVs(exp)}>
          <Text ellipsis style={{ maxWidth: 340, display: "inline-block" }}>
            {getNombreVs(exp)}
          </Text>
        </Tooltip>
      ),
    },
   {
  title: "Fecha principal",
  key: "proxima_audiencia",
  width: 300,
render: (_, exp) => {
  const { label, value, tone } = getFechaPrincipalLabel(exp);
  if (!label) return <Text type="secondary">—</Text>;

  const color =
    tone === "green" ? "#1f7a1f" :
    tone === "gold"  ? "#ad6800" :
    tone === "red"   ? "#cf1322" :
    "inherit";

  return (
    <Text type="secondary">
      <span style={{ color, fontWeight: 600 }}>{label}:</span>{" "}
      <Text>{value}</Text>
    </Text>
  );
},


},

    {
      title: "Emisión del citatorio",
      key: "emision_citatorio",
      width: 200,
      render: (_, exp) => (
        <Text type="secondary">{fmtFecha(exp.fecha_emision_expediente)}</Text>
      ),
    },
    {
      title: "Núm. ID. Único",
      key: "num_id_unico",
      width: 200,
      render: (_, exp) => {
        const expediente = exp.expediente;
        return (
          <Tooltip title={`${expediente ?? "—"}`}>
            <Text
              type="secondary"
              ellipsis
              style={{ maxWidth: 180, display: "inline-block" }}
            >
              {expediente ?? "—"}
            </Text>
          </Tooltip>
        );
      },
    },
  {
  title: "Status",
  key: "status",
  width: 120,
  render: (_, exp) => {
  const ui = getUiStatus(exp);
  const forceDone = isConstancia(exp);

  const text = forceDone ? "Concluido" : ui;
  const color = forceDone ? "success" : colorStatus(exp.id_conciliacion_status);

  return (
    <Tag color={color} className="exp-status-tag">
      {text}
    </Tag>
  );
},

},

    {
      title: "Notificación",
      key: "apercibimiento",
      width: 260,
      render: (_, exp) => renderNotificacionTag(exp, { variant: "table" }),
    },
    {
      title: "Acciones",
      key: "acciones",
      width: 140,
      fixed: "right",
      render: (_, exp) => (
        <Button
          type="primary"
          size="small"
       
          onClick={() => handleView(exp)}
        >
          Ver detalles
        </Button>
      ),
    },
  ];

  return (
    <>
      <div className="laboral-expedientes-card">
  <div className="exp-list-toolbar">
    <div className="exp-list-toolbar-right">
      <Text type="secondary">Vista:</Text>
     <Segmented
  options={[
    {
      value: "cards",
      label: (
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
         
          Tarjetas
        </span>
      ),
    },
    {
      value: "tabla",
      label: (
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
       
          Tabla
        </span>
      ),
    },
  ]}
  value={viewMode}
  onChange={setViewMode}
/>

    </div>
  </div>
        {viewMode === "cards" && (
          <Row gutter={[24, 24]} style={{ marginTop: 12 }}>
            {gridItems.map((exp) => {
           
             const tipoNotif = exp.tipo_notificado;
           
const nombreVs = getNombreVs(exp);
const expedienteTxtRaw = exp.expediente; // OJO: crudo para saber si falta
const fmt = (v) => {
  const d = dayjs(v);
  if (!v || !d.isValid()) return null; // null => se pintará "FALTA AGREGAR"
  return d.format("D [de] MMMM [del] YYYY");
};

const fechaEmisionRaw = exp.fecha_emision_expediente;
const fechaEmisionTxt = fmt(fechaEmisionRaw);

// si quieres conservarlos, pero no los uses para render si pueden faltar
const fechaConvenioTxt = fmt(exp.fecha_convenio);
const fechaAudienciaTxt = fmt(exp.fecha_proxima_audiencia);
const forceDone = Number(exp.is_constancia_documento) === 1;

const statusText = forceDone ? "Concluido" : (exp.status || "—");
const statusColor = forceDone ? "success" : colorStatus(exp.id_conciliacion_status);

              return (
                <Col key={exp.id} xs={24} sm={12} md={12} lg={8} xl={6}>
                  <Card
  hoverable
  className="exp-card"
  bodyStyle={{ padding: 0, display: "flex", flexDirection: "column", height: "100%" }}
  style={{ marginInline: 6, marginTop: 20, overflow: "hidden" }}
>
<div className="exp-card-content">
                    <div className="exp-card-block">
  <div className="exp-card-head">
    <div className="exp-card-head-left">
      

      <div className="exp-card-title">
        <Paragraph style={{ margin: 0 }} ellipsis={{ rows: 2 }}>
          {toTitleCase(nombreVs)}
        </Paragraph>
      </div>
    </div>

   <Tag className="exp-status-tag" color={statusColor}>
  {toTitleCase(statusText)}
</Tag>

  </div>

  <div className="exp-lines">
    <div className="exp-line">
  <Text type="secondary">
    {showOrMissing(exp.nombre_objeto, (v) => <Text type="secondary">{toTitleCase(v)}</Text>)}
  </Text>
</div>

{(() => {
  const { label, value, tone } = getFechaPrincipalLabel(exp);
  if (!label) return null;

  const color =
    tone === "green" ? "#1f7a1f" :
    tone === "gold"  ? "#ad6800" :
    tone === "red"   ? "#cf1322" :
    "inherit";

  return (
    <div className="exp-line">
      <Text type="secondary">
  <span style={{ color, fontWeight: 600 }}>{label}:</span>{" "}
  {isEmpty(value) ? <MissingText /> : <Text>{toTitleCase(value)}</Text>}
</Text>
    </div>
  );
})()}


   <div className="exp-line">
  <Text type="secondary">
    Emisión del citatorio:{" "}
    {isEmpty(fechaEmisionTxt) ? <MissingText /> : <Text>{toTitleCase(fechaEmisionTxt)}</Text>}
  </Text>
</div>
  <div className="exp-line">
  <Text type="secondary" ellipsis style={{ maxWidth: 240 }}>
    Núm. ID. Único:{" "}
    {isEmpty(expedienteTxtRaw) ? <MissingText /> : <Text>{String(expedienteTxtRaw)}</Text>}
  </Text>
</div>
  </div>
</div>

                    </div>
                    <div className="exp-card-footer">
                      {/* Franja tipo HTML */}


<div
  className={`exp-bottom-strip ${
    tipoNotif === "actuario" ? "is-red" : tipoNotif === "trabajador" ? "is-green" : "is-yellow"
  }`}
>
  <span>
    {tipoNotif === "actuario"
      ? "CON APERCIBIMIENTO DE MULTA"
      : tipoNotif === "trabajador"
      ? "SIN APERCIBIMIENTO DE MULTA"
      : MISSING_LABEL + " TIPO NOTIFiCACIÓN."}
  </span>
</div>

<Button
  className="exp-btn-dark"
  block
  style={{color:"#fff"}}
 onClick={() => handleView(exp)}
>
  VER DETALLES
</Button>
</div>
                  </Card>
                </Col>
              );
            })}
          </Row>
        )}

        {viewMode === "tabla" && (
          <div style={{ marginTop: 12 }}>
            <Table
              dataSource={gridItems}
              rowKey="id"
              columns={columns}
              size="middle"
               pagination={false}

              scroll={{ x: 1320 }}
            />
          </div>
        )}

        {filteredExpedientes.length > PAGE_SIZE && (
          <div style={{ marginTop: 16, textAlign: "right" }}>
            <Pagination
              current={currentPage}
              pageSize={PAGE_SIZE}
              total={filteredExpedientes.length}
              onChange={(page) => setCurrentPage(page)}
              size="small"
              showSizeChanger={false}
            />
          </div>
        )}

        {gridItems.length === 0 && (
          <div
            style={{
              padding: "36px 12px",
              textAlign: "center",
              color: "rgba(0,0,0,0.55)",
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 500 }}>
              Sin información por el momento
            </div>
          </div>
        )}
      </div>

    
    </>
  );
}
export default React.memo(ExpedienteCards);
