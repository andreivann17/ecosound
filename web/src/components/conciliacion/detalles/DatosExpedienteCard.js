// src/pages/materias/laboral/components/DatosExpedienteCard.jsx
import React from "react";
import {
  Card,
  Row,
  Col,
  Descriptions,
  Divider,
  Typography,
  Button,
  Space,
  Tag,
} from "antd";
import { FilePdfOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";

import { fmtDate } from "./laboralExpedienteFormatters";
import { useNavigate } from "react-router-dom";

const { Text } = Typography;

export default function DatosExpedienteCard({
  detalle,
  ObjetoName,
  estadoName,
  ciudadName,
  ambitoName,
  proximaAudiencia,
  onExportPDF,
  onEditExpediente,
  exportingPDF = false,
  audiencias,
  onAdelantarAudiencia,
  onDeleteExpediente,
  deletingExp = false,
}) {

  const navigate = useNavigate();
  console.log(detalle)

  const toTitleCase = (str) => {
    if (!str || typeof str !== "string") return "—";
    return str
      .toLowerCase()
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  };

  const formatNombrePersona = (str) => {
    if (!str || typeof str !== "string") return "—";
    return str
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ")
      .split(" ")
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(" ");
  };

  const labelStyle = {
    width: 210,
    fontSize: 13,
    fontWeight: 600,
    textTransform: "uppercase",
    color: "#8c8c8c",
  };

  const contentStyle = {
    fontSize: 14,
    fontWeight: 500,
    color: "#1f1f1f",
    whiteSpace: "normal",
    wordBreak: "break-word",
  };

  const formaNotificacion =
    detalle.tipo_notificado_actuario || detalle.tipo_notificado || "—";

  const aQuienSeNotifico = detalle.tipo_notificado
    ? detalle.tipo_notificado.charAt(0).toUpperCase() +
      detalle.tipo_notificado.slice(1)
    : "—";

  const fechaRecepcionCitatorio = detalle.fecha_notificacion
    ? fmtDate(detalle.fecha_notificacion)
    : "—";

  const esClienteDirecto =
    detalle.cliente_directo_empresa === 1
      ? "Cliente directo"
      : detalle.cliente_directo_empresa === 0
      ? "Cliente vía corresponsal"
      : "—";

  const razonesSociales =
    Array.isArray(detalle.razones_sociales) && detalle.razones_sociales.length > 0
      ? detalle.razones_sociales
      : [];

  // =========================
  // ESTATUS (id_conciliacion_status)
  // =========================
  const STATUS_ACTIVO = 1;
  const STATUS_CONVENIO = 2;
  const STATUS_DIFERIMIENTO = 3;
  const STATUS_ARCHIVO_INCOMP_SOLICITANTE = 4;
  const STATUS_ARCHIVO_INCOMP_PATRON = 5;
  const STATUS_NO_CONCILIACION = 6;

  const statusId = Number(detalle?.id_conciliacion_status ?? 0);

  const esActivo = statusId === STATUS_ACTIVO;
  const esDiferimiento = statusId === STATUS_DIFERIMIENTO;
  const esConvenio = statusId === STATUS_CONVENIO;
  const esNoConciliacion = statusId === STATUS_NO_CONCILIACION;
  const esArchivoSolicitante = statusId === STATUS_ARCHIVO_INCOMP_SOLICITANTE;
  const esArchivoPatron = statusId === STATUS_ARCHIVO_INCOMP_PATRON;

  // =========================
  // TOMAR "AUDIENCIA" (desde audiencias)
  // - tu JSON viene como { expediente, count, items:[...] }
  // =========================
  const audienciaActual =
    (audiencias && Array.isArray(audiencias.items) && audiencias.items[0]) ||
    (Array.isArray(audiencias) && audiencias[0]) ||
    null;

  // Convenio: decidir si ya hay constancia (cumplido) o si toca mostrar fecha de pago
  const isConstanciaDocumento = Number(audienciaActual?.is_constancia_documento ?? 0) === 1;

  // Fecha de pago (solo si es convenio y NO hay constancia)
  const fechaPagoConvenioRaw =
    audienciaActual?.convenio?.[0]?.fecha_pago ||
    audienciaActual?.pagos_convenio?.[0]?.fecha ||
    null;

  const fechaPagoConvenio = fechaPagoConvenioRaw ? fmtDate(fechaPagoConvenioRaw) : "—";

  // =========================
  // PRÓXIMA AUDIENCIA (solo cuando aplica)
  // =========================
  const proximaAudienciaText =
    proximaAudiencia ||
    (detalle.fecha_proxima_audiencia ? fmtDate(detalle.fecha_proxima_audiencia) : "Pendiente de programar");

  // =========================
  // MENSAJE DEL CUADRO AZUL
  // =========================
  // =========================
// MENSAJE DEL CUADRO AZUL
// =========================
let blueHeader = "Estatus del expediente";
let blueBody = "—";
let blueSub = null; // <- NUEVO: línea corta descriptiva

if (esActivo || esDiferimiento) {
  blueHeader = "Próxima audiencia";
  blueBody = proximaAudienciaText;
  blueSub = null;
} else if (esConvenio) {
  if (isConstanciaDocumento) {
    blueHeader = "Estatus del expediente";
    blueBody = "Caso concluido por convenio (cumplido)";
    blueSub = null;
  } else {
    blueHeader = "Próximo pago";
    blueBody = fechaPagoConvenio !== "—" ? fechaPagoConvenio : "Pendiente de definir";
    blueSub = "Convenio pendiente de constancia";
  }
} else if (esNoConciliacion) {
  blueHeader = "Estatus del expediente";
  blueBody = "Caso concluido por no conciliación";
  blueSub = null;
} else if (esArchivoSolicitante) {
  blueHeader = "Estatus del expediente";
  blueBody = "Archivo por incomparecencia del solicitante";
  blueSub = null;
} else if (esArchivoPatron) {
  blueHeader = "Estatus del expediente";
  blueBody = "Archivo por incomparecencia del patrón";
  blueSub = null;
} else if (isConstanciaDocumento) {
  blueHeader = "Estatus del expediente";
  blueBody = "Caso concluido por constancia de cumplimiento";
  blueSub = null;
}


  // Botón Convenio Anticipado: SOLO Activo o Diferimiento
  const showConvenioAnticipadoBtn = esActivo || esDiferimiento;

  return (
    <div>
      {/* CARD HEADER SOLO TÍTULO + BOTONES */}
      <Card className="laboral-exp-detail-card laboral-exp-detail-card-main p-2">
        <div className="laboral-exp-section-header">
          <div>
            <Text className="laboral-exp-section-title" style={{ fontSize: 18 }}>
              Datos de expediente
            </Text>
            <Text type="secondary" className="laboral-exp-section-sub">
              Información principal del citatorio, la empresa y la próxima audiencia.
            </Text>
          </div>

          <Space>
            <Button
              type="default"
              icon={<EditOutlined />}
              onClick={() =>
                navigate(
                  `/materias/laboral/centro-conciliacion/${detalle.id}/editar`,
                  {
                    state: {
                      idAutoridad: detalle.id_autoridad,
                      idCiudad: detalle.id_ciudad,
                      idEstado: detalle.id_estado,
                      nombreIdentificacionCiudad: detalle.nombre_identificador,
                    },
                  }
                )
              }
              disabled={deletingExp}
            >
              Editar
            </Button>

            <Button
              onClick={onExportPDF}
              loading={exportingPDF}
              disabled={exportingPDF || deletingExp}
            >
              Exportar PDF
            </Button>

            <Button
              danger
              type="primary"
              icon={<DeleteOutlined />}
              onClick={() => onDeleteExpediente?.()}
              loading={deletingExp}
              disabled={deletingExp}
            >
              Eliminar
            </Button>
          </Space>
        </div>
      </Card>

      {/* ESPACIO GRIS EXACTAMENTE EN LA LÍNEA AZUL */}
      <div
        style={{
          width: "100%",
          height: 22,
          background: "#f3f3f3",
          margin: "14px 0",
        }}
      />

      {/* CARD 1: DATOS DEL EXPEDIENTE + CUADRO AZUL */}
      <Card className="laboral-exp-detail-card laboral-exp-detail-card-main p-2">
        <Row gutter={[16, 16]} align="stretch">
          <Col xs={24} lg={20}>
            <Descriptions
              title={null}
              bordered
              column={{ xs: 1, sm: 1, md: 2, lg: 2 }}
              size="small"
              labelStyle={labelStyle}
              contentStyle={contentStyle}
              className="laboral-exp-descriptions laboral-exp-descriptions-main"
            >
              <Descriptions.Item label="Núm. ID Único">
                <Text strong>{detalle.expediente || "—"}</Text>
              </Descriptions.Item>

              <Descriptions.Item label="Fecha de emisión del citatorio">
                <Text strong>
                  {fmtDate(detalle.fecha_emision_expediente || detalle.created_at)}
                </Text>
              </Descriptions.Item>

              <Descriptions.Item label="Objeto">
                <Text strong>{toTitleCase(ObjetoName)}</Text>
              </Descriptions.Item>

              <Descriptions.Item label="Estado">
                <Text strong>{toTitleCase(estadoName)}</Text>
              </Descriptions.Item>

              <Descriptions.Item label="Ciudad">
                <Text strong>{toTitleCase(ciudadName)}</Text>
              </Descriptions.Item>

              <Descriptions.Item label="Competencia">
                <Text strong>{toTitleCase(ambitoName)}</Text>
              </Descriptions.Item>

              <Descriptions.Item label="Autoridad">
                <span
                  style={{
                    display: "inline-block",
                    maxWidth: 260,
                    whiteSpace: "normal",
                    wordBreak: "break-word",
                  }}
                >
                  <Text strong>
                    {toTitleCase(detalle.nombre_autoridad) ||
                      toTitleCase(detalle.autoridad_nombre) ||
                      toTitleCase(detalle.autoridad) ||
                      "—"}
                  </Text>
                </span>
              </Descriptions.Item>

              <Descriptions.Item label="Forma de notificación">
                <Text strong>{toTitleCase(formaNotificacion)}</Text>
              </Descriptions.Item>

              <Descriptions.Item label="A quién se le notificó">
                <Text strong>{toTitleCase(aQuienSeNotifico)}</Text>
              </Descriptions.Item>

              {detalle.tipo_notificado_actuario === "despacho" ? (
                <Descriptions.Item label="Fecha y hora de recepción del citatorio">
                  <Text strong>{fechaRecepcionCitatorio}</Text>
                </Descriptions.Item>
              ) : (
                <Descriptions.Item label="Medio notificado">
                  <Text strong>{toTitleCase(detalle.medio_notificacion)}</Text>
                </Descriptions.Item>
              )}
            </Descriptions>
          </Col>

          {/* CUADRO AZUL */}
          <Col xs={24} lg={4}>
            <div
              className="laboral-exp-next-aud-card"
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                textAlign: "center",
                height: "100%",
              }}
            >
              <div className="laboral-exp-next-aud-header" style={{ marginBottom: 12 }}>
                <span
                  className="laboral-exp-chip-label"
                  style={{ fontSize: 16, fontWeight: 600 }}
                >
                  {blueHeader}
                </span>
              </div>
<div className="laboral-exp-next-aud-body" style={{ marginBottom: 16 }}>
    <Text style={{ marginBottom: 6,}} strong>{blueBody}</Text>
  {blueSub ? (
    
    <Text type="secondary" style={{ display: "block", fontSize: 12 }}>
      {blueSub}
    </Text>
  ) : null}

</div>


              <div className="laboral-exp-next-aud-footer">
                {showConvenioAnticipadoBtn ? (
                  <Button
                    type="primary"
                    size="large"
                    style={{
                      fontSize: "14px",
                      fontWeight: 600,
                      padding: "10px 26px",
                      borderRadius: "10px",
                    }}
                    onClick={() => onAdelantarAudiencia?.()}
                  >
                    Convenio Anticipado
                  </Button>
                ) : null}
              </div>
            </div>
          </Col>
        </Row>
      </Card>

      {/* SEGUNDO ESPACIO GRIS ENTRE BLOQUES */}
      <div
        style={{
          width: "100%",
          height: 22,
          background: "#f3f3f3",
          margin: "14px 0",
        }}
      />

      {/* CARD 2: SOLICITANTE + EMPRESA */}
      <Card className="laboral-exp-detail-card laboral-exp-detail-card-main p-2">
        <Row gutter={[16, 16]} align="stretch">
          <Col xs={24} lg={24}>
            <Descriptions
              title={null}
              bordered
              column={{ xs: 1, sm: 1, md: 2, lg: 2 }}
              size="small"
              labelStyle={labelStyle}
              contentStyle={contentStyle}
            >
              <Descriptions.Item label="Nombre del solicitante">
                <Text strong>{formatNombrePersona(detalle.nombre_trabajador)}</Text>
              </Descriptions.Item>

              <Descriptions.Item label="Empresa principal">
                <Text strong>{toTitleCase(detalle.nombre_empresa) || "—"}</Text>
              </Descriptions.Item>

              <Descriptions.Item label="Tipo de cliente">
                <Text strong>{toTitleCase(esClienteDirecto)}</Text>
              </Descriptions.Item>

              <Descriptions.Item label="Corresponsal">
                <Text strong>{toTitleCase(detalle.nombre_corresponsal_empresa) || "—"}</Text>
              </Descriptions.Item>

              <Descriptions.Item label="Correo de contacto">
                <Text strong>{toTitleCase(detalle.correo_empresa) || "—"}</Text>
              </Descriptions.Item>

              <Descriptions.Item label="Teléfono empresa">
                <Text strong>{toTitleCase(detalle.celular_empresa) || "—"}</Text>
              </Descriptions.Item>

              <Descriptions.Item label="Razones sociales vinculadas" span={2}>
                {razonesSociales.length > 0 ? (
                  <Space wrap>
                    {razonesSociales.map((rs) => (
                      <Tag key={rs.id}>{toTitleCase(rs.razon_social)}</Tag>
                    ))}
                  </Space>
                ) : (
                  <Text strong>—</Text>
                )}
              </Descriptions.Item>
            </Descriptions>
          </Col>
        </Row>
      </Card>
    </div>
  );
}
