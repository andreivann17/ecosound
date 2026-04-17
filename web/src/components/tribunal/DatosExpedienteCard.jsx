// src/components/tribunal/detalles/DatosExpedienteCard.jsx

import React, { useMemo } from "react";
import { Card, Row, Col, Descriptions, Typography, Button, Space, Tag, Divider } from "antd";
import { EditOutlined, DeleteOutlined, FilePdfOutlined, FileTextOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

const { Text, Title } = Typography;

const safeObj = (v) => (v && typeof v === "object" ? v : {});
const safeArr = (v) => (Array.isArray(v) ? v : []);

const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
};

const toTitleCase = (str) => {
  if (!str) return "—";
  const s = String(str).trim();
  if (!s) return "—";
  return s
    .toLowerCase()
    .replace(/\s+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
};

const prettyPrestacion = (key) =>
  toTitleCase(String(key || "").replaceAll("_", " "));

export default function DatosExpedienteCard({
  detalle,
  meta,
  datosGenerales,
  accionesPrestaciones,
  etapaProcesal,
  ciudadName,
  estadoName,
  autoridadName,
  onDeleteExpediente,
  deletingExp = false,
}) {
  const navigate = useNavigate();

  const d = safeObj(detalle);
  const m = safeObj(meta);
  const dg = safeObj(datosGenerales);
  const ap = safeObj(accionesPrestaciones);
  const etapa = safeObj(etapaProcesal);

  const prestacionesTags = useMemo(() => {
    const p = safeObj(ap?.prestaciones);
    const keys = Object.keys(p).filter((k) => p[k] === true);
    return keys;
  }, [ap?.prestaciones]);

  const statusTag = Number(d?.active ?? 0) === 1 ? "Activo" : "Inactivo";

  const hasCitatorio =
    etapa?.id_tribunal_documento_citatorio !== null &&
    etapa?.id_tribunal_documento_citatorio !== undefined &&
    Number(etapa?.id_tribunal_documento_citatorio) !== 0;

  const blueHeader = hasCitatorio ? "Citatorio" : "Sin citatorio";
  const blueBody = hasCitatorio
    ? (etapa?.citatorio?.filename || "Documento asignado")
    : "No se ha asignado citatorio";

  const blueSub = hasCitatorio
    ? (etapa?.citatorio?.url ? "Disponible para abrir" : null)
    : null;

  const canEdit = true;

  const handleEdit = () => {
    const id = d?.id ?? dg?.num_unico ?? null;
    if (!id) return;

    navigate(`/materias/laboral/tribunal/${id}/editar`, {
      state: {
        isEdit: true,
        idExpediente: id,
        idCiudad: m?.idCiudad ?? dg?.ciudad ?? null,
        idAutoridad: m?.idAutoridad ?? dg?.autoridad ?? null,
        nombreIdentificacionCiudad: m?.nombreIdentificacionCiudad ?? null,
      },
    });
  };

  const openCitatorio = () => {
    const url = etapa?.citatorio?.url;
    if (!url) return;
    window.open(`${PATH}${url}`, "_blank", "noreferrer");
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

  return (
    <div>
      {/* CARD HEADER: título + botones */}
      <Card className="laboral-exp-detail-card laboral-exp-detail-card-main p-2">
        <div className="laboral-exp-section-header">
          <div>
            <Text className="laboral-exp-section-title" style={{ fontSize: 18 }}>
              Datos de expediente
            </Text>
            <Text type="secondary" className="laboral-exp-section-sub">
              Información principal capturada en tribunal.
            </Text>
          </div>

          <Space>
            <Button
              type="default"
              icon={<EditOutlined />}
              onClick={handleEdit}
              disabled={!canEdit || deletingExp}
            >
              Editar
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

      {/* separador gris */}
      <div style={{ width: "100%", height: 22, background: "#f3f3f3", margin: "14px 0" }} />

      {/* CARD: descripciones + cuadro azul */}
      <Card className="laboral-exp-detail-card laboral-exp-detail-card-main p-2">
        <Row gutter={[16, 16]} align="stretch">
          <Col xs={24} lg={20}>
            <Descriptions
              bordered
              column={{ xs: 1, sm: 1, md: 2, lg: 2 }}
              size="small"
              labelStyle={labelStyle}
              contentStyle={contentStyle}
              className="laboral-exp-descriptions laboral-exp-descriptions-main"
            >
              <Descriptions.Item label="ID tribunal">
                <Text strong>{d?.id ?? "—"}</Text>
              </Descriptions.Item>

              <Descriptions.Item label="Código">
                <Text strong>{d?.code ?? "—"}</Text>
              </Descriptions.Item>

              <Descriptions.Item label="Estado">
                <Text strong>{toTitleCase(estadoName)}</Text>
              </Descriptions.Item>

              <Descriptions.Item label="Ciudad">
                <Text strong>{toTitleCase(ciudadName)}</Text>
              </Descriptions.Item>

              <Descriptions.Item label="Autoridad">
                <Text strong>{toTitleCase(autoridadName)}</Text>
              </Descriptions.Item>

              <Descriptions.Item label="Estatus">
                <Tag className="laboral-exp-status-tag">{statusTag}</Tag>
              </Descriptions.Item>

              <Descriptions.Item label="Número único">
                <Text strong>{dg?.num_unico || "—"}</Text>
              </Descriptions.Item>

              <Descriptions.Item label="Expediente anterior">
                <Text strong>{dg?.numero_expediente_anterior || "—"}</Text>
              </Descriptions.Item>

              <Descriptions.Item label="Corresponsal" span={2}>
                <Text strong>{dg?.corresponsal || "—"}</Text>
              </Descriptions.Item>

              <Descriptions.Item label="Trabajador">
                <Text strong>{ap?.trabajador_nombre || "—"}</Text>
              </Descriptions.Item>

              <Descriptions.Item label="Acción intentada">
                <Text strong>{ap?.accion_intentada || "—"}</Text>
              </Descriptions.Item>

              <Descriptions.Item label="Fecha recepción demanda">
                <Text strong>{fmtDate(ap?.fecha_recepcion_demanda)}</Text>
              </Descriptions.Item>

              <Descriptions.Item label="Otras prestaciones">
                <Text strong>{ap?.otras_prestaciones || "—"}</Text>
              </Descriptions.Item>

              <Descriptions.Item label="Prestaciones" span={2}>
                {prestacionesTags.length ? (
                  <Space wrap>
                    {prestacionesTags.map((k) => (
                      <Tag key={k}>{prettyPrestacion(k)}</Tag>
                    ))}
                  </Space>
                ) : (
                  <Text strong>—</Text>
                )}
              </Descriptions.Item>

              <Descriptions.Item label="Fecha límite contestación">
                <Text strong>{fmtDate(etapa?.fecha_limite_contestacion)}</Text>
              </Descriptions.Item>

              <Descriptions.Item label="Fecha audiencia conciliatoria">
                <Text strong>{fmtDate(etapa?.fecha_audiencia_conciliatoria)}</Text>
              </Descriptions.Item>

              <Descriptions.Item label="Observaciones" span={2}>
                <Text strong style={{ whiteSpace: "pre-wrap" }}>
                  {etapa?.observaciones_etapa_actual || "—"}
                </Text>
              </Descriptions.Item>
            </Descriptions>

            <Divider style={{ margin: "14px 0" }} />

            <Card
              bordered={false}
              style={{
                background: "#f9fafb",
                borderRadius: 16,
              }}
              bodyStyle={{ padding: 14 }}
            >
              <Space align="center" wrap>
                <FileTextOutlined />
                <Text strong>Hechos</Text>
              </Space>

              <div style={{ marginTop: 10 }}>
                <Descriptions
                  bordered
                  size="small"
                  column={{ xs: 1, sm: 1, md: 2, lg: 2 }}
                  labelStyle={labelStyle}
                  contentStyle={contentStyle}
                >
                  <Descriptions.Item label="Responsable del despido">
                    <Text strong>{safeObj(d?.hechos)?.responsable_despido || "—"}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Jefes inmediatos">
                    <Text strong>{safeObj(d?.hechos)?.jefes_inmediatos || "—"}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Narrativa" span={2}>
                    <Text strong style={{ whiteSpace: "pre-wrap" }}>
                      {safeObj(d?.hechos)?.narrativa || "—"}
                    </Text>
                  </Descriptions.Item>
                </Descriptions>
              </div>
            </Card>

            <Divider style={{ margin: "14px 0" }} />

            <Card
              bordered={false}
              style={{
                background: "#f9fafb",
                borderRadius: 16,
              }}
              bodyStyle={{ padding: 14 }}
            >
              <Space align="center" wrap>
                <FileTextOutlined />
                <Text strong>Condiciones de trabajo</Text>
              </Space>

              <div style={{ marginTop: 10 }}>
                <Descriptions
                  bordered
                  size="small"
                  column={{ xs: 1, sm: 1, md: 2, lg: 2 }}
                  labelStyle={labelStyle}
                  contentStyle={contentStyle}
                >
                  <Descriptions.Item label="Fecha de ingreso">
                    <Text strong>{fmtDate(safeObj(d?.condiciones_trabajo)?.fecha_ingreso)}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Puesto">
                    <Text strong>{safeObj(d?.condiciones_trabajo)?.puesto || "—"}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Salario diario">
                    <Text strong>{safeObj(d?.condiciones_trabajo)?.salario_diario || "—"}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Salario diario integrado">
                    <Text strong>{safeObj(d?.condiciones_trabajo)?.salario_diario_integrado || "—"}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Lugar del servicio" span={2}>
                    <Text strong>{safeObj(d?.condiciones_trabajo)?.lugar_servicio || "—"}</Text>
                  </Descriptions.Item>
                </Descriptions>
              </div>
            </Card>
          </Col>

          {/* Cuadro azul lateral */}
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
                <span className="laboral-exp-chip-label" style={{ fontSize: 16, fontWeight: 600 }}>
                  {blueHeader}
                </span>
              </div>

              <div className="laboral-exp-next-aud-body" style={{ marginBottom: 16 }}>
                <Text style={{ marginBottom: 6 }} strong>
                  {blueBody}
                </Text>
                {blueSub ? (
                  <Text type="secondary" style={{ display: "block", fontSize: 12 }}>
                    {blueSub}
                  </Text>
                ) : null}
              </div>

              <div className="laboral-exp-next-aud-footer">
                {hasCitatorio && etapa?.citatorio?.url ? (
                  <Button
                    type="primary"
                    size="large"
                    style={{
                      fontSize: "14px",
                      fontWeight: 600,
                      padding: "10px 26px",
                      borderRadius: "10px",
                    }}
                    icon={<FilePdfOutlined />}
                    onClick={openCitatorio}
                    disabled={deletingExp}
                  >
                    Abrir citatorio
                  </Button>
                ) : null}
              </div>
            </div>
          </Col>
        </Row>
      </Card>
    </div>
  );
}
