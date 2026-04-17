// src/components/expedientes/ExpedienteDetailsModal.jsx
import React, { useMemo, useState } from "react";
import {
  Modal,
  Typography,
  Tag,
  Space,
  Descriptions,
  Divider,
  Button,
  notification,
  Row,
  Col,
  Dropdown,
} from "antd";
import {
  FileTextOutlined,
  ApartmentOutlined,
  EnvironmentOutlined,
  CalendarOutlined,
  IdcardOutlined,
  FilePdfOutlined,
  DownOutlined,
} from "@ant-design/icons";

import DiferimientoModal from "./diferimientoModal";
import RatificacionModal from "./ratificacionModal";
import NoConciliacionModal from "./noConciliacionModal";
const { Title, Text } = Typography;

const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString();
};

const statusColor = (id) => {
  const map = { 1: "processing", 2: "success", 3: "warning", 4: "default", 5: "error" };
  return map[id] || "default";
};

/**
 * Props:
 *  - open, onClose
 *  - expediente (row)
 *  - maps: { ciudadesById, estadosById, abogadosById, statusById, ambitoById }
 *  - onExportPDF?: fn(expediente)
 *  - onAccion?: fn({ type, payload })
 */
export default function ExpedienteDetailsModal({
  open,
  onClose,
  expediente,
  maps = {},
  onExportPDF,
  onAccion,
}) {
  const {
    ciudadesById = {},
    estadosById = {},
    abogadosById = {},
    statusById = {},
    ambitoById = { 1: "Local", 2: "Federal" },
  } = maps;

  const data = useMemo(() => expediente || {}, [expediente]);
const [openNoCon, setOpenNoCon] = useState(false);

  const ciudadName =
    ciudadesById[data.id_ciudad]?.nombre ||
    ciudadesById[data.id_ciudad] ||
    (data.id_ciudad ? `#${data.id_ciudad}` : "—");

  const estadoName = (() => {
    const ciudad = ciudadesById[data.id_ciudad];
    if (ciudad && ciudad.id_estado && estadosById[ciudad.id_estado]) {
      return estadosById[ciudad.id_estado].nombre || estadosById[ciudad.id_estado].code;
    }
    return "—";
  })();

  const ambitoName = ambitoById[data.id_ambito] || (data.id_ambito ? `#${data.id_ambito}` : "—");
  const statusName =data.status
  const abogadoName =
    abogadosById[data.id_abogado]?.nombre ||
    abogadosById[data.id_abogado] ||
    (data.id_abogado ? `#${data.id_abogado}` : "—");

  const [openDiferimiento, setOpenDiferimiento] = useState(false);
  const [openRatificacion, setOpenRatificacion] = useState(false);

  const handleExportPDF = () => {
    if (typeof onExportPDF === "function") onExportPDF(data);
    else {
      notification.info("Exportar PDF: implementa onExportPDF()");
    }
  };

  const handleNoConciliacion = () => {
    if (typeof onAccion === "function")
      onAccion({ type: "NO_CONCILIACION", payload: { id_conciliacion: data.id_conciliacion } });
    else notification.info("No Conciliación: implementa onAccion()");
  };

  const handleArchivoIncomparecencia = () => {
    if (typeof onAccion === "function")
      onAccion({
        type: "ARCHIVO_INCOMPARECENCIA",
        payload: { id_conciliacion: data.id_conciliacion },
      });
    else notification.info("Archivo por Incomparecencia: implementa onAccion()");
  };

  const handleSubmitDiferimiento = (values) => {
    if (typeof onAccion === "function") {
      onAccion({
        type: "DIFERIMIENTO",
        payload: { id_conciliacion: data.id_conciliacion, ...values },
      });
    }
    setOpenDiferimiento(false);
  };

  const handleSubmitRatificacion = (values) => {
    if (typeof onAccion === "function") {
      onAccion({
        type: "RATIFICACION",
        payload: { id_conciliacion: data.id_conciliacion, ...values },
      });
    }
    setOpenRatificacion(false);
  };
const items = [
  {
    key: "ratificacion",
    label: "Convenio",
    onClick: () => setOpenRatificacion(true),
  },
  {
    key: "diferimiento",
    label: "Diferimiento",
    onClick: () => setOpenDiferimiento(true),
  },
  {
    key: "archivo",
    label: "Archivo por Incomparecencia",
    onClick: handleArchivoIncomparecencia,
  },
  {
    key: "no_conciliacion",
    label: "No Conciliación",
    danger: true,
    onClick: () => setOpenNoCon(true),
  },
];

  const handleExportCitaAudiencia = () => {
  }
  const handleExportChecklistPrejudicial = () => {  
  }

  const handleExportConvenio = () => {
  }
  const handleExportChecklistNoConciliacion = () => {
  }
  const exportItems = [
  {
    key: "cita_audiencia",
    label: "Cita Audiencia",
    onClick: handleExportCitaAudiencia,
  },
  {
    key: "checklist_prejudicial",
    label: "Checklist Prejudicial",
    onClick: handleExportChecklistPrejudicial,
  },
  {
    key: "checklist_Convenio",
    label: "Checklist Convenio",
    onClick: handleExportConvenio,
  },
 
  {
    key: "checklist_no_conciliacion",
    label: "Checklist No Conciliación",
    onClick: handleExportChecklistNoConciliacion,
  },
];
  return (
    <>
      <Modal
        open={open}
        onCancel={onClose}
        width="80vw"
        style={{ top: 90 }}
        // SCROLL INTERNO DEL BODY
        bodyStyle={{ padding: 24, maxHeight: "80vh", overflow: "auto" }}
        footer={null}
        destroyOnClose
      >
        {/* CABECERA */}
        <Row align="middle" justify="space-between" gutter={[16, 16]}>
          <Col flex="auto">
            <Space align="center">
              <FileTextOutlined style={{ fontSize: 20 }} />
              <Title level={4} style={{ margin: 0 }}>
                {data.expediente}

              </Title>
                  <Tag color={statusColor(data.id_conciliacion_status)}>{statusName}</Tag>
            </Space>
          </Col>

          {/* Botonera de acciones (arriba) */}
          <Col>
    <Space wrap>
      <Dropdown
        menu={{
          items: items.map((item) => ({
            key: item.key,
            label: (
              <span
                style={{
                  color: item.danger ? "#ff4d4f" : "inherit",
                  fontWeight: item.danger ? 600 : 400,
                }}
                onClick={item.onClick}
              >
                {item.label}
              </span>
            ),
          })),
        }}
        placement="bottomLeft"
      >
        <Button type="primary">
          Status <DownOutlined />
        </Button>
      </Dropdown>

           <Dropdown
      menu={{
        items: exportItems.map((item) => ({
          key: item.key,
          label: (
            <span onClick={item.onClick}>
              {item.label}
            </span>
          ),
        })),
      }}
      placement="bottomLeft"
    >
      <Button icon={<FilePdfOutlined />}>
        Exportar <DownOutlined />
      </Button>
    </Dropdown>
   
    </Space>
  </Col>
        </Row>

        {/* Metadatos de cabecera */}
        <Row style={{ marginTop: 8 }} gutter={[16, 16]}>
          <Col span={24}>
            <Space size="large" wrap>
              <Space>
                <ApartmentOutlined />
                <Text>{ambitoName}</Text>
              </Space>
              <Space>
                <EnvironmentOutlined />
                <Text>
                  {ciudadName}
                  {estadoName !== "—" ? `, ${estadoName}` : ""}
                </Text>
              </Space>
              <Space>
                <CalendarOutlined />
                <Text>Creado: {fmtDate(data.fecha_creacion_expediente)}</Text>
              </Space>
              <Space>
                <IdcardOutlined />
                <Text>Abogado: {abogadoName}</Text>
              </Space>
            </Space>
          </Col>
        </Row>

    
        <Divider style={{ margin: "16px 0" }} />

        {/* NUEVO BLOQUE: DATOS DE EXPEDIENTE */}
        <Descriptions
          title="Datos de expediente"
          bordered
          column={{ xs: 1, sm: 1, md: 2, lg: 3 }}
          size="small"
          labelStyle={{ width: 220 }}
        >
          <Descriptions.Item label="Expediente">{data.expediente || "—"}</Descriptions.Item>

          <Descriptions.Item label="Fecha de creación del expediente">
            {fmtDate(data.fecha_creacion_expediente)}
          </Descriptions.Item>

          <Descriptions.Item label="Fecha de la cita de la audiencia">
            {fmtDate(
              data.fecha_cita_audiencia ||
                data.fecha_audiencia || // fallback si tu backend lo nombra así
                data.fecha_audiencia_inicial // último recurso
            )}
          </Descriptions.Item>

          <Descriptions.Item label="Estado">{estadoName}</Descriptions.Item>
          <Descriptions.Item label="Ciudad">{ciudadName}</Descriptions.Item>
          <Descriptions.Item label="Ámbito">{ambitoName}</Descriptions.Item>

          <Descriptions.Item label="Autoridad">
            {data.autoridad_nombre || data.autoridad || "—"}
          </Descriptions.Item>
        </Descriptions>

        <Divider />

        {/* BLOQUE: Datos del patrón / empresa */}
        <Descriptions
          title="Datos del patrón / empresa"
          bordered
          column={{ xs: 1, sm: 1, md: 2, lg: 3 }}
          size="small"
          labelStyle={{ width: 220 }}
        >
          <Descriptions.Item label="Nombre del patrón">
            {data.nombre_patron || "—"}
          </Descriptions.Item>
          <Descriptions.Item label="RFC patrón">{data.rfc_patron || "—"}</Descriptions.Item>
          <Descriptions.Item label="Razón social (id)">
            {data.id_razon_social ?? "—"}
          </Descriptions.Item>
          <Descriptions.Item label="Empresa (id)">{data.id_empresa ?? "—"}</Descriptions.Item>
        </Descriptions>

        <Divider />

        {/* BLOQUE: Situación laboral */}
        <Descriptions
          title="Situación laboral"
          bordered
          column={{ xs: 1, sm: 1, md: 2, lg: 3 }}
          size="small"
          labelStyle={{ width: 220 }}
        >
          <Descriptions.Item label="Puesto">{data.puesto_trabajador || "—"}</Descriptions.Item>
          <Descriptions.Item label="Horario">{data.horario || "—"}</Descriptions.Item>
          <Descriptions.Item label="Día de descanso">{data.dia_descanso || "—"}</Descriptions.Item>
          <Descriptions.Item label="Jornada semanal">
            {data.jornada_semanal || "—"}
          </Descriptions.Item>
          <Descriptions.Item label="Fecha ingreso">
            {fmtDate(data.fecha_ingreso_trabajador)}
          </Descriptions.Item>
          <Descriptions.Item label="Último día laboral">
            {fmtDate(data.ultimo_dia_laboral)}
          </Descriptions.Item>
          <Descriptions.Item label="Baja IMSS">{data.baja_imss ? "Sí" : "No"}</Descriptions.Item>
          <Descriptions.Item label="Fecha baja IMSS">{fmtDate(data.fecha_baja_imss)}</Descriptions.Item>
          <Descriptions.Item label="Motivo de baja">{data.motivo_baja || "—"}</Descriptions.Item>
        </Descriptions>

        <Divider />

        {/* BLOQUE: Sueldos y conceptos */}
        <Descriptions
          title="Sueldos y conceptos"
          bordered
          column={{ xs: 1, sm: 1, md: 2, lg: 3 }}
          size="small"
          labelStyle={{ width: 220 }}
        >
          <Descriptions.Item label="Salario diario">
            {data.ultimo_salario_diario || "—"}
          </Descriptions.Item>
          <Descriptions.Item label="Salario integrado">
            {data.ultimo_salario_integrado || "—"}
          </Descriptions.Item>
          <Descriptions.Item label="Conceptos de salario">
            {data.conceptos_salario || "—"}
          </Descriptions.Item>
          <Descriptions.Item label="Renuncia firmada">
            {data.renuncia_firmada_trabajador ? "Sí" : "No"}
          </Descriptions.Item>
          <Descriptions.Item label="Finiquito firmado">
            {data.finiquito_firmado ? "Sí" : "No"}
          </Descriptions.Item>
        </Descriptions>

        <Divider />

        {/* BLOQUE: Proceso de conciliación */}
        <Descriptions
          title="Proceso de conciliación"
          bordered
          column={{ xs: 1, sm: 1, md: 2, lg: 3 }}
          size="small"
          labelStyle={{ width: 220 }}
        >
          <Descriptions.Item label="Específico">{data.especifico || "—"}</Descriptions.Item>
          <Descriptions.Item label="Motivo real del trabajador">
            {data.motivo_real_trabajdor || "—"}
          </Descriptions.Item>
          <Descriptions.Item label="Comentario">{data.comentario || "—"}</Descriptions.Item>
          <Descriptions.Item label="Propuesta de conflicto">
            {data.propuesta_conflicto || "—"}
          </Descriptions.Item>
          <Descriptions.Item label="Cantidad autorizada">
            {data.cantidad_autorizada || "—"}
          </Descriptions.Item>
          <Descriptions.Item label="Cantidad autorizada (opción)">
            {data.cantidad_autorizada_opcion || "—"}
          </Descriptions.Item>
          <Descriptions.Item label="Proporcionado por">
            {data.proporcionado_nombre || "—"}
          </Descriptions.Item>
          <Descriptions.Item label="Puesto de quien proporciona">
            {data.proporcionado_puesto || "—"}
          </Descriptions.Item>
          <Descriptions.Item label="Fecha proporcionado">
            {fmtDate(data.proporcionado_fecha)}
          </Descriptions.Item>
          <Descriptions.Item label="Código">{data.code || "—"}</Descriptions.Item>
        </Descriptions>
      </Modal>

      {/* MODALES AUXILIARES */}
      <DiferimientoModal
        open={openDiferimiento}
        onCancel={() => setOpenDiferimiento(false)}
        onSubmit={handleSubmitDiferimiento}
      />
      <NoConciliacionModal
  open={openNoCon}
  onCancel={() => setOpenNoCon(false)}
  onSubmit={(payload) => {
    // TODO: llamar a tu API
    // await api.post('/conciliacion/no-concilia', payload)
    setOpenNoCon(false);
  }}
/>
      <RatificacionModal
        open={openRatificacion}
        onCancel={() => setOpenRatificacion(false)}
        onSubmit={handleSubmitRatificacion}
      />
    </>
  );
}
